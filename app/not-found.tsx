import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Home, ShoppingBag, Search, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "404 - Page Not Found | SabQuick Ambikapur",
  description: "The page you are looking for does not exist. Return to SabQuick for 10-minute grocery delivery.",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 sm:px-6 py-12 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-6 relative z-10">
        {/* Brand Logo */}
        <div className="flex justify-center">
          <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
            <img
              src="/brand/navbar-logo.png"
              alt="SabQuick"
              className="h-10 sm:h-12 w-auto object-contain mx-auto"
            />
          </Link>
        </div>

        {/* 404 Hero Illustration & Badge */}
        <div className="relative inline-flex items-center justify-center mt-2">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white border border-slate-200/80 shadow-xl shadow-emerald-950/5 flex flex-col items-center justify-center p-4 relative">
            <span className="text-4xl sm:text-5xl">🛒</span>
            <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-xs shadow-sm">
              404
            </span>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Missing Grocery Aisle</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Oops! Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            The page or item you are looking for might have been moved, eaten, or doesn&apos;t exist in our dark store inventory.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Button
            asChild
            className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <Link href="/">
              <Home className="w-4 h-4" />
              <span>Back to Store</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto h-11 px-5 rounded-2xl border-slate-300 text-slate-700 hover:bg-white bg-white/80 font-bold text-xs shadow-xs"
          >
            <Link href="/#categories">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Browse Categories</span>
            </Link>
          </Button>
        </div>

        {/* Fast Delivery Promise Footer */}
        <div className="pt-6 border-t border-slate-200/60 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>SabQuick • Fresh Groceries Delivered in 10-15 Minutes</span>
        </div>
      </div>
    </main>
  );
}
