/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Palette, Zap, CheckCircle2, ArrowLeft, RefreshCw, X } from "lucide-react";

export const THEME_PRESETS = [
  {
    name: "Forest Speed (Standard)",
    primary: "#0B6E4F",
    accent: "#00C853",
    saleTag: "⚡ 10-15 Min Delivery Guarantee",
    bannerUrl: "/banners/forest-speed-hero.webp",
  },
  {
    name: "Diwali Gold Dhamaka",
    primary: "#B45309",
    accent: "#F59E0B",
    saleTag: "🪔 Diwali Dhamaka: 15-Min Festival Express",
    bannerUrl: "/banners/diwali-express.webp",
  },
  {
    name: "Midnight Flash",
    primary: "#1E1B4B",
    accent: "#6366F1",
    saleTag: "🌙 Midnight Flash: Late-Night Snacks & Drinks",
    bannerUrl: "/banners/midnight-flash.webp",
  },
  {
    name: "Summer Citrus Coolers",
    primary: "#EA580C",
    accent: "#FBBF24",
    saleTag: "☀️ Summer Coolers: Ice Creams & Beverages",
    bannerUrl: "/banners/summer-coolers.webp",
  },
  {
    name: "Holi Colors & Treats",
    primary: "#BE185D",
    accent: "#F43F5E",
    saleTag: "🎨 Holi Utsav: Gulal, Sweets & Thandai",
    bannerUrl: "/banners/holi-sweets.webp",
  },
];

interface SeasonalThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeUpdated?: () => void;
}

export function SeasonalThemeModal({
  isOpen,
  onClose,
  onThemeUpdated,
}: SeasonalThemeModalProps) {
  const [themeName, setThemeName] = React.useState("Forest Speed (Standard)");
  const [primaryColor, setPrimaryColor] = React.useState("#0B6E4F");
  const [accentColor, setAccentColor] = React.useState("#00C853");
  const [saleTagText, setSaleTagText] = React.useState("⚡ 10-15 Min Delivery Guarantee");
  const [bannerImageUrl, setBannerImageUrl] = React.useState("");
  const [themeSaving, setThemeSaving] = React.useState(false);
  const [themeSuccessMsg, setThemeSuccessMsg] = React.useState("");
  const [themeErrorMsg, setThemeErrorMsg] = React.useState("");

  // Load current active theme when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetch("/api/theme")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            if (data.themeName) setThemeName(data.themeName);
            if (data.primaryColor) setPrimaryColor(data.primaryColor);
            if (data.accentColor) setAccentColor(data.accentColor);
            if (data.saleTagText) setSaleTagText(data.saleTagText);
            if (data.bannerImageUrl) setBannerImageUrl(data.bannerImageUrl);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleApplyPreset = (preset: (typeof THEME_PRESETS)[0]) => {
    setThemeName(preset.name);
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
    setSaleTagText(preset.saleTag);
    if (preset.bannerUrl) setBannerImageUrl(preset.bannerUrl);
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setThemeSaving(true);
    setThemeSuccessMsg("");
    setThemeErrorMsg("");

    try {
      const res = await fetch("/api/ops/theme/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeName,
          primaryColor,
          accentColor,
          saleTagText,
          bannerImageUrl: bannerImageUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update theme.");

      setThemeSuccessMsg("Seasonal theme successfully updated & applied globally!");
      onThemeUpdated?.();
      setTimeout(() => {
        setThemeSuccessMsg("");
      }, 4000);
    } catch (err: any) {
      setThemeErrorMsg(err.message || "Network error updating theme.");
    } finally {
      setThemeSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl p-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <DialogTitle className="sr-only">Seasonal Theme &amp; Branding Customizer</DialogTitle>

        {/* Header */}
        <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Seasonal Brand &amp; Theme Engine</span>
                <Badge variant="accent" className="text-[10px] font-black uppercase px-1.5 py-0">
                  Manager &amp; Owner
                </Badge>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Instantly re-skin the customer app with seasonal festival themes &amp; promo banners
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* 1-Click Festival Presets */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-2">
              ⚡ 1-Click Seasonal Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {THEME_PRESETS.map((preset) => {
                const isActive = themeName === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative select-none ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-2xs shrink-0 -ml-1"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 block line-clamp-1 leading-tight">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Form & Live Preview */}
          <form onSubmit={handleSaveTheme} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Campaign / Theme Name *
                </label>
                <Input
                  required
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="e.g. Diwali Dhamaka 2026"
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Hero Sale Tag Headline *
                </label>
                <Input
                  required
                  value={saleTagText}
                  onChange={(e) => setSaleTagText(e.target.value)}
                  placeholder="e.g. 🪔 15-Min Festival Express"
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary Color */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Primary Brand Color (Navbar &amp; Accents)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#0B6E4F"
                    className="h-10 text-xs font-mono font-bold uppercase rounded-xl"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Accent Color (Discounts &amp; Badges)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#00C853"
                    className="h-10 text-xs font-mono font-bold uppercase rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Custom Hero Banner Image URL (Optional)
              </label>
              <Input
                value={bannerImageUrl}
                onChange={(e) => setBannerImageUrl(e.target.value)}
                placeholder="https://... or /banners/my-theme.webp"
                className="h-10 text-xs font-medium rounded-xl"
              />
            </div>

            {/* Live Visual Preview */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Live Customer Hero Preview
              </span>
              <div
                className="p-4 rounded-xl border border-white/10 flex flex-col gap-2 transition-all shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, #064E3B 60%, #0f172a 100%)`,
                }}
              >
                <div className="inline-flex items-center gap-1.5 w-fit text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-xs text-slate-900" style={{ backgroundColor: accentColor }}>
                  <Zap className="w-3 h-3 fill-current" />
                  <span>10-15 Min Delivery</span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white drop-shadow-sm">
                  {saleTagText || "⚡ 10-15 Min Delivery Guarantee"}
                </h3>
              </div>
            </div>

            {/* Error & Success Alerts */}
            {themeSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{themeSuccessMsg}</span>
              </div>
            )}
            {themeErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">
                {themeErrorMsg}
              </div>
            )}

            {/* Submit CTA */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-11 px-5 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={themeSaving}
                className="h-11 px-6 rounded-xl text-xs font-black bg-primary hover:bg-primary-dark text-white shadow-md gap-2"
              >
                {themeSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{themeSaving ? "SAVING THEME..." : "APPLY THEME GLOBALLY"}</span>
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
