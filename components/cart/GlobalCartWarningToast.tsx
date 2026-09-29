"use client";

import * as React from "react";
import { useCartStore } from "@/store/useCartStore";
import { AlertTriangle, X } from "lucide-react";

export function GlobalCartWarningToast() {
  const warningToast = useCartStore((s) => s.warningToast);
  const setWarningToast = useCartStore((s) => s.setWarningToast);

  React.useEffect(() => {
    if (!warningToast) return;
    const timer = setTimeout(() => {
      setWarningToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [warningToast, setWarningToast]);

  if (!warningToast) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[100] max-w-[90vw] sm:max-w-md w-full px-4 py-3 rounded-2xl bg-slate-900/95 text-white border border-amber-500/40 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <p className="text-xs sm:text-sm font-bold text-amber-50 leading-snug truncate">
          {warningToast}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setWarningToast(null)}
        className="w-7 h-7 rounded-lg hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white flex items-center justify-center shrink-0 transition-colors"
        aria-label="Dismiss alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
