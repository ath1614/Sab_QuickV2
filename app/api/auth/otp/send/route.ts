import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import redis from "@/lib/redis";

const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number starting with 6-9"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in before verifying phone number." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parseResult = sendOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { phone } = parseResult.data;
    const userId = session.user.id;

    // Check rate limit cooldown (30 seconds)
    const cooldownKey = `otp:cooldown:${userId}`;
    const inCooldown = await redis.get(cooldownKey);
    if (inCooldown) {
      const ttl = await redis.ttl(cooldownKey);
      return NextResponse.json(
        {
          error: `Please wait ${ttl > 0 ? ttl : 30} seconds before requesting a new OTP.`,
        },
        { status: 429 }
      );
    }

    // Generate 4-digit OTP code
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Store in Redis with 300s (5 minutes) expiry
    const otpKey = `otp:phone:${phone}`;
    await redis.set(otpKey, otpCode, "EX", 300);

    // Set cooldown rate limit for 30s
    await redis.set(cooldownKey, "1", "EX", 30);

    // Log for local developer convenience
    console.log(`\n======================================================`);
    console.log(`[SABQUICK DEV OTP] >>> Phone: +91 ${phone} | OTP: ${otpCode} <<<`);
    console.log(`======================================================\n`);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      expiresIn: 300,
    });
  } catch (error) {
    console.error("[OTP Send Error]:", error);
    return NextResponse.json(
      { error: "Failed to send OTP. Please try again later." },
      { status: 500 }
    );
  }
}
