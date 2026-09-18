"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Sparkles,
  ArrowLeft,
  Check,
  Copy,
  Layers,
  MapPin,
  FileCode,
  Smartphone,
  Printer,
  ShieldCheck,
  Download,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Logo, BRAND_COLORS, LogoVariant, LogoTheme } from "@/components/brand/Logo";
import { SplashScreen } from "@/components/brand/SplashScreen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Dynamic map preview for all 3 marker pins
const DynamicBrandPinsMap = dynamic(
  () => import("@/components/brand/BrandPinsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
        Loading interactive map pins preview...
      </div>
    ),
  }
);

export default function BrandShowcasePage() {
  const [copiedColor, setCopiedColor] = React.useState<string | null>(null);
  const [replaySplash, setReplaySplash] = React.useState<boolean>(false);

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const COLOR_TOKENS = [
    {
      name: "Forest Racing Green",
      token: "--brand-primary",
      hex: "#0B6E4F",
      usage: "Primary brand mark, dark store hub pin, main CTAs",
    },
    {
      name: "Kinetic Speed Green",
      token: "--brand-accent",
      hex: "#00C853",
      usage: "Speed streaks, lightning flashes, geofence active status",
    },
    {
      name: "Carbon Black",
      token: "--surface-dark",
      hex: "#111827",
      usage: "Speed cut angled wedges, rider terminal, dark theme base",
    },
    {
      name: "Pure White",
      token: "--surface-light",
      hex: "#FFFFFF",
      usage: "High-contrast lettering, receipt backgrounds, pin borders",
    },
  ];

  const STATIC_ASSETS = [
    {
      name: "Scalable Vector Favicon",
      path: "/favicon.svg",
      dims: "Vector SVG",
      desc: "Crisp vector favicon for modern browsers",
    },
    {
      name: "Legacy Favicon",
      path: "/favicon.ico",
      dims: "48x48 px",
      desc: "Windows & legacy browser bookmark icon",
    },
    {
      name: "Apple Touch Icon",
      path: "/apple-touch-icon.png",
      dims: "180x180 px",
      desc: "iOS Home Screen & Safari Web Clip",
    },
    {
      name: "PWA Mobile App Icon",
      path: "/icon-192.png",
      dims: "192x192 px",
      desc: "Android PWA standard launcher icon",
    },
    {
      name: "PWA High-Res App Icon",
      path: "/icon-512.png",
      dims: "512x512 px",
      desc: "Android splash screen & store listing",
    },
    {
      name: "PWA Maskable Adaptive Icon",
      path: "/icon-maskable-512.png",
      dims: "512x512 px",
      desc: "Android adaptive circular / squircle safe crop",
    },
    {
      name: "OpenGraph Social Banner",
      path: "/og-image.png",
      dims: "1200x630 px",
      desc: "Rich preview card for Twitter / WhatsApp / iMessage",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-surface-dark pb-24 selection:bg-primary-accent selection:text-surface-dark">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Logo variant="compact" size={34} />
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <Badge variant="accent" className="font-bold text-[10px] tracking-wider uppercase">
              Brand Systems &amp; Assets Specification
            </Badge>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Store</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {/* Title Banner */}
        <div className="bg-gradient-to-r from-surface-dark via-[#0B6E4F] to-surface-dark text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-white/10 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider text-primary-accent border border-white/15">
              <Zap className="w-3.5 h-3.5 fill-primary-accent" />
              SABQUICK BRAND IDENTITY V2.0
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Design Systems &amp; Vector Asset Suite
            </h1>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
              A comprehensive audit and implementation of all brand marks, responsive SVGs, PWA icons, 
              POS thermal printer receipts, and Leaflet OpenStreetMap telemetry markers.
            </p>
          </div>

          <div className="absolute right-6 -bottom-8 opacity-15 pointer-events-none hidden md:block">
            <Logo variant="icon" size={280} />
          </div>
        </div>

        {/* 1. BRAND COLOR PALETTE TOKENS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-black tracking-tight">1. Core Brand Color Palette</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLOR_TOKENS.map((c) => (
              <div
                key={c.hex}
                className="bg-white rounded-2xl p-4 border border-border-subtle shadow-xs hover:shadow-md transition-shadow group relative cursor-pointer"
                onClick={() => copyHex(c.hex)}
                title="Click to copy HEX code"
              >
                <div
                  className="h-20 w-full rounded-xl shadow-inner border border-black/10 flex items-end justify-end p-2"
                  style={{ backgroundColor: c.hex }}
                >
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-black/40 text-white backdrop-blur-xs">
                    {c.hex}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-surface-dark">{c.name}</span>
                    {copiedColor === c.hex ? (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Copied!
                      </span>
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 block">{c.token}</span>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{c.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. MASTER FULL LOCKUP VARIANT */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-black tracking-tight">2. Master Brand Lockup (`variant=&quot;full&quot;`)</h2>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Aspect 450x145 &bull; Vector SVG
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Light Theme Background */}
            <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm flex flex-col items-center justify-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Light Background Surface
              </span>
              <div className="w-full flex items-center justify-center py-4">
                <Logo variant="full" theme="light" className="max-w-full drop-shadow-md" />
              </div>
              <code className="text-[11px] font-mono bg-slate-100 px-3 py-1 rounded-lg text-slate-700">
                {'<Logo variant="full" theme="light" />'}
              </code>
            </div>

            {/* Dark Theme Background */}
            <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-sm flex flex-col items-center justify-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Dark Carbon Surface
              </span>
              <div className="w-full flex items-center justify-center py-4">
                <Logo variant="full" theme="dark" className="max-w-full drop-shadow-md" />
              </div>
              <code className="text-[11px] font-mono bg-slate-900 px-3 py-1 rounded-lg text-slate-300">
                {'<Logo variant="full" theme="dark" />'}
              </code>
            </div>
          </div>
        </section>

        {/* 3. COMPACT HORIZONTAL MARK */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-black tracking-tight">3. Compact Horizontal Mark (`variant=&quot;compact&quot;`)</h2>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Headers &amp; Navbars (Height: 32–44px)
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Light Navbar Mockup */}
            <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Light Navigation Bar
              </span>
              <div className="h-16 rounded-2xl bg-white border border-slate-200 px-4 flex items-center justify-between shadow-xs">
                <Logo variant="compact" size={36} />
                <Badge variant="accent" className="text-[10px]">11 Mins</Badge>
              </div>
              <code className="text-[11px] font-mono bg-slate-100 px-3 py-1 rounded-lg text-slate-700 block text-center">
                {'<Logo variant="compact" size={36} />'}
              </code>
            </div>

            {/* Dark Navigation Mockup */}
            <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-sm space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Dark Dispatch / Terminal Bar
              </span>
              <div className="h-16 rounded-2xl bg-slate-900 border border-slate-800 px-4 flex items-center justify-between shadow-xs">
                <Logo variant="compact" theme="dark" size={36} />
                <Badge variant="accent" className="text-[10px]">Rider Fleet</Badge>
              </div>
              <code className="text-[11px] font-mono bg-slate-900 px-3 py-1 rounded-lg text-slate-300 block text-center">
                {'<Logo variant="compact" theme="dark" size={36} />'}
              </code>
            </div>
          </div>
        </section>

        {/* 4. APP ICON MONOGRAM RESOLUTION MATRIX */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-black tracking-tight">4. Monogram Icon Resolution Matrix (`variant=&quot;icon&quot;`)</h2>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              1:1 Aspect Ratio &bull; 16px to 128px
            </Badge>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 items-end justify-items-center">
              {/* 16px */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Logo variant="icon" size={16} />
                </div>
                <span className="text-[11px] font-mono font-bold">16x16 px</span>
                <span className="text-[10px] text-muted-foreground">Favicon</span>
              </div>

              {/* 32px */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Logo variant="icon" size={32} />
                </div>
                <span className="text-[11px] font-mono font-bold">32x32 px</span>
                <span className="text-[10px] text-muted-foreground">Modal / Tabs</span>
              </div>

              {/* 40px */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Logo variant="icon" size={40} />
                </div>
                <span className="text-[11px] font-mono font-bold">40x40 px</span>
                <span className="text-[10px] text-muted-foreground">Header Badges</span>
              </div>

              {/* 48px */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Logo variant="icon" size={48} />
                </div>
                <span className="text-[11px] font-mono font-bold">48x48 px</span>
                <span className="text-[10px] text-muted-foreground">Favicon.ico</span>
              </div>

              {/* 64px */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Logo variant="icon" size={64} />
                </div>
                <span className="text-[11px] font-mono font-bold">64x64 px</span>
                <span className="text-[10px] text-muted-foreground">App Launch</span>
              </div>

              {/* 128px */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Logo variant="icon" size={96} />
                </div>
                <span className="text-[11px] font-mono font-bold">96x96 px</span>
                <span className="text-[10px] text-muted-foreground">PWA Splash</span>
              </div>
            </div>

            {/* Dark Theme Monograms */}
            <div className="pt-6 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-4">
                Dark Mode Monogram Variants
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-3">
                  <Logo variant="icon" theme="dark" size={36} />
                  <div>
                    <span className="text-xs font-bold text-white block">Rider Dashboard</span>
                    <span className="text-[10px] text-slate-400 font-mono">36x36 px</span>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-3">
                  <Logo variant="icon" theme="dark" size={40} />
                  <div>
                    <span className="text-xs font-bold text-white block">Manager Kanban</span>
                    <span className="text-[10px] text-slate-400 font-mono">40x40 px</span>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-3">
                  <Logo variant="icon" theme="dark" size={48} />
                  <div>
                    <span className="text-xs font-bold text-white block">Station Tablet</span>
                    <span className="text-[10px] text-slate-400 font-mono">48x48 px</span>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-3">
                  <Logo variant="icon" theme="dark" size={56} />
                  <div>
                    <span className="text-xs font-bold text-white block">PWA Standalone</span>
                    <span className="text-[10px] text-slate-400 font-mono">56x56 px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. THERMAL RECEIPT STAMP */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-black tracking-tight">5. Thermal POS Receipt Stamp (`variant=&quot;thermal&quot;`)</h2>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              100% Monochrome B&amp;W &bull; ESC/POS Compatible
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Thermal Ticket Simulation */}
            <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm flex flex-col items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                58mm / 80mm POS Paper Tape Preview
              </span>
              <div className="w-72 bg-amber-50/50 border-2 border-dashed border-slate-300 rounded-2xl p-5 font-mono text-xs text-slate-900 space-y-3 shadow-md">
                <div className="flex justify-center">
                  <Logo variant="thermal" size={240} />
                </div>
                <div className="space-y-1 text-[11px] border-t border-dashed border-slate-300 pt-2">
                  <div className="flex justify-between font-bold">
                    <span>ORDER: SQ-8492</span>
                    <span>14:32 IST</span>
                  </div>
                  <div>CUSTOMER: Aarav Sharma</div>
                  <div>DEST: Ambikapur, CG-15</div>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between font-bold text-xs">
                  <span>TOTAL PAID:</span>
                  <span>₹420.00 (UPI)</span>
                </div>
                <div className="text-center text-[9px] text-slate-500 font-bold pt-1">
                  *** 10-15 MIN EXPRESS FULFILLMENT ***
                </div>
              </div>
            </div>

            {/* Thermal Specs & Code */}
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-3">
                <h3 className="text-sm font-black text-surface-dark">Thermal Printing Characteristics</h3>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
                  <li><strong>Zero Grayscale:</strong> Pure `#000000` and `#FFFFFF` vector geometry prevents dot-matrix blurring on thermal heat heads.</li>
                  <li><strong>Stenciled SQ Speed Block:</strong> Distinctive negative-space speed slices survive fast 200 DPI thermal cutter feeds.</li>
                  <li><strong>Tear-Line Indicators:</strong> Includes dashed cut guide markings matching standard POS roll widths.</li>
                </ul>
                <div className="pt-2">
                  <code className="text-[11px] font-mono bg-slate-100 p-2.5 rounded-xl text-slate-700 block">
                    {'<Logo variant="thermal" size={200} />'}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. LEAFLET TELEMETRY MAP PINS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-black tracking-tight">6. Dynamic Leaflet Map Telemetry Pins</h2>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              OpenStreetMap L.divIcon
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Map Preview Container */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-4 border border-border-subtle shadow-sm overflow-hidden">
              <DynamicBrandPinsMap />
            </div>

            {/* Pin Descriptions */}
            <div className="space-y-4">
              {/* Store Hub Pin */}
              <div className="bg-white rounded-2xl p-4 border border-border-subtle shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary border-2 border-white shadow-md flex items-center justify-center text-white font-black text-xs shrink-0">
                    SQ
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-surface-dark">createHubPin()</h3>
                    <p className="text-[11px] text-muted-foreground">38x38px Forest Green badge with drop shadow</p>
                  </div>
                </div>
              </div>

              {/* Customer Pin */}
              <div className="bg-white rounded-2xl p-4 border border-border-subtle shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-10 bg-slate-900 rounded-t-full rounded-b-md flex items-center justify-center shrink-0">
                    <div className="w-3 h-3 rounded-full bg-primary-accent" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-surface-dark">createCustomerPin(isServiceable)</h3>
                    <p className="text-[11px] text-muted-foreground">Dynamic target ring (Green inside 2.5km / Red outside)</p>
                  </div>
                </div>
              </div>

              {/* Rider Radar Pin */}
              <div className="bg-white rounded-2xl p-4 border border-border-subtle shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-primary-accent flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-primary-accent fill-primary-accent" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-surface-dark">createRiderPin()</h3>
                    <p className="text-[11px] text-muted-foreground">42x42px Carbon disc with pulsing CSS radar rings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. STATIC & PWA ASSET CHECKLIST */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-black tracking-tight">7. Generated Static Assets &amp; PWA Manifest</h2>
            </div>
            <Badge variant="accent" className="text-xs font-mono">
              public/ Directory Active
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STATIC_ASSETS.map((a) => (
              <div
                key={a.path}
                className="bg-white rounded-2xl p-4 border border-border-subtle shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-surface-dark">{a.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {a.dims}
                    </Badge>
                  </div>
                  <code className="text-[11px] font-mono text-primary font-bold block mt-1">
                    {a.path}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">{a.desc}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={a.path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    Inspect Asset <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 8. ANIMATED SPLASH SCREEN PREVIEW & REPLAY */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-black tracking-tight">8. Animated Splash Screen Sandbox</h2>
            </div>
            <Badge variant="accent" className="text-xs font-mono">
              1.8s Sequenced CSS Animation
            </Badge>
          </div>

          <div className="bg-gradient-to-r from-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 border border-slate-800 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>Choreographed Entry Sequence</span>
                <Badge variant="outline" className="text-[10px] text-primary-accent border-primary-accent/40">
                  Interactive Sandbox
                </Badge>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Tests the complete full-screen mobile/desktop splash screen:
                <strong> &quot;S&quot; slides from left</strong> &bull; <strong>&quot;A&quot; and &quot;B&quot; drop into alignment</strong> &bull; 
                <strong> &quot;QUICK&quot; dashes from right with electric green speed streak</strong> &bull; 
                <strong> 10-15 Min SLA badge illumination</strong> &bull; <strong> Smooth scale &amp; fade-out exit</strong>.
              </p>
            </div>

            <Button
              onClick={() => setReplaySplash(true)}
              className="bg-primary-accent text-surface-dark hover:bg-primary-accent/90 font-black text-sm px-6 h-12 rounded-2xl shadow-lg shadow-emerald-500/20 shrink-0 gap-2"
            >
              <Zap className="w-4 h-4 fill-surface-dark" />
              <span>Trigger / Replay Splash Screen</span>
            </Button>
          </div>
        </section>

        {/* Fullscreen Splash Player */}
        {replaySplash && (
          <SplashScreen onComplete={() => setReplaySplash(false)} forceShow={true} />
        )}
      </main>
    </div>
  );
}
