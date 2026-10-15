/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Zap } from "lucide-react";

interface SplashScreenProps {
  onComplete?: () => void;
  durationMs?: number;
  forceShow?: boolean;
}

export function SplashScreen({
  onComplete,
  durationMs = 1200,
  forceShow = false,
}: SplashScreenProps) {
  const [stage, setStage] = React.useState<"entering" | "shimmer" | "exiting" | "hidden">("entering");
  const [progress, setProgress] = React.useState<number>(0);

  React.useEffect(() => {
    // 1. Shimmer trigger
    const shimmerTimer = setTimeout(() => {
      setStage("shimmer");
    }, 250);

    // 2. Start exit animation
    const exitTimer = setTimeout(() => {
      setStage("exiting");
    }, Math.max(durationMs - 350, 300));

    // 3. Mark complete
    const finishTimer = setTimeout(() => {
      setStage("hidden");
      onComplete?.();
    }, durationMs);

    // Smooth hairline progress increment
    const interval = 20;
    const step = 100 / (durationMs / interval);
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return Math.min(prev + step, 100);
      });
    }, interval);

    return () => {
      clearTimeout(shimmerTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
      clearInterval(progressTimer);
    };
  }, [durationMs, onComplete]);

  if (stage === "hidden" && !forceShow) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white text-slate-900 select-none overflow-hidden transition-all duration-400 ease-out pointer-events-none ${
        stage === "exiting" ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
      role="dialog"
      aria-label="SABQuick Loading"
    >
      {/* Ambient subtle emerald glow behind logo */}
      <div className="absolute w-[420px] h-[420px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none animate-pulse" />

      <div className="relative flex flex-col items-center justify-center px-6 max-w-sm w-full">
        {/* Animated Brand Logo Container */}
        <div className="relative flex items-center justify-center transition-transform duration-700 ease-out transform">
          <img
            src="/brand/splash-logo.png"
            alt="SABQuick"
            className="w-full max-w-[270px] sm:max-w-[320px] h-auto object-contain select-none drop-shadow-sm transition-all duration-600 animate-in fade-in zoom-in-90"
          />

          {/* Shimmer sweep effect */}
          <div
            className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-2xl ${
              stage === "shimmer" || stage === "exiting" ? "opacity-100" : "opacity-0"
            } transition-opacity duration-300`}
          >
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 animate-[shimmer_1s_infinite]" />
          </div>
        </div>

        {/* Brand Promise & Progress Pill */}
        <div className="mt-8 flex flex-col items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black tracking-wider uppercase text-slate-800 flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
              Superfast Grocery Delivery
            </span>
          </div>

          {/* Hairline Progress Bar */}
          <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
