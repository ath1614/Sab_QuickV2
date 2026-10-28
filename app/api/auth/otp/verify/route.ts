import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import redis from "@/lib/redis";
import prisma from "@/lib/prisma";
import {
  isOtpLocked,
  otpStorageKey,
  recordOtpFailure,
  resetOtpAttempts,
  verifyOtpHash,
} from "@/lib/otp";
import { getClientIp } from "@/lib/rateLimit";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/rateLimitServer";

const verifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Code must be exactly 6 digits"),
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

    const ipLimit = await enforceRateLimit(
      `otp:verify:${getClientIp(req.headers)}:${phone}`,
      10,
      10 * 60_000
    );
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait and try again." },
        { status: 429, headers: rateLimitHeaders(ipLimit) }
      );
    }

    if (await isOtpLocked(phone)) {
      return NextResponse.json(
        {
          error:
            "Too many incorrect attempts. Please request a fresh code in a few minutes.",
        },
        { status: 429 }
      );
    }

    const otpKey = otpStorageKey(phone);
    const storedOtpHash = await redis.get(otpKey);

    if (!storedOtpHash) {
      return NextResponse.json(
        { error: "OTP expired or not found. Please request a new code." },
        { status: 400 }
      );
    }

    if (!verifyOtpHash(phone, otp, storedOtpHash)) {
      await recordOtpFailure(phone);
      return NextResponse.json(
        { error: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }
    // The OTP is deleted only after the database operations below succeed, so a
    // transient database error does not force the customer to request a new code.

    // Optional active session check
    const session = await getServerSession(authOptions);

    let dbUser;
    if (session?.user?.id) {
      // User is already authenticated (e.g. via Google OAuth) and verifying phone on their account
      const existingPhoneUser = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhoneUser && existingPhoneUser.id !== session.user.id) {
        // Prevent hijacking staff or partner accounts (OWNER, MANAGER, RIDER)
        if (existingPhoneUser.role !== Role.CUSTOMER) {
          return NextResponse.json(
            {
              error:
                "This phone number is assigned to a staff/partner account. Please log in directly using your phone number.",
            },
            { status: 403 }
          );
        }

        // Clean customer merge: atomically transfer orders, addresses, and device tokens to the authenticated session
        dbUser = await prisma.$transaction(async (tx) => {
          // 1. Migrate customer orders
          await tx.order.updateMany({
            where: { customerId: existingPhoneUser.id },
            data: { customerId: session.user.id },
          });

          // 2. Migrate saved customer addresses
          await tx.address.updateMany({
            where: { userId: existingPhoneUser.id },
            data: { userId: session.user.id },
          });

          // 3. Migrate device tokens
          await tx.deviceToken.updateMany({
            where: { userId: existingPhoneUser.id },
            data: { userId: session.user.id },
          });

          // 4. Release unique phone constraint from previous record
          if (!existingPhoneUser.email) {
            // Previous phone-only OTP guest/customer placeholder — safely purge
            await tx.user.delete({
              where: { id: existingPhoneUser.id },
            });
          } else {
            // Account has its own email — detach the phone number
            await tx.user.update({
              where: { id: existingPhoneUser.id },
              data: {
                phone: null,
                phoneVerified: false,
              },
            });
          }

          // 5. Assign and verify phone on current session user
          return await tx.user.update({
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
        });
      } else {
        // Phone number is either unassigned or already belongs to this user
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
      }
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
            roles: [Role.CUSTOMER],
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

    // Single-use security: purge the OTP and clear the failure counter only
    // after the database operations succeeded.
    await redis.del(otpKey);
    await resetOtpAttempts(phone);

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
