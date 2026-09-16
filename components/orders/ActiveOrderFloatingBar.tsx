"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bike,
  Package,
  Zap,
  ArrowRight,
} from "lucide-react";

export interface ActiveOrderData {
  id: string;
  orderNumber: string;
  status: "PENDING" | "CONFIRMED" | "PACKING" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
  totalAmount: number;
  deliveryOtp: string;
  createdAt: string;
  etaMinutes: number;
  itemsCount: number;
  rider: {
    id?: string;
    name: string | null;
    phone: string | null;
    vehicleDetails?: string | null;
  } | null;
}

function getStatusDetails(status: string) {
  switch (status) {
    case "PENDING":
    case "CONFIRMED":
      return {
        label: "Order Confirmed",
        icon: Zap,
      };
    case "PACKING":
      return {
        label: "Dark Store packing your items",
        icon: Package,
      };
    case "READY_FOR_PICKUP":
      return {
        label: "Bag ready • Rider arriving",
        icon: Package,
      };
    case "OUT_FOR_DELIVERY":
      return {
        label: "Rider on the way to your door",
        icon: Bike,
      };
    default:
      return {
        label: "Order in Progress",
        icon: Zap,
      };
  }
}

export function ActiveOrderFloatingBar() {
  const { data: session, status: authStatus } = useSession();
  const pathname = usePathname();
  const [order, setOrder] = React.useState<ActiveOrderData | null>(null);
  const [eta, setEta] = React.useState<number>(12);
  const [isExiting, setIsExiting] = React.useState<boolean>(false);

  // 1. Fetch active order
  const fetchActiveOrder = React.useCallback(async () => {
    if (authStatus !== "authenticated" || !session?.user?.id) {
      setOrder(null);
      return;
    }

    try {
      const res = await fetch("/api/orders/active");
      if (!res.ok) return;
      const data = await res.json();

      if (!data.order) {
        if (order) {
          // Smooth exit transition
          setIsExiting(true);
          setTimeout(() => {
            setOrder(null);
            setIsExiting(false);
          }, 400);
        }
        return;
      }

      if (data.order.status === "DELIVERED" || data.order.status === "CANCELLED") {
        setIsExiting(true);
        setTimeout(() => {
          setOrder(null);
          setIsExiting(false);
        }, 400);
        return;
      }

      setOrder(data.order);
      setEta(data.order.etaMinutes || 12);
      setIsExiting(false);
    } catch (err) {
      console.warn("Failed to fetch active order:", err);
    }
  }, [authStatus, session?.user?.id, order]);

  // Initial fetch and 8s polling
  React.useEffect(() => {
    if (authStatus === "authenticated") {
      fetchActiveOrder();
      const interval = setInterval(fetchActiveOrder, 8000);

      const handleFocus = () => {
        fetchActiveOrder();
      };
      window.addEventListener("focus", handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", handleFocus);
      };
    } else {
      setOrder(null);
    }
  }, [authStatus, fetchActiveOrder]);

  // 2. Real-time SSE listener to the active order stream
  React.useEffect(() => {
    if (!order?.orderNumber) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/orders/${order.orderNumber}/stream`);

      eventSource.addEventListener("status_update", (event: MessageEvent) => {
        try {
          const update = JSON.parse(event.data);
          if (update.status === "DELIVERED" || update.status === "CANCELLED") {
            setIsExiting(true);
            setTimeout(() => {
              setOrder(null);
              setIsExiting(false);
            }, 400);
          } else {
            setOrder((prev) => (prev ? { ...prev, status: update.status } : null));
          }
        } catch (e) {
          console.error("Failed to parse SSE update in floating bar:", e);
        }
      });
    } catch (e) {
      console.warn("SSE connection error in floating bar:", e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [order?.orderNumber]);

  // 3. Local live countdown for ETA
  React.useEffect(() => {
    if (!order?.createdAt) return;

    const calcEta = () => {
      const createdTime = new Date(order.createdAt).getTime();
      const targetTime = createdTime + 15 * 60 * 1000;
      const remainingMs = targetTime - Date.now();
      const mins = Math.max(1, Math.min(15, Math.ceil(remainingMs / 60000)));
      setEta(mins);
    };

    calcEta();
    const timer = setInterval(calcEta, 30000);
    return () => clearInterval(timer);
  }, [order?.createdAt]);

  // Visibility checks
  if (!order || authStatus !== "authenticated") {
    return null;
  }

  // Hide when viewing the dedicated tracking page for this specific order
  const isDedicatedTrackingPage =
    pathname === `/orders/${order.orderNumber}` ||
    pathname.startsWith(`/orders/${order.orderNumber}/`);

  if (isDedicatedTrackingPage) {
    return null;
  }

  const statusDetails = getStatusDetails(order.status);
  const StatusIcon = statusDetails.icon;

  return (
    <aside
      aria-label="Active delivery order status"
      className={`fixed bottom-4 inset-x-4 max-w-xl mx-auto z-50 transition-all duration-400 ease-out ${
        isExiting
          ? "opacity-0 translate-y-8 pointer-events-none"
          : "opacity-100 translate-y-0"
      }`}
    >
      <div className="bg-slate-950/95 backdrop-blur-md text-white border border-emerald-500/30 rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center justify-between gap-3 relative overflow-hidden ring-1 ring-white/10">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

        {/* Left Column: Icon + Status + ETA */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Pulsing kinetic icon container */}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <StatusIcon className="w-5 h-5 animate-pulse" />
          </div>

          {/* Status Label & Subtext */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white truncate">
                {statusDetails.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                <Zap className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                Arriving in ~{eta} mins
              </span>
              <span className="text-slate-600 text-xs">&bull;</span>
              <span className="text-[11px] text-slate-400 truncate">
                {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right Column: 4-digit OTP + Track CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* 4-Digit In-App Delivery OTP Pill */}
          <div className="bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-md text-xs font-mono font-bold text-emerald-400 shrink-0 shadow-inner">
            OTP: {order.deliveryOtp}
          </div>

          {/* Track CTA Button */}
          <Link
            href={`/orders/${order.orderNumber}`}
            className="h-8 sm:h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shrink-0 transition-all shadow-sm active:scale-95"
            title={`Track Order #${order.orderNumber}`}
          >
            <span>Track</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
