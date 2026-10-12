"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, Lock } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAuthModalStore } from "@/store/useAuthModalStore";

interface ComingSoonViewProps {
  launchDate?: string | null;
  onEnterPreview?: () => void;
}

export function ComingSoonView({ launchDate, onEnterPreview }: ComingSoonViewProps) {
  const { data: session } = useSession();
  const { openAuthModal } = useAuthModalStore();

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

  const userRole = session?.user?.role;
  const userRoles: string[] =
    (session?.user as any)?.roles?.length
      ? (session?.user as any).roles
      : [userRole];
  const isStaffOrReviewer =
    userRoles.some((r) => ["OWNER", "MANAGER", "PACKER", "RIDER"].includes(r)) ||
    (session?.user as any)?.phone === "9999999999";

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-slate-800 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo variant="compact" height={34} />

        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">
                {session.user?.name || session.user?.phone || session.user?.email}
              </span>
              {isStaffOrReviewer && onEnterPreview && (
                <button
                  type="button"
                  onClick={onEnterPreview}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <span>Preview Store</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white transition-colors"
            >
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Staff Login</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Minimalist Content */}
      <main className="max-w-xl mx-auto px-6 py-16 flex flex-col items-center text-center my-auto">
        {/* Subtle pill indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Ambikapur Dark Store</span>
        </div>

        {/* Clean, Plain Heading */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-4">
          Coming Soon
        </h1>

        {/* Minimalist Subtext */}
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-md mb-8">
          We&apos;re preparing our local dark store to deliver fresh groceries and daily essentials to your doorstep in minutes.
        </p>

        {/* Clean Light Subscription Input */}
        <div className="w-full max-w-md">
          {subscribed ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>You&apos;re on the list. We&apos;ll notify you when delivery opens.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="flex items-center bg-white border border-slate-200 rounded-full p-1.5 shadow-xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/10 transition-all">
                <input
                  type="text"
                  placeholder="Enter mobile number or email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="flex-1 px-4 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-hidden"
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 sm:px-5 py-2.5 rounded-full transition-colors shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Notify Me"
                  )}
                </button>
              </div>

              {notifyError && (
                <p className="text-xs text-rose-600 flex items-center justify-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{notifyError}</span>
                </p>
              )}
            </form>
          )}
        </div>

        {/* Discreet reviewer note */}
        <p className="text-[11px] text-slate-400 mt-10">
          App Reviewers: Log in using test phone <span className="font-mono text-slate-600 font-semibold">9999999999</span> to preview the store.
        </p>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
        <p>&copy; {new Date().getFullYear()} SabQuick. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-600 transition-colors">
            Terms
          </Link>
          <Link href="/refund" className="hover:text-slate-600 transition-colors">
            Refunds
          </Link>
        </div>
      </footer>
    </div>
  );
}
