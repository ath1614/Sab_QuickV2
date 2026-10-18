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
    let effectiveToken = token;

    // On iOS, if device registered with 64-char hex APNs token, exchange for FCM token
    if (platform === "IOS" && /^[a-fA-F0-9]{64}$/.test(token)) {
      try {
        const { getFirebaseAdminApp } = await import("@/lib/firebase-admin");
        const app = getFirebaseAdminApp();
        const tokenObj = await (app.options.credential as any)?.getAccessToken?.();
        if (tokenObj?.access_token) {
          const exchangeApns = async (isSandbox: boolean) => {
            const res = await fetch("https://iid.googleapis.com/iid/v1:batchImport", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenObj.access_token}`,
                access_token_auth: "true",
              },
              body: JSON.stringify({
                application: "com.sabquick.app",
                sandbox: isSandbox,
                apns_tokens: [token],
              }),
            });
            const data = await res.json().catch(() => null);
            return data?.results?.[0]?.registration_token || null;
          };

          // Try production first (for TestFlight & App Store release builds), then sandbox (for Xcode debug builds)
          let fcmToken = await exchangeApns(false);
          if (!fcmToken) {
            fcmToken = await exchangeApns(true);
          }
          if (fcmToken) {
            console.log("[APNs-to-FCM exchange success]:", fcmToken.substring(0, 16) + "...");
            effectiveToken = fcmToken;
          } else {
            console.warn("[APNs-to-FCM exchange warning]: Could not exchange APNs token with Google IID (both prod and sandbox returned null)");
          }
        }
      } catch (apnsErr) {
        console.warn("[APNs-to-FCM exchange notice]:", apnsErr);
      }
    }

    // Upsert token to user so switching accounts or updating token preserves clean records
    await prisma.deviceToken.upsert({
      where: { token: effectiveToken },
      update: {
        userId: session.user.id,
        platform,
        deviceModel: deviceModel || undefined,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        token: effectiveToken,
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
