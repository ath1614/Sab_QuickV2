import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const savePhoneSchema = z.object({
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
        { error: "Unauthorized: Please sign in first." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parseResult = savePhoneSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { phone } = parseResult.data;

    // Check if phone number is already registered to a different account
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: "This mobile number is already linked to another account." },
        { status: 400 }
      );
    }

    // Attach verified phone to the authenticated Google/Customer user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone,
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

    return NextResponse.json({
      success: true,
      message: "Delivery contact number saved successfully.",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("[POST /api/auth/phone/save error]:", error);
    return NextResponse.json(
      { error: "Failed to save contact number. Please try again." },
      { status: 500 }
    );
  }
}
