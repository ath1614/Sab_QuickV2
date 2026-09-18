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
  durationMs = 2000,
  forceShow = false,
}: SplashScreenProps) {
  const [stage, setStage] = React.useState<"animating" | "exiting" | "hidden">("animating");

  React.useEffect(() => {
    // 1. Trigger exit animation shortly before completion
    const exitTimer = setTimeout(() => {
      setStage("exiting");
    }, Math.max(durationMs - 400, 1200));

    // 2. Complete and unmount
    const finishTimer = setTimeout(() => {
      setStage("hidden");
      onComplete?.();
    }, durationMs);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onComplete]);

  if (stage === "hidden" && !forceShow) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0B0F19] text-white select-none transition-all duration-400 ease-out pointer-events-none ${
        stage === "exiting" ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
      role="dialog"
      aria-label="SabQuick Loading Splash"
    >
      <style jsx global>{`
        @keyframes sqBackdropGlow {
          0% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 0.75; transform: scale(1.12); }
          100% { opacity: 0.45; transform: scale(1); }
        }

        @keyframes sqLogoEnter {
          0% { opacity: 0; transform: scale(0.85) translateY(16px); }
          60% { opacity: 1; transform: scale(1.02) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes sqStreakSweep {
          0% { transform: translateX(-140%) skewX(-25deg); opacity: 0; }
          25% { opacity: 0.85; }
          100% { transform: translateX(200%) skewX(-25deg); opacity: 0; }
        }

        @keyframes sqBadgeReveal {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes sqProgressBar {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        .anim-glow {
          animation: sqBackdropGlow 2.2s ease-in-out infinite alternate;
        }
        .anim-logo-card {
          animation: sqLogoEnter 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-streak {
          animation: sqStreakSweep 0.85s 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .anim-badge {
          animation: sqBadgeReveal 0.5s 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .anim-progress {
          animation: sqProgressBar 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      {/* Ambient Speed Radial Glow */}
      <div className="absolute w-[520px] h-[520px] rounded-full bg-[#0B6E4F]/35 blur-[120px] anim-glow pointer-events-none" />
      <div className="absolute w-[320px] h-[320px] rounded-full bg-[#00E676]/20 blur-[90px] anim-glow pointer-events-none translate-x-24 -translate-y-12" />

      {/* Dynamic Background Speed Lines */}
      <div className="absolute inset-0 overflow-hidden opacity-25 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-1 bg-gradient-to-r from-transparent via-[#00E676] to-transparent rotate-[-12deg]" />
        <div className="absolute top-1/2 -left-10 w-[550px] h-1.5 bg-gradient-to-r from-transparent via-white to-transparent rotate-[-12deg]" />
        <div className="absolute top-3/4 left-10 w-80 h-1 bg-gradient-to-r from-transparent via-[#00E676] to-transparent rotate-[-12deg]" />
      </div>

      {/* Center Animated Official Logo Lockup */}
      <div className="relative z-10 flex flex-col items-center px-4 max-w-md w-full">
        {/* Crisp Card to ensure high contrast for black and green branding */}
        <div className="relative w-full max-w-[340px] sm:max-w-[420px] bg-white rounded-3xl p-5 sm:p-7 shadow-2xl shadow-emerald-950/50 border border-white/80 overflow-hidden anim-logo-card flex items-center justify-center">
          {/* Neon Light Sweep Streak */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent skew-x-[-25deg] anim-streak pointer-events-none" />

          {/* Official Brand Logo Image */}
          <img
            src="/brand/sabquick-official-logo.png"
            alt="SabQuick - A Complete Provision Store | Right to Your Door"
            className="w-full h-auto object-contain max-h-[140px] sm:max-h-[170px] drop-shadow-sm select-none"
          />
        </div>

        {/* Dynamic Tagline & SLA Badge */}
        <div className="mt-6 flex flex-col items-center space-y-2.5 anim-badge">
          <div className="inline-flex items-center gap-1.5 bg-[#00E676]/15 border border-[#00E676]/40 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wider text-[#00E676] uppercase shadow-sm">
            <Zap className="w-4 h-4 fill-[#00E676]" />
            10-15 Min Hyper-Local Delivery
          </div>
          <p className="text-[11px] sm:text-xs font-medium tracking-wider text-slate-300">
            Ambikapur Dark Store &bull; Doorstep Guarantee
          </p>
        </div>

        {/* Minimal Kinetic Progress Line */}
        <div className="mt-7 w-48 sm:w-64 h-1.5 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/50">
          <div className="h-full bg-gradient-to-r from-[#0B6E4F] via-[#00E676] to-[#69F0AE] rounded-full anim-progress" />
        </div>
      </div>
    </div>
  );
}
