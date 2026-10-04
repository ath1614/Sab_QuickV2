import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const body = await req.json().catch(() => ({}));
    const contact = (body.contact || "").trim();

    if (!contact || contact.length < 5) {
      return NextResponse.json(
        { error: "Please enter a valid phone number or email address." },
        { status: 400 }
      );
    }

    // Upsert subscriber
    const subscriber = await prisma.launchSubscriber.upsert({
      where: { contact },
      update: {},
      create: { contact },
    });

    const totalCount = await prisma.launchSubscriber.count();

    return NextResponse.json({
      success: true,
      message: "You're on the launch priority list! We'll notify you the moment orders open.",
      subscriberCount: totalCount,
    });
  } catch (error) {
    console.error("[POST /api/store/notify-launch error]:", error);
    return NextResponse.json(
      { error: "Could not register your notification request. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await ensureDatabaseSchema();
    const count = await prisma.launchSubscriber.count();
    return NextResponse.json({ subscriberCount: count });
  } catch (error) {
    return NextResponse.json({ subscriberCount: 0 });
  }
}
