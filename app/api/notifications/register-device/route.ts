import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import {
  importApnsToken,
  isApnsDeviceToken,
  maskPushToken,
  trimPushError,
} from "@/lib/pushTokens";
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
    let effectiveToken = token;
    let pushError: string | null = null;
    let tokenKind: "apns" | "fcm" = isApnsDeviceToken(token) ? "apns" : "fcm";

    // On iOS the Capacitor plugin hands us a raw APNs token. Firebase can only
    // send to an FCM registration token, so exchange it and keep the exact
    // failure reason when that import does not work.
    if (platform === "IOS" && isApnsDeviceToken(token)) {
      const imported = await importApnsToken(token);

      if (imported.fcmToken) {
        effectiveToken = imported.fcmToken;
        tokenKind = "fcm";
        console.log(
          `[APNs-to-FCM exchange success] ${maskPushToken(imported.fcmToken)} (${imported.sandbox ? "sandbox" : "production"})`
        );
      } else {
        pushError = trimPushError(
          imported.error || "APNs token could not be imported into Firebase."
        );
        console.warn(
          `[APNs-to-FCM exchange failed] ${maskPushToken(token)}: ${pushError}`
        );
      }
    }

    // Upsert token to user so switching accounts or updating token preserves clean records
    await prisma.deviceToken.upsert({
      where: { token: effectiveToken },
      update: {
        userId: session.user.id,
        platform,
        deviceModel: deviceModel || undefined,
        lastError: pushError,
        lastErrorAt: pushError ? new Date() : null,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        token: effectiveToken,
        platform,
        deviceModel: deviceModel || undefined,
        lastError: pushError,
        lastErrorAt: pushError ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: pushError
        ? "Device saved, but iOS push delivery is not ready yet."
        : "Device registered for push notifications.",
      // fcmReady=false means this device will not receive pushes until the
      // Firebase iOS app / APNs auth key is fixed. The app reports this back so
      // /api/notifications/status can show it without server log access.
      fcmReady: platform === "IOS" ? tokenKind === "fcm" : true,
      tokenKind,
      pushError,
    });
  } catch (error: any) {
    console.error("[POST /api/notifications/register-device error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to register device token." },
      { status: 500 }
    );
  }
}
