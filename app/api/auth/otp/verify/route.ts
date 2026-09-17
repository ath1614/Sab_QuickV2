import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Role } from "@prisma/client";
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
  name: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = verifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { phone, otp, name } = parseResult.data;
    const otpKey = `otp:phone:${phone}`;
    const storedOtp = await redis.get(otpKey);

    if (!storedOtp) {
      return NextResponse.json(
        { error: "OTP expired or not found. Please request a new code." },
        { status: 400 }
      );
    }

    if (storedOtp !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    // Single-use security: purge OTP from Redis immediately
    await redis.del(otpKey);

    // Optional active session check
    const session = await getServerSession(authOptions);

    let dbUser;
    if (session?.user?.id) {
      // User is already authenticated and verifying phone on their account
      dbUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          phone,
          phoneVerified: true,
          ...(name && !session.user.name ? { name: name.trim() } : {}),
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
    } else {
      // Direct customer login or registration via phone OTP
      const existingUser = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingUser) {
        dbUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            phoneVerified: true,
            ...(name && !existingUser.name ? { name: name.trim() } : {}),
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
      } else {
        // Enforce role strictly as CUSTOMER (immune to privilege escalation payloads)
        dbUser = await prisma.user.create({
          data: {
            phone,
            name: name?.trim() || "Customer",
            phoneVerified: true,
            role: Role.CUSTOMER,
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
      }
    }

    return NextResponse.json({
      success: true,
      message: "Phone number verified successfully",
      user: dbUser,
    });
  } catch (error: any) {
    console.error("[OTP Verify Error]:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again later." },
      { status: 500 }
    );
  }
}
