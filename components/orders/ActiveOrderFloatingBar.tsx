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
  X,
  ChevronDown,
  ChevronUp,
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
        label: "Packing Order",
        icon: Package,
      };
    case "READY_FOR_PICKUP":
      return {
        label: "Rider Arriving",
        icon: Package,
      };
    case "OUT_FOR_DELIVERY":
      return {
        label: "Out for Delivery",
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
  const [isDismissed, setIsDismissed] = React.useState<boolean>(false);
  const [isMinimized, setIsMinimized] = React.useState<boolean>(false);

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

      // Check if this specific order was explicitly dismissed in this browser session
      if (typeof window !== "undefined") {
        const dismissedKey = `sq_dismissed_order_${data.order.orderNumber}`;
        if (sessionStorage.getItem(dismissedKey) === "true") {
          setIsDismissed(true);
        } else {
          setIsDismissed(false);
        }
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

  const handleDismissOrderBar = () => {
    if (order?.orderNumber && typeof window !== "undefined") {
      sessionStorage.setItem(`sq_dismissed_order_${order.orderNumber}`, "true");
    }
    setIsDismissed(true);
  };

  // Visibility checks
  if (!order || authStatus !== "authenticated" || isDismissed) {
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

  // Minimized Compact Pill Floating State
  if (isMinimized) {
    return (
      <div
        className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-3 sm:right-6 z-50 transition-all duration-300 ${
          isExiting ? "opacity-0 scale-90 pointer-events-none" : "opacity-100 scale-100"
        }`}
      >
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md text-slate-900 border border-slate-200/90 rounded-full px-3 py-1.5 shadow-lg ring-1 ring-slate-900/5">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-1.5 text-xs font-bold hover:text-emerald-600 transition-colors"
            title="Expand Order Status"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>#{order.orderNumber.slice(-4)} (~{eta}m)</span>
            <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
          </button>
          <button
            type="button"
            onClick={handleDismissOrderBar}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-0.5"
            title="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <aside
      aria-label="Active delivery order status"
      className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 inset-x-3 sm:inset-x-4 max-w-lg mx-auto z-50 transition-all duration-300 ease-out ${
        isExiting
          ? "opacity-0 translate-y-6 pointer-events-none"
          : "opacity-100 translate-y-0"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md text-slate-900 border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-between gap-2 sm:gap-3 relative overflow-hidden ring-1 ring-slate-900/5">
        {/* Subtle Top Emerald Line */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />

        {/* Left Column: Icon + Status + ETA */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Pulsing kinetic icon container */}
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 shrink-0">
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <StatusIcon className="w-4 h-4" />
          </div>

          {/* Minimal Status Label & Subtext */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate text-xs sm:text-sm font-bold text-slate-900">
              <span className="truncate">{statusDetails.label}</span>
              <span className="text-slate-300 shrink-0">•</span>
              <span className="text-emerald-600 font-semibold shrink-0">~{eta}m</span>
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
              Order #{order.orderNumber.slice(-4)} • {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
            </div>
          </div>
        </div>

        {/* Right Column: OTP + Track CTA + Minimize/Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* OTP Pill */}
          <div className="bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold text-emerald-800 shrink-0">
            OTP {order.deliveryOtp}
          </div>

          {/* Track CTA */}
          <Link
            href={`/orders/${order.orderNumber}`}
            className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-colors shadow-sm active:scale-95"
            title={`Track Order #${order.orderNumber}`}
          >
            <span>Track</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            title="Minimize"
            aria-label="Minimize"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleDismissOrderBar}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            title="Dismiss"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
