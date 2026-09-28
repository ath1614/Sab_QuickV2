"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Zap,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  Check,
  Sparkles,
  MapPin,
  ArrowLeft,
  Moon,
  Sun,
  ShieldCheck,
  Heart,
  Eye,
} from "lucide-react";

export default function NeumorphicDemoPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ledColor, setLedColor] = useState<"yellow" | "green" | "cyan">("green");
  const [userSwitchOn, setUserSwitchOn] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("dairy");
  const [cart, setCart] = useState<{ [id: string]: number }>({ "1": 1 });
  const [activeSubcategory, setActiveSubcategory] = useState("All");

  const isDark = theme === "dark";

  // Palette tokens
  const bgCanvas = isDark ? "#1a1d24" : "#dcdfe5";
  const bgCard = isDark ? "#1c2027" : "#dcdfe5";
  const textPrimary = isDark ? "#f1f5f9" : "#1e293b";
  const textSecondary = isDark ? "#94a3b8" : "#64748b";

  // Neumorphic shadow tokens
  const extrudeSm = isDark
    ? "-3px -3px 6px #242933, 3px 3px 6px #101217"
    : "-3px -3px 7px #ffffff, 3px 3px 7px #b4b8c2";

  const extrudeMd = isDark
    ? "-5px -5px 10px #242933, 5px 5px 10px #101217"
    : "-5px -5px 11px #ffffff, 5px 5px 11px #b4b8c2";

  const extrudeLg = isDark
    ? "-8px -8px 18px #242933, 8px 8px 18px #101217"
    : "-8px -8px 18px #ffffff, 8px 8px 18px #b4b8c2";

  const recessSm = isDark
    ? "inset -3px -3px 6px #242933, inset 3px 3px 6px #101217"
    : "inset -3px -3px 6px #ffffff, inset 3px 3px 6px #b4b8c2";

  const recessMd = isDark
    ? "inset -6px -6px 12px #242933, inset 6px 6px 12px #101217"
    : "inset -6px -6px 12px #ffffff, inset 6px 6px 12px #b4b8c2";

  // LED Glow definitions
  const getLedGlow = (active: boolean) => {
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
    // SabQuick Kinetic Green
    return {
      backgroundColor: "#00e676",
      boxShadow: "0 0 14px 4px #00e676, 0 0 25px 6px rgba(0, 230, 118, 0.45)",
    };
  };

  const sampleProducts = [
    {
      id: "1",
      name: "Amul Taaza Homogenised Toned Milk",
      weight: "500 ml",
      price: 28,
      mrp: 30,
      image: "🥛",
      category: "dairy",
      tag: "DAILY ESSENTIAL",
    },
    {
      id: "2",
      name: "Lay's India's Magic Masala Chips",
      weight: "90 g",
      price: 40,
      mrp: 45,
      image: "🥔",
      category: "snacks",
      tag: "POPULAR",
    },
    {
      id: "3",
      name: "Fresh Alphonso Table Mangoes",
      weight: "1 kg",
      price: 320,
      mrp: 380,
      image: "🥭",
      category: "fresh",
      tag: "DIRECT FARM",
    },
    {
      id: "4",
      name: "Coca-Cola Zero Sugar Can",
      weight: "300 ml",
      price: 40,
      mrp: 40,
      image: "🥤",
      category: "drinks",
      tag: "CHILLED",
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
    const p = sampleProducts.find((x) => x.id === id);
    return acc + (p?.price || 0) * qty;
  }, 0);

  return (
    <div
      className="min-h-screen transition-colors duration-300 font-sans pb-28 select-none"
      style={{ backgroundColor: bgCanvas, color: textPrimary }}
    >
      {/* 1. TOP CONTROL BAR (Playground toolbar) */}
      <div
        className="sticky top-0 z-50 px-4 py-3 border-b flex items-center justify-between gap-4 backdrop-blur-md"
        style={{
          backgroundColor: isDark ? "rgba(26,29,36,0.92)" : "rgba(220,223,229,0.92)",
          borderColor: isDark ? "#292e3a" : "#cbd1dc",
        }}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all"
            style={{
              boxShadow: extrudeSm,
              backgroundColor: bgCanvas,
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>

          <Link
            href="/demo/home"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide text-emerald-600 dark:text-emerald-400 transition-all hover:scale-105"
            style={{
              boxShadow: extrudeSm,
              backgroundColor: bgCanvas,
            }}
          >
            <span>Full Home Demo &rarr;</span>
          </Link>
        </div>

        {/* LED Color & Theme Switches */}
        <div className="flex items-center gap-2">
          {/* LED Glow Swatches */}
          <div
            className="flex items-center gap-1.5 p-1 rounded-full px-2"
            style={{ boxShadow: recessSm }}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider px-1 opacity-60">LED:</span>
            <button
              onClick={() => setLedColor("green")}
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                ledColor === "green" ? "scale-125 ring-2 ring-emerald-500" : "opacity-60"
              }`}
              style={{ backgroundColor: "#00e676" }}
              title="SabQuick Green"
            />
            <button
              onClick={() => setLedColor("yellow")}
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                ledColor === "yellow" ? "scale-125 ring-2 ring-amber-400" : "opacity-60"
              }`}
              style={{ backgroundColor: "#ffcc00" }}
              title="Amber / Yellow"
            />
            <button
              onClick={() => setLedColor("cyan")}
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                ledColor === "cyan" ? "scale-125 ring-2 ring-cyan-400" : "opacity-60"
              }`}
              style={{ backgroundColor: "#00e5ff" }}
              title="Neon Cyan"
            />
          </div>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-full transition-all"
            style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
            title="Toggle Light/Dark Matte"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        {/* HERO INTRO */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-1"
            style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={getLedGlow(true)}
            />
            Hardware-Grade Tactile Skeuomorphism
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Soft-UI Design System for SabQuick
          </h1>
          <p className="text-sm sm:text-base max-w-2xl mx-auto opacity-75">
            Derived directly from the physical dual-shadow switch button. Surfaces emerge continuously from the canvas through directional 145° light, sunken trenches, and photoluminescent LED diodes.
          </p>
        </div>

        {/* SECTION 1: THE ORIGINAL SWITCH BUTTON (WORKING EXACT REPLICA) */}
        <div
          className="p-6 sm:p-8 rounded-3xl space-y-6"
          style={{ boxShadow: extrudeLg, backgroundColor: bgCanvas }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-300/40">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>1. Original Switch Button Replica</span>
              </h2>
              <p className="text-xs opacity-70">
                Interactive replica of the exact CSS & HTML provided, with customizable LED luminescence.
              </p>
            </div>
            <div className="text-xs font-mono font-semibold opacity-70">
              State: {userSwitchOn ? "ACTIVE (ON)" : "INACTIVE (OFF)"}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-8 py-4">
            {/* The exact switch container */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative rounded-full select-none cursor-pointer transition-all"
                style={{
                  width: "150px",
                  height: "60px",
                  backgroundColor: bgCanvas,
                  boxShadow: recessMd,
                }}
                onClick={() => setUserSwitchOn(!userSwitchOn)}
              >
                <div
                  className="absolute rounded-full flex items-center justify-start transition-all duration-300"
                  style={{
                    width: "80px",
                    height: "50px",
                    top: "5px",
                    left: userSwitchOn ? "65px" : "5px",
                    background: userSwitchOn
                      ? isDark
                        ? "linear-gradient(145deg, #2b303c, #171a20)"
                        : "linear-gradient(145deg, #cfcfcf, #a9a9a9)"
                      : isDark
                      ? "linear-gradient(145deg, #242933, #15181e)"
                      : "linear-gradient(145deg, #d9d9d9, #bfbfbf)",
                    boxShadow: extrudeMd,
                    paddingLeft: "12px",
                  }}
                >
                  {/* LED Light */}
                  <div
                    className="w-3 h-3 rounded-full transition-all duration-300"
                    style={getLedGlow(userSwitchOn)}
                  />
                </div>
              </div>
              <span className="text-xs font-semibold opacity-70">
                Click switch to toggle physical state
              </span>
            </div>

            {/* Extracted Physics Specs */}
            <div
              className="p-4 rounded-2xl space-y-2 text-xs font-mono max-w-md w-full"
              style={{ boxShadow: recessSm }}
            >
              <div className="font-bold text-sm tracking-wide text-emerald-600 dark:text-emerald-400">
                📐 Reverse-Engineered Physics
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Light Direction:</span>
                <span className="font-semibold">145° (Top-Left Specular)</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Track Trench:</span>
                <span className="font-semibold">Double Inset Shadows</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Elevated Plaque:</span>
                <span className="font-semibold">Double Outset Speculars</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Diode Emission:</span>
                <span className="font-semibold">Multi-layer Radial Bloom</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: HOW IT TRANSLATES TO THE SABQUICK NAVBAR */}
        <div
          className="p-6 sm:p-8 rounded-3xl space-y-6"
          style={{ boxShadow: extrudeLg, backgroundColor: bgCanvas }}
        >
          <div className="border-b pb-4 border-slate-300/40">
            <h2 className="text-xl font-bold">2. Neumorphic Header & Trench Search Bar</h2>
            <p className="text-xs opacity-70">
              The navbar eliminates generic border lines. Elements sit molded into the background surface.
            </p>
          </div>

          {/* Rendered Navbar Preview */}
          <div
            className="p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ boxShadow: recessSm, backgroundColor: bgCanvas }}
          >
            {/* Logo Plaque */}
            <div className="flex items-center gap-3">
              <div
                className="px-4 py-2 rounded-2xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
              >
                <img
                  src="/brand/navbar-logo.png"
                  alt="SQ"
                  className="h-7 w-auto object-contain"
                />
              </div>

              {/* Geofence Active Pill with Pulsing LED */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase cursor-pointer"
                style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={getLedGlow(true)}
                />
                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  SUPERFAST • 2.5 KM
                </span>
              </div>
            </div>

            {/* Recessed Trench Search Input */}
            <div className="relative flex-1 max-w-md w-full">
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-full w-full transition-all"
                style={{
                  boxShadow: recessMd,
                  backgroundColor: bgCanvas,
                }}
              >
                <Search
                  className={`w-4 h-4 transition-colors ${
                    searchQuery ? "text-emerald-500" : "opacity-40"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Search 'milk, chips, curd' (sunken trench)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
          </div>
        </div>

        {/* SECTION 3: NEUMORPHIC PRODUCT CARDS & TACTILE STEPPER */}
        <div
          className="p-6 sm:p-8 rounded-3xl space-y-6"
          style={{ boxShadow: extrudeLg, backgroundColor: bgCanvas }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-slate-300/40">
            <div>
              <h2 className="text-xl font-bold">3. Neumorphic Product Cards & Tactile Stepper</h2>
              <p className="text-xs opacity-70">
                Notice the recessed image bay and the physical click feel of the Add/Stepper button with live glowing LED status diode.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ boxShadow: recessSm }}>
              Cart Items: {totalCartCount}
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sampleProducts.map((p) => {
              const qty = cart[p.id] || 0;
              return (
                <div
                  key={p.id}
                  className="rounded-3xl p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
                  style={{
                    boxShadow: extrudeMd,
                    backgroundColor: bgCanvas,
                  }}
                >
                  <div className="space-y-3">
                    {/* Sunken Image Bay */}
                    <div
                      className="relative w-full h-36 rounded-2xl flex items-center justify-center text-5xl transition-all"
                      style={{
                        boxShadow: recessSm,
                        backgroundColor: bgCanvas,
                      }}
                    >
                      <span className="filter drop-shadow-md select-none">{p.image}</span>

                      {/* Tag Capsule */}
                      <span
                        className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          boxShadow: extrudeSm,
                          backgroundColor: bgCanvas,
                          color: isDark ? "#38bdf8" : "#0284c7",
                        }}
                      >
                        {p.tag}
                      </span>
                    </div>

                    {/* Meta & Title */}
                    <div>
                      <div className="text-[11px] font-bold opacity-60 tracking-wider uppercase">
                        {p.weight}
                      </div>
                      <div className="font-bold text-sm leading-tight mt-0.5 line-clamp-2">
                        {p.name}
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Tactile Add Button */}
                  <div className="mt-4 pt-3 border-t border-slate-300/30 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-black">₹{p.price}</span>
                        {p.mrp > p.price && (
                          <span className="text-xs line-through opacity-50">₹{p.mrp}</span>
                        )}
                      </div>
                    </div>

                    {/* Tactile Button / Stepper Slot */}
                    {qty === 0 ? (
                      <button
                        onClick={() => updateCart(p.id, 1)}
                        className="px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-150 active:scale-95 text-emerald-600 dark:text-emerald-400"
                        style={{
                          boxShadow: extrudeSm,
                          backgroundColor: bgCanvas,
                        }}
                      >
                        ADD
                      </button>
                    ) : (
                      <div
                        className="flex items-center gap-1.5 p-1 rounded-xl transition-all"
                        style={{
                          boxShadow: recessSm,
                          backgroundColor: bgCanvas,
                        }}
                      >
                        <button
                          onClick={() => updateCart(p.id, -1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all active:scale-90"
                          style={{
                            boxShadow: extrudeSm,
                            backgroundColor: bgCanvas,
                          }}
                        >
                          <Minus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </button>

                        <div className="flex items-center gap-1 px-1">
                          <span className="text-xs font-black min-w-[14px] text-center">
                            {qty}
                          </span>
                          {/* Mini Glowing Status LED confirming item in cart */}
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={getLedGlow(true)}
                          />
                        </div>

                        <button
                          onClick={() => updateCart(p.id, 1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all active:scale-90"
                          style={{
                            boxShadow: extrudeSm,
                            backgroundColor: bgCanvas,
                          }}
                        >
                          <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: SPLIT-SCREEN CATEGORIES (SUNKEN ACTIVE GROOVE) */}
        <div
          className="p-6 sm:p-8 rounded-3xl space-y-6"
          style={{ boxShadow: extrudeLg, backgroundColor: bgCanvas }}
        >
          <div className="border-b pb-4 border-slate-300/40">
            <h2 className="text-xl font-bold">4. Category Split Screen (Blinkit Parity)</h2>
            <p className="text-xs opacity-70">
              When a category is active, it inverts from flat into a sunken recessed slot with an active LED accent bar.
            </p>
          </div>

          <div
            className="p-4 rounded-2xl flex flex-col md:flex-row gap-6 min-h-[220px]"
            style={{ boxShadow: recessSm, backgroundColor: bgCanvas }}
          >
            {/* Left Rail */}
            <div className="w-full md:w-56 space-y-2 shrink-0">
              {[
                { id: "dairy", label: "Dairy & Breakfast", icon: "🥛" },
                { id: "snacks", label: "Snacks & Munchies", icon: "🍿" },
                { id: "fresh", label: "Fruits & Vegetables", icon: "🍎" },
                { id: "drinks", label: "Cold Drinks & Juices", icon: "🥤" },
              ].map((c) => {
                const isActive = activeCategory === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all"
                    style={{
                      boxShadow: isActive ? recessMd : extrudeSm,
                      backgroundColor: bgCanvas,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{c.icon}</span>
                      <span>{c.label}</span>
                    </div>

                    {/* Active Diode indicator */}
                    <div
                      className="w-2 h-2 rounded-full transition-all"
                      style={getLedGlow(isActive)}
                    />
                  </button>
                );
              })}
            </div>

            {/* Right Pane (Subcategories & Chips) */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                {["All", "Milk", "Curd & Yogurt", "Butter & Cheese", "Paneer"].map((sub) => {
                  const isSubActive = activeSubcategory === sub;
                  return (
                    <button
                      key={sub}
                      onClick={() => setActiveSubcategory(sub)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                      style={{
                        boxShadow: isSubActive ? recessSm : extrudeSm,
                        backgroundColor: bgCanvas,
                        color: isSubActive
                          ? isDark
                            ? "#34d399"
                            : "#059669"
                          : textPrimary,
                      }}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>

              {/* Informative Hardware Callout */}
              <div
                className="p-4 rounded-2xl text-xs space-y-1.5 opacity-80"
                style={{ boxShadow: extrudeSm, backgroundColor: bgCanvas }}
              >
                <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" /> Physical State Mechanics
                </div>
                <p>
                  In this paradigm, interactive selection never feels like a flat 2D color change. Active categories physically sink into the canvas, while inactive items remain elevated or flush.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: ARCHITECTURAL COMPARISON & RECOMMENDATION */}
        <div
          className="p-6 sm:p-8 rounded-3xl space-y-4"
          style={{ boxShadow: extrudeLg, backgroundColor: bgCanvas }}
        >
          <h2 className="text-xl font-bold">5. Engineering & Usability Assessment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div
              className="p-4 rounded-2xl space-y-2"
              style={{ boxShadow: recessSm }}
            >
              <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Why It WOWs Users
              </div>
              <ul className="space-y-1.5 opacity-80 list-disc list-inside">
                <li>Looks distinctly premium and custom-built, setting SabQuick apart from generic flat templates.</li>
                <li>Satisfying haptic visual cues when clicking buttons and toggles.</li>
                <li>The physical glowing LED diodes give unmistakable instant feedback.</li>
              </ul>
            </div>

            <div
              className="p-4 rounded-2xl space-y-2"
              style={{ boxShadow: recessSm }}
            >
              <div className="font-bold text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Production Best Practice
              </div>
              <ul className="space-y-1.5 opacity-80 list-disc list-inside">
                <li>Maintain high text contrast (`#1E293B` or `#F1F5F9`) so readability remains crisp.</li>
                <li>Use Neumorphism as an optional &ldquo;Tactile Hardware Theme&rdquo; selectable from the owner&apos;s theme panel or settings!</li>
                <li>Keeps the core store accessible while providing a stunning retro-modern hardware skin.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 6. FLOATING TACTILE CART STRIP */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <div
            className="p-3 rounded-3xl flex items-center justify-between gap-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
            style={{
              boxShadow: extrudeLg,
              backgroundColor: bgCanvas,
            }}
          >
            <div className="flex items-center gap-3 pl-2">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ boxShadow: recessSm, backgroundColor: bgCanvas }}
              >
                <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-black tracking-wide">
                  {totalCartCount} {totalCartCount === 1 ? "ITEM" : "ITEMS"} &bull; ₹{totalCartPrice}
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={getLedGlow(true)} />
                  DISPATCH READY
                </div>
              </div>
            </div>

            {/* Tactile Checkout Trigger */}
            <button
              onClick={() => alert(`Neumorphic Checkout Triggered! Total: ₹${totalCartPrice}`)}
              className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
              style={{
                boxShadow: extrudeSm,
                backgroundColor: bgCanvas,
                color: isDark ? "#34d399" : "#059669",
              }}
            >
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
