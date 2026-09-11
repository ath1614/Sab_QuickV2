import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    if (session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Only store owners can update seasonal themes." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { themeName, primaryColor, accentColor, bannerImageUrl, saleTagText } = body;

    if (!themeName || !primaryColor || !accentColor) {
      return NextResponse.json(
        { error: "Missing required fields: themeName, primaryColor, and accentColor are required." },
        { status: 400 }
      );
    }

    const updatedTheme = await prisma.themeConfig.upsert({
      where: { id: "active_theme" },
      update: {
        themeName,
        primaryColor,
        accentColor,
        bannerImageUrl: bannerImageUrl || null,
        saleTagText: saleTagText || null,
      },
      create: {
        id: "active_theme",
        themeName,
        primaryColor,
        accentColor,
        bannerImageUrl: bannerImageUrl || null,
        saleTagText: saleTagText || null,
      },
    });

    return NextResponse.json({
      success: true,
      theme: updatedTheme,
    });
  } catch (error) {
    console.error("[POST /api/ops/theme/update error]:", error);
    return NextResponse.json(
      { error: "Internal server error updating seasonal theme." },
      { status: 500 }
    );
  }
}
