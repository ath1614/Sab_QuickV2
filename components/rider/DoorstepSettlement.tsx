"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Smartphone,
} from "lucide-react";

interface DoorstepSettlementProps {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  onDeliveryCompleted: () => void;
}

export function DoorstepSettlement({
  orderId,
  orderNumber,
  totalAmount,
  paymentMethod,
  paymentStatus,
  onDeliveryCompleted,
}: DoorstepSettlementProps) {
  const [otpDigits, setOtpDigits] = React.useState<string[]>(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const isPrepaid = paymentStatus === "PAID" || paymentMethod === "ONLINE_PREPAID";

  // Standard NPCI UPI URI Scheme
  const upiUri = `upi://pay?pa=sabquick@upi&pn=SabQuickStore&am=${totalAmount}&tr=${orderNumber}&tn=SabQuick_${orderNumber}&cu=INR`;

  // Auto-focus OTP digits
  const handleOtpChange = (index: number, val: string) => {
    setErrorMsg(null);
    const char = val.replace(/\D/g, "").slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = char;
    setOtpDigits(nextDigits);

    // Auto-advance to next input
    if (char && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullOtp = otpDigits.join("");
  const isOtpComplete = fullOtp.length === 4;

  const handleVerifyOtp = async () => {
    if (!isOtpComplete) return;

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/rider/orders/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          enteredOtp: fullOtp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to verify OTP.");
        setIsVerifying(false);
        return;
      }

      setSuccessMsg("Order verified and settled successfully! 🎉");
      setTimeout(() => {
        onDeliveryCompleted();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-surface-dark border border-slate-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl space-y-6">
      {/* 1. PAYMENT SETTLEMENT SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest font-black text-primary-accent flex items-center gap-1.5">
            <QrCode className="w-4 h-4" />
            Doorstep Payment Settlement
          </span>
          <span className="font-mono text-xs font-bold text-slate-300">
            Bill: ₹{totalAmount}
          </span>
        </div>

        {isPrepaid ? (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-accent/20 text-primary-accent flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Prepaid Order</h4>
                <p className="text-[11px] text-emerald-400">
                  Customer already paid ₹{totalAmount} online. No cash needed.
                </p>
              </div>
            </div>
            <Badge variant="accent" className="font-bold text-xs bg-primary-accent text-surface-dark">
              PAID
            </Badge>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary-accent" />
              <h4 className="text-xs font-bold text-white">
                UPI at Doorstep &bull; Scan QR Code
              </h4>
            </div>

            {/* In-App Dynamic NPCI UPI QR SVG */}
            <div className="bg-white p-3.5 rounded-2xl shadow-md border border-slate-200 inline-block">
              <QRCodeSVG
                value={upiUri}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="space-y-0.5">
              <div className="font-mono text-base font-black text-primary-accent">
                ₹{totalAmount}
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Ask customer to scan using Google Pay, PhonePe, Paytm, or BHIM.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. 4-DIGIT DELIVERY OTP HANDOVER SECTION */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest font-black text-primary-accent flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Customer Handover Verification
          </span>
          <span className="text-[10px] text-slate-400">
            Ask customer for OTP
          </span>
        </div>

        <p className="text-xs text-slate-300">
          Enter the 4-digit Delivery OTP shown on the customer&apos;s SabQuick screen
          to complete this delivery.
        </p>

        {/* 4 Separate Numeric Input Squares with Auto-advance */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 py-3">
          {otpDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              size={1}
              value={digit}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-14 h-16 sm:w-16 sm:h-20 shrink-0 text-center font-mono text-3xl font-black rounded-2xl bg-white/10 border-2 border-slate-700 text-white focus:border-primary-accent focus:ring-2 focus:ring-primary-accent/40 focus:outline-none transition-all shadow-inner"
            />
          ))}
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-900/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Large Touch Target Action Button (52px height) */}
        <Button
          type="button"
          disabled={!isOtpComplete || isVerifying || Boolean(successMsg)}
          onClick={handleVerifyOtp}
          className="w-full h-12 sm:h-14 rounded-2xl bg-primary-accent hover:bg-primary-accent/90 text-surface-dark font-black text-sm shadow-lg shadow-primary-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verifying OTP with Dark Store...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>VERIFY OTP & COMPLETE DELIVERY</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
