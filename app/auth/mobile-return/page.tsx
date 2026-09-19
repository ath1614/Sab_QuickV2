import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import redis from "@/lib/redis";
import crypto from "crypto";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { CheckCircle2, ArrowRight, Smartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MobileReturnPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-slate-200/80 space-y-5">
          <Logo variant="full" size={40} className="mx-auto" />
          <div className="space-y-2">
            <h1 className="text-xl font-black text-surface-dark">Authentication Incomplete</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Google authentication was cancelled or could not be verified. Please return to the SabQuick app and try again.
            </p>
          </div>
          <a
            href="sabquick://auth-callback?cancelled=true"
            className="w-full h-12 inline-flex items-center justify-center rounded-2xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/90 transition-all"
          >
            Return to SabQuick App
          </a>
        </div>
      </div>
    );
  }

  // Generate 90-second single-use cryptographic exchange token
  const exchangeToken = crypto.randomBytes(32).toString("hex");
  const payload = {
    userId: session.user.id,
    email: session.user.email,
    phone: session.user.phone,
    name: session.user.name,
  };

  await redis.setex(`auth:mobile-exchange:${exchangeToken}`, 90, JSON.stringify(payload));

  const deepLinkUrl = `sabquick://auth-callback?token=${exchangeToken}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-white to-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-emerald-100 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-primary shadow-inner">
            <CheckCircle2 className="w-9 h-9 animate-bounce" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5 text-primary" /> Verified via Google
          </span>
          <h1 className="text-2xl font-black text-surface-dark tracking-tight">
            Welcome back, {session.user.name || "Customer"}!
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Redirecting you back to the <strong>SabQuick App</strong> now...
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="space-y-3 pt-2">
          <a
            href={deepLinkUrl}
            className="w-full h-14 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary-hover text-white font-black text-base shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <span>Open SabQuick App</span>
            <ArrowRight className="w-5 h-5" />
          </a>

          <p className="text-[11px] text-muted-foreground">
            Tap the button above if your SabQuick app does not open automatically.
          </p>
        </div>

        {/* Auto-redirect script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  window.location.href = "${deepLinkUrl}";
                } catch(e) {}
              })();
            `,
          }}
        />
      </div>
    </div>
  );
}
