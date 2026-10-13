export interface ThemePreset {
  key: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  saleTagText: string;
  bannerImageUrl?: string;
}

/**
 * Shared seasonal palette gallery (single source of truth).
 * Consumed by the owner theme console presets and the campaign scheduler.
 */
export const THEME_PRESETS: ThemePreset[] = [
  // Brand default
  {
    key: "standard",
    name: "Standard Green",
    primaryColor: "#0B6E4F",
    accentColor: "#00C853",
    saleTagText: "Superfast Delivery Guarantee",
    bannerImageUrl: "/brand/banners/original-theme.jpg",
  },
  // Festivals
  {
    key: "navratri",
    name: "Navratri Nine",
    primaryColor: "#6D28D9",
    accentColor: "#F97316",
    saleTagText: "Navratri Special — 9 Days of Deals",
    bannerImageUrl: "/brand/banners/navratri-theme.jpg",
  },
  {
    key: "diwali",
    name: "Diwali Lights",
    primaryColor: "#7C2D12",
    accentColor: "#F59E0B",
    saleTagText: "Diwali Dhamaka — Festive Deals Live",
    bannerImageUrl: "/brand/banners/diwali-theme.jpg",
  },
  {
    key: "big-save",
    name: "Big Save Days",
    primaryColor: "#B91C1C",
    accentColor: "#FACC15",
    saleTagText: "Big Save Days — Huge Discounts Live",
    bannerImageUrl: "/brand/banners/big-save-theme.jpg",
  },
  {
    key: "midnight",
    name: "Midnight Express",
    primaryColor: "#1E1B4B",
    accentColor: "#6366F1",
    saleTagText: "Midnight Express — Late Night Cravings Solved",
    bannerImageUrl: "/brand/banners/midnight-theme.jpg",
  },
  {
    key: "holi",
    name: "Holi Colors",
    primaryColor: "#BE185D",
    accentColor: "#F472B6",
    saleTagText: "Holi Hai! Colorful Savings Inside",
    bannerImageUrl: "/brand/banners/holi-theme.jpg",
  },
  {
    key: "eid",
    name: "Eid Mubarak",
    primaryColor: "#065F46",
    accentColor: "#34D399",
    saleTagText: "Eid Mubarak — Feast Essentials Fast",
    bannerImageUrl: "/brand/banners/eid-theme.jpg",
  },
  {
    key: "christmas",
    name: "Christmas Cheer",
    primaryColor: "#7F1D1D",
    accentColor: "#22C55E",
    saleTagText: "Merry Christmas — Holiday Treats Delivered",
    bannerImageUrl: "/brand/banners/christmas-theme.jpg",
  },
  {
    key: "raksha-bandhan",
    name: "Raksha Bandhan",
    primaryColor: "#9D174D",
    accentColor: "#FB7185",
    saleTagText: "Rakhi Special — Send Love in 15 Min",
    bannerImageUrl: "/brand/banners/raksha-bandhan-theme.jpg",
  },
  {
    key: "independence",
    name: "Tiranga Sale",
    primaryColor: "#1E3A8A",
    accentColor: "#F97316",
    saleTagText: "Tiranga Sale — Independence Offers",
    bannerImageUrl: "/brand/banners/independence-theme.jpg",
  },
  {
    key: "summer",
    name: "Summer Chill",
    primaryColor: "#0E7490",
    accentColor: "#22D3EE",
    saleTagText: "Summer Chill — Cold Drinks & Ice Creams",
    bannerImageUrl: "/brand/banners/summer-chill-theme.jpg",
  },
];

/** Convert hex to an rgb() string for CSS variable composition. */
export function hexToRgbString(hex: string): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}
