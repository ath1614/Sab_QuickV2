import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import redis from "@/lib/redis";
import { z } from "zod";

export const dynamic = "force-dynamic";

const clientPushStatusSchema = z.object({
  permission: z.string().min(1).max(60),
  registered: z.boolean(),
  fcmReady: z.boolean().optional(),
  platform: z.string().min(1).max(20).optional(),
  error: z.string().max(2000).nullable().optional(),
  reportedAt: z.string().max(60).optional(),
});

/**
 * Receives what the device itself knows about push: permission state, whether
 * the native plugin registered, and the reason when it did not.
 *
 * Nothing here is used for sending - it exists so "no notifications on iOS"
 * can be diagnosed without attaching Xcode to a TestFlight build.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = clientPushStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const record = {
      ...parsed.data,
      reportedAt: new Date().toISOString(),
    };

    await redis
      .set(`push:client-status:${session.user.id}`, JSON.stringify(record), "EX", 60 * 60 * 24 * 7)
      .catch((err) => {
        console.warn("[Push client status] Could not cache report:", err);
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/notifications/client-status error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record push status." },
      { status: 500 }
    );
  }
}
