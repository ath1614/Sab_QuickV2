import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const theme = await prisma.themeConfig.findUnique({
      where: { id: "active_theme" },
    });

    if (!theme) {
      return NextResponse.json({
        themeName: "Forest Speed (Standard)",
        primaryColor: "#0B6E4F",
        accentColor: "#00C853",
        saleTagText: "⚡ 10-15 Min Delivery Guarantee",
        bannerImageUrl: "/banners/forest-speed-hero.webp",
      });
    }

    return NextResponse.json({
      themeName: theme.themeName,
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
      saleTagText: theme.saleTagText,
      bannerImageUrl: theme.bannerImageUrl,
    });
  } catch (error) {
    console.error("[GET /api/theme error]:", error);
    return NextResponse.json(
      {
        themeName: "Forest Speed (Standard)",
        primaryColor: "#0B6E4F",
        accentColor: "#00C853",
        saleTagText: "⚡ 10-15 Min Delivery Guarantee",
        bannerImageUrl: "/banners/forest-speed-hero.webp",
      },
      { status: 200 }
    );
  }
}
