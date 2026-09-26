"use client";

import * as React from "react";

const THEME_REFETCH_TTL_MS = 5 * 60 * 1000;

export function ThemeSync() {
  React.useEffect(() => {
    let isMounted = true;

    async function syncTheme() {
      try {
        const res = await fetch("/api/theme");
        if (!res.ok || !isMounted) return;
        const data = await res.json();

        if (data.primaryColor && data.accentColor) {
          const root = document.documentElement;
          root.style.setProperty("--brand-primary", data.primaryColor);
          root.style.setProperty("--brand-accent", data.accentColor);
          if (data.bannerImageUrl) {
            root.style.setProperty("--brand-banner", `url(${data.bannerImageUrl})`);
          }
        }
      } catch (err) {
        console.warn("[ThemeSync Error]:", err);
      }
    }

    syncTheme();
    // Seasonal campaigns can go live mid-session — re-resolve on a TTL.
    const interval = setInterval(syncTheme, THEME_REFETCH_TTL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return null;
}
