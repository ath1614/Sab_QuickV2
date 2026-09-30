"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

/**
 * Mobile Google OAuth Initiation Bridge
 *
 * Runs in the external system browser (Chrome) so that the entire NextAuth PKCE
 * and OAuth state handshake is contained within Chrome's cookie jar.
 * Once Google consent completes, NextAuth redirects to /auth/mobile-return,
 * which issues a 90-second single-use exchange token and deep-links back into
 * the native SabQuick APK (sabquick://auth-callback?token=...).
 */
export default function GoogleStartPage() {
  const [hasStarted, setHasStarted] = React.useState(false);

  React.useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      // Initiate OAuth strictly inside this browser session
      signIn("google", {
        callbackUrl: "/auth/mobile-return",
      });
    }
  }, [hasStarted]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-slate-200/80 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <Logo variant="full" size={42} className="mx-auto" />
        <div className="flex flex-col items-center justify-center gap-3 py-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Connecting to Google...</h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
            Redirecting to Google Sign-In. Please choose your Google account to log into SabQuick.
          </p>
        </div>
      </div>
    </div>
  );
}
