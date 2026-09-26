import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import redis from "@/lib/redis";
import prisma from "@/lib/prisma";
import { resetOtpAttempts } from "@/lib/otp";

const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number starting with 6-9"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = sendOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { phone } = parseResult.data;

    // 1. Check if phone belongs to Owner or internal Staff
    const existingUser = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, name: true, role: true, email: true },
    });

    const isOwner = phone === "9109066668" || existingUser?.role === "OWNER";
    const isStaff = Boolean(existingUser && existingUser.role !== "CUSTOMER");

    // A. Store Owner authentication via Passcode (Zero SMS consumed)
    if (isOwner) {
      return NextResponse.json({
        success: true,
        requirePin: true,
        isOwner: true,
        role: "OWNER",
        pinLength: 6,
        message: "Store Owner detected. Enter your 6-digit Owner Passcode.",
      });
    }

    // B. Internal Staff authentication via Staff PIN (Zero SMS consumed)
    if (isStaff && existingUser) {
      return NextResponse.json({
        success: true,
        requirePin: true,
        isStaff: true,
        role: existingUser.role,
        pinLength: 4,
        message: `Staff account [${existingUser.role}] detected. Enter your 4-digit Staff PIN.`,
      });
    }

    // 2. Enforce strict 60-second rate-limiting cooldown per phone number via Redis
    const cooldownKey = `otp:cooldown:${phone}`;
    const inCooldown = await redis.get(cooldownKey);
    if (inCooldown) {
      const ttl = await redis.ttl(cooldownKey);
      return NextResponse.json(
        {
          error: `Please wait ${ttl > 0 ? ttl : 60} seconds before requesting a new OTP.`,
        },
        { status: 429 }
      );
    }

    // 3. Generate secure 4-digit OTP for Customer
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // 4. Store OTP in Redis with 300-second (5 minutes) TTL
    const otpKey = `otp:phone:${phone}`;
    await redis.set(otpKey, otpCode, "EX", 300);

    // 5. Set 60-second cooldown in Redis
    await redis.set(cooldownKey, "1", "EX", 60);

    // A fresh OTP invalidates any previous failed-attempt lockout.
    await resetOtpAttempts(phone);

    const isNewUser = !existingUser || !existingUser.name;

    // 6. Direct SMS Dispatch Gateway Integration (Fast2SMS / 2Factor / MSG91)
    let smsDispatched = false;
    const fast2smsKey = process.env.FAST2SMS_API_KEY || process.env.SMS_GATEWAY_API_KEY;
    const twoFactorKey = process.env.TWOFACTOR_API_KEY;

    if (fast2smsKey) {
      try {
        console.log(`[SMS GATEWAY] Dispatching OTP via Fast2SMS to +91 ${phone}...`);
        const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: fast2smsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "otp",
            variables_values: otpCode,
            numbers: phone,
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (d.return) smsDispatched = true;
      } catch (smsErr) {
        console.error("[Fast2SMS Gateway Error]:", smsErr);
      }
    } else if (twoFactorKey) {
      try {
        console.log(`[SMS GATEWAY] Dispatching OTP via 2Factor to +91 ${phone}...`);
        await fetch(`https://2factor.in/API/V1/${twoFactorKey}/SMS/${phone}/${otpCode}/`);
        smsDispatched = true;
      } catch (smsErr) {
        console.error("[2Factor Gateway Error]:", smsErr);
      }
    } else {
      // Direct console log for development and staging
      console.log(`\n======================================================`);
      console.log(`[SABQUICK OTP] >>> Phone: +91 ${phone} | Code: ${otpCode} | Role: ${existingUser?.role || "CUSTOMER"} <<<`);
      console.log(`======================================================\n`);
    }

    // Zero-Captcha Policy:
    // We permanently disable client-side reCAPTCHA (useFirebase: false) so customers
    // never encounter fire-hydrant/traffic-light captcha challenges or WebView freezes.
    //
    // OTP DELIVERY MODES (OTP_DELIVERY_MODE env):
    //   - "auto" (default): if an SMS gateway is configured -> send real SMS and
    //     never reflect the code in the response. Without a gateway -> "display"
    //     mode (below) so login keeps working.
    //   - "display": the code is returned and shown in the app UI. This is the
    //     current production login mechanism (no SMS provider configured yet).
    //     Trade-off: possession of the endpoint = ability to request a code for
    //     any number. Documented in AUTH_FLOWS.md. Configure FAST2SMS_API_KEY or
    //     TWOFACTOR_API_KEY and login automatically upgrades to real SMS OTP.
    const hasSmsGateway = Boolean(fast2smsKey || twoFactorKey);
    const otpDeliveryMode = process.env.OTP_DELIVERY_MODE || "auto";
    const exposeDevCode =
      otpDeliveryMode === "display" || (otpDeliveryMode === "auto" && !hasSmsGateway);

    return NextResponse.json({
      success: true,
      useFirebase: false,
      message: smsDispatched
        ? "Verification code sent to your mobile phone"
        : "Verification code ready",
      expiresIn: 300,
      cooldown: 60,
      isNewUser,
      ...(exposeDevCode ? { freeOtp: otpCode } : {}),
    });
  } catch (error: any) {
    console.error("[OTP Send Error]:", error);
    return NextResponse.json(
      { error: "Failed to send OTP. Please try again later." },
      { status: 500 }
    );
  }
}
