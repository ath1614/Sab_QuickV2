import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import { z } from "zod";

export const dynamic = "force-dynamic";

const registerDeviceSchema = z.object({
  token: z.string().min(10, "Valid push token is required"),
  platform: z.enum(["ANDROID", "IOS", "WEB"]).default("ANDROID"),
  deviceModel: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Must be logged in to register push notifications." },
        { status: 401 }
      );
    }

    await ensureDatabaseSchema();

    const body = await req.json().catch(() => ({}));
    const parseResult = registerDeviceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { token, platform, deviceModel } = parseResult.data;

    // Upsert token to user so switching accounts or updating token preserves clean records
    await prisma.deviceToken.upsert({
      where: { token },
      update: {
        userId: session.user.id,
        platform,
        deviceModel: deviceModel || undefined,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        token,
        platform,
        deviceModel: deviceModel || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Device registered for push notifications.",
    });
  } catch (error: any) {
    console.error("[POST /api/notifications/register-device error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to register device token." },
      { status: 500 }
    );
  }
}
