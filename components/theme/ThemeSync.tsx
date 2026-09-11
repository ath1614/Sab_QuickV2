"use client";

import * as React from "react";

export function ThemeSync() {
  React.useEffect(() => {
    async function syncTheme() {
      try {
        const res = await fetch("/api/theme");
        if (!res.ok) return;
        const data = await res.json();

        if (data.primaryColor && data.accentColor) {
          const root = document.documentElement;
          root.style.setProperty("--brand-primary", data.primaryColor);
          root.style.setProperty("--brand-accent", data.accentColor);
        }
      } catch (err) {
        console.warn("[ThemeSync Error]:", err);
      }
    }

    syncTheme();
  }, []);

  return null;
}
