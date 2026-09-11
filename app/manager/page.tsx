"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Clock,
  Bike,
  PackageCheck,
  AlertTriangle,
  Search,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Send,
  SlidersHorizontal,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand/Logo";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  aisle: string;
  product: {
    id: string;
    name: string;
    imageUrl: string;
    packSize: string;
    isAvailable: boolean;
    stockQuantity: number;
  };
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: "PENDING" | "PACKING" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  createdAt: string;
  packedAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  elapsedMinutes: number;
  urgency: "NORMAL" | "WARNING" | "CRITICAL";
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
  };
  rider: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  address: {
    label: string;
    flatBuilding: string;
    streetArea: string;
  };
  items: OrderItem[];
}

interface RiderData {
  id: string;
  name: string | null;
  phone: string | null;
  isOnline: boolean;
  vehicleDetails: string;
}

interface ProductItem {
  id: string;
  title: string;
  imageUrl: string;
  packSize: string;
  price: number;
  stockCount: number;
  isAvailable: boolean;
}

export default function ManagerDispatchPage() {
  const { data: session, status: authStatus } = useSession();
  const [orders, setOrders] = React.useState<OrderData[]>([]);
  const [riders, setRiders] = React.useState<RiderData[]>([]);
  const [analytics, setAnalytics] = React.useState<{
    todayGMV: number;
    completedOrders: number;
    activeOrders: number;
    avgPackingTimeMinutes: number;
    lowStockCount: number;
  } | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // SKU Quick Search & Stock Toggle
  const [allProducts, setAllProducts] = React.useState<ProductItem[]>([]);
  const [skuSearch, setSkuSearch] = React.useState("");
  const [skuUpdatingId, setSkuUpdatingId] = React.useState<string | null>(null);

  // Selected Rider assignments map (orderId -> riderId)
  const [selectedRiders, setSelectedRiders] = React.useState<Record<string, string>>({});

  // View Delivered orders drawer/modal
  const [showDeliveredTab, setShowDeliveredTab] = React.useState(false);

  // 1. Fetch live orders & riders
  const fetchOrdersAndRiders = React.useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/ops/orders");
      if (!res.ok) throw new Error("Failed to fetch ops orders");
      const data = await res.json();
      setOrders(data.orders || []);
      setRiders(data.riders || []);
    } catch (err) {
      console.error("Manager orders fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 2. Fetch analytics & products catalog
  const fetchAnalyticsAndCatalog = React.useCallback(async () => {
    try {
      const res = await fetch("/api/ops/analytics");
      if (!res.ok) return;
      const data = await res.json();
      setAnalytics(data.metrics || null);
      if (data.allProducts) {
        setAllProducts(data.allProducts);
      }
    } catch (err) {
      console.error("Manager analytics fetch error:", err);
    }
  }, []);

  // Auto-polling every 4 seconds
  React.useEffect(() => {
    if (authStatus === "authenticated") {
      fetchOrdersAndRiders();
      fetchAnalyticsAndCatalog();
      const interval = setInterval(() => {
        fetchOrdersAndRiders(true);
        fetchAnalyticsAndCatalog();
      }, 4500);
      return () => clearInterval(interval);
    }
  }, [authStatus, fetchOrdersAndRiders, fetchAnalyticsAndCatalog]);

  // Handle Order Status / Rider Transition
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: "PACKING" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED",
    riderId?: string
  ) => {
    setActionLoadingId(orderId);
    try {
      const payload: { orderId: string; status: string; riderId?: string } = {
        orderId,
        status: newStatus,
      };
      if (riderId) {
        payload.riderId = riderId;
      } else if (selectedRiders[orderId]) {
        payload.riderId = selectedRiders[orderId];
      }

      const res = await fetch("/api/ops/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to update order: ${err.error || "Unknown error"}`);
        return;
      }

      await fetchOrdersAndRiders(true);
      await fetchAnalyticsAndCatalog();
    } catch (e) {
      console.error("Order status update error:", e);
      alert("Network error updating order status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Instant 1-click SKU availability toggle
  const handleToggleProductStock = async (productId: string, currentAvailable: boolean) => {
    setSkuUpdatingId(productId);
    try {
      const res = await fetch("/api/ops/inventory/toggle-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          isAvailable: !currentAvailable,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to toggle SKU: ${err.error || "Unknown error"}`);
        return;
      }

      const data = await res.json();
      // Update local state instantly
      setAllProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isAvailable: data.isAvailable } : p))
      );
    } catch (e) {
      console.error("Failed to toggle product stock:", e);
    } finally {
      setSkuUpdatingId(null);
    }
  };

  // Filtered Products for fast search bar
  const filteredProducts = React.useMemo(() => {
    if (!skuSearch.trim()) return [];
    const query = skuSearch.toLowerCase();
    return allProducts.filter((p) => p.title.toLowerCase().includes(query)).slice(0, 6);
  }, [allProducts, skuSearch]);

  // Role Protection
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Manager Dispatch Cockpit...</p>
        </div>
      </div>
    );
  }

  const role = session?.user?.role;
  const isAuthorized = role && ["MANAGER", "OWNER"].includes(role);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-border-subtle">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-surface-dark mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600 mb-6">
            The Live Dispatch Kanban Cockpit is reserved for <strong>Store Managers</strong> and <strong>Owners</strong>.
          </p>
          <Link href="/">
            <Button variant="default" className="w-full">
              Return to SabQuick Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Kanban Columns Data
  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const packingOrders = orders.filter((o) => o.status === "PACKING");
  const readyOrders = orders.filter((o) => o.status === "READY_FOR_PICKUP");
  const outOrders = orders.filter((o) => o.status === "OUT_FOR_DELIVERY");
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED");

  const onlineRidersCount = riders.filter((r) => r.isOnline).length;
  const activeOrdersCount = pendingOrders.length + packingOrders.length + readyOrders.length + outOrders.length;
  const slaBreachOrders = orders.filter(
    (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED" && o.elapsedMinutes >= 10
  );

  return (
    <div className="min-h-screen bg-slate-100 text-surface-dark flex flex-col antialiased">
      {/* Top Cockpit Header */}
      <header className="h-16 bg-white border-b border-border-subtle px-4 lg:px-8 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <Logo variant="icon" theme="dark" size={40} className="rounded-xl shadow-xs shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-surface-dark leading-tight">
                SabQuick <span className="text-primary">Dispatch Cockpit</span>
              </h1>
              <Badge variant="dark" className="text-[10px] uppercase font-black px-1.5 py-0">
                KANBAN OPS
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Live floor orchestration & 15-minute SLA dispatch
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <Link href="/packer">
            <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold gap-1.5 text-slate-700">
              <PackageCheck className="w-4 h-4 text-primary" />
              <span>Packer Station</span>
            </Button>
          </Link>

          {role === "OWNER" && (
            <Link href="/owner">
              <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold gap-1.5 text-slate-700">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Owner Hub</span>
              </Button>
            </Link>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchOrdersAndRiders();
              fetchAnalyticsAndCatalog();
            }}
            disabled={isRefreshing}
            className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </Button>

          <div className="flex items-center gap-2 pl-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Live</span>
          </div>
        </div>
      </header>

      {/* Operations Metrics Bar */}
      <section className="bg-white border-b border-border-subtle px-4 lg:px-8 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-6 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Orders
            </div>
            <div className="text-lg font-black text-surface-dark flex items-center gap-1.5">
              <span>{activeOrdersCount}</span>
              <span className="text-xs font-semibold text-slate-400">in hub pipeline</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Fleet Capacity
            </div>
            <div className="text-lg font-black text-surface-dark flex items-center gap-1.5">
              <span>{onlineRidersCount}</span>
              <span className="text-xs font-semibold text-slate-400">
                / {riders.length} Riders Online
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Avg Picking Time
            </div>
            <div className="text-lg font-black text-surface-dark flex items-center gap-1.5">
              <span>{analytics?.avgPackingTimeMinutes || 2.4}m</span>
              <span className="text-xs font-bold text-emerald-600">⚡ Target &lt;3m</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              slaBreachOrders.length > 0
                ? "bg-rose-100 text-rose-700 animate-pulse"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              SLA Risk (&gt;10m)
            </div>
            <div className="text-lg font-black text-surface-dark flex items-center gap-1.5">
              <span className={slaBreachOrders.length > 0 ? "text-rose-600" : ""}>
                {slaBreachOrders.length}
              </span>
              <span className="text-xs font-semibold text-slate-400">Orders flagged</span>
            </div>
          </div>
        </div>
      </section>

      {/* Instant SKU Out-of-Stock Search & 1-Click Toggle Strip */}
      <section className="bg-slate-50 border-b border-border-subtle px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                1-Click Stock Toggle:
              </span>
              <span className="text-xs text-slate-500 ml-1.5 hidden sm:inline">
                Instantly mark damaged or depleted SKUs out-of-stock without refreshing.
              </span>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={skuSearch}
              onChange={(e) => setSkuSearch(e.target.value)}
              placeholder="Search SKU name (e.g. Milk, Eggs)..."
              className="h-9 pl-9 pr-4 text-xs rounded-xl bg-white border-slate-300"
            />

            {/* Fast SKU Dropdown Results */}
            {filteredProducts.length > 0 && (
              <div className="absolute top-11 right-0 left-0 bg-white rounded-xl shadow-xl border border-border-subtle z-50 p-2 space-y-1 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-slate-100 relative shrink-0 overflow-hidden">
                        <Image
                          src={prod.imageUrl}
                          alt={prod.title}
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-surface-dark truncate max-w-[150px]">
                          {prod.title}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {prod.packSize} • {prod.stockCount} in stock
                        </div>
                      </div>
                    </div>

                    <Button
                      variant={prod.isAvailable ? "default" : "outline"}
                      size="sm"
                      disabled={skuUpdatingId === prod.id}
                      onClick={() => handleToggleProductStock(prod.id, prod.isAvailable)}
                      className={`h-7 px-2.5 rounded-lg text-[11px] font-black shrink-0 ${
                        prod.isAvailable
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "border-rose-300 text-rose-600 bg-rose-50 hover:bg-rose-100"
                      }`}
                    >
                      {skuUpdatingId === prod.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : prod.isAvailable ? (
                        "IN STOCK"
                      ) : (
                        "OUT OF STOCK"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4-Column Operations Kanban Board */}
      <main className="flex-1 p-4 lg:p-6 overflow-x-auto">
        <div className="min-w-[1050px] grid grid-cols-4 gap-4 h-full items-start">
          {/* COLUMN 1: PENDING / RECEIVED */}
          <div className="bg-slate-200/70 rounded-2xl p-3 border border-slate-300/80 flex flex-col max-h-[calc(100vh-210px)]">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  1. Received
                </h3>
              </div>
              <Badge variant="secondary" className="font-black text-xs px-2 py-0">
                {pendingOrders.length}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {pendingOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-medium">
                  No orders waiting for floor intake.
                </div>
              ) : (
                pendingOrders.map((order) => renderOrderCard(order, "PENDING"))
              )}
            </div>
          </div>

          {/* COLUMN 2: PACKING STATION */}
          <div className="bg-slate-200/70 rounded-2xl p-3 border border-slate-300/80 flex flex-col max-h-[calc(100vh-210px)]">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  2. Floor Picking
                </h3>
              </div>
              <Badge variant="accent" className="font-black text-xs px-2 py-0">
                {packingOrders.length}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {packingOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-medium">
                  No orders actively in picking totes.
                </div>
              ) : (
                packingOrders.map((order) => renderOrderCard(order, "PACKING"))
              )}
            </div>
          </div>

          {/* COLUMN 3: READY FOR PICKUP (DISPATCH STAGE) */}
          <div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-300/80 flex flex-col max-h-[calc(100vh-210px)]">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                  3. Ready for Pickup
                </h3>
              </div>
              <Badge variant="default" className="font-black text-xs px-2 py-0 bg-emerald-700">
                {readyOrders.length}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {readyOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-medium">
                  No orders staged in Dispatch Bay.
                </div>
              ) : (
                readyOrders.map((order) => renderOrderCard(order, "READY_FOR_PICKUP"))
              )}
            </div>
          </div>

          {/* COLUMN 4: OUT FOR DELIVERY */}
          <div className="bg-slate-200/70 rounded-2xl p-3 border border-slate-300/80 flex flex-col max-h-[calc(100vh-210px)]">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  4. En Route
                </h3>
              </div>
              <Badge variant="dark" className="font-black text-xs px-2 py-0">
                {outOrders.length}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {outOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-medium">
                  No active rider deliveries en route.
                </div>
              ) : (
                outOrders.map((order) => renderOrderCard(order, "OUT_FOR_DELIVERY"))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delivered Today Quick Drawer Button */}
      <footer className="h-10 bg-white border-t border-border-subtle px-6 flex items-center justify-between text-xs text-slate-600 shrink-0">
        <div>
          <span>Today&apos;s Delivered Fulfillment: </span>
          <strong className="text-emerald-700 font-bold">{deliveredOrders.length} orders</strong>
          <span className="text-slate-400 ml-2">
            (GMV: ₹{analytics?.todayGMV?.toLocaleString("en-IN") || 0})
          </span>
        </div>
        <button
          onClick={() => setShowDeliveredTab((v) => !v)}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          <span>{showDeliveredTab ? "Hide Delivered Log" : "View Delivered Log"}</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showDeliveredTab ? "rotate-90" : ""}`} />
        </button>
      </footer>

      {/* Delivered Orders Accordion Panel */}
      {showDeliveredTab && (
        <div className="bg-white border-t border-border-subtle p-4 max-h-60 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-700">Delivered Orders Today</h4>
            {deliveredOrders.length === 0 ? (
              <p className="text-xs text-slate-500">No delivered orders recorded yet today.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {deliveredOrders.map((d) => (
                  <div
                    key={d.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-surface-dark">{d.orderNumber}</span>
                      <span className="text-slate-500 ml-2">₹{d.totalAmount}</span>
                      <div className="text-[11px] text-slate-600">
                        {d.customer.name || "Customer"} • Rider: {d.rider?.name || "Rider"}
                      </div>
                    </div>
                    <Link href={`/orders/${d.orderNumber}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] font-bold">
                        Details
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Helper: Render individual Kanban Order Card
  function renderOrderCard(order: OrderData, colStage: "PENDING" | "PACKING" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY") {
    const isUpdating = actionLoadingId === order.id;
    const isSlaBreached = order.elapsedMinutes >= 10;
    const isWarning = order.elapsedMinutes >= 5 && order.elapsedMinutes < 10;

    // Elapsed Badge
    let timerBadge = (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
        <Clock className="w-3 h-3 mr-0.5" /> {order.elapsedMinutes}m
      </span>
    );

    if (isSlaBreached) {
      timerBadge = (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
          <AlertCircle className="w-3 h-3 mr-0.5" /> {order.elapsedMinutes}m SLA
        </span>
      );
    } else if (isWarning) {
      timerBadge = (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Clock className="w-3 h-3 mr-0.5" /> {order.elapsedMinutes}m
        </span>
      );
    }

    return (
      <div
        key={order.id}
        className={`p-3.5 rounded-xl bg-white border transition-all shadow-sm flex flex-col gap-2.5 relative ${
          isSlaBreached
            ? "border-rose-400 ring-1 ring-rose-300"
            : "border-slate-200/90 hover:border-slate-300 hover:shadow-md"
        }`}
      >
        {/* Card Header: Order Number & Timer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-surface-dark tracking-tight">
              {order.orderNumber}
            </span>
            <Link
              href={`/orders/${order.orderNumber}`}
              target="_blank"
              className="text-slate-400 hover:text-primary transition-colors"
              title="Open Live Tracking View"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
          {timerBadge}
        </div>

        {/* Customer & Address Preview */}
        <div className="text-xs text-slate-600 space-y-0.5">
          <div className="font-bold text-slate-800 flex justify-between">
            <span className="truncate max-w-[140px]">{order.customer.name || "Customer"}</span>
            <span className="font-black text-slate-900">₹{order.totalAmount}</span>
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {order.address?.flatBuilding}, {order.address?.streetArea}
          </div>
        </div>

        {/* Items Summary Preview */}
        <div className="bg-slate-50 rounded-lg p-2 text-[11px] text-slate-600 border border-slate-100">
          <div className="font-bold text-slate-700 mb-0.5">
            {order.items.length} SKUs (
            {order.items.reduce((sum, it) => sum + it.quantity, 0)} pcs):
          </div>
          <div className="truncate text-slate-500">
            {order.items
              .slice(0, 3)
              .map((it) => `${it.product.name} (x${it.quantity})`)
              .join(", ")}
            {order.items.length > 3 ? "..." : ""}
          </div>
        </div>

        {/* Stage-Specific Dispatch Actions */}
        {colStage === "PENDING" && (
          <Button
            variant="outline"
            size="sm"
            disabled={isUpdating}
            onClick={() => handleUpdateStatus(order.id, "PACKING")}
            className="w-full h-8 text-xs font-bold gap-1 rounded-lg border-primary/40 text-primary hover:bg-primary/5"
          >
            {isUpdating ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <span>Start Floor Picking</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        )}

        {colStage === "PACKING" && (
          <Button
            variant="outline"
            size="sm"
            disabled={isUpdating}
            onClick={() => handleUpdateStatus(order.id, "READY_FOR_PICKUP")}
            className="w-full h-8 text-xs font-bold gap-1 rounded-lg border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
          >
            {isUpdating ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <span>Ready for Staging</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        )}

        {colStage === "READY_FOR_PICKUP" && (
          <div className="space-y-2 pt-1 border-t border-emerald-100">
            {/* Manual Rider Assignment Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Assign Delivery Partner:</span>
                {order.rider && (
                  <span className="text-emerald-600 font-bold">Assigned</span>
                )}
              </label>

              <select
                value={selectedRiders[order.id] || order.rider?.id || ""}
                onChange={(e) =>
                  setSelectedRiders((prev) => ({ ...prev, [order.id]: e.target.value }))
                }
                className="w-full text-xs h-8 rounded-lg border border-slate-300 bg-white px-2 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Select Rider ({onlineRidersCount} online) --</option>
                {riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.isOnline ? "🟢 Online" : "⚪ Offline"}) - {r.vehicleDetails}
                  </option>
                ))}
              </select>
            </div>

            {/* Dispatch Action */}
            <Button
              variant="default"
              size="sm"
              disabled={isUpdating}
              onClick={() => handleUpdateStatus(order.id, "OUT_FOR_DELIVERY")}
              className="w-full h-8 text-xs font-black gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isUpdating ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>DISPATCH ORDER</span>
                </>
              )}
            </Button>
          </div>
        )}

        {colStage === "OUT_FOR_DELIVERY" && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-slate-700 font-bold">
              <Bike className="w-3.5 h-3.5 text-primary" />
              <span className="truncate max-w-[120px]">{order.rider?.name || "Assigned Rider"}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={() => handleUpdateStatus(order.id, "DELIVERED")}
              className="h-7 px-2 text-[10px] font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-lg"
            >
              Mark Delivered
            </Button>
          </div>
        )}
      </div>
    );
  }
}
