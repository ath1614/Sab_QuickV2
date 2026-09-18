"use client";

import * as React from "react";
import { Zap, Loader2 } from "lucide-react";

interface CustomLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export function CustomLoadingScreen({
  message = "Loading SabQuick Dark Store...",
  subMessage = "10-15 min hyper-local provision fulfillment",
}: CustomLoadingScreenProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-sm select-none animate-in fade-in-0 duration-200"
      role="status"
      aria-label="Loading content"
    >
      <div className="flex flex-col items-center max-w-xs text-center p-6 space-y-4">
        {/* Animated Brand Emblem */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing Outer Halo */}
          <div className="absolute w-16 h-16 rounded-2xl bg-emerald-500/20 animate-ping" />
          <div className="relative w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-emerald-950/20 border-2 border-emerald-400">
            <span className="font-black text-xl tracking-tighter">SQ</span>
            <Zap className="w-3.5 h-3.5 fill-[#00E676] text-[#00E676] absolute -top-1 -right-1" />
          </div>
        </div>

        {/* Loading Message */}
        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            <span>{message}</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            {subMessage}
          </p>
        </div>

        {/* Smooth Linear Progress Line */}
        <div className="w-36 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-[#00E676] rounded-full animate-pulse w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );
}
