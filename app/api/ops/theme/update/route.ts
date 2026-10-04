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

    if (!["OWNER", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Store Owner or Manager role required to update seasonal themes." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      themeName,
      primaryColor,
      accentColor,
      bannerImageUrl,
      saleTagText,
      isStoreLive,
      launchDate,
    } = body;

    const current = await prisma.themeConfig.findUnique({
      where: { id: "active_theme" },
    });

    const finalThemeName = themeName || current?.themeName || "Standard";
    const finalPrimaryColor = primaryColor || current?.primaryColor || "#0B6E4F";
    const finalAccentColor = accentColor || current?.accentColor || "#00C853";
    const finalBannerImageUrl =
      bannerImageUrl !== undefined ? (bannerImageUrl || null) : (current?.bannerImageUrl || null);
    const finalSaleTagText =
      saleTagText !== undefined ? (saleTagText || null) : (current?.saleTagText || null);
    const finalIsStoreLive =
      isStoreLive !== undefined ? Boolean(isStoreLive) : (current?.isStoreLive ?? true);
    const finalLaunchDate =
      launchDate !== undefined ? (launchDate ? new Date(launchDate) : null) : (current?.launchDate ?? null);

    const updatedTheme = await prisma.themeConfig.upsert({
      where: { id: "active_theme" },
      update: {
        themeName: finalThemeName,
        primaryColor: finalPrimaryColor,
        accentColor: finalAccentColor,
        bannerImageUrl: finalBannerImageUrl,
        saleTagText: finalSaleTagText,
        isStoreLive: finalIsStoreLive,
        launchDate: finalLaunchDate,
      },
      create: {
        id: "active_theme",
        themeName: finalThemeName,
        primaryColor: finalPrimaryColor,
        accentColor: finalAccentColor,
        bannerImageUrl: finalBannerImageUrl,
        saleTagText: finalSaleTagText,
        isStoreLive: finalIsStoreLive,
        launchDate: finalLaunchDate,
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
