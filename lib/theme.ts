import { ThemeCampaign, ThemeConfig } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Theme resolution engine (Phase 5).
 *
 * Order of precedence:
 *   1. LIVE scheduled campaign — a ThemeCampaign row whose validity window
 *      contains "now", ordered by priority (desc) then validFrom (desc).
 *   2. Manual pin — the ThemeConfig row (owner's manually applied theme).
 *   3. Brand defaults — safe fallback if nothing is configured.
 *
 * The storefront and the future Flutter app both consume `GET /api/theme`,
 * which resolves through this module.
 */

export interface ResolvedTheme {
  themeName: string;
  primaryColor: string;
  accentColor: string;
  saleTagText: string;
  bannerImageUrl: string | null;
  /** Which layer produced this theme — useful for owner debugging. */
  source: "campaign" | "manual" | "default";
  /** When a campaign is live, its id (for highlighting in the owner console). */
  campaignId?: string;
}

export const DEFAULT_THEME: ResolvedTheme = {
  themeName: "Forest Speed (Standard)",
  primaryColor: "#0B6E4F",
  accentColor: "#00C853",
  saleTagText: "⚡ 10-15 Min Delivery Guarantee",
  bannerImageUrl: "/banners/forest-speed-hero.webp",
  source: "default",
};

function manualToResolved(config: ThemeConfig): ResolvedTheme {
  return {
    themeName: config.themeName,
    primaryColor: config.primaryColor,
    accentColor: config.accentColor,
    saleTagText: config.saleTagText || DEFAULT_THEME.saleTagText,
    bannerImageUrl: config.bannerImageUrl,
    source: "manual",
  };
}

function campaignToResolved(campaign: ThemeCampaign): ResolvedTheme {
  return {
    themeName: campaign.name,
    primaryColor: campaign.primaryColor,
    accentColor: campaign.accentColor,
    saleTagText: campaign.saleTagText || DEFAULT_THEME.saleTagText,
    bannerImageUrl: campaign.bannerImageUrl,
    source: "campaign",
    campaignId: campaign.id,
  };
}

/** Resolve the theme a visitor should see right now. Never throws. */
export async function resolveActiveTheme(): Promise<ResolvedTheme> {
  const now = new Date();

  try {
    const campaign = await prisma.themeCampaign.findFirst({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: [{ priority: "desc" }, { validFrom: "desc" }],
    });

    if (campaign) {
      return campaignToResolved(campaign);
    }

    const manual = await prisma.themeConfig.findUnique({
      where: { id: "active_theme" },
    });

    if (manual) {
      return manualToResolved(manual);
    }
  } catch (err) {
    console.warn("[resolveActiveTheme] falling back to defaults:", err);
  }

  return DEFAULT_THEME;
}
