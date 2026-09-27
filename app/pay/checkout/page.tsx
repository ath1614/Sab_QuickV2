"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { loadCashfreeSdk } from "@/lib/cashfree";

/**
 * Hosted-checkout bridge for the mobile apps.
 *
 * The Flutter app opens `/pay/checkout?payment_session_id=...&mode=...` in
 * the in-app browser: this page loads the official Cashfree JS SDK (the same
 * one the web CartDrawer uses) and immediately redirects `_self` into the
 * hosted payment page, which keeps native UPI intent buttons (GPay, PhonePe,
 * Paytm) working. On completion Cashfree redirects to the order tracker
 * (returnUrl configured server-side) and the webhook + verify endpoint
 * settle the order; the app polls the verify endpoint meanwhile.
 */
function CheckoutRedirect() {
  const params = useSearchParams();
  const sessionId = params.get("payment_session_id");
  const mode = params.get("mode") || "production";
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!sessionId) {
      setError("Missing payment session. Please start checkout again.");
      return;
    }
    let cancelled = false;
    (async () => {
      const ok = await loadCashfreeSdk();
      if (cancelled) return;
      if (!ok) {
        setError("Could not load the payment module. Please try again.");
        return;
      }
      const Cashfree = (window as any).Cashfree;
      if (!Cashfree) {
        setError("Payment module unavailable. Please try again.");
        return;
      }
      const cf = new Cashfree({ mode });
      cf.checkout({
        paymentSessionId: sessionId,
        redirectTarget: "_self",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, mode]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
      {error ? (
        <>
          <div className="text-red-600 font-bold text-sm">{error}</div>
          <a href="/" className="text-xs font-bold text-emerald-700 underline">
            Back to SabQuick
          </a>
        </>
      ) : (
        <>
          <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
          <p className="text-sm font-bold text-slate-800">
            Opening secure Cashfree checkout…
          </p>
          <p className="text-[11px] text-slate-500">
            UPI, cards and netbanking — do not close this window.
          </p>
        </>
      )}
    </div>
  );
}

export default function PayCheckoutPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
        </div>
      }
    >
      <CheckoutRedirect />
    </React.Suspense>
  );
}
