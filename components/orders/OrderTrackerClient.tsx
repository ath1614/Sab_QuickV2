/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { OrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  MapPin,
  Sparkles,
  ShoppingBag,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

// Dynamically import Leaflet OrderRouteMap to disable SSR
const DynamicOrderRouteMap = dynamic(
  () => import("@/components/orders/OrderRouteMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[280px] sm:h-[320px] rounded-3xl bg-slate-100 flex flex-col items-center justify-center gap-2 border border-border-subtle animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Loading SabQuick transit route map...
        </span>
      </div>
    ),
  }
);

export interface TrackedOrderData {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryOtp: string;
  subtotal: number;
  deliveryFee: number;
  handlingFee: number;
  tipAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string | Date;
  packedAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  address: {
    id: string;
    label: string;
    flatBuilding: string;
    streetArea: string;
    landmark?: string | null;
    latitude: number;
    longitude: number;
  };
  rider?: {
    id: string;
    name: string | null;
    phone: string | null;
    vehicleDetails: string | null;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    title: string;
    unitQuantity: string;
    imageUrl: string;
    price: number;
    quantity: number;
  }>;
}

interface OrderTrackerClientProps {
  initialOrder: TrackedOrderData;
}

export function OrderTrackerClient({ initialOrder }: OrderTrackerClientProps) {
  const [order, setOrder] = React.useState<TrackedOrderData>(initialOrder);
  const [isAccordionOpen, setIsAccordionOpen] = React.useState<boolean>(false);
  const [copiedOtp, setCopiedOtp] = React.useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = React.useState<number>(900); // 15 mins default
  const [isConnected, setIsConnected] = React.useState<boolean>(true);

  // 1. Calculate Countdown ETA
  React.useEffect(() => {
    const createdTime = new Date(order.createdAt).getTime();
    const targetDeliveryTime = createdTime + 15 * 60 * 1000; // 15 minutes SLA

    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((targetDeliveryTime - now) / 1000));
      setRemainingSeconds(diffSecs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  // 2. Connect to Server-Sent Events (SSE) Stream
  React.useEffect(() => {
    const eventSource = new EventSource(
      `/api/orders/${order.orderNumber}/stream`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.addEventListener("initial_state", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setOrder((prev) => ({ ...prev, ...data }));
      } catch (err) {
        console.error("Failed to parse initial_state event:", err);
      }
    });

    eventSource.addEventListener("status_update", (event: MessageEvent) => {
      try {
        const update = JSON.parse(event.data);
        setOrder((prev) => ({
          ...prev,
          status: update.status,
          packedAt: update.packedAt ?? prev.packedAt,
          deliveredAt: update.deliveredAt ?? prev.deliveredAt,
          rider: update.rider ?? prev.rider,
        }));
      } catch (err) {
        console.error("Failed to parse status_update event:", err);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [order.orderNumber]);

  // Copy OTP handler
  const handleCopyOtp = () => {
    navigator.clipboard.writeText(order.deliveryOtp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  // Determine active stepper stage (1 to 4)
  const getStageIndex = (status: OrderStatus): number => {
    switch (status) {
      case "PENDING":
      case "CONFIRMED":
        return 1;
      case "PACKING":
        return 2;
      case "READY_FOR_PICKUP":
      case "OUT_FOR_DELIVERY":
        return 3;
      case "DELIVERED":
        return 4;
      default:
        return 1;
    }
  };

  const currentStage = getStageIndex(order.status);
  const isDelivered = order.status === "DELIVERED";

  const stages = [
    {
      index: 1,
      name: "Order Confirmed",
      description: "Order placed & verified at store",
      icon: ShoppingBag,
    },
    {
      index: 2,
      name: "Packing at Dark Store",
      description: "Bagging items in Hub #01",
      icon: Package,
    },
    {
      index: 3,
      name: "Rider Out For Delivery",
      description: "Express courier en route to door",
      icon: Truck,
    },
    {
      index: 4,
      name: "Order Delivered",
      description: "Handed over at doorstep",
      icon: CheckCircle2,
    },
  ];

  const remainingMins = Math.floor(remainingSeconds / 60);
  const remainingSecs = remainingSeconds % 60;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-border-subtle shadow-sm text-xs font-bold text-muted-foreground hover:text-surface-dark hover:border-surface-dark transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Store</span>
          </Link>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-border-subtle shadow-sm text-xs font-bold text-muted-foreground hover:text-surface-dark hover:border-surface-dark transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>All Orders</span>
          </Link>
        </div>

        {/* Live SSE Status Pill */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-primary-accent animate-pulse" : "bg-amber-500"
            }`}
          />
          <span className="text-[11px] font-mono text-muted-foreground">
            {isConnected ? "Live Tracking Sync" : "Reconnecting..."}
          </span>
        </div>
      </div>

      {/* 1. HEADER CARD: Order Number & ETA Countdown */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-border-subtle shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Logo variant="compact" size={30} className="hidden sm:inline-block" />
            <h1 className="text-xl sm:text-2xl font-black text-surface-dark tracking-tight">
              Order #{order.orderNumber}
            </h1>
            <Badge variant="accent" className="font-bold text-xs">
              {isDelivered ? "Delivered" : "Express 10-15 Min SLA"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Dynamic Countdown Pill */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Estimated Delivery
            </span>
            <div className="font-mono text-lg font-black text-surface-dark flex items-center gap-1.5">
              {isDelivered ? (
                <span className="text-primary">Delivered 🎉</span>
              ) : (
                <>
                  <span>
                    {remainingMins}:{remainingSecs < 10 ? `0${remainingSecs}` : remainingSecs}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Mins Left
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4-STAGE VISUAL STATUS STEPPER */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-border-subtle shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-surface-dark flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary fill-primary" />
            Live Delivery Progression
          </h2>
          <span className="text-xs font-bold text-primary font-mono">
            Stage {currentStage} of 4
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-2 relative">
          {stages.map((stage) => {
            const isCompleted = stage.index < currentStage || isDelivered;
            const isCurrent = stage.index === currentStage && !isDelivered;
            const StageIcon = stage.icon;

            return (
              <div
                key={stage.index}
                className={`relative p-3.5 rounded-2xl border transition-all flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 ${
                  isCurrent
                    ? "bg-primary/5 border-primary shadow-xs ring-2 ring-primary/20"
                    : isCompleted
                    ? "bg-emerald-50/60 border-emerald-200"
                    : "bg-slate-50/60 border-slate-200 opacity-60"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold transition-colors ${
                    isCurrent
                      ? "bg-primary text-white shadow-md animate-pulse"
                      : isCompleted
                      ? "bg-primary text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <StageIcon className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-surface-dark truncate">
                      {stage.name}
                    </span>
                    {isCurrent && (
                      <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. HIGH-CONTRAST IN-APP DELIVERY OTP CARD */}
      <div className="rounded-3xl bg-surface-dark border-2 border-primary-accent p-6 text-white shadow-xl relative overflow-hidden">
        {/* Glow ambient background element */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary-accent/15 rounded-full blur-3xl pointer-events-none" />

        {isDelivered ? (
          <div className="py-4 flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary-accent/20 text-primary-accent flex items-center justify-center font-bold">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-white">
              Order Handed Over Successfully!
            </h3>
            <p className="text-xs text-slate-300 max-w-sm">
              Your grocery items were delivered in record time. Thank you for
              ordering with SabQuick!
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary-accent" />
                <span className="text-xs uppercase tracking-widest font-black text-primary-accent">
                  Secure Delivery Verification OTP
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                Share this OTP with rider upon delivery
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Give this 4-digit OTP to your delivery partner only after
                receiving and verifying your grocery bag.
              </p>
            </div>

            {/* Individual Stylized Monospace OTP Boxes */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              {(order.deliveryOtp ? String(order.deliveryOtp) : "1234").split("").map((digit, idx) => (
                <div
                  key={idx}
                  className="w-12 h-14 sm:w-14 sm:h-16 bg-white/10 text-white rounded-2xl flex items-center justify-center font-mono text-2xl sm:text-3xl font-black border border-primary-accent/40 shadow-inner"
                >
                  {digit}
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyOtp}
                className="text-slate-300 hover:text-white hover:bg-white/10 h-14 px-2.5 rounded-xl border border-white/10"
                title="Copy OTP"
              >
                <Copy className="w-4 h-4" />
                <span className="text-[10px] hidden sm:inline ml-1 font-mono">
                  {copiedOtp ? "Copied" : "Copy"}
                </span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 4. DELIVERY PARTNER & VEHICLE CARD (When rider is assigned) */}
      {order.rider && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-border-subtle shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
              {order.rider.name?.slice(0, 2).toUpperCase() || "RD"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-surface-dark">
                  {order.rider.name || "Delivery Partner"}
                </h3>
                <Badge variant="accent" className="text-[10px] py-0 px-1.5 font-bold">
                  Active Rider
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {order.rider.vehicleDetails || "Electric Two-Wheeler (Zero-Emission)"}
              </p>
            </div>
          </div>

          {/* Native Dialing Button */}
          {order.rider.phone && (
            <a
              href={`tel:${order.rider.phone}`}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-primary text-white font-bold text-xs shadow-sm hover:bg-primary/90 transition-all shrink-0"
            >
              <Phone className="w-4 h-4" />
              <span>Call Delivery Partner ({order.rider.phone})</span>
            </a>
          )}
        </div>
      )}

      {/* 5. ZERO-COST ROUTE VISUALIZATION MAP */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-surface-dark flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Live Transit Path
          </h2>
          <span className="text-xs text-muted-foreground">
            Delivering to: {order.address.flatBuilding}, {order.address.streetArea}
          </span>
        </div>

        <DynamicOrderRouteMap
          customerLat={order.address.latitude}
          customerLng={order.address.longitude}
          customerAddressLabel={order.address.label}
          orderStatus={order.status}
        />
      </div>

      {/* 6. ITEMIZED ORDER SUMMARY ACCORDION */}
      <div className="bg-white rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setIsAccordionOpen(!isAccordionOpen)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-surface-dark">
                Order Items & Bill Breakdown
              </h3>
              <p className="text-xs text-muted-foreground">
                {order.items.reduce((acc, i) => acc + i.quantity, 0)} items &bull; Total Paid: ₹{order.totalAmount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <span>{isAccordionOpen ? "Hide Details" : "View Details"}</span>
            {isAccordionOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {isAccordionOpen && (
          <div className="border-t border-slate-100 p-5 space-y-4 animate-in fade-in-50">
            {/* Item List */}
            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-surface-dark truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {item.unitQuantity} &bull; Qty: {item.quantity}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono font-bold text-surface-dark shrink-0">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs border border-slate-100">
              <div className="flex justify-between text-muted-foreground">
                <span>Item Subtotal</span>
                <span className="font-mono text-surface-dark font-medium">
                  ₹{order.subtotal}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Partner Fee</span>
                <div>
                  {order.deliveryFee === 0 ? (
                    <>
                      <span className="line-through text-slate-400 mr-1.5 font-mono text-[11px]">
                        ₹15
                      </span>
                      <span className="font-bold text-primary">FREE</span>
                    </>
                  ) : (
                    <span className="font-mono text-surface-dark font-medium">
                      ₹{order.deliveryFee}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Handling Charge</span>
                <span className="font-mono text-surface-dark font-medium">
                  ₹{order.handlingFee}
                </span>
              </div>
              {order.tipAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Rider Delivery Tip</span>
                  <span className="font-mono text-surface-dark font-medium">
                    ₹{order.tipAmount}
                  </span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-surface-dark">
                <span>Total Amount Paid</span>
                <span className="font-black text-primary font-mono text-base">
                  ₹{order.totalAmount}
                </span>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Payment Mode:</span>
                <span className="font-semibold text-surface-dark">
                  {order.paymentMethod === "UPI_DOORSTEP"
                    ? "UPI at Doorstep (Scan QR)"
                    : "Online Prepaid (UPI App)"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
