"use client";

import * as React from "react";
import { Zap, Sparkles, Smartphone, Monitor } from "lucide-react";
import { getBannerForTheme } from "@/lib/theme";

interface ThemeHeroPreviewProps {
  themeName: string;
  primaryColor: string;
  accentColor: string;
  saleTagText: string;
  bannerImageUrl: string;
  className?: string;
}

export function ThemeHeroPreview({
  themeName,
  primaryColor,
  accentColor,
  saleTagText,
  bannerImageUrl,
  className = "",
}: ThemeHeroPreviewProps) {
  const [deviceMode, setDeviceMode] = React.useState<"desktop" | "mobile">("desktop");

  const resolvedBanner = getBannerForTheme(themeName, bannerImageUrl);
  const isFestive =
    themeName.toLowerCase().includes("festiv") ||
    themeName.toLowerCase().includes("navratri") ||
    themeName.toLowerCase().includes("diwali") ||
    themeName.toLowerCase().includes("holi") ||
    themeName.toLowerCase().includes("eid") ||
    themeName.toLowerCase().includes("christmas");

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header bar with device switcher */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Live Customer Storefront Preview</span>
        </span>

        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setDeviceMode("desktop")}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
              deviceMode === "desktop"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Monitor className="w-3 h-3" />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode("mobile")}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
              deviceMode === "mobile"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* Preview Frame */}
      <div
        className={`transition-all duration-300 mx-auto ${
          deviceMode === "mobile" ? "max-w-xs sm:max-w-sm" : "w-full"
        }`}
      >
        <div
          className="relative rounded-3xl overflow-hidden bg-slate-950 text-white p-4 sm:p-6 shadow-xl border border-white/10"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 48%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0.10) 100%), url(${resolvedBanner})`,
            backgroundSize: "cover",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Ambient Lighting Orbs */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div
              className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-30"
              style={{ backgroundColor: accentColor || "#00C853" }}
            />
            <div
              className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full blur-2xl opacity-20"
              style={{ backgroundColor: primaryColor || "#0B6E4F" }}
            />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6">
            {/* Left Typography & Actions */}
            <div className="space-y-2 sm:space-y-2.5 max-w-md">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 uppercase font-black tracking-wider text-[9px] sm:text-[10px] py-0.5 px-2 rounded-md shadow-xs font-mono"
                  style={{
                    backgroundColor: accentColor || "#00C853",
                    color: "#04241c",
                  }}
                >
                  <Zap className="w-2.5 h-2.5 fill-current" />
                  Superfast
                </span>
                <span className="inline-flex items-center text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-white/90 border border-white/20 backdrop-blur-xs">
                  {isFestive ? "✨ Festive Edition" : "⚡ Fresh Dark Store"}
                </span>
              </div>

              <h2 className="text-base sm:text-xl font-display font-black tracking-tight leading-tight text-white drop-shadow-md line-clamp-2">
                {saleTagText || "⚡ Superfast Delivery Guarantee"}
              </h2>

              <p className="text-[11px] sm:text-xs text-white/85 leading-relaxed font-medium drop-shadow-xs line-clamp-2">
                Fresh milk, dairy staples, puja samagri, and midnight munchies dispatched from our Ambikapur dark store within minutes.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-[10px] shadow-sm cursor-default"
                  style={{
                    backgroundColor: accentColor || "#00C853",
                    color: "#04241c",
                  }}
                >
                  <span>Shop Essentials</span>
                  <span className="text-xs">&darr;</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 text-white font-bold text-[10px] border border-white/20 backdrop-blur-xs cursor-default">
                  <span>Categories &rarr;</span>
                </span>
              </div>
            </div>

            {/* Desktop Geofence SLA Pill */}
            {deviceMode === "desktop" && (
              <div className="hidden sm:flex flex-col items-end justify-center shrink-0">
                <div className="bg-black/50 backdrop-blur-md border border-white/20 rounded-xl p-2.5 shadow-lg text-right max-w-[200px] space-y-0.5">
                  <span
                    className="text-[9px] font-black uppercase tracking-wider block"
                    style={{ color: accentColor || "#34D399" }}
                  >
                    ⚡ 3.5 KM Geofence
                  </span>
                  <p className="text-[11px] font-black text-white leading-tight">
                    Superfast Delivery
                  </p>
                  <p className="text-[9px] text-white/70 truncate">
                    {themeName} Active
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
