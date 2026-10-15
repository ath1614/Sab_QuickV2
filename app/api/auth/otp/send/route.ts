import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import redis from "@/lib/redis";
import prisma from "@/lib/prisma";
import { resetOtpAttempts } from "@/lib/otp";
import { sendOtpSms } from "@/lib/sms";

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

    // 1. Google Play Reviewer Account, Owner, and Internal Staff check
    const reviewerPhone = process.env.REVIEWER_PHONE?.trim() || "9820088991";
    const ownerPhone = process.env.OWNER_PHONE?.trim() || "9109066668";
    const existingUser = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, name: true, role: true, email: true },
    });

    const isReviewer = phone === reviewerPhone;
    const isOwner = phone === ownerPhone || existingUser?.role === "OWNER";
    const isStaff = Boolean(existingUser && existingUser.role !== "CUSTOMER");

    // Zero-SMS Authentication for Reviewer, Store Owner, and Internal Staff.
    // Return identical response to prevent account enumeration / role leakage.
    if (isReviewer || isOwner || isStaff) {
      return NextResponse.json({
        success: true,
        useFirebase: false,
        message: "Verification code sent to your mobile phone",
        expiresIn: 300,
        cooldown: 60,
        isNewUser: false,
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

    // 6. Direct SMS Dispatch Gateway Integration (Renflair / Fast2SMS / 2Factor)
    const smsResult = await sendOtpSms(phone, otpCode);
    const smsDispatched = smsResult.success;

    // STRICT PRODUCTION POLICY:
    // Under no circumstance is the demo/free OTP returned or displayed in production.
    const isProduction = process.env.NODE_ENV === "production";
    const hasSmsGateway = Boolean(
      process.env.RENFLAIR_API_KEY ||
      process.env.FAST2SMS_API_KEY ||
      process.env.SMS_GATEWAY_API_KEY ||
      process.env.TWOFACTOR_API_KEY
    );
    const otpDeliveryMode = process.env.OTP_DELIVERY_MODE || "auto";
    const exposeDevCode =
      !isProduction &&
      (otpDeliveryMode === "display" || (otpDeliveryMode === "auto" && !hasSmsGateway));

    return NextResponse.json({
      success: true,
      useFirebase: false,
      message: smsDispatched
        ? "Verification code sent to your mobile phone"
        : "Verification code sent",
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
