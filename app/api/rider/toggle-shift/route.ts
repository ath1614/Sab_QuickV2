import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const toggleShiftSchema = z.object({
  isOnline: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userRoles = session.user.roles || [session.user.role];
    if (!userRoles.includes("RIDER") && session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Rider role required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = toggleShiftSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { isOnline } = parseResult.data;
    const riderId = session.user.id;

    const updatedProfile = await prisma.riderProfile.upsert({
      where: { userId: riderId },
      update: { isOnline },
      create: {
        userId: riderId,
        isOnline,
        vehicleDetails: "Electric Two-Wheeler (SabQuick Express)",
      },
    });

    return NextResponse.json({
      success: true,
      isOnline: updatedProfile.isOnline,
    });
  } catch (error: any) {
    console.error("[POST /api/rider/toggle-shift error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle shift" },
      { status: 500 }
    );
  }
}
