"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, ShoppingBag } from "lucide-react";
import confetti from "canvas-confetti";
import { useCartStore } from "@/store/useCartStore";
import Link from "next/link";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || searchParams.get("orderId");
  const clearCart = useCartStore((state) => state.clearCart);

  const [status, setStatus] = React.useState<"VERIFYING" | "SUCCESS" | "FAILED">("VERIFYING");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [orderNumber, setOrderNumber] = React.useState<string>(orderId || "");

  React.useEffect(() => {
    if (!orderId) {
      setStatus("FAILED");
      setErrorMessage("No order identifier found in payment return parameters.");
      return;
    }

    let isMounted = true;
    let attempts = 0;
    const maxAttempts = 3;

    const verify = async () => {
      try {
        attempts += 1;
        const res = await fetch("/api/payments/cashfree/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        const data = await res.json().catch(() => ({}));

        if (!isMounted) return;

        if (res.ok && data.success) {
          setStatus("SUCCESS");
          if (data.orderNumber) {
            setOrderNumber(data.orderNumber);
          }
          clearCart();

          try {
            confetti({
              particleCount: 90,
              spread: 70,
              origin: { y: 0.6 },
              disableForReducedMotion: true,
            });
            setTimeout(() => {
              try { confetti.reset(); } catch {}
            }, 3000);
          } catch {
            // ignore confetti error
          }

          // Auto-redirect to order tracking after 1.5s
          setTimeout(() => {
            if (isMounted) {
              router.push(`/orders/${data.orderNumber || orderId}?payment_success=true`);
            }
          }, 1500);
          return;
        }

        // If not successful yet and under max attempts, wait 2.5s and retry
        if (attempts < maxAttempts) {
          setTimeout(() => {
            if (isMounted) verify();
          }, 2500);
          return;
        }

        // If failed after retries, cancel unconfirmed order to release stock and restore coupon
        setStatus("FAILED");
        setErrorMessage(data.error || "Payment was not completed or could not be verified by your bank.");

        fetch("/api/orders/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            reason: "Payment unsuccessful or dropped in UPI gateway",
          }),
        }).catch((cErr) => console.warn("Failed to cancel unconfirmed order:", cErr));
      } catch (err: any) {
        if (!isMounted) return;
        if (attempts < maxAttempts) {
          setTimeout(() => {
            if (isMounted) verify();
          }, 2500);
          return;
        }
        setStatus("FAILED");
        setErrorMessage(err.message || "Network error while verifying payment status.");
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [orderId, clearCart, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden text-center p-6 sm:p-8 animate-in fade-in duration-200">
        {status === "VERIFYING" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Verifying Your Payment
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Confirming transaction status with Cashfree & your UPI app. Please do not close or refresh this screen.
              </p>
            </div>
            {orderNumber && (
              <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[11px] font-mono text-slate-600">
                Order #{orderNumber}
              </div>
            )}
          </div>
        )}

        {status === "SUCCESS" && (
          <div className="space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Payment Confirmed
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">
                Order Placed Successfully!⚡
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Your order is confirmed! SabQuick dark store is packing your fresh items now.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push(`/orders/${orderNumber}?payment_success=true`)}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <span>Track Your Delivery</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {status === "FAILED" && (
          <div className="space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                Payment Not Completed
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight mt-1.5">
                Order Was Not Placed
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 max-w-xs mx-auto leading-relaxed">
                {errorMessage || "The UPI transaction was cancelled or timed out. No amount was charged to your account."}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-left flex items-start gap-2.5">
              <ShoppingBag className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold">Your cart is preserved.</span> You can retry payment with Google Pay, PhonePe, Paytm, or choose Cash on Delivery.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <Link
                href="/"
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Return to Cart / Storefront</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PayVerifyPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
        </div>
      }
    >
      <VerifyContent />
    </React.Suspense>
  );
}
