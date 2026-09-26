"use client";

import * as React from "react";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Copy,
  ArrowRight,
  TrendingDown,
  ShoppingBag,
  PartyPopper,
  Ticket,
  Tag,
  Truck,
} from "lucide-react";

export interface OrderCelebrationData {
  orderNumber: string;
  totalAmount: number;
  deliveryOtp: string;
  totalSavings: number;
  savingsBreakdown?: {
    mrpSavings?: number;
    couponSavings?: number;
    couponCode?: string;
    deliverySavings?: number;
  };
  paymentMethod?: string;
}

interface OrderCelebrationModalProps {
  isOpen: boolean;
  order: OrderCelebrationData | null;
  onClose: () => void;
  onTrackOrder: () => void;
}

export function OrderCelebrationModal({
  isOpen,
  order,
  onClose,
  onTrackOrder,
}: OrderCelebrationModalProps) {
  const [copiedOtp, setCopiedOtp] = React.useState(false);

  // Trigger celebration confetti when modal pops open
  React.useEffect(() => {
    if (isOpen && order) {
      // 1. Center energetic burst
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.55 },
        colors: ["#0B6E4F", "#00C853", "#F59E0B", "#10B981", "#3B82F6"],
        zIndex: 9999999,
      });

      // 2. Left and Right cannon bursts
      const timer = setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0.1, y: 0.65 },
          colors: ["#0B6E4F", "#00C853", "#F59E0B"],
          zIndex: 9999999,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 0.9, y: 0.65 },
          colors: ["#0B6E4F", "#00C853", "#F59E0B"],
          zIndex: 9999999,
        });
      }, 280);

      return () => clearTimeout(timer);
    }
  }, [isOpen, order]);

  if (!order) return null;

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(order.deliveryOtp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const hasSavings = order.totalSavings > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 bg-white rounded-3xl border-2 border-primary/30 shadow-2xl overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          {/* Animated Celebration Icon */}
          <div className="relative">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-primary to-emerald-400 p-0.5 shadow-lg shadow-primary/20 animate-in zoom-in-75 duration-300">
              <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
                <PartyPopper className="w-9 h-9 text-primary animate-bounce" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-md">
              <Sparkles className="w-3.5 h-3.5 fill-amber-950" />
            </span>
          </div>

          {/* Heading */}
          <DialogHeader className="space-y-1 text-center">
            <Badge
              variant="accent"
              className="mx-auto text-[11px] font-black uppercase px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border-emerald-300"
            >
              Order Placed Successfully!
            </Badge>
            <DialogTitle className="text-2xl sm:text-3xl font-black text-surface-dark tracking-tight">                Woohoo! It&apos;s Confirmed
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">                Your items are being packed at Dark Store Hub #01. Arriving in 10-15 mins!
            </DialogDescription>
          </DialogHeader>

          {/* TOTAL SAVINGS CELEBRATION CARD */}
          {hasSavings && (
            <div className="w-full bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-teal-500/10 border-2 border-emerald-400/60 rounded-2xl p-3.5 text-center shadow-xs space-y-1 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-800 uppercase tracking-wider">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                <span>Super Saver Deal!</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono flex items-center justify-center gap-1">
                <span>You Saved</span>
                <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg shadow-xs">
                  ₹{order.totalSavings}
                </span>
                <span>on this order!</span>
              </div>
              {order.savingsBreakdown && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[10px] text-emerald-800/80 font-semibold">
                  {(order.savingsBreakdown.couponSavings || 0) > 0 && (
                    <span className="bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                      <Ticket className="w-3 h-3" />
                      Coupon ({order.savingsBreakdown.couponCode}): -₹{order.savingsBreakdown.couponSavings}
                    </span>
                  )}
                  {(order.savingsBreakdown.mrpSavings || 0) > 0 && (
                    <span className="bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      MRP Discount: -₹{order.savingsBreakdown.mrpSavings}
                    </span>
                  )}
                  {(order.savingsBreakdown.deliverySavings || 0) > 0 && (
                    <span className="bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Free Delivery: -₹{order.savingsBreakdown.deliverySavings}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ORDER NUMBER & DELIVERY OTP CARD */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-left">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-semibold">Order Number</span>
              <span className="font-mono font-bold text-surface-dark bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                #{order.orderNumber}
              </span>
            </div>

            {/* OTP Section */}
            <div className="border-t border-dashed border-slate-200 pt-3 flex flex-col items-center text-center">
              <span className="text-[10px] uppercase tracking-widest font-black text-primary">
                Delivery Verification OTP
              </span>
              <div className="mt-1 flex items-center gap-2">
                <div className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-surface-dark bg-primary-accent/20 px-4 py-1 rounded-xl border border-primary-accent/50 shadow-inner">
                  {order.deliveryOtp}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyOtp}
                  className="h-10 px-2.5 rounded-xl border-slate-200 hover:bg-white text-xs"
                  title="Copy OTP"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="ml-1 text-[11px] font-mono">
                    {copiedOtp ? "Copied!" : "Copy"}
                  </span>
                </Button>
              </div>
              <span className="mt-1 text-[10px] text-muted-foreground">
                Share this OTP with your delivery partner upon arrival
              </span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-600">Total Bill Paid</span>
              <span className="text-primary font-black text-base font-mono">
                ₹{order.totalAmount}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="w-full space-y-2 pt-1">
            <Button
              onClick={onTrackOrder}
              className="w-full h-12 text-sm font-black rounded-xl shadow-lg bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Track Live Order &bull; #{order.orderNumber}</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>

            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full h-10 text-xs font-bold text-muted-foreground hover:text-surface-dark rounded-xl"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
