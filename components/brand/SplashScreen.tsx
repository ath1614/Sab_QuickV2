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
  durationMs = 1850,
  forceShow = false,
}: SplashScreenProps) {
  const [stage, setStage] = React.useState<"animating" | "exiting" | "hidden">("animating");

  React.useEffect(() => {
    // 1. Trigger exit animation shortly before completion
    const exitTimer = setTimeout(() => {
      setStage("exiting");
    }, Math.max(durationMs - 350, 1000));

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
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0B0F19] text-white select-none transition-all duration-350 ease-out pointer-events-none ${
        stage === "exiting" ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
      role="dialog"
      aria-label="SabQuick Loading Splash"
    >
      <style jsx global>{`
        @keyframes sqBackdropGlow {
          0% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 0.7; transform: scale(1.1); }
          100% { opacity: 0.5; transform: scale(1); }
        }

        @keyframes sqWedgeSlide {
          0% { opacity: 0; transform: translateX(-40px) scale(0.9); }
          60% { opacity: 1; transform: translateX(4px) scale(1.02); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }

        @keyframes sqLetterS {
          0% { opacity: 0; transform: translateX(-60px) scale(0.8); }
          70% { opacity: 1; transform: translateX(6px) scale(1.08); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }

        @keyframes sqLetterA {
          0% { opacity: 0; transform: translateY(-30px) scale(0.8); }
          70% { opacity: 1; transform: translateY(4px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes sqLetterB {
          0% { opacity: 0; transform: translateY(30px) scale(0.8); }
          70% { opacity: 1; transform: translateY(-4px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes sqQuickDash {
          0% { opacity: 0; transform: translateX(80px) skewX(-10deg) scale(0.85); }
          60% { opacity: 1; transform: translateX(-8px) skewX(-10deg) scale(1.04); }
          100% { opacity: 1; transform: translateX(0) skewX(-10deg) scale(1); }
        }

        @keyframes sqLightningFlash {
          0% { opacity: 0; transform: scale(0.2) rotate(-20deg); }
          40% { opacity: 1; transform: scale(1.25) rotate(0deg); filter: drop-shadow(0 0 12px #00E676); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 6px #00E676); }
        }

        @keyframes sqStreakSweep {
          0% { transform: translateX(-100%) scaleX(0.2); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateX(120%) scaleX(1); opacity: 0; }
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
          animation: sqBackdropGlow 2s ease-in-out infinite alternate;
        }
        .anim-wedge {
          animation: sqWedgeSlide 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-letter-s {
          animation: sqLetterS 0.45s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .anim-letter-a {
          animation: sqLetterA 0.42s 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .anim-letter-b {
          animation: sqLetterB 0.42s 0.52s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .anim-quick {
          animation: sqQuickDash 0.55s 0.72s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .anim-lightning {
          animation: sqLightningFlash 0.45s 0.88s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .anim-streak {
          animation: sqStreakSweep 0.75s 0.95s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .anim-badge {
          animation: sqBadgeReveal 0.45s 1.05s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .anim-progress {
          animation: sqProgressBar 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      {/* Ambient Speed Radial Glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[#0B6E4F]/30 blur-[120px] anim-glow pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-[#00E676]/15 blur-[90px] anim-glow pointer-events-none translate-x-24 -translate-y-12" />

      {/* Dynamic Background Speed Lines */}
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-1 bg-gradient-to-r from-transparent via-[#00E676] to-transparent rotate-[-12deg]" />
        <div className="absolute top-1/2 -left-10 w-[550px] h-1.5 bg-gradient-to-r from-transparent via-white to-transparent rotate-[-12deg]" />
        <div className="absolute top-3/4 left-10 w-80 h-1 bg-gradient-to-r from-transparent via-[#00E676] to-transparent rotate-[-12deg]" />
      </div>

      {/* Center Animated Logo Lockup */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Master Logo Box */}
        <div className="relative flex items-center bg-[#111827] border border-slate-700/60 shadow-2xl shadow-emerald-950/60 rounded-3xl p-5 sm:p-7 overflow-hidden anim-wedge">
          {/* Neon Light Sweep Streak */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[#00E676]/40 to-transparent skew-x-[-20deg] anim-streak pointer-events-none" />

          {/* Left Carbon Wedge Monogram */}
          <div className="relative flex items-center justify-center mr-4 sm:mr-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#0B6E4F] to-[#043827] border-2 border-[#00E676]/50 shadow-lg shadow-emerald-900/50 flex items-center justify-center relative overflow-hidden">
              {/* Monogram Speed Slash */}
              <div className="absolute -inset-1 bg-[#00E676]/20 skew-x-[-20deg]" />
              <span className="text-white font-black text-2xl sm:text-3xl tracking-tighter drop-shadow-md">
                SQ
              </span>
              {/* Mini Lightning Spark */}
              <Zap className="w-4 h-4 text-[#00E676] fill-[#00E676] absolute -top-1 -right-1 anim-lightning" />
            </div>
          </div>

          {/* Sequenced Typography */}
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            {/* Letter 'S' */}
            <span className="text-3xl sm:text-5xl font-black tracking-tight text-white inline-block anim-letter-s">
              S
            </span>
            {/* Letter 'A' */}
            <span className="text-3xl sm:text-5xl font-black tracking-tight text-white inline-block anim-letter-a">
              A
            </span>
            {/* Letter 'B' */}
            <span className="text-3xl sm:text-5xl font-black tracking-tight text-white inline-block anim-letter-b">
              B
            </span>

            {/* Kinetic 'QUICK' */}
            <div className="inline-flex items-center ml-2 anim-quick">
              <span className="text-3xl sm:text-5xl font-black tracking-tight text-[#00E676] drop-shadow-[0_0_12px_rgba(0,230,118,0.4)]">
                Quick
              </span>
              {/* Lightning Spark beside Q */}
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-[#00E676] fill-[#00E676] ml-1 anim-lightning" />
            </div>
          </div>
        </div>

        {/* Dynamic Tagline & SLA Badge */}
        <div className="mt-6 flex flex-col items-center space-y-2.5 anim-badge">
          <div className="inline-flex items-center gap-1.5 bg-[#00E676]/15 border border-[#00E676]/40 px-3.5 py-1 rounded-full text-xs sm:text-sm font-black tracking-wider text-[#00E676] uppercase shadow-sm">
            <Zap className="w-3.5 h-3.5 fill-[#00E676]" />
            10-15 Min Hyper-Local Delivery
          </div>
          <p className="text-[11px] sm:text-xs font-mono tracking-widest text-slate-400 uppercase">
            A Complete Provision Store &bull; Right to Your Door
          </p>
        </div>

        {/* Minimal Kinetic Progress Line */}
        <div className="mt-8 w-48 sm:w-64 h-1 bg-slate-800/80 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#0B6E4F] via-[#00E676] to-[#69F0AE] rounded-full anim-progress" />
        </div>
      </div>
    </div>
  );
}
