import { NextResponse } from "next/server";
import { resolveActiveTheme, DEFAULT_THEME } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const theme = await resolveActiveTheme();

    return NextResponse.json({
      themeName: theme.themeName,
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
      saleTagText: theme.saleTagText,
      bannerImageUrl: theme.bannerImageUrl,
      source: theme.source,
      campaignId: theme.campaignId ?? null,
    });
  } catch (error) {
    console.error("[GET /api/theme error]:", error);
    return NextResponse.json({
      themeName: DEFAULT_THEME.themeName,
      primaryColor: DEFAULT_THEME.primaryColor,
      accentColor: DEFAULT_THEME.accentColor,
      saleTagText: DEFAULT_THEME.saleTagText,
      bannerImageUrl: DEFAULT_THEME.bannerImageUrl,
      source: "default",
      campaignId: null,
    });
  }
}
