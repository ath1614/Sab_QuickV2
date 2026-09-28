"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Zap,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Clock,
  MapPin,
  ChevronDown,
  Sparkles,
  Heart,
  Share2,
  Home as HomeIcon,
  LayoutGrid,
  User,
  ShieldCheck,
  Moon,
  Sun,
  Flame,
  ArrowLeft,
  Check,
  SlidersHorizontal,
} from "lucide-react";

export default function NeumorphicHomePageDemo() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [ledColor, setLedColor] = React.useState<"green" | "yellow" | "cyan">("green");
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [cart, setCart] = React.useState<Record<string, number>>({
    "dairy-1": 1,
    "snack-1": 2,
  });
  const [activeTab, setActiveTab] = React.useState<"home" | "categories" | "cart" | "orders" | "account">("home");

  const isDark = theme === "dark";

  // Palette tokens
  const bgCanvas = isDark ? "#1a1d24" : "#dcdfe5";
  const textPrimary = isDark ? "#f8fafc" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#475569";

  // Mathematical shadow vectors
  const extrudeSm = isDark
    ? "-3px -3px 6px #242933, 3px 3px 6px #101217"
    : "-3px -3px 7px #ffffff, 3px 3px 7px #b4b8c2";

  const extrudeMd = isDark
    ? "-5px -5px 11px #242933, 5px 5px 11px #101217"
    : "-5px -5px 11px #ffffff, 5px 5px 11px #b4b8c2";

  const extrudeLg = isDark
    ? "-8px -8px 20px #242933, 8px 8px 20px #101217"
    : "-8px -8px 20px #ffffff, 8px 8px 20px #b4b8c2";

  const recessSm = isDark
    ? "inset -3px -3px 6px #242933, inset 3px 3px 6px #101217"
    : "inset -3px -3px 6px #ffffff, inset 3px 3px 6px #b4b8c2";

  const recessMd = isDark
    ? "inset -6px -6px 12px #242933, inset 6px 6px 12px #101217"
    : "inset -6px -6px 12px #ffffff, inset 6px 6px 12px #b4b8c2";

  const getLedStyle = (active: boolean) => {
    if (!active) {
      return {
        backgroundColor: isDark ? "#333945" : "#8a8f9c",
        boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.5), 0 0 3px rgba(0,0,0,0.2)",
      };
    }
    if (ledColor === "yellow") {
      return {
        backgroundColor: "#ffcc00",
        boxShadow: "0 0 14px 4px #ffcc00, 0 0 25px 6px rgba(255, 204, 0, 0.45)",
      };
    }
    if (ledColor === "cyan") {
      return {
        backgroundColor: "#00e5ff",
        boxShadow: "0 0 14px 4px #00e5ff, 0 0 25px 6px rgba(0, 229, 255, 0.45)",
      };
    }
    return {
      backgroundColor: "#00e676",
      boxShadow: "0 0 14px 4px #00e676, 0 0 25px 6px rgba(0, 230, 118, 0.45)",
    };
  };

  const categories = [
    { id: "all", name: "All Aisles", icon: "⚡" },
    { id: "dairy", name: "Dairy & Bread", icon: "🥛" },
    { id: "snacks", name: "Snacks & Munchies", icon: "🍿" },
    { id: "drinks", name: "Cold Drinks", icon: "🥤" },
    { id: "fresh", name: "Fresh Fruits", icon: "🍎" },
    { id: "instant", name: "Instant Noodles", icon: "🍜" },
    { id: "atta", name: "Atta, Dal & Rice", icon: "🌾" },
  ];

  const products = [
    // Dairy Rail
    {
      id: "dairy-1",
      name: "Amul Taaza Homogenised Toned Milk",
      weight: "500 ml",
      price: 28,
      mrp: 30,
      image: "🥛",
      category: "dairy",
      tag: "DAILY ESSENTIAL",
      rating: "4.9",
    },
    {
      id: "dairy-2",
      name: "Amul Salted Butter Block",
      weight: "100 g",
      price: 58,
      mrp: 60,
      image: "🧈",
      category: "dairy",
      tag: "FRESH BATCH",
      rating: "4.8",
    },
    {
      id: "dairy-3",
      name: "Modern Brown Bread (100% Whole Wheat)",
      weight: "400 g",
      price: 45,
      mrp: 50,
      image: "🍞",
      category: "dairy",
      tag: "BAKERY",
      rating: "4.7",
    },
    {
      id: "dairy-4",
      name: "Epigamia Greek Yogurt (Wild Blueberry)",
      weight: "90 g",
      price: 60,
      mrp: 65,
      image: "🫐",
      category: "dairy",
      tag: "PROBIOTIC",
      rating: "4.9",
    },

    // Snacks Rail
    {
      id: "snack-1",
      name: "Lay's India's Magic Masala Chips",
      weight: "90 g",
      price: 40,
      mrp: 45,
      image: "🥔",
      category: "snacks",
      tag: "POPULAR",
      rating: "4.9",
    },
    {
      id: "snack-2",
      name: "Doritos Sizzlin' Hot Nacho Crisps",
      weight: "82 g",
      price: 50,
      mrp: 55,
      image: "🧀",
      category: "snacks",
      tag: "SPICY BITE",
      rating: "4.8",
    },
    {
      id: "snack-3",
      name: "Cadbury Dairy Milk Silk Chocolate",
      weight: "60 g",
      price: 75,
      mrp: 80,
      image: "🍫",
      category: "snacks",
      tag: "SWEET CRUSH",
      rating: "5.0",
    },
    {
      id: "snack-4",
      name: "Haldiram's Bhujia Sev Classic",
      weight: "200 g",
      price: 55,
      mrp: 60,
      image: "🥨",
      category: "snacks",
      tag: "NAMKEEN",
      rating: "4.8",
    },

    // Cold Drinks Rail
    {
      id: "drink-1",
      name: "Coca-Cola Zero Sugar Chilled Can",
      weight: "300 ml",
      price: 40,
      mrp: 40,
      image: "🥤",
      category: "drinks",
      tag: "ZERO SUGAR",
      rating: "4.9",
    },
    {
      id: "drink-2",
      name: "Red Bull Energy Drink (Cold Can)",
      weight: "250 ml",
      price: 125,
      mrp: 130,
      image: "⚡",
      category: "drinks",
      tag: "VITALIZES",
      rating: "4.9",
    },
    {
      id: "drink-3",
      name: "Raw Pressery Cold Pressed Coconut Water",
      weight: "200 ml",
      price: 65,
      mrp: 70,
      image: "🥥",
      category: "drinks",
      tag: "100% NATURAL",
      rating: "4.7",
    },
    {
      id: "drink-4",
      name: "Frooti Fresh Mango Drink Tetra",
      weight: "160 ml",
      price: 15,
      mrp: 15,
      image: "🥭",
      category: "drinks",
      tag: "FAVORITE",
      rating: "4.8",
    },
  ];

  const updateCart = (id: string, delta: number) => {
    setCart((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalCartPrice = Object.entries(cart).reduce((acc, [id, qty]) => {
    const p = products.find((x) => x.id === id);
    return acc + (p?.price || 0) * qty;
  }, 0);

  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchesCat = activeCategory === "all" || p.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div
      className="min-h-screen transition-colors duration-300 font-sans pb-36 select-none"
      style={{ backgroundColor: bgCanvas, color: textPrimary }}
    >
      {/* ========================================================
          1. TOP APP BAR (Hardware Status Bar & Theme Controls)
         ======================================================== */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md transition-all"
        style={{
          backgroundColor: isDark ? "rgba(26,29,36,0.92)" : "rgba(220,223,229,0.92)",
          boxShadow: isDark
            ? "0 4px 14px rgba(0,0,0,0.4)"
            : "0 4px 14px rgba(180,184,194,0.3)",
        }}
      >
        {/* Micro SLA Indicator Banner */}
        <div
          className="px-4 py-1.5 flex items-center justify-between text-[11px] font-bold tracking-wider uppercase border-b"
          style={{
            borderColor: isDark ? "#292e3a" : "#cbd1dc",
            backgroundColor: bgCanvas,
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={getLedStyle(true)} />
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
              HYPER-LOCAL SUPERFAST SLA &bull; 2.5 KM DISPATCH
            </span>
          </div>

          {/* Theme & LED Diode Switcher Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-full px-2" style={{ boxShadow: recessSm }}>
              <span className="text-[9px] uppercase font-bold opacity-60">LED:</span>
              <button
                onClick={() => setLedColor("green")}
                className={`w-3 h-3 rounded-full transition-transform ${
                  ledColor === "green" ? "scale-125 ring-2 ring-emerald-400" : "opacity-50"
                }`}
                style={{ backgroundColor: "#00e676" }}
                title="Kinetic Green"
              />
              <button
                onClick={() => setLedColor("yellow")}
                className={`w-3 h-3 rounded-full transition-transform ${
                  ledColor === "yellow" ? "scale-125 ring-2 ring-amber-400" : "opacity-50"
                }`}
                style={{ backgroundColor: "#ffcc00" }}
                title="Industrial Amber"
              />
              <button
                onClick={() => setLedColor("cyan")}
                className={`w-3 h-3 rounded-full transition-transform ${
                  ledColor === "cyan" ? "scale-125 ring-2 ring-cyan-400" : "opacity-50"
                }`}
                style={{ backgroundColor: "#00e5ff" }}
                title="Cyan Light"
              />
            </div>

            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-1.5 rounded-full transition-transform active:scale-90"
              style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
              title="Toggle Light/Dark Theme"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Brand Logo & Address Pill */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shrink-0"
              style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
            >
              <img
                src="/brand/navbar-logo.png"
                alt="SabQuick"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </Link>

            {/* Address Pill (Tactile elevated pod with glowing LED) */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-semibold cursor-pointer max-w-[220px] sm:max-w-xs truncate transition-all active:scale-95"
              style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
              onClick={() => alert("Geofence Address Selector Modal")}
            >
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-[11px] leading-tight">HOME</span>
                  <span className="text-[10px] opacity-60">• 10-15 Min</span>
                </div>
                <div className="text-[10px] opacity-75 truncate leading-tight">
                  Flat 402, Royal Residency, Gandhi Chowk
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
            </div>

            {/* Mobile Cart Trigger */}
            <div className="md:hidden">
              <button
                onClick={() => setActiveTab("cart")}
                className="p-2 rounded-2xl relative flex items-center justify-center transition-all active:scale-90"
                style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
              >
                <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                {totalCartCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center animate-in zoom-in-50"
                    style={{ backgroundColor: "#00e676" }}
                  >
                    {totalCartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Center: Recessed Sunken Trench Search Bar */}
          <div className="relative w-full md:max-w-xl">
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-full w-full transition-all"
              style={{
                boxShadow: recessMd,
                backgroundColor: bgCanvas,
              }}
            >
              <Search
                className={`w-4 h-4 shrink-0 transition-colors ${
                  searchQuery ? "text-emerald-500" : "opacity-40"
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 'milk, chips, eggs, cold drinks'..."
                className="bg-transparent border-none outline-none w-full text-xs sm:text-sm font-medium placeholder:opacity-50"
                style={{ color: textPrimary }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-bold opacity-60 hover:opacity-100 px-1"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Desktop Right Quick Actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link
              href="/orders"
              className="px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
              style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
            >
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>My Orders</span>
            </Link>

            <button
              onClick={() => alert(`Opening Cart (${totalCartCount} items)`)}
              className="px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all active:scale-95"
              style={{
                boxShadow: extrudeSm,
                backgroundColor: bgCanvas,
                color: isDark ? "#34d399" : "#059669",
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{totalCartCount > 0 ? `${totalCartCount} ITEMS • ₹${totalCartPrice}` : "CART"}</span>
              {totalCartCount > 0 && (
                <div className="w-2 h-2 rounded-full" style={getLedStyle(true)} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================
          2. MAIN CONTENT BODY
         ======================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* HERO PROMOTIONAL BANNER (Extruded Tactile Plaque) */}
        <section
          className="rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all"
          style={{
            boxShadow: extrudeLg,
            backgroundColor: bgCanvas,
          }}
        >
          <div className="space-y-3 text-center md:text-left">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase"
              style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
            >
              <div className="w-2 h-2 rounded-full" style={getLedStyle(true)} />
              ⚡ SUPERFAST DISPATCH DIRECTORY
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              A Complete Provision Store <br className="hidden sm:inline" />
              <span className="text-emerald-600 dark:text-emerald-400">Right to Your Door</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium opacity-75 max-w-lg">
              Fresh milk, warm bakery items, crisps, and cold drinks handpicked from our dark store within 2.5 km.
            </p>
          </div>

          {/* Hero Quick Badge */}
          <div
            className="p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 shrink-0 max-w-xs w-full"
            style={{ boxShadow: recessSm, backgroundColor: bgCanvas }}
          >
            <div className="text-3xl">🚀</div>
            <div className="text-xs font-black tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
              ZERO MINIMUM ORDER
            </div>
            <div className="text-[11px] opacity-70">
              Instant checkout with UPI, Card & Cash on Delivery.
            </div>
          </div>
        </section>

        {/* CATEGORIES RAIL (Tactile 3D Pods) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider opacity-80 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" /> Browse By Aisle
            </h2>
            <Link
              href="/categories"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              See All Aisles &rarr;
            </Link>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((c) => {
              const isActive = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl min-w-[92px] sm:min-w-[110px] gap-2 transition-all active:scale-95 shrink-0"
                  style={{
                    boxShadow: isActive ? recessMd : extrudeSm,
                    backgroundColor: bgCanvas,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl transition-all"
                    style={{
                      boxShadow: isActive ? extrudeSm : recessSm,
                      backgroundColor: bgCanvas,
                    }}
                  >
                    <span>{c.icon}</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold tracking-tight text-center leading-tight ${
                      isActive ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "opacity-80"
                    }`}
                  >
                    {c.name}
                  </span>

                  {/* Diode Indicator */}
                  <div className="w-1.5 h-1.5 rounded-full transition-all" style={getLedStyle(isActive)} />
                </button>
              );
            })}
          </div>
        </section>

        {/* ========================================================
            3. PRODUCT CARDS SECTION (Molded Squircle Chassis)
           ======================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1 border-b pb-2 border-slate-300/30">
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {activeCategory === "all" ? "Dark Store Fresh Catalog" : categories.find((c) => c.id === activeCategory)?.name}
              </h2>
              <p className="text-xs opacity-65">
                Showing {filteredProducts.length} items ready for immediate dispatch
              </p>
            </div>
            <div
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ boxShadow: recessSm }}
            >
              {totalCartCount} in Bag
            </div>
          </div>

          {/* The Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((p) => {
              const qty = cart[p.id] || 0;
              return (
                <div
                  key={p.id}
                  className="rounded-3xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group"
                  style={{
                    boxShadow: extrudeMd,
                    backgroundColor: bgCanvas,
                  }}
                >
                  <div className="space-y-2.5">
                    {/* Sunken Packaging Display Bay */}
                    <div
                      className="relative w-full h-32 sm:h-36 rounded-2xl flex items-center justify-center text-5xl transition-all"
                      style={{
                        boxShadow: recessSm,
                        backgroundColor: bgCanvas,
                      }}
                    >
                      <span className="filter drop-shadow-md select-none transition-transform group-hover:scale-110">
                        {p.image}
                      </span>

                      {/* Top Pill: Tag */}
                      <span
                        className="absolute top-2 left-2 text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          boxShadow: extrudeSm,
                          backgroundColor: bgCanvas,
                          color: isDark ? "#38bdf8" : "#0284c7",
                        }}
                      >
                        {p.tag}
                      </span>

                      {/* Rating pill */}
                      <span
                        className="absolute bottom-2 right-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                        style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
                      >
                        ★ {p.rating}
                      </span>
                    </div>

                    {/* Weight & Title */}
                    <div>
                      <div className="text-[10px] font-extrabold opacity-60 tracking-wider uppercase">
                        {p.weight}
                      </div>
                      <div className="font-bold text-xs sm:text-sm leading-snug line-clamp-2 mt-0.5" style={{ color: textPrimary }}>
                        {p.name}
                      </div>
                    </div>
                  </div>

                  {/* Price & Tactile Button */}
                  <div className="mt-3 pt-2.5 border-t border-slate-300/30 flex items-center justify-between gap-1.5">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm sm:text-base font-black">₹{p.price}</span>
                        {p.mrp > p.price && (
                          <span className="text-[10px] sm:text-xs line-through opacity-50">₹{p.mrp}</span>
                        )}
                      </div>
                      {p.mrp > p.price && (
                        <div className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          SAVE ₹{p.mrp - p.price}
                        </div>
                      )}
                    </div>

                    {/* Physical Stepper or Add Button */}
                    {qty === 0 ? (
                      <button
                        onClick={() => updateCart(p.id, 1)}
                        className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-150 active:scale-90 text-emerald-600 dark:text-emerald-400"
                        style={{
                          boxShadow: extrudeSm,
                          backgroundColor: bgCanvas,
                        }}
                      >
                        ADD
                      </button>
                    ) : (
                      <div
                        className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl transition-all"
                        style={{
                          boxShadow: recessSm,
                          backgroundColor: bgCanvas,
                        }}
                      >
                        <button
                          onClick={() => updateCart(p.id, -1)}
                          className="w-5 sm:w-6 h-5 sm:h-6 rounded-lg flex items-center justify-center transition-all active:scale-90"
                          style={{
                            boxShadow: extrudeSm,
                            backgroundColor: bgCanvas,
                          }}
                        >
                          <Minus className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-emerald-600 dark:text-emerald-400" />
                        </button>

                        <div className="flex items-center gap-1 px-1">
                          <span className="text-xs font-black min-w-[12px] text-center">
                            {qty}
                          </span>
                          <div className="w-1.5 h-1.5 rounded-full" style={getLedStyle(true)} />
                        </div>

                        <button
                          onClick={() => updateCart(p.id, 1)}
                          className="w-5 sm:w-6 h-5 sm:h-6 rounded-lg flex items-center justify-center transition-all active:scale-90"
                          style={{
                            boxShadow: extrudeSm,
                            backgroundColor: bgCanvas,
                          }}
                        >
                          <Plus className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-emerald-600 dark:text-emerald-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ========================================================
          4. FLOATING TACTILE CART STRIP (When items in cart)
         ======================================================== */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <div
            className="p-3 rounded-3xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3"
            style={{
              boxShadow: extrudeLg,
              backgroundColor: bgCanvas,
            }}
          >
            <div className="flex items-center gap-2.5 pl-2">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400"
                style={{ boxShadow: recessSm, backgroundColor: bgCanvas }}
              >
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black tracking-wide leading-tight">
                  {totalCartCount} {totalCartCount === 1 ? "ITEM" : "ITEMS"} &bull; ₹{totalCartPrice}
                </div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={getLedStyle(true)} />
                  GEOFENCE DISPATCH ACTIVE
                </div>
              </div>
            </div>

            {/* View Cart Button */}
            <button
              onClick={() => alert(`View Cart Clicked (${totalCartCount} items)`)}
              className="px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 text-emerald-600 dark:text-emerald-400"
              style={{
                boxShadow: extrudeSm,
                backgroundColor: bgCanvas,
              }}
            >
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          5. NEUMORPHIC BOTTOM TAB NAVIGATION (Mobile Bottom Nav)
         ======================================================== */}
      <nav
        aria-label="Tactile Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-50 backdrop-blur-xl transition-all border-t"
        style={{
          backgroundColor: isDark ? "rgba(26,29,36,0.95)" : "rgba(220,223,229,0.95)",
          borderColor: isDark ? "#292e3a" : "#cbd1dc",
          boxShadow: isDark
            ? "0 -6px 20px rgba(0,0,0,0.5)"
            : "0 -6px 20px rgba(180,184,194,0.4)",
        }}
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto items-center px-2">
          {/* Tab 1: Home */}
          <button
            onClick={() => setActiveTab("home")}
            className="flex flex-col items-center justify-center h-full gap-1 transition-all"
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all"
              style={{
                boxShadow: activeTab === "home" ? recessSm : "none",
                backgroundColor: activeTab === "home" ? bgCanvas : "transparent",
              }}
            >
              <HomeIcon
                className={`w-5 h-5 transition-colors ${
                  activeTab === "home" ? "text-emerald-600 dark:text-emerald-400" : "opacity-50"
                }`}
              />
            </div>
            <span
              className={`text-[9px] tracking-tight ${
                activeTab === "home" ? "font-black text-emerald-600 dark:text-emerald-400" : "opacity-60"
              }`}
            >
              Home
            </span>
          </button>

          {/* Tab 2: Categories */}
          <button
            onClick={() => setActiveTab("categories")}
            className="flex flex-col items-center justify-center h-full gap-1 transition-all"
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all"
              style={{
                boxShadow: activeTab === "categories" ? recessSm : "none",
                backgroundColor: activeTab === "categories" ? bgCanvas : "transparent",
              }}
            >
              <LayoutGrid
                className={`w-5 h-5 transition-colors ${
                  activeTab === "categories" ? "text-emerald-600 dark:text-emerald-400" : "opacity-50"
                }`}
              />
            </div>
            <span
              className={`text-[9px] tracking-tight ${
                activeTab === "categories" ? "font-black text-emerald-600 dark:text-emerald-400" : "opacity-60"
              }`}
            >
              Categories
            </span>
          </button>

          {/* Tab 3: Center Hero Cart Button */}
          <button
            onClick={() => setActiveTab("cart")}
            className="flex flex-col items-center justify-center h-full gap-1 relative -top-2 transition-transform active:scale-95"
          >
            <div
              className="relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all"
              style={{
                boxShadow: extrudeMd,
                backgroundColor: bgCanvas,
              }}
            >
              <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {totalCartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black text-black flex items-center justify-center"
                  style={{ backgroundColor: "#00e676" }}
                >
                  {totalCartCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {totalCartCount > 0 ? `₹${totalCartPrice}` : "Cart"}
            </span>
          </button>

          {/* Tab 4: Orders */}
          <button
            onClick={() => setActiveTab("orders")}
            className="flex flex-col items-center justify-center h-full gap-1 transition-all"
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all"
              style={{
                boxShadow: activeTab === "orders" ? recessSm : "none",
                backgroundColor: activeTab === "orders" ? bgCanvas : "transparent",
              }}
            >
              <Clock
                className={`w-5 h-5 transition-colors ${
                  activeTab === "orders" ? "text-emerald-600 dark:text-emerald-400" : "opacity-50"
                }`}
              />
            </div>
            <span
              className={`text-[9px] tracking-tight ${
                activeTab === "orders" ? "font-black text-emerald-600 dark:text-emerald-400" : "opacity-60"
              }`}
            >
              Orders
            </span>
          </button>

          {/* Tab 5: Account */}
          <button
            onClick={() => setActiveTab("account")}
            className="flex flex-col items-center justify-center h-full gap-1 transition-all"
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all"
              style={{
                boxShadow: activeTab === "account" ? recessSm : "none",
                backgroundColor: activeTab === "account" ? bgCanvas : "transparent",
              }}
            >
              <User
                className={`w-5 h-5 transition-colors ${
                  activeTab === "account" ? "text-emerald-600 dark:text-emerald-400" : "opacity-50"
                }`}
              />
            </div>
            <span
              className={`text-[9px] tracking-tight ${
                activeTab === "account" ? "font-black text-emerald-600 dark:text-emerald-400" : "opacity-60"
              }`}
            >
              Account
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
