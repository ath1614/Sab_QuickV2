"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShiftHeader, RiderStats } from "@/components/rider/ShiftHeader";
import {
  IncomingDispatchAlert,
  AvailableOrder,
} from "@/components/rider/IncomingDispatchAlert";
import {
  ActiveDeliveryCard,
  ActiveOrderData,
} from "@/components/rider/ActiveDeliveryCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bike,
  LogOut,
  RefreshCw,
  Home,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function RiderDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isTogglingShift, setIsTogglingShift] = React.useState<boolean>(false);
  const [acceptingOrderId, setAcceptingOrderId] = React.useState<string | null>(null);

  const [isOnline, setIsOnline] = React.useState<boolean>(false);
  const [vehicleDetails, setVehicleDetails] = React.useState<string>("");
  const [stats, setStats] = React.useState<RiderStats>({
    completedOrdersCount: 0,
    totalCollectedCash: 0,
    totalTips: 0,
    basePayoutPerOrder: 30,
    estimatedEarnings: 0,
  });

  const [activeOrder, setActiveOrder] = React.useState<ActiveOrderData | null>(null);
  const [availableOrders, setAvailableOrders] = React.useState<AvailableOrder[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Fetch rider status
  const fetchRiderStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/rider/status");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/?auth_error=unauthorized_role");
          return;
        }
        throw new Error("Failed to load rider profile");
      }

      const data = await res.json();
      setIsOnline(data.isOnline);
      setVehicleDetails(data.vehicleDetails || "");
      setStats(data.stats);
      setActiveOrder(data.activeOrder);
      setAvailableOrders(data.availableOrders || []);
      setErrorMsg(null);
    } catch (err: any) {
      console.warn("Rider status poll error:", err);
      setErrorMsg(err.message || "Connection interrupted.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Initial fetch and auto-polling loop every 8 seconds
  React.useEffect(() => {
    if (status === "authenticated") {
      fetchRiderStatus();
      const interval = setInterval(fetchRiderStatus, 8000);
      return () => clearInterval(interval);
    } else if (status === "unauthenticated") {
      router.push("/?auth_error=unauthenticated");
    }
  }, [status, fetchRiderStatus, router]);

  // Toggle shift state
  const handleToggleShift = async (newOnlineState: boolean) => {
    setIsTogglingShift(true);
    try {
      const res = await fetch("/api/rider/toggle-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: newOnlineState }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle shift state");
      }

      const data = await res.json();
      setIsOnline(data.isOnline);
      await fetchRiderStatus();
    } catch (err: any) {
      alert(err.message || "Failed to toggle shift.");
    } finally {
      setIsTogglingShift(false);
    }
  };

  // Accept incoming order
  const handleAcceptOrder = async (orderId: string) => {
    setAcceptingOrderId(orderId);
    try {
      const res = await fetch("/api/rider/orders/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to accept order.");
        return;
      }

      await fetchRiderStatus();
    } catch (err: any) {
      alert(err.message || "Network error while accepting order.");
    } finally {
      setAcceptingOrderId(null);
    }
  };

  // Callback when delivery is completed
  const handleDeliveryCompleted = () => {
    fetchRiderStatus();
  };

  if (isLoading && status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-2.5 text-primary-accent font-bold">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading SabQuick Rider Terminal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-primary-accent selection:text-surface-dark pb-16">
      {/* Top Mobile-First App Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Logo variant="icon" theme="dark" size={36} className="rounded-xl shrink-0" />
            <div>
              <span className="font-black text-base tracking-tight text-white">
                SabQuick <span className="text-primary-accent">Rider</span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-mono">
                Hub #01 Express Fleet
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchRiderStatus()}
              className="text-slate-400 hover:text-white h-9 w-9 p-0 rounded-xl"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Link
              href="/"
              className="h-9 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Store</span>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 px-2.5 rounded-xl text-xs gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Terminal Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-2xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Shift Status & Daily Metrics Header */}
        <ShiftHeader
          isOnline={isOnline}
          onToggleShift={handleToggleShift}
          stats={stats}
          riderName={session?.user?.name}
          vehicleDetails={vehicleDetails}
          isToggling={isTogglingShift}
        />

        {/* 2. Active Delivery OR Incoming Dispatch Alerts */}
        {activeOrder ? (
          <div className="space-y-2">
            <ActiveDeliveryCard
              order={activeOrder}
              onDeliveryCompleted={handleDeliveryCompleted}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <IncomingDispatchAlert
              orders={availableOrders}
              onAcceptOrder={handleAcceptOrder}
              acceptingOrderId={acceptingOrderId}
              isOnline={isOnline}
            />
          </div>
        )}
      </main>
    </div>
  );
}
