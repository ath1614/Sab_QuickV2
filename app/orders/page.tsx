"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Clock,
  ShoppingBag,
  ArrowLeft,
  Bike,
  Package,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RotateCw,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthModalStore } from "@/store/useAuthModalStore";
import { Logo } from "@/components/brand/Logo";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    imageUrl: string;
    unit: string;
  };
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  deliveryOtp: string;
  createdAt: string;
  items: OrderItem[];
  address?: {
    flatBuilding: string;
    streetArea: string;
  } | null;
  rider?: {
    name: string;
    phone: string;
    riderProfile?: {
      vehicleDetails: string | null;
    } | null;
  } | null;
}

const ACTIVE_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
];

export default function OrdersPage() {
  const { data: session, status: authStatus } = useSession();
  const { openAuthModal } = useAuthModalStore();
  const [orders, setOrders] = React.useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchOrders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    if (session?.user) {
      fetchOrders();
    } else if (authStatus !== "loading") {
      setIsLoading(false);
    }
  }, [session, authStatus, fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const activeOrders = (orders || []).filter((o) => o && o.status && ACTIVE_STATUSES.includes(o.status));
  const pastOrders = (orders || []).filter((o) => o && o.status && !ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 pt-[env(safe-area-inset-top,0px)]">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-xs">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-surface-dark transition-colors"
              title="Back to Store"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Logo variant="icon" size={28} />
              <h1 className="text-lg font-black text-surface-dark tracking-tight">
                My Orders
              </h1>
            </div>
          </div>

          {session?.user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-xl gap-1.5 text-xs text-muted-foreground hover:text-primary"
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* State 1: Unauthenticated */}
        {!session?.user && authStatus !== "loading" && (
          <div className="text-center py-16 px-4 space-y-5 bg-white rounded-3xl border border-border-subtle shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-primary flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-sm mx-auto">
              <h2 className="text-xl font-black text-surface-dark">
                Track Live 10-15 Min Deliveries
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sign in with your mobile number to view active orders, delivery OTPs, and past purchase receipts.
              </p>
            </div>
            <Button
              variant="default"
              onClick={openAuthModal}
              className="gap-2 rounded-2xl h-12 px-6 font-bold text-sm shadow-md"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </Button>
          </div>
        )}

        {/* State 2: Authenticated & Loading */}
        {session?.user && isLoading && (
          <div className="space-y-4">
            <div className="h-44 bg-white rounded-3xl border border-border-subtle animate-pulse" />
            <div className="h-32 bg-white rounded-3xl border border-border-subtle animate-pulse" />
          </div>
        )}

        {/* State 3: Authenticated with Orders */}
        {session?.user && !isLoading && (
          <>
            {/* Active Orders Section */}
            {activeOrders.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <h2 className="text-sm font-black text-surface-dark uppercase tracking-wider">
                      Live Delivery in Progress
                    </h2>
                  </div>
                  <Badge variant="accent" className="text-[10px] uppercase font-bold py-0.5 px-2">
                    10-15 Min SLA
                  </Badge>
                </div>

                {activeOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 rounded-3xl bg-white border-2 border-primary/20 shadow-md space-y-4 hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Order Number</span>
                        <p className="text-base font-black text-surface-dark">
                          #{order.orderNumber}
                        </p>
                      </div>
                      <Badge variant="default" className="text-xs font-bold py-1 px-3">
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {/* Delivery OTP Highlight Box */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Delivery OTP
                        </span>
                        <p className="text-[11px] text-emerald-800">
                          Share this code with rider upon delivery
                        </p>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-base font-black text-emerald-950">
                        {String(order.deliveryOtp || "1234").split("").map((digit, i) => (
                          <span
                            key={i}
                            className="w-8 h-8 rounded-xl bg-white border border-emerald-300 shadow-xs flex items-center justify-center text-primary"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Rider Info if assigned */}
                    {order.rider && (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-border-subtle text-xs">
                        <div className="w-8 h-8 rounded-full bg-primary-accent text-surface-dark flex items-center justify-center font-bold shrink-0">
                          <Bike className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-surface-dark truncate">
                            {order.rider.name || "Delivery Partner"}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {order.rider.riderProfile?.vehicleDetails || "EV Scooter"} • +91 {order.rider.phone || "N/A"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Items Summary & Action */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {(order.items || []).reduce((s, it) => s + (it?.quantity || 1), 0)} Items • ₹{order.totalAmount || 0}
                      </span>

                      <Link href={`/orders/${order.orderNumber}`}>
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-md"
                        >
                          <span>Track Live on Map</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Past Orders Section */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-surface-dark uppercase tracking-wider">
                Order History
              </h2>

              {pastOrders.length === 0 && activeOrders.length === 0 && (
                <div className="text-center py-16 px-4 space-y-4 bg-white rounded-3xl border border-border-subtle shadow-xs">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 text-muted-foreground flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <h3 className="text-base font-bold text-surface-dark">
                      No Orders Yet
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Explore fresh groceries, dairy, and snacks delivered in 10-15 minutes.
                    </p>
                  </div>
                  <Link href="/">
                    <Button variant="default" className="rounded-2xl h-11 px-6 text-xs font-bold">
                      Explore Store
                    </Button>
                  </Link>
                </div>
              )}

              {pastOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.orderNumber}`}
                  className="block p-4 rounded-2xl bg-white border border-border-subtle shadow-xs hover:border-primary/40 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold text-sm text-surface-dark">
                        #{order.orderNumber}
                      </span>
                    </div>
                    <Badge
                      variant={order.status === "DELIVERED" ? "secondary" : "outline"}
                      className="text-[10px] font-bold py-0.5 px-2"
                    >
                      {order.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }) : "Recent"} • {(order.items || []).length} items
                    </span>
                    <div className="flex items-center gap-1 font-bold text-surface-dark group-hover:text-primary transition-colors">
                      <span>₹{order.totalAmount || 0}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
