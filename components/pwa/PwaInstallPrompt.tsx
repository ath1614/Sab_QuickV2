"use client";

import * as React from "react";
import { Download, X, Share, PlusSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { usePwa } from "./PwaProvider";

export function PwaInstallPrompt() {
  const { isInstalled, isInstallable, installApp } = usePwa();
  const [isVisible, setIsVisible] = React.useState(false);
  const [isIos, setIsIos] = React.useState(false);
  const [showIosGuide, setShowIosGuide] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || isInstalled) return;

    // Check if dismissed in the last 7 days
    const lastDismissed = localStorage.getItem("sabquick_pwa_dismissed");
    if (lastDismissed) {
      const dismissedTime = parseInt(lastDismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        return;
      }
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isIosDevice && !isStandalone) {
      setIsIos(true);
      // Wait 3 seconds before showing non-intrusive prompt
      const timer = setTimeout(() => setIsVisible(true), 3500);
      return () => clearTimeout(timer);
    }

    if (isInstallable) {
      // Wait 2 seconds before showing prompt
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, isInstallable]);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIosGuide(false);
    localStorage.setItem("sabquick_pwa_dismissed", Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
    } else {
      await installApp();
      setIsVisible(false);
    }
  };

  if (!isVisible || isInstalled) {
    return null;
  }

  return (
    <aside
      aria-label="Install SabQuick Mobile App"
      className="fixed bottom-24 md:bottom-6 left-4 right-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-surface-dark text-white border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
        {/* Subtle accent glow */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary-accent to-transparent" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo variant="icon" size={42} className="rounded-xl shrink-0 shadow-md" />
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs sm:text-sm font-black text-white">Install SabQuick App</h4>
                <span className="text-[10px] bg-primary-accent text-surface-dark font-black px-1.5 py-0.2 rounded-sm uppercase">
                  Fast
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                Faster 10-15 min ordering & instant rider GPS tracking.
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Dismiss prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action button */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleInstallClick}
            className="flex-1 h-9 rounded-xl font-bold text-xs gap-1.5 bg-primary-accent text-surface-dark hover:bg-primary-accent/90 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-9 px-3 text-xs text-slate-300 hover:text-white hover:bg-white/10"
          >
            Later
          </Button>
        </div>

        {/* iOS Step-by-Step Instruction Overlay */}
        {showIosGuide && (
          <div className="mt-3 pt-3 border-t border-white/15 text-[11px] text-slate-200 space-y-1.5 animate-in fade-in">
            <div className="font-bold text-primary-accent flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Add to Home Screen on iPhone / iPad:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
              <li className="flex items-center gap-1">
                1. Tap the Safari Share button <Share className="w-3 h-3 text-white inline shrink-0" /> at the bottom
              </li>
              <li className="flex items-center gap-1">
                2. Scroll and tap <PlusSquare className="w-3 h-3 text-white inline shrink-0" />{" "}
                <strong>Add to Home Screen</strong>
              </li>
            </ol>
          </div>
        )}
      </div>
    </aside>
  );
}
