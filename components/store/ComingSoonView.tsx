"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2, Sparkles, Bell } from "lucide-react";

interface ComingSoonViewProps {
  launchDate?: string | null;
  onEnterPreview?: () => void;
}

export function ComingSoonView({ launchDate, onEnterPreview }: ComingSoonViewProps) {
  const [contact, setContact] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [subscribed, setSubscribed] = React.useState(false);
  const [notifyError, setNotifyError] = React.useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;

    setSubmitting(true);
    setNotifyError(null);

    try {
      const res = await fetch("/api/store/notify-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: contact.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save contact");
      }

      setSubscribed(true);
    } catch (err: any) {
      setNotifyError(err.message || "Failed to save contact");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between px-4 py-8 sm:py-12 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top spacing */}
      <div className="w-full max-w-md mx-auto" />

      {/* Main Center Container — 100% Mobile First */}
      <main className="w-full max-w-md mx-auto flex flex-col items-center text-center my-auto">
        {/* Large Prominent SabQuick Official Brand Logo */}
        <div className="w-full max-w-[280px] sm:max-w-[340px] mb-8 transition-transform hover:scale-102">
          <Image
            src="/brand/sabquick-official-logo.png"
            alt="SabQuick - A Complete Provision Store | Right to Your Door"
            width={340}
            height={160}
            className="w-full h-auto object-contain mx-auto"
            priority
          />
        </div>

        {/* Minimalist Live Dark Store Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-semibold mb-5 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ambikapur Dark Store</span>
        </div>

        {/* Crisp Plain Typography Heading */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-3">
          Coming Soon
        </h1>

        {/* Clean, Plain Subtext */}
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-sm mb-8 px-2">
          We&apos;re stocking up our dark store to bring fresh groceries, fruits, veggies and daily essentials right to your doorstep in 10 minutes.
        </p>

        {/* Large Mobile-First Notification Trigger */}
        <div className="w-full max-w-sm px-2">
          {subscribed ? (
            <div className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center justify-center gap-2 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>You&apos;re on the priority list! We&apos;ll notify you on launch.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="w-full space-y-3">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Enter mobile number or email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full h-13 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-hidden transition-all shadow-xs"
                  required
                />
              </div>

              {/* Large Mobile-First Primary Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Get Notified on Launch</span>
                  </>
                )}
              </button>

              {notifyError && (
                <p className="text-xs text-rose-600 flex items-center justify-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{notifyError}</span>
                </p>
              )}
            </form>
          )}
        </div>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="w-full max-w-md mx-auto pt-8 border-t border-slate-100 flex flex-col items-center justify-center text-center text-xs text-slate-400 gap-2">
        <p>&copy; {new Date().getFullYear()} SabQuick. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-slate-300">&bull;</span>
          <Link href="/terms" className="hover:text-slate-600 transition-colors">
            Terms of Service
          </Link>
          <span className="text-slate-300">&bull;</span>
          <Link href="/refund" className="hover:text-slate-600 transition-colors">
            Refunds
          </Link>
        </div>
      </footer>
    </div>
  );
}
