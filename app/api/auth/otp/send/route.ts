import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import redis from "@/lib/redis";
import prisma from "@/lib/prisma";
import {
  OTP_TTL_SECONDS,
  generateOtp,
  hashOtp,
  otpCooldownKey,
  otpStorageKey,
} from "@/lib/otp";
import { sendOtpSms } from "@/lib/sms";
import { getClientIp } from "@/lib/rateLimit";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/rateLimitServer";

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

    const ipLimit = await enforceRateLimit(
      `otp:send:${getClientIp(req.headers)}:${phone}`,
      5,
      60_000
    );
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait and try again." },
        { status: 429, headers: rateLimitHeaders(ipLimit) }
      );
    }

    // Staff and owners authenticate with a PIN, never an SMS OTP. Return the
    // same generic response so this endpoint cannot enumerate staff numbers.
    // The owner phone is intentionally read without any fallback.
    const ownerPhone = process.env.OWNER_PHONE?.trim();
    const existingUser = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, name: true, role: true, email: true },
    });

    const isOwner = Boolean(ownerPhone && phone === ownerPhone) || existingUser?.role === "OWNER";
    const isStaff = Boolean(existingUser && existingUser.role !== "CUSTOMER");

    if (isOwner || isStaff) {
      return NextResponse.json({
        success: true,
        useFirebase: false,
        message: "Verification code sent to your mobile phone",
        expiresIn: OTP_TTL_SECONDS,
        cooldown: 60,
      });
    }

    // Strict 60-second cooldown per phone number.
    const cooldownKey = otpCooldownKey(phone);
    const inCooldown = await redis.get(cooldownKey);
    if (inCooldown) {
      const ttl = await redis.ttl(cooldownKey);
      return NextResponse.json(
        { error: `Please wait ${ttl > 0 ? ttl : 60} seconds before requesting a new OTP.` },
        { status: 429 }
      );
    }

    const otpCode = generateOtp();
    const otpKey = otpStorageKey(phone);

    // Only the HMAC is stored. A Redis dump cannot be used to log in.
    await redis.set(otpKey, hashOtp(phone, otpCode), "EX", OTP_TTL_SECONDS);
    await redis.set(cooldownKey, "1", "EX", 60);

    const smsResult = await sendOtpSms(phone, otpCode);
    const smsDispatched = smsResult.success;

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
      expiresIn: OTP_TTL_SECONDS,
      cooldown: 60,
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
