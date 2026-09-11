"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Power,
  TrendingUp,
  Coins,
  PackageCheck,
  Bike,
  Loader2,
} from "lucide-react";

export interface RiderStats {
  completedOrdersCount: number;
  totalCollectedCash: number;
  totalTips: number;
  basePayoutPerOrder: number;
  estimatedEarnings: number;
}

interface ShiftHeaderProps {
  isOnline: boolean;
  onToggleShift: (newOnlineState: boolean) => Promise<void>;
  stats: RiderStats;
  riderName?: string | null;
  vehicleDetails?: string | null;
  isToggling?: boolean;
}

export function ShiftHeader({
  isOnline,
  onToggleShift,
  stats,
  riderName = "SabQuick Delivery Partner",
  vehicleDetails = "Ather 450X (Electric)",
  isToggling = false,
}: ShiftHeaderProps) {
  return (
    <div className="bg-surface-dark text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-5">
      {/* Top Rider Info & Shift Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary-accent/15 border border-primary-accent/30 text-primary-accent flex items-center justify-center font-black text-xl shrink-0">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                {riderName}
              </h1>
              <Badge
                variant={isOnline ? "accent" : "outline"}
                className={`text-[10px] font-bold py-0.5 px-2 ${
                  isOnline
                    ? "bg-primary-accent text-surface-dark"
                    : "text-slate-400 border-slate-700"
                }`}
              >
                {isOnline ? "● ON DUTY (ACCEPTING)" : "○ OFF DUTY"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {vehicleDetails}
            </p>
          </div>
        </div>

        {/* Large Touch Shift Toggle Button (min 52px height) */}
        <Button
          type="button"
          disabled={isToggling}
          onClick={() => onToggleShift(!isOnline)}
          className={`h-12 sm:h-14 px-6 rounded-2xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2.5 ${
            isOnline
              ? "bg-red-500/15 text-red-400 border border-red-500/40 hover:bg-red-500/25"
              : "bg-primary-accent text-surface-dark hover:bg-primary-accent/90 shadow-primary-accent/20"
          }`}
        >
          {isToggling ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Power className="w-5 h-5" />
          )}
          <span>{isOnline ? "GO OFFLINE" : "GO ONLINE & START SHIFT"}</span>
        </Button>
      </div>

      {/* Today's Quick Metrics Grid */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-1">
        {/* Metric 1: Deliveries Completed */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Completed
            </span>
            <PackageCheck className="w-4 h-4 text-primary-accent" />
          </div>
          <div className="mt-2">
            <div className="font-mono text-xl sm:text-2xl font-black text-white">
              {stats.completedOrdersCount}
            </div>
            <span className="text-[10px] text-slate-400">Orders today</span>
          </div>
        </div>

        {/* Metric 2: Cash / Doorstep UPI Collected */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Cash / UPI
            </span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="font-mono text-xl sm:text-2xl font-black text-white">
              ₹{stats.totalCollectedCash}
            </div>
            <span className="text-[10px] text-slate-400">To remit at hub</span>
          </div>
        </div>

        {/* Metric 3: Total Earnings (Base + Tips) */}
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-primary-accent">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              Earnings
            </span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className="font-mono text-xl sm:text-2xl font-black text-primary-accent">
              ₹{stats.estimatedEarnings}
            </div>
            <span className="text-[10px] text-slate-300">
              ₹{stats.basePayoutPerOrder}/del + ₹{stats.totalTips} tip
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
