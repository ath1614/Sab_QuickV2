"use client";

import * as React from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, PhoneCall, ShieldCheck, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = React.useState(false);

  // Auto-reload as soon as internet connection is restored
  React.useEffect(() => {
    const handleOnline = () => {
      window.location.reload();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 text-surface-dark">
      {/* Header */}
      <header className="max-w-md mx-auto w-full flex items-center justify-center pt-6">
        <Logo variant="compact" size={38} />
      </header>

      {/* Main Content Body */}
      <main className="max-w-md mx-auto w-full bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
          <WifiOff className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-surface-dark tracking-tight">
            Connection Lost
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            SabQuick requires an active internet connection to calculate live 10-15 minute delivery ETAs and sync dark store inventory.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-border-subtle text-left text-xs space-y-2">
          <div className="font-bold text-surface-dark flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>While You Wait</span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Your cart and delivery address are safely saved locally on this device. We will automatically reconnect the moment your signal returns.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <Button
            variant="default"
            className="w-full h-12 rounded-xl font-bold gap-2 text-sm shadow-sm"
            disabled={isRetrying}
            onClick={handleRetry}
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Checking Connection..." : "Retry Connection"}</span>
          </Button>

          <Button
            variant="outline"
            asChild
            className="w-full h-11 rounded-xl font-semibold text-xs border-border-subtle"
          >
            <Link href="/" className="gap-2">
              <Home className="w-3.5 h-3.5" />
              <span>Go to Home</span>
            </Link>
          </Button>
        </div>

        {/* Dark Store Support Help */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <PhoneCall className="w-3.5 h-3.5 text-primary" />
          <span>Support Helpline: +91 9109066668</span>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-md mx-auto w-full text-center pb-6 text-[11px] text-muted-foreground">
        SabQuick Hyper-Local Provision Delivery &bull; Ambikapur Store
      </footer>
    </div>
  );
}
