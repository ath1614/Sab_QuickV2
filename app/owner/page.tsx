"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  TrendingUp,
  DollarSign,
  PackageCheck,
  Clock,
  AlertTriangle,
  Palette,
  Layers,
  Search,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Save,
  Sparkles,
  Sliders,
  Check,
  AlertCircle,
  Eye,
  Store,
  LayoutDashboard,
  FolderTree,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";

interface ProductItem {
  id: string;
  title: string;
  imageUrl: string;
  packSize: string;
  price: number;
  stockCount: number;
  isAvailable: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AnalyticsData {
  todayGMV: number;
  completedOrders: number;
  activeOrders: number;
  avgPackingTimeMinutes: number;
  lowStockCount: number;
  totalProductsCount: number;
}

const THEME_PRESETS = [
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
    saleTag: "☀️ Summer Coolers: Chilled In 10 Mins",
    bannerUrl: "/banners/summer-coolers.webp",
  },
];

export default function OwnerControlPage() {
  const { data: session, status: authStatus } = useSession();
  const [analytics, setAnalytics] = React.useState<AnalyticsData | null>(null);
  const [allProducts, setAllProducts] = React.useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Inventory Table filters
  const [inventorySearch, setInventorySearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [toggleStockId, setToggleStockId] = React.useState<string | null>(null);

  // Theme Form State
  const [themeName, setThemeName] = React.useState("Forest Speed (Standard)");
  const [primaryColor, setPrimaryColor] = React.useState("#0B6E4F");
  const [accentColor, setAccentColor] = React.useState("#00C853");
  const [saleTagText, setSaleTagText] = React.useState("⚡ 10-15 Min Delivery Guarantee");
  const [bannerImageUrl, setBannerImageUrl] = React.useState("/banners/forest-speed-hero.webp");
  const [themeSaving, setThemeSaving] = React.useState(false);
  const [themeSuccessMsg, setThemeSuccessMsg] = React.useState("");

  // Fetch initial analytics & catalog
  const fetchOperationsData = React.useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/ops/analytics");
      if (!res.ok) throw new Error("Failed to fetch ops analytics");
      const data = await res.json();
      setAnalytics(data.metrics || null);
      if (data.allProducts) {
        setAllProducts(data.allProducts);
      }
    } catch (e) {
      console.error("Owner analytics fetch error:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch current active theme
  const fetchCurrentTheme = React.useCallback(async () => {
    try {
      const res = await fetch("/api/theme");
      if (!res.ok) return;
      const data = await res.json();
      if (data.themeName) setThemeName(data.themeName);
      if (data.primaryColor) setPrimaryColor(data.primaryColor);
      if (data.accentColor) setAccentColor(data.accentColor);
      if (data.saleTagText) setSaleTagText(data.saleTagText);
      if (data.bannerImageUrl) setBannerImageUrl(data.bannerImageUrl);
    } catch (e) {
      console.error("Theme fetch error:", e);
    }
  }, []);

  React.useEffect(() => {
    if (authStatus === "authenticated") {
      fetchOperationsData();
      fetchCurrentTheme();
      const interval = setInterval(() => {
        fetchOperationsData(true);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [authStatus, fetchOperationsData, fetchCurrentTheme]);

  // Instant Stock Toggle Handler
  const handleToggleStock = async (productId: string, currentAvailable: boolean) => {
    setToggleStockId(productId);
    try {
      const res = await fetch("/api/ops/inventory/toggle-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          isAvailable: !currentAvailable,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Stock toggle failed: ${err.error || "Unknown error"}`);
        return;
      }

      const data = await res.json();
      setAllProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isAvailable: data.isAvailable } : p))
      );
      // Refresh metrics
      fetchOperationsData(true);
    } catch (err) {
      console.error("Toggle stock error:", err);
    } finally {
      setToggleStockId(null);
    }
  };

  // Save Seasonal Theme Handler
  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setThemeSaving(true);
    setThemeSuccessMsg("");
    try {
      const res = await fetch("/api/ops/theme/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeName,
          primaryColor,
          accentColor,
          saleTagText,
          bannerImageUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to save theme: ${err.error || "Unknown error"}`);
        return;
      }

      // Immediately propagate to current document variables
      if (typeof window !== "undefined") {
        document.documentElement.style.setProperty("--brand-primary", primaryColor);
        document.documentElement.style.setProperty("--brand-accent", accentColor);
      }

      setThemeSuccessMsg("Theme successfully updated & applied globally!");
      setTimeout(() => setThemeSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Save theme error:", err);
      alert("Network error updating seasonal theme.");
    } finally {
      setThemeSaving(false);
    }
  };

  // Apply Theme Preset
  const handleApplyPreset = (preset: typeof THEME_PRESETS[0]) => {
    setThemeName(preset.name);
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
    setSaleTagText(preset.saleTag);
    setBannerImageUrl(preset.bannerUrl);
  };

  // RBAC Authentication Guard
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Owner Control Center...</p>
        </div>
      </div>
    );
  }

  const role = session?.user?.role;
  if (role !== "OWNER") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-border-subtle">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-surface-dark mb-2">Owner Restricted Area</h2>
          <p className="text-sm text-slate-600 mb-6">
            Only designated <strong>Store Owners</strong> have access to financial metrics, catalog overrides, and store theme customization.
          </p>
          <Link href="/">
            <Button variant="default" className="w-full">
              Return to Store
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filtered Products for Replenishment Table
  const uniqueCategories = Array.from(
    new Set(allProducts.map((p) => p.category.name).filter(Boolean))
  );

  const filteredInventory = allProducts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      p.category.name.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesCategory =
      categoryFilter === "ALL" || p.category.name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-surface-dark flex flex-col antialiased">
      {/* Top Bar */}
      <header className="bg-white border-b border-border-subtle pt-[env(safe-area-inset-top,0px)] shadow-sm shrink-0 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start space-x-3">
            <div className="flex items-center space-x-3">
              <Link href="/" title="Back to Storefront">
                <Logo variant="icon" size={38} className="rounded-xl shadow-xs shrink-0 hover:opacity-90" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-surface-dark leading-tight">
                    SabQuick <span className="text-primary">Owner Hub</span>
                  </h1>
                  <Badge variant="default" className="text-[9px] sm:text-[10px] uppercase font-black px-1.5 py-0 bg-primary">
                    PRO
                  </Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Financial metrics, catalog &amp; theme branding
                </p>
              </div>
            </div>

            {/* Mobile Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchOperationsData();
                fetchCurrentTheme();
              }}
              disabled={isRefreshing}
              className="sm:hidden h-8 w-8 p-0 rounded-xl shrink-0"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            </Button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <Link href="/owner/catalog" className="shrink-0">
              <Button variant="accent" size="sm" className="h-8 sm:h-9 rounded-xl text-xs font-black gap-1.5 shadow-sm px-2.5 sm:px-3">
                <FolderTree className="w-3.5 h-3.5" />
                <span>Catalog &amp; Pricing</span>
              </Button>
            </Link>

            <Link href="/manager" className="shrink-0">
              <Button variant="outline" size="sm" className="h-8 sm:h-9 rounded-xl text-xs font-bold gap-1.5 px-2.5 sm:px-3 text-slate-700">
                <LayoutDashboard className="w-3.5 h-3.5 text-slate-600" />
                <span>Manager</span>
              </Button>
            </Link>

            <Link href="/packer" className="shrink-0">
              <Button variant="outline" size="sm" className="h-8 sm:h-9 rounded-xl text-xs font-bold gap-1.5 px-2.5 sm:px-3 text-slate-700">
                <PackageCheck className="w-3.5 h-3.5 text-primary" />
                <span>Packer</span>
              </Button>
            </Link>

            <Link href="/" className="shrink-0">
              <Button variant="outline" size="sm" className="h-8 sm:h-9 rounded-xl text-xs font-bold gap-1.5 px-2.5 sm:px-3 text-slate-700">
                <Store className="w-3.5 h-3.5 text-slate-600" />
                <span>Store</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchOperationsData();
                fetchCurrentTheme();
              }}
              disabled={isRefreshing}
              className="hidden sm:inline-flex h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* SECTION 1: FINANCIAL & SLA KPI METRIC CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* GMV Card */}
          <div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Today&apos;s GMV
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-surface-dark tracking-tight">
                ₹{analytics?.todayGMV ? analytics.todayGMV.toLocaleString("en-IN") : "0"}
              </div>
              <p className="text-xs font-semibold text-emerald-600 mt-1">
                Gross Merchandise Value
              </p>
            </div>
          </div>

          {/* Delivered Orders */}
          <div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Delivered Orders
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <PackageCheck className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-surface-dark tracking-tight">
                {analytics?.completedOrders || 0}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Completed & Settled Today
              </p>
            </div>
          </div>

          {/* Average Packing SLA */}
          <div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Avg Floor SLA
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-surface-dark tracking-tight">
                {analytics?.avgPackingTimeMinutes || 2.4} min
              </div>
              <p className="text-xs font-semibold text-emerald-600 mt-1">
                ⚡ Dark Store Packing Speed
              </p>
            </div>
          </div>

          {/* Low Stock SKUs Alert */}
          <div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Depleted / Low Stock
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                {analytics?.lowStockCount || 0} SKUs
              </div>
              <p className="text-xs font-semibold text-rose-600 mt-1">
                Requires replenishment
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: DYNAMIC SEASONAL THEME CUSTOMIZER */}
        <section className="bg-white rounded-3xl p-6 lg:p-8 border border-border-subtle shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-black text-surface-dark tracking-tight">
                  Dynamic Seasonal Theme Engine
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize brand colors, promotional banners, and flash sale banners in real-time across the app.
              </p>
            </div>

            {/* Presets Quick Picker */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Presets:
              </span>
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  {preset.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveTheme} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Theme Controls (2 columns on large screens) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Theme Campaign Name</label>
                  <Input
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value)}
                    placeholder="e.g. Diwali Dhamaka 2026"
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Sale Tag Banner Text</label>
                  <Input
                    value={saleTagText}
                    onChange={(e) => setSaleTagText(e.target.value)}
                    placeholder="e.g. ⚡ 10-15 Min Delivery Guarantee"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Color Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Primary Brand Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 text-xs font-mono rounded-xl uppercase"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      required
                    />
                  </div>
                </div>

                {/* Accent Color Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Accent Kinetic Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 text-xs font-mono rounded-xl uppercase"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Banner Hero Image URL</label>
                <Input
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                  placeholder="/banners/forest-speed-hero.webp"
                  className="h-10 text-xs rounded-xl font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={themeSaving}
                  className="h-11 px-6 rounded-xl font-black text-xs gap-2 bg-primary hover:bg-primary/90 text-white shadow-md"
                >
                  {themeSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>SAVE & APPLY THEME GLOBALLY</span>
                </Button>

                {themeSuccessMsg && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4" />
                    {themeSuccessMsg}
                  </span>
                )}
              </div>
            </div>

            {/* Live Interactive Preview Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Live UI Skin Preview
                </span>
                <Badge variant="outline" className="text-[10px] bg-white font-bold">
                  Preview
                </Badge>
              </div>

              {/* Mock Header and Tag */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div
                  className="text-xs font-bold px-2.5 py-1 rounded-full inline-block text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {saleTagText || "⚡ Fast 10-15 Min Delivery"}
                </div>
                <div className="text-sm font-black text-surface-dark">
                  SabQuick • {themeName}
                </div>
              </div>

              {/* Mock Buttons with Dynamic Inline Styles */}
              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full h-10 rounded-xl font-black text-xs text-white shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>Primary Button (e.g. Add to Cart)</span>
                </button>

                <button
                  type="button"
                  className="w-full h-10 rounded-xl font-black text-xs text-surface-dark shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  style={{ backgroundColor: accentColor }}
                >
                  <span>Accent Button (e.g. 15-Min Express)</span>
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* SECTION 3: INVENTORY REPLENISHMENT & CATALOG OVERRIDE TABLE */}
        <section className="bg-white rounded-3xl p-6 lg:p-8 border border-border-subtle shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-black text-surface-dark tracking-tight">
                  Inventory Replenishment & Stock Master
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor current dark-store SKU stock levels and toggle real-time catalog availability.
              </p>
            </div>

            {/* Search & Category Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <Input
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder="Search catalog..."
                  className="h-9 pl-8 pr-3 text-xs rounded-xl"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs h-9 rounded-xl border border-slate-300 bg-white px-3 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Categories ({allProducts.length})</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile High-Density Touch Cards (< md) */}
          <div className="block md:hidden space-y-3">
            {isLoading ? (
              <div className="py-8 text-center text-slate-500 font-medium">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                Loading inventory records...
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No matching products found in catalog.
              </div>
            ) : (
              filteredInventory.map((product) => {
                const isLowStock = product.stockCount < 15;
                const isUpdating = toggleStockId === product.id;

                return (
                  <div
                    key={product.id}
                    className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white relative shrink-0 overflow-hidden border border-slate-200 p-0.5">
                        <Image
                          src={product.imageUrl}
                          alt={product.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                            {product.category?.name || "General"}
                          </span>
                          <span className="text-xs font-black text-slate-900 font-mono">
                            ₹{product.price}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-surface-dark truncate mt-0.5" title={product.title}>
                          {product.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {product.packSize}
                          </span>
                          <span className="text-slate-300">&bull;</span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded font-bold text-[10px] ${
                              isLowStock
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {product.stockCount} units
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${product.isAvailable ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <span className={`text-xs font-bold ${product.isAvailable ? "text-emerald-700" : "text-rose-600"}`}>
                          {product.isAvailable ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>

                      <Button
                        variant={product.isAvailable ? "outline" : "default"}
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleToggleStock(product.id, product.isAvailable)}
                        className={`h-8 px-3 rounded-xl text-xs font-black transition-all ${
                          product.isAvailable
                            ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {isUpdating ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : product.isAvailable ? (
                          "Mark Out-of-Stock"
                        ) : (
                          "Mark In-Stock"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">SKU Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Pack Size</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock Count</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">1-Click Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                      Loading inventory records...
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                      No matching products found in catalog.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((product) => {
                    const isLowStock = product.stockCount < 15;
                    const isUpdating = toggleStockId === product.id;

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Thumbnail & Title */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 relative shrink-0 overflow-hidden border border-slate-200">
                              <Image
                                src={product.imageUrl}
                                alt={product.title}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 font-bold text-surface-dark max-w-[200px] truncate">
                              {product.title}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {product.category?.name || "General"}
                        </td>

                        {/* Pack Size */}
                        <td className="py-3 px-4 text-slate-500">
                          {product.packSize}
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4 font-black text-slate-900">
                          ₹{product.price}
                        </td>

                        {/* Stock Count */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              isLowStock
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {product.stockCount} units
                          </span>
                        </td>

                        {/* Availability Status */}
                        <td className="py-3 px-4">
                          {product.isAvailable ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              In Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              Out of Stock
                            </span>
                          )}
                        </td>

                        {/* Toggle Button */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant={product.isAvailable ? "outline" : "default"}
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleToggleStock(product.id, product.isAvailable)}
                            className={`h-8 px-3 rounded-lg text-xs font-black transition-all ${
                              product.isAvailable
                                ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {isUpdating ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : product.isAvailable ? (
                              "Mark Out-of-Stock"
                            ) : (
                              "Mark In-Stock"
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
