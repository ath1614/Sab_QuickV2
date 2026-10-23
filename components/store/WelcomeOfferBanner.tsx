"use client";

import * as React from "react";
import { Sparkles, Gift, Check, ArrowRight, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import confetti from "canvas-confetti";

export function WelcomeOfferBanner() {
  const [isEligible, setIsEligible] = React.useState<boolean>(false);
  const [isDismissed, setIsDismissed] = React.useState<boolean>(false);
  const [justApplied, setJustApplied] = React.useState<boolean>(false);

  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const openCart = useCartStore((state) => state.openCart);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("sq_welcome_banner_dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }

    async function checkEligibility() {
      try {
        const res = await fetch("/api/coupons");
        if (res.ok) {
          const data = await res.json();
          const hasWelcome = (data.coupons || []).some(
            (c: { code: string }) => c.code === "WELCOMEFREE"
          );
          setIsEligible(hasWelcome);
        }
      } catch (err) {
        // Silently ignore if offline
      }
    }

    checkEligibility();
  }, []);

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    applyCoupon({
      code: "WELCOMEFREE",
      discountAmount: 25,
      description: "Welcome Offer • 100% Free Delivery on your first 2 orders!",
    });
    setJustApplied(true);
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.15 },
      });
    } catch {
      // Ignore confetti error
    }
    setTimeout(() => setJustApplied(false), 3000);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sq_welcome_banner_dismissed", "true");
    }
  };

  if (!isEligible || isDismissed) {
    return null;
  }

  const isAlreadyApplied = appliedCoupon?.code === "WELCOMEFREE";

  return (
    <aside
      aria-label="Welcome promotional offer"
      className="relative z-20 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white shadow-md border-b border-emerald-500/30 overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-12 left-1/4 w-32 h-32 bg-white/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 right-1/4 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl" />
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2.5 sm:gap-4 relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="hidden sm:flex w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-white/20 border border-white/30 items-center justify-center shrink-0 shadow-2xs">
            <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            <span className="hidden min-[360px]:inline-block bg-white text-emerald-900 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs shrink-0">
              New User Gift
            </span>
            <p className="text-[10.5px] min-[360px]:text-[11px] sm:text-xs font-bold text-white leading-snug line-clamp-2 sm:line-clamp-none">
              <span className="hidden sm:inline">Welcome to SabQuick! </span>
              <strong>100% Free Delivery</strong> on your first 2 orders!
            </p>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-200 font-mono bg-black/20 px-2 py-0.5 rounded border border-white/10">
              Code: <strong className="text-white">WELCOMEFREE</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAlreadyApplied || justApplied ? (
            <button
              onClick={() => openCart()}
              className="h-8 px-2.5 rounded-lg text-[10px] sm:text-[11px] font-black bg-emerald-950/80 text-emerald-200 border border-emerald-400/40 flex items-center gap-1 hover:bg-emerald-950 transition-colors shadow-2xs"
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Applied In Cart</span>
            </button>
          ) : (
            <button
              onClick={handleApply}
              className="h-8 px-2.5 sm:px-3 rounded-lg text-[10px] sm:text-[11px] font-black bg-white hover:bg-emerald-50 text-emerald-900 flex items-center gap-1 shadow-sm transition-transform active:scale-95"
            >
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
              <span className="min-[360px]:hidden">Claim</span>
              <span className="hidden min-[360px]:inline">Claim Free Delivery</span>
              <ArrowRight className="w-3 h-3 hidden sm:inline" />
            </button>
          )}

          <button
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="w-8 h-8 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
