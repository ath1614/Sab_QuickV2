"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Clock,
  Sparkles,
  Zap,
  ShoppingBag,
  Bell,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Lock,
  Smartphone,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [subscriberCount, setSubscriberCount] = React.useState<number | null>(null);
  const [notifyError, setNotifyError] = React.useState<string | null>(null);

  // Time remaining state
  const [timeLeft, setTimeLeft] = React.useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Calculate target date: use launchDate or default to 7 days from now
  const targetTimestamp = React.useMemo(() => {
    if (launchDate) {
      const parsed = new Date(launchDate).getTime();
      if (!isNaN(parsed) && parsed > Date.now()) return parsed;
    }
    // Default fallback: 5 days from today
    return Date.now() + 5 * 24 * 60 * 60 * 1000;
  }, [launchDate]);

  React.useEffect(() => {
    const updateCountdown = () => {
      const diff = Math.max(0, targetTimestamp - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp]);

  // Load existing subscriber count
  React.useEffect(() => {
    fetch("/api/store/notify-launch")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.subscriberCount === "number") {
          setSubscriberCount(data.subscriberCount);
        }
      })
      .catch(() => {});
  }, []);

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
        throw new Error(data.error || "Failed to subscribe for notifications");
      }

      setSubscribed(true);
      if (typeof data.subscriberCount === "number") {
        setSubscriberCount(data.subscriberCount);
      }
    } catch (err: any) {
      setNotifyError(err.message || "Failed to save phone number");
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background radial blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-400/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-3">
          <Logo variant="full" theme="dark" size={38} />
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5"
          >
            Dark Store Coming Soon
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {session ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 hidden sm:inline">
                Signed in as <strong>{session.user?.name || session.user?.email || "User"}</strong>
              </span>
              {isStaffOrReviewer && onEnterPreview && (
                <Button
                  onClick={onEnterPreview}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <span>Preview Store</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <Button
              onClick={openAuthModal}
              variant="outline"
              size="sm"
              className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs rounded-xl font-bold gap-1.5 backdrop-blur-md"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Reviewer &amp; Staff Login</span>
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center text-center relative z-10 my-auto">
        {/* Glow badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold mb-6 shadow-inner backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Setting up our local dark store in your neighborhood</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-3xl leading-[1.1] mb-5">
          10-Minute Dark Store <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-lime-300">
            Grocery Delivery
          </span>{" "}
          is Arriving!
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed mb-8">
          Fresh fruits, vegetables, dairy, household essentials &amp; snacks delivered to your doorstep in{" "}
          <strong className="text-emerald-400 font-bold">under 10 minutes</strong> at wholesale prices.
        </p>

        {/* Live Countdown Grid */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-4 mb-10 w-full max-w-lg">
          {[
            { label: "DAYS", val: timeLeft.days },
            { label: "HOURS", val: timeLeft.hours },
            { label: "MINUTES", val: timeLeft.minutes },
            { label: "SECONDS", val: timeLeft.seconds },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center shadow-xl backdrop-blur-md hover:border-emerald-500/40 transition-colors"
            >
              <span className="font-mono text-2xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                {String(item.val).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-wider mt-1">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Notification Subscription Card */}
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
          {subscribed ? (
            <div className="flex flex-col items-center py-2 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">You&apos;re on the Priority List!</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                We will send you an exclusive launch coupon &amp; notification the moment order dispatch begins.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="text-left">
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Get notified when we go live
                </label>
                <p className="text-[11px] text-slate-500">
                  Be the first to order and get an exclusive ₹100 launch voucher.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  placeholder="Enter mobile number or email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 rounded-xl h-11 text-xs focus-visible:ring-emerald-500"
                  required
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl h-11 px-5 text-xs shrink-0 shadow-lg shadow-emerald-500/20"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 mr-1.5" />
                      <span>Notify Me</span>
                    </>
                  )}
                </Button>
              </div>

              {notifyError && (
                <p className="text-[11px] font-semibold text-rose-400 text-left flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{notifyError}</span>
                </p>
              )}
            </form>
          )}

          {typeof subscriberCount === "number" && subscriberCount > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>
                <strong>{subscriberCount + 140}</strong> people in your city have already joined the launch list.
              </span>
            </div>
          )}
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-8">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3.5 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">10-Minute Dispatch</h4>
              <p className="text-[11px] text-slate-400">Hyperlocal dark store delivery</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3.5 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">1000+ Fresh SKUs</h4>
              <p className="text-[11px] text-slate-400">Farm fresh veggies &amp; snacks</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3.5 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 text-lime-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Native UPI Checkout</h4>
              <p className="text-[11px] text-slate-400">GPay, PhonePe, Paytm &amp; COD</p>
            </div>
          </div>
        </div>

        {/* App Reviewer Credentials Box */}
        <div className="mt-8 p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 text-left max-w-md w-full flex items-start gap-2.5">
          <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 leading-relaxed">
            <span className="font-bold text-slate-200">Play Store / App Store Reviewers:</span> Use phone{" "}
            <code className="text-emerald-300 font-mono bg-slate-800 px-1 py-0.5 rounded">9999999999</code> with OTP{" "}
            <code className="text-emerald-300 font-mono bg-slate-800 px-1 py-0.5 rounded">1234</code> to access the full
            store in preview mode.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 border-t border-slate-900/80 text-center relative z-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-3">
        <p>&copy; {new Date().getFullYear()} SabQuick Hyperlocal Dark Store. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-400 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-400 transition-colors">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-slate-400 transition-colors">
            Support
          </Link>
        </div>
      </footer>
    </div>
  );
}
