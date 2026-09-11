import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import redis from "@/lib/redis";
import prisma from "@/lib/prisma";

const verifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),
  otp: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "OTP must be exactly 4 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in first." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parseResult = verifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { phone, otp } = parseResult.data;
    const otpKey = `otp:phone:${phone}`;
    const storedOtp = await redis.get(otpKey);

    if (!storedOtp) {
      return NextResponse.json(
        { error: "OTP expired or not found. Please request a new one." },
        { status: 400 }
      );
    }

    if (storedOtp !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    // OTP matched! Update user in PostgreSQL
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone: phone,
        phoneVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        phoneVerified: true,
        role: true,
      },
    });

    // Clean up used OTP from Redis
    await redis.del(otpKey);

    return NextResponse.json({
      success: true,
      message: "Phone number verified successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("[OTP Verify Error]:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again later." },
      { status: 500 }
    );
  }
}
