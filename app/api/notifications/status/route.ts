import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import { isApnsDeviceToken, maskPushToken } from "@/lib/pushTokens";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await ensureDatabaseSchema();

    const devices = await prisma.deviceToken.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        token: true,
        platform: true,
        deviceModel: true,
        lastError: true,
        lastErrorAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const rawClientReport = await redis
      .get(`push:client-status:${session.user.id}`)
      .catch(() => null);

    let clientReport: Record<string, unknown> | null = null;
    if (rawClientReport) {
      try {
        clientReport = JSON.parse(rawClientReport);
      } catch {
        clientReport = null;
      }
    }

    return NextResponse.json({
      success: true,
      firebaseAdminConfigured: Boolean(process.env.FIREBASE_PRIVATE_KEY),
      client: clientReport,
      devices: devices.map((device) => ({
        id: device.id,
        platform: device.platform,
        tokenKind: isApnsDeviceToken(device.token) ? "apns" : "fcm",
        token: maskPushToken(device.token),
        deviceModel: device.deviceModel,
        lastError: device.lastError,
        lastErrorAt: device.lastErrorAt,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error("[GET /api/notifications/status error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to read push status." },
      { status: 500 }
    );
  }
}
