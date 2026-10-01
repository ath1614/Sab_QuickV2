"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Banknote,
  Sparkles,
} from "lucide-react";
import {
  POPULAR_UPI_APPS,
  buildUpiUri,
  launchUpiPayment,
  UpiAppConfig,
} from "@/lib/upi";
import { useCartStore } from "@/store/useCartStore";

interface UpiPaymentModalProps {
  isOpen: boolean;
  orderNumber: string;
  orderId: string;
  totalAmount: number;
  onClose: () => void;
}

export function UpiPaymentModal({
  isOpen,
  orderNumber,
  orderId,
  totalAmount,
  onClose,
}: UpiPaymentModalProps) {
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);

  const [selectedApp, setSelectedApp] = React.useState<UpiAppConfig | null>(null);
  const [hasLaunchedApp, setHasLaunchedApp] = React.useState(false);
  const [utrNumber, setUtrNumber] = React.useState("");
  const [showUtrInput, setShowUtrInput] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isSwitchingCod, setIsSwitchingCod] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDesktop(window.innerWidth >= 768);
      const handleResize = () => setIsDesktop(window.innerWidth >= 768);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  if (!isOpen) return null;

  const upiUri = buildUpiUri({
    orderNumber,
    amount: totalAmount,
  });

  const handleAppClick = async (app: UpiAppConfig) => {
    setSelectedApp(app);
    setErrorMessage(null);
    setHasLaunchedApp(true);

    await launchUpiPayment({
      uri: upiUri,
      packageName: app.packageName,
      appId: app.id,
    });
  };

  const handleConfirmPayment = async () => {
    setIsConfirming(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/orders/${orderNumber}/confirm-upi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utr: utrNumber || undefined,
          appUsed: selectedApp?.name || "UPI",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to confirm payment status.");
      }

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (cErr) {
        // ignore confetti error
      }

      clearCart();
      onClose();
      router.push(`/orders/${orderNumber}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not confirm payment. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSwitchToCod = async () => {
    setIsSwitchingCod(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/orders/${orderNumber}/switch-cod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not switch to Cash on Delivery.");
      }

      clearCart();
      onClose();
      router.push(`/orders/${orderNumber}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to change payment method.");
    } finally {
      setIsSwitchingCod(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-5 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/20">
                Direct UPI
              </span>
              <span className="text-[11px] text-emerald-100 font-medium">
                0% Gateway Fee
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-100 bg-white/10 px-2.5 py-1 rounded-full">
              <span>Order #{orderNumber}</span>
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-emerald-100">Amount to Pay</p>
              <h2 className="text-2xl font-black tracking-tight font-display">
                ₹{totalAmount.toFixed(2)}
              </h2>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-100 bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-300/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Safe & Encrypted</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Desktop UPI QR Section */}
          {isDesktop && (
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
              <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                <QRCodeSVG
                  value={upiUri}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800">
                  Scan QR with any UPI App
                </p>
                <p className="text-[11px] text-slate-500">
                  Google Pay, PhonePe, Paytm, or BHIM
                </p>
              </div>
            </div>
          )}

          {/* App Chooser Buttons */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>{isDesktop ? "Or open directly on mobile" : "Tap your preferred UPI app"}</span>
              {hasLaunchedApp && (
                <button
                  type="button"
                  onClick={() => setHasLaunchedApp(false)}
                  className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Choose another app</span>
                </button>
              )}
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {POPULAR_UPI_APPS.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleAppClick(app)}
                  className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 text-center relative hover:shadow-xs active:scale-98 ${
                    selectedApp?.id === app.id
                      ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {app.badge && (
                    <span className="absolute -top-2 right-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                      {app.badge}
                    </span>
                  )}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-xs font-black text-xs"
                    style={{ backgroundColor: app.color }}
                  >
                    {app.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {app.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Post-Launch Confirmation Step */}
          {hasLaunchedApp && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    Payment in progress in {selectedApp?.name || "UPI app"}
                  </h4>
                  <p className="text-[11px] text-emerald-700 leading-relaxed mt-0.5">
                    Enter your UPI PIN in {selectedApp?.name || "your app"} to approve ₹{totalAmount.toFixed(2)}. Once done, tap below to confirm!
                  </p>
                </div>
              </div>

              {/* Optional UTR Input Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowUtrInput(!showUtrInput)}
                  className="text-[11px] font-medium text-emerald-800 underline hover:text-emerald-950"
                >
                  {showUtrInput ? "Hide Reference No." : "+ Add 12-digit UPI Reference / UTR (optional)"}
                </button>

                {showUtrInput && (
                  <div className="mt-2">
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="e.g. 427918274910"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ""))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-emerald-300 bg-white font-mono placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Primary Confirmation Button */}
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isConfirming}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Order...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I Have Paid ₹{totalAmount.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Switch to COD / Alternative */}
          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSwitchToCod}
              disabled={isSwitchingCod}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <Banknote className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {isSwitchingCod ? "Switching..." : "Change to Cash on Delivery"}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-[11px] text-slate-400 hover:text-slate-600 py-1 px-2"
            >
              Cancel Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
