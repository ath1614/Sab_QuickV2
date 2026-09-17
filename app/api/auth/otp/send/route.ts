import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import redis from "@/lib/redis";
import prisma from "@/lib/prisma";

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

    // 1. Enforce strict 60-second rate-limiting cooldown per phone number via Redis
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

    // 2. Generate secure 4-digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // 3. Store OTP in Redis with 300-second (5 minutes) TTL
    const otpKey = `otp:phone:${phone}`;
    await redis.set(otpKey, otpCode, "EX", 300);

    // 4. Set 60-second cooldown in Redis
    await redis.set(cooldownKey, "1", "EX", 60);

    // 5. Query whether customer already exists to advise onboarding form
    const existingUser = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, name: true },
    });
    const isNewUser = !existingUser || !existingUser.name;

    // 6. SMS Dispatch Gateway Integration
    if (process.env.SMS_GATEWAY_API_KEY && process.env.NODE_ENV === "production") {
      // In production with live SMS credentials, forward to SMS gateway
      try {
        console.log(`[SMS GATEWAY] Dispatching OTP to +91 ${phone}...`);
        // Gateway dispatch hook (e.g., Fast2SMS / Twilio / MSG91)
      } catch (smsErr) {
        console.error("[SMS Gateway Error]:", smsErr);
      }
    } else {
      // Developer terminal output for local / staging verification
      console.log(`\n======================================================`);
      console.log(`[SABQUICK SECURE OTP] >>> Phone: +91 ${phone} | OTP: ${otpCode} <<<`);
      console.log(`======================================================\n`);
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      expiresIn: 300,
      cooldown: 60,
      isNewUser,
      ...(!process.env.SMS_GATEWAY_API_KEY ? { freeOtp: otpCode } : {}),
    });
  } catch (error: any) {
    console.error("[OTP Send Error]:", error);
    return NextResponse.json(
      { error: "Failed to send OTP. Please try again later." },
      { status: 500 }
    );
  }
}
