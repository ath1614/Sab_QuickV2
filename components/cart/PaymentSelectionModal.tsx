"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Banknote,
  QrCode,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

interface PaymentSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  activeAddressSummary?: string;
  onSelectPayment: (
    method: "CASHFREE" | "ONLINE_UPI" | "UPI_DOORSTEP" | "CASH_ON_DELIVERY",
    extra?: {
      upiId?: string;
      upiApp?: string;
      /**
       * UPI_INTENT = open the chosen UPI app directly (native app),
       * UPI_CHOOSER = Cashfree's UPI app list,
       * CARDS = hosted Cashfree page.
       */
      flow?: "UPI_INTENT" | "UPI_CHOOSER" | "CARDS";
    }
  ) => void;
  isProcessing: boolean;
}

export function PaymentSelectionModal({
  open,
  onOpenChange,
  totalAmount,
  activeAddressSummary,
  onSelectPayment,
  isProcessing,
}: PaymentSelectionModalProps) {
  const [selectedMethod, setSelectedMethod] = React.useState<
    "PHONEPE" | "GPAY" | "PAYTM" | "OTHER_UPI" | "UPI_ID" | "UPI_DOORSTEP" | "COD" | "CARDS"
  >("PHONEPE");

  const [upiIdInput, setUpiIdInput] = React.useState("");
  const [upiIdError, setUpiIdError] = React.useState("");

  const handlePay = () => {
    // Each of these opens that exact UPI app on the phone via the native
    // Cashfree UPI Intent flow - the app is never shown a Cashfree web page.
    if (selectedMethod === "PHONEPE") {
      onSelectPayment("CASHFREE", { upiApp: "phonepe", flow: "UPI_INTENT" });
    } else if (selectedMethod === "GPAY") {
      onSelectPayment("CASHFREE", { upiApp: "gpay", flow: "UPI_INTENT" });
    } else if (selectedMethod === "PAYTM") {
      onSelectPayment("CASHFREE", { upiApp: "paytm", flow: "UPI_INTENT" });
    } else if (selectedMethod === "OTHER_UPI") {
      onSelectPayment("CASHFREE", { flow: "UPI_CHOOSER" });
    } else if (selectedMethod === "UPI_ID") {
      const trimmed = upiIdInput.trim();
      if (!trimmed || !trimmed.includes("@")) {
        setUpiIdError("Please enter a valid UPI ID (e.g. mobile@ybl)");
        return;
      }
      setUpiIdError("");
      onSelectPayment("ONLINE_UPI", { upiId: trimmed });
    } else if (selectedMethod === "UPI_DOORSTEP") {
      onSelectPayment("UPI_DOORSTEP");
    } else if (selectedMethod === "COD") {
      onSelectPayment("CASH_ON_DELIVERY");
    } else if (selectedMethod === "CARDS") {
      onSelectPayment("CASHFREE", { flow: "CARDS" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-3xl border border-slate-100 shadow-2xl bg-slate-50 max-h-[92vh] flex flex-col">
        {/* Header (Blinkit / Zepto Parity) */}
        <div className="bg-white p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>
            <div>
              <DialogTitle className="text-sm font-extrabold text-surface-dark flex items-center gap-1.5">
                Select Payment Method
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-600" /> Superfast Delivery
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              To Pay
            </span>
            <span className="text-base font-black text-primary">
              ₹{totalAmount.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Scrollable Payment Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* SECTION 1: 1-TAP UPI (RECOMMENDED) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-primary" />
                Pay via UPI (Instant &amp; 1-Tap)
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Fastest
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {/* PhonePe */}
              <div
                onClick={() => setSelectedMethod("PHONEPE")}
                className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  selectedMethod === "PHONEPE" ? "bg-primary/5" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center font-black text-sm shrink-0">
                    पे
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-surface-dark">PhonePe</span>
                      <span className="text-[9px] font-extrabold text-purple-700 bg-purple-50 px-1 py-0.2 rounded">
                        1-Tap
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Direct UPI Intent via Cashfree
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  selectedMethod === "PHONEPE" ? "border-primary bg-primary text-white" : "border-slate-300"
                }`}>
                  {selectedMethod === "PHONEPE" && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Google Pay */}
              <div
                onClick={() => setSelectedMethod("GPAY")}
                className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  selectedMethod === "GPAY" ? "bg-primary/5" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black text-xs shrink-0">
                    GPay
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-surface-dark">Google Pay</span>
                      <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1 py-0.2 rounded">
                        Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Fast UPI Payment
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  selectedMethod === "GPAY" ? "border-primary bg-primary text-white" : "border-slate-300"
                }`}>
                  {selectedMethod === "GPAY" && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Paytm */}
              <div
                onClick={() => setSelectedMethod("PAYTM")}
                className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  selectedMethod === "PAYTM" ? "bg-primary/5" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center font-black text-xs shrink-0">
                    Paytm
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-surface-dark">Paytm UPI</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Wallet / Bank UPI
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  selectedMethod === "PAYTM" ? "border-primary bg-primary text-white" : "border-slate-300"
                }`}>
                  {selectedMethod === "PAYTM" && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Other UPI Apps (Cashfree Native Sheet) */}
              <div
                onClick={() => setSelectedMethod("OTHER_UPI")}
                className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  selectedMethod === "OTHER_UPI" ? "bg-primary/5" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-black text-xs shrink-0">
                    UPI
                  </div>
                  <div>
                    <span className="text-xs font-bold text-surface-dark">
                      Any other UPI App
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      BHIM, Cred, Navi, Amazon Pay, Banking Apps
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  selectedMethod === "OTHER_UPI" ? "border-primary bg-primary text-white" : "border-slate-300"
                }`}>
                  {selectedMethod === "OTHER_UPI" && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Enter UPI ID / VPA Fallback */}
              <div
                onClick={() => setSelectedMethod("UPI_ID")}
                className={`p-3.5 cursor-pointer transition-all ${
                  selectedMethod === "UPI_ID" ? "bg-primary/5" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                      @
                    </div>
                    <div>
                      <span className="text-xs font-bold text-surface-dark">
                        Enter UPI ID (VPA)
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Pay using your UPI ID from any phone
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedMethod === "UPI_ID" ? "border-primary bg-primary text-white" : "border-slate-300"
                  }`}>
                    {selectedMethod === "UPI_ID" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {selectedMethod === "UPI_ID" && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <Input
                      placeholder="e.g. 9109066668@ybl or name@okaxis"
                      value={upiIdInput}
                      onChange={(e) => {
                        setUpiIdInput(e.target.value);
                        setUpiIdError("");
                      }}
                      className="text-xs h-9 bg-white"
                      autoFocus
                    />
                    {upiIdError && (
                      <p className="text-[11px] text-red-500 font-medium">
                        {upiIdError}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      A payment request will be sent to your UPI app. Approve it to confirm your order.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: PAY ON DELIVERY */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block px-1">
              Pay on Delivery (Doorstep)
            </span>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {/* UPI at Doorstep */}
              <div
                onClick={() => setSelectedMethod("UPI_DOORSTEP")}
                className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  selectedMethod === "UPI_DOORSTEP" ? "bg-primary/5" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-surface-dark">
                      UPI at Delivery
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Scan QR code on delivery partner&apos;s phone
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  selectedMethod === "UPI_DOORSTEP" ? "border-primary bg-primary text-white" : "border-slate-300"
                }`}>
                  {selectedMethod === "UPI_DOORSTEP" && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Cash on Delivery */}
              <div
                onClick={() => setSelectedMethod("COD")}
                className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  selectedMethod === "COD" ? "bg-primary/5" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-surface-dark">
                      Cash on Delivery
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Pay cash at your doorstep
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  selectedMethod === "COD" ? "border-primary bg-primary text-white" : "border-slate-300"
                }`}>
                  {selectedMethod === "COD" && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: CARDS & NETBANKING */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block px-1">
              Cards &amp; NetBanking
            </span>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div
                onClick={() => setSelectedMethod("CARDS")}
                className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  selectedMethod === "CARDS" ? "bg-primary/5" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-surface-dark">
                      Credit / Debit Card &amp; NetBanking
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Visa, Mastercard, RuPay, 50+ Banks via Cashfree
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  selectedMethod === "CARDS" ? "border-primary bg-primary text-white" : "border-slate-300"
                }`}>
                  {selectedMethod === "CARDS" && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="bg-white p-4 border-t border-slate-100 shadow-md flex items-center justify-between gap-3 sticky bottom-0">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">
              Total Amount
            </span>
            <span className="text-lg font-black text-surface-dark">
              ₹{totalAmount.toFixed(0)}
            </span>
          </div>

          <Button
            size="lg"
            onClick={handlePay}
            disabled={isProcessing}
            className="flex-1 bg-primary hover:bg-primary-hover text-white rounded-2xl h-12 text-sm font-extrabold shadow-md gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <span>Pay ₹{totalAmount.toFixed(0)}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
