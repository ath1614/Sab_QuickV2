/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

interface SplashScreenProps {
  onComplete?: () => void;
  durationMs?: number;
  forceShow?: boolean;
}

export function SplashScreen({
  onComplete,
  durationMs = 1800,
  forceShow = false,
}: SplashScreenProps) {
  const [stage, setStage] = React.useState<"animating" | "exiting" | "hidden">("animating");

  React.useEffect(() => {
    const exitTimer = setTimeout(() => {
      setStage("exiting");
    }, Math.max(durationMs - 350, 1000));

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
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white text-slate-900 select-none transition-opacity duration-300 ease-out pointer-events-none ${
        stage === "exiting" ? "opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-label="SabQuick Loading Splash"
    >
      <div className="relative flex flex-col items-center justify-center px-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
        <img
          src="/brand/splash-logo.png"
          alt="SabQuick - Right to Your Door"
          className="w-full max-w-[280px] sm:max-w-[340px] h-auto object-contain select-none"
        />
      </div>
    </div>
  );
}

