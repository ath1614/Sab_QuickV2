import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { isOtpLocked, otpAttemptsKey } from "@/lib/otp";

export const dynamic = "force-dynamic";

/**
 * GDPR/DPDP-style account deletion with OTP confirmation.
 *
 * Flow:
 *   POST { action: "request", phone }  -> sends an OTP to the registered phone
 *   POST { action: "confirm", phone, otp } -> verifies the OTP, then purges
 *
 * Security properties:
 * - Only the account holder can delete their own account: the OTP is delivered
 *   to the registered phone and the session (when present) must match it.
 * - The old unauthenticated "delete by bare phone number" path is removed.
 * - Attempt limiting on verification prevents brute-force of the deletion OTP.
 */

const deletionRequestSchema = z.object({
  action: z.literal("request"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number starting with 6-9"),
});

const deletionConfirmSchema = z.object({
  action: z.literal("confirm"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number starting with 6-9"),
  otp: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "OTP must be exactly 4 digits"),
});

const DELETION_OTP_PREFIX = "account-deletion:otp:";
const DELETION_ATTEMPT_PREFIX = "account-deletion:attempts:";
const DELETION_ATTEMPT_LIMIT = 5;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = await getServerSession(authOptions);
    const sessionPhone =
      typeof session?.user?.phone === "string" ? session.user.phone : undefined;

    // -------------------------------------------------------------
    // STEP 1: Request a deletion OTP
    // -------------------------------------------------------------
    if (body?.action === "request") {
      const parseResult = deletionRequestSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
      }

      const { phone } = parseResult.data;

      // If a session exists, it must belong to the phone being deleted.
      if (sessionPhone && sessionPhone !== phone) {
        return NextResponse.json(
          { error: "You can only request deletion for your own logged-in account." },
          { status: 403 }
        );
      }

      const targetUser = await prisma.user.findUnique({ where: { phone } });
      if (!targetUser || targetUser.phone !== phone) {
        return NextResponse.json(
          { error: "No account found matching this mobile number." },
          { status: 404 }
        );
      }

      // Safety: Prevent deleting the Store Owner account.
      if (targetUser.role === "OWNER" || phone === "9109066668") {
        return NextResponse.json(
          { error: "Store Owner account cannot be deleted via customer deletion request." },
          { status: 403 }
        );
      }

      // Staff accounts must be deactivated by the Owner, not self-deleted.
      if (targetUser.role !== "CUSTOMER") {
        return NextResponse.json(
          { error: "Staff accounts cannot be self-deleted. Please contact the store owner." },
          { status: 403 }
        );
      }

      // Rate-limit OTP issuance (60s cooldown, shared with login OTP keying).
      const cooldownKey = `otp:cooldown:${phone}`;
      const inCooldown = await redis.get(cooldownKey);
      if (inCooldown) {
        const ttl = await redis.ttl(cooldownKey);
        return NextResponse.json(
          { error: `Please wait ${ttl > 0 ? ttl : 60} seconds before requesting a new code.` },
          { status: 429 }
        );
      }

      const deletionOtp = Math.floor(1000 + Math.random() * 9000).toString();
      await redis.set(`${DELETION_OTP_PREFIX}${phone}`, deletionOtp, "EX", 300);
      await redis.set(cooldownKey, "1", "EX", 60);

      // Dispatch via the same SMS gateways used for login OTPs.
      const fast2smsKey = process.env.FAST2SMS_API_KEY || process.env.SMS_GATEWAY_API_KEY;
      const twoFactorKey = process.env.TWOFACTOR_API_KEY;
      let smsDispatched = false;

      if (fast2smsKey) {
        try {
          const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
              authorization: fast2smsKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              route: "otp",
              variables_values: deletionOtp,
              numbers: phone,
            }),
          });
          const d = await res.json().catch(() => ({}));
          if (d.return) smsDispatched = true;
        } catch (smsErr) {
          console.error("[Account Deletion Fast2SMS Error]:", smsErr);
        }
      } else if (twoFactorKey) {
        try {
          await fetch(`https://2factor.in/API/V1/${twoFactorKey}/SMS/${phone}/${deletionOtp}/`);
          smsDispatched = true;
        } catch (smsErr) {
          console.error("[Account Deletion 2Factor Error]:", smsErr);
        }
      } else {
        console.log(
          `\n[SABQUICK ACCOUNT DELETION OTP] >>> Phone: +91 ${phone} | Code: ${deletionOtp} <<<\n`
        );
      }

      return NextResponse.json({
        success: true,
        smsDispatched,
        message: smsDispatched
          ? "Verification code sent to your registered mobile number."
          : "Verification code generated. Check server logs in development.",
        expiresIn: 300,
      });
    }

    // -------------------------------------------------------------
    // STEP 2: Confirm the OTP and purge the account
    // -------------------------------------------------------------
    if (body?.action === "confirm") {
      const parseResult = deletionConfirmSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
      }

      const { phone, otp } = parseResult.data;

      if (sessionPhone && sessionPhone !== phone) {
        return NextResponse.json(
          { error: "You can only delete your own logged-in account." },
          { status: 403 }
        );
      }

      const attemptKey = `${DELETION_ATTEMPT_PREFIX}${phone}`;
      const attempts = parseInt((await redis.get(attemptKey)) || "0", 10);
      if (attempts >= DELETION_ATTEMPT_LIMIT) {
        return NextResponse.json(
          {
            error:
              "Too many incorrect attempts. Please request a fresh deletion code in a few minutes.",
          },
          { status: 429 }
        );
      }

      const storedOtp = await redis.get(`${DELETION_OTP_PREFIX}${phone}`);
      if (!storedOtp || storedOtp !== otp) {
        await redis.incr(attemptKey);
        if (attempts === 0) {
          await redis.expire(attemptKey, 360);
        }
        return NextResponse.json(
          { error: "Invalid or expired code. Please try again." },
          { status: 400 }
        );
      }

      // Single-use: destroy the OTP immediately after successful verification.
      await redis.del(`${DELETION_OTP_PREFIX}${phone}`, attemptKey, otpAttemptsKey(phone));

      const targetUser = await prisma.user.findUnique({ where: { phone } });
      if (!targetUser) {
        return NextResponse.json(
          { error: "No account found matching this mobile number." },
          { status: 404 }
        );
      }

      if (targetUser.role === "OWNER" || phone === "9109066668") {
        return NextResponse.json(
          { error: "Store Owner account cannot be deleted via customer deletion request." },
          { status: 403 }
        );
      }

      // 1. Delete associated doorstep delivery addresses
      await prisma.address.deleteMany({
        where: { userId: targetUser.id },
      });

      // 2. Anonymize user record: purge name, phone, email, and pin
      const anonymizedPhone = `deleted_${Date.now()}_${targetUser.id.slice(0, 6)}`;
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          name: "Deleted Account",
          email: null,
          phone: anonymizedPhone,
          phoneVerified: false,
          pin: null,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          "Customer account and all associated personal data have been permanently purged.",
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Expected 'request' or 'confirm'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Account Deletion Error]:", error);
    return NextResponse.json(
      { error: "Failed to process account deletion request. Please contact support directly." },
      { status: 500 }
    );
  }
}
