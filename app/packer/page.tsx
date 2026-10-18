"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  PackageCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Printer,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  Store,
  Layers,
  Check,
  ArrowLeft,
  ListOrdered,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

export default function PackerStationPage() {
  const { data: session, status: authStatus } = useSession();
  const [orders, setOrders] = React.useState<OrderData[]>([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [mobileTab, setMobileTab] = React.useState<"queue" | "picking" | "ready">("queue");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [pickedItemIds, setPickedItemIds] = React.useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = React.useState(false);
  const [printModalOpen, setPrintModalOpen] = React.useState(false);
  const [unpickedConfirmModalOpen, setUnpickedConfirmModalOpen] = React.useState(false);

  const initialLoadDoneRef = React.useRef(false);
  const knownOrderIdsRef = React.useRef<Set<string>>(new Set());

  // Synthesize Web Audio chime for incoming orders
  const playChime = React.useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Crisp high double chime: C6 (1046.5 Hz) -> E6 (1318.5 Hz)
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
      osc.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.56);

      if (navigator?.vibrate) {
        navigator.vibrate([120, 60, 120]);
      }
    } catch (e) {
      console.warn("Audio chime prevented by browser policy:", e);
    }
  }, [soundEnabled]);

  // Fetch orders from /api/ops/orders
  const fetchOrders = React.useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/ops/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      const orderList: OrderData[] = data.orders || [];
      setOrders(orderList);

      const activeList = orderList.filter((o) => o.status === "PENDING" || o.status === "PACKING");
      if (initialLoadDoneRef.current) {
        const hasNewOrder = activeList.some((o) => !knownOrderIdsRef.current.has(o.id));
        if (hasNewOrder) {
          playChime();
        }
      } else {
        initialLoadDoneRef.current = true;
      }
      knownOrderIdsRef.current = new Set(orderList.map((o) => o.id));

      // Retain or select active order
      setSelectedOrderId((currentId) => {
        const activeOrders = orderList.filter(
          (o) => o.status === "PENDING" || o.status === "PACKING"
        );
        if (currentId && activeOrders.some((o) => o.id === currentId)) {
          return currentId;
        }
        if (currentId && orderList.some((o) => o.id === currentId && o.status === "READY_FOR_PICKUP")) {
          return currentId;
        }
        // On desktop, auto-select first order. On mobile, let user select from queue.
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
          return activeOrders.length > 0 ? activeOrders[0].id : null;
        }
        return currentId;
      });
    } catch (err) {
      console.error("Ops orders fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [playChime]);

  // Polling every 4 seconds
  React.useEffect(() => {
    if (authStatus === "authenticated") {
      fetchOrders();
      const interval = setInterval(() => {
        fetchOrders(true);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [authStatus, fetchOrders]);

  const queueOrders = orders.filter(
    (o) => o.status === "PENDING" || o.status === "PACKING"
  );
  const readyOrders = orders.filter((o) => o.status === "READY_FOR_PICKUP");

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  // Group items by aisle
  const itemsByAisle = React.useMemo(() => {
    if (!selectedOrder) return {};
    const map: Record<string, OrderItem[]> = {};
    selectedOrder.items.forEach((item) => {
      const aisle = item.aisle || "Aisle 1: General Grocery";
      if (!map[aisle]) map[aisle] = [];
      map[aisle].push(item);
    });
    return map;
  }, [selectedOrder]);

  const toggleItemPicked = (itemId: string) => {
    if (navigator?.vibrate) {
      try {
        navigator.vibrate(30);
      } catch {
        // ignore
      }
    }
    setPickedItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const checkAllItems = (checked: boolean) => {
    if (!selectedOrder) return;
    const next: Record<string, boolean> = {};
    selectedOrder.items.forEach((it) => {
      next[it.id] = checked;
    });
    setPickedItemIds((prev) => ({ ...prev, ...next }));
  };

  const handleSelectOrderMobile = (orderId: string) => {
    setSelectedOrderId(orderId);
    setMobileTab("picking");
  };

  // Status transitions
  const handleTransitionStatus = async (newStatus: "PACKING" | "READY_FOR_PICKUP") => {
    if (!selectedOrder) return;

    if (newStatus === "READY_FOR_PICKUP") {
      const totalItems = selectedOrder.items.length;
      const picked = selectedOrder.items.filter((item) => pickedItemIds[item.id]).length;
      if (picked < totalItems) {
        setUnpickedConfirmModalOpen(true);
        return;
      }
    }

    await executeStatusChange(newStatus);
  };

  const executeStatusChange = async (newStatus: "PACKING" | "READY_FOR_PICKUP") => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/ops/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status: newStatus,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        alert(`Status update failed: ${errorData.error || "Unknown error"}`);
        return;
      }

      await fetchOrders(true);
      setUnpickedConfirmModalOpen(false);

      if (newStatus === "READY_FOR_PICKUP") {
        setPrintModalOpen(true);
        // Switch mobile tab back to queue after marking ready
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileTab("queue");
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Network error updating status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Authentication Guard
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading SABQuick Floor Station...</p>
        </div>
      </div>
    );
  }

  const role = session?.user?.role;
  const userRoles = session?.user?.roles || (role ? [role] : []);
  const isAuthorized = userRoles.some((r) => ["PACKER", "MANAGER", "OWNER"].includes(r));

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-border-subtle">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-surface-dark mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            The SABQuick Floor Station requires <strong>PACKER</strong>, <strong>MANAGER</strong>, or <strong>OWNER</strong> authorization.
          </p>
          <Link href="/" className="w-full inline-block">
            <Button variant="default" className="w-full h-11 rounded-xl font-bold">
              Return to Store
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalItemCount = selectedOrder?.items.length || 0;
  const pickedCount = selectedOrder?.items.filter((i) => pickedItemIds[i.id]).length || 0;
  const isFullyPicked = totalItemCount > 0 && pickedCount === totalItemCount;
  const pickProgressPercent = totalItemCount > 0 ? Math.round((pickedCount / totalItemCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-surface-dark flex flex-col antialiased">
      {/* Top Header */}
      <header className="bg-white border-b border-border-subtle pt-[env(safe-area-inset-top,0px)] shadow-xs shrink-0 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          {/* Brand & Station Info */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors shrink-0"
              title="Store"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-primary" />
              <span className="hidden xs:inline">Store</span>
            </Link>
            <div className="flex items-center gap-1.5 min-w-0">
              <Logo variant="icon" size={28} className="rounded-lg shadow-xs shrink-0" />
              <div className="min-w-0 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-surface-dark truncate">
                    SABQuick <span className="text-primary font-bold">Packer</span>
                  </span>
                  <Badge className="text-[9px] bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-1 py-0 shrink-0">
                    HUB #01
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions (Audio Chime, Sync, Links) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled((v) => !v)}
              className={`h-8 px-2 rounded-xl text-xs font-bold gap-1 border-slate-200 ${
                soundEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "text-slate-400"
              }`}
              title={soundEnabled ? "Audio chime active" : "Audio muted"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{soundEnabled ? "Audio ON" : "Muted"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOrders()}
              disabled={isRefreshing}
              className="h-8 w-8 p-0 rounded-xl border-slate-200"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-700 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            </Button>

            {role === "MANAGER" || role === "OWNER" ? (
              <Link href="/manager" className="hidden sm:inline-block">
                <Button variant="outline" size="sm" className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-700">
                  <span>Manager</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Mobile Segmented Navigation Tabs (< md) */}
        <div className="md:hidden px-3 pb-2 pt-1 border-t border-slate-100 bg-white">
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMobileTab("queue")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                mobileTab === "queue"
                  ? "bg-white text-surface-dark shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Queue</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary text-white font-black">
                {queueOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedOrder) setMobileTab("picking");
              }}
              disabled={!selectedOrder}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                mobileTab === "picking"
                  ? "bg-white text-surface-dark shadow-xs font-black text-primary"
                  : selectedOrder
                  ? "text-slate-700 hover:text-slate-900"
                  : "text-slate-400 opacity-60 cursor-not-allowed"
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>{selectedOrder ? `#${selectedOrder.orderNumber}` : "Picking"}</span>
              {selectedOrder && (
                <span className="ml-0.5 text-[10px] text-emerald-700 font-bold">
                  {pickedCount}/{totalItemCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileTab("ready")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                mobileTab === "ready"
                  ? "bg-white text-surface-dark shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ready</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                {readyOrders.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Orders Queue (Desktop Always / Mobile in 'queue' or 'ready' tab) */}
        <aside
          className={cn(
            "bg-white border-r border-border-subtle flex flex-col overflow-hidden",
            // Mobile: only show if tab is 'queue' or 'ready'
            mobileTab === "picking" ? "hidden md:flex" : "flex",
            "w-full md:w-[360px] lg:w-[400px] shrink-0"
          )}
        >
          {/* Queue Tab Header */}
          <div className="p-3 bg-slate-50 border-b border-border-subtle flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                {mobileTab === "ready" ? "Dispatched / Ready" : "Packing Queue"}
              </span>
              <Badge
                variant="default"
                className={`text-xs px-2 py-0 font-bold ${
                  mobileTab === "ready" ? "bg-slate-700" : "bg-primary"
                }`}
              >
                {mobileTab === "ready" ? readyOrders.length : queueOrders.length}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {mobileTab === "ready"
                ? `${queueOrders.length} pending pack`
                : `${readyOrders.length} ready for dispatch`}
            </span>
          </div>

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
            {isLoading ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
                <p className="text-xs font-medium text-slate-500">Scanning order queue...</p>
              </div>
            ) : mobileTab === "ready" ? (
              readyOrders.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 mt-4">
                  <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">No Orders in Ready Bay</h4>
                  <p className="text-xs text-slate-500 mt-1">Packed orders awaiting rider pickup appear here.</p>
                </div>
              ) : (
                readyOrders.map((ro) => (
                  <button
                    key={ro.id}
                    onClick={() => handleSelectOrderMobile(ro.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-2 relative ${
                      ro.id === selectedOrderId
                        ? "bg-emerald-50 border-emerald-400 shadow-sm ring-2 ring-emerald-200"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-black text-slate-900">{ro.orderNumber}</span>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                        READY
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {ro.customer.name || "Customer"} • {ro.items.length} items • ₹{ro.totalAmount}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>{ro.rider ? `Rider: ${ro.rider.name}` : "Awaiting rider"}</span>
                      <span className="text-primary font-bold">View Slip →</span>
                    </div>
                  </button>
                ))
              )
            ) : queueOrders.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 mt-4">
                <PackageCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-slate-800">Queue is Clear!</h4>
                <p className="text-xs text-slate-500 mt-1">All incoming orders have been packed.</p>
              </div>
            ) : (
              queueOrders.map((order) => {
                const isSelected = order.id === selectedOrderId;
                const totalUnits = order.items.reduce((acc, it) => acc + it.quantity, 0);

                let urgencyBadge = (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <Clock className="w-3 h-3 mr-1" /> {order.elapsedMinutes}m
                  </span>
                );

                if (order.urgency === "WARNING") {
                  urgencyBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                      <Clock className="w-3 h-3 mr-1" /> {order.elapsedMinutes}m SLA
                    </span>
                  );
                } else if (order.urgency === "CRITICAL") {
                  urgencyBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs animate-pulse">
                      <AlertCircle className="w-3 h-3 mr-1" /> {order.elapsedMinutes}m URGENT
                    </span>
                  );
                }

                return (
                  <button
                    key={order.id}
                    onClick={() => handleSelectOrderMobile(order.id)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all flex flex-col gap-2 relative border ${
                      isSelected
                        ? "bg-emerald-50/70 border-primary shadow-md ring-2 ring-primary/20"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-surface-dark tracking-tight">
                        {order.orderNumber}
                      </span>
                      {urgencyBadge}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div className="font-semibold text-slate-800 truncate max-w-[150px]">
                        {order.customer.name || "App Customer"}
                      </div>
                      <Badge
                        variant={order.status === "PACKING" ? "accent" : "secondary"}
                        className="text-[10px] font-bold px-1.5 py-0"
                      >
                        {order.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                      <span>
                        {order.items.length} SKUs ({totalUnits} units)
                      </span>
                      <span className="font-bold text-slate-700">₹{order.totalAmount}</span>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs">
                      <span className="text-primary font-bold inline-flex items-center gap-1">
                        {order.status === "PACKING" ? "Continue Packing" : "Start Picking"}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {order.address?.streetArea || "Hub delivery"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}

            {/* Desktop Ready for Pickup Summary */}
            {readyOrders.length > 0 && (
              <div className="hidden md:block pt-3 mt-3 border-t border-slate-200">
                <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Packed &amp; Ready</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {readyOrders.length}
                  </Badge>
                </div>
                <div className="space-y-1.5 mt-2">
                  {readyOrders.map((ro) => (
                    <button
                      key={ro.id}
                      onClick={() => setSelectedOrderId(ro.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                        ro.id === selectedOrderId
                          ? "bg-slate-200 border-slate-400 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-bold">{ro.orderNumber}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {ro.rider ? `Rider: ${ro.rider.name}` : "Awaiting rider"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Column: Active Focused Picking Stage */}
        <main
          className={cn(
            "flex-1 flex flex-col bg-slate-50 overflow-hidden",
            // Mobile: only show if tab is 'picking'
            mobileTab !== "picking" ? "hidden md:flex" : "flex",
            "w-full"
          )}
        >
          {selectedOrder ? (
            <>
              {/* Mobile Back-to-Queue Nav Bar (< md) */}
              <div className="md:hidden px-3 py-2 bg-white border-b border-border-subtle flex items-center justify-between shrink-0 shadow-xs">
                <button
                  type="button"
                  onClick={() => setMobileTab("queue")}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-xs font-bold text-primary active:bg-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Queue ({queueOrders.length})</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-sm text-surface-dark">
                    #{selectedOrder.orderNumber}
                  </span>
                  <Badge
                    variant={
                      selectedOrder.status === "READY_FOR_PICKUP"
                        ? "default"
                        : selectedOrder.status === "PACKING"
                        ? "accent"
                        : "secondary"
                    }
                    className="text-[10px] font-bold"
                  >
                    {selectedOrder.status}
                  </Badge>
                </div>
              </div>

              {/* Order Meta Header Banner */}
              <div className="p-3 sm:p-4 bg-white border-b border-border-subtle shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-surface-dark tracking-tight">
                      Order {selectedOrder.orderNumber}
                    </h2>
                    <Badge
                      variant={
                        selectedOrder.status === "READY_FOR_PICKUP"
                          ? "default"
                          : selectedOrder.status === "PACKING"
                          ? "accent"
                          : "secondary"
                      }
                      className="hidden sm:inline-flex font-bold uppercase text-[10px]"
                    >
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600">
                    <span>
                      Customer: <strong>{selectedOrder.customer.name || "App Customer"}</strong>
                    </span>
                    {selectedOrder.customer.phone && (
                      <span>
                        Phone: <strong>{selectedOrder.customer.phone}</strong>
                      </span>
                    )}
                    <span className="truncate">
                      Destination: <strong>{selectedOrder.address?.flatBuilding}, {selectedOrder.address?.streetArea}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintModalOpen(true)}
                    className="h-8 sm:h-9 px-3 rounded-xl text-xs font-bold gap-1.5 border-slate-300 text-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-700" />
                    <span>Bag Slip</span>
                  </Button>
                </div>
              </div>

              {/* Picking Progress Indicator (Mobile-friendly layout) */}
              <div className="bg-emerald-50 border-b border-emerald-100 px-3 sm:px-6 py-2 shrink-0 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-emerald-900 tracking-wide flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>PICKING PROGRESS</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => checkAllItems(!isFullyPicked)}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      {isFullyPicked ? "Uncheck all" : "Check all"}
                    </button>
                    <span className="font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      {pickedCount}/{totalItemCount} ({pickProgressPercent}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-emerald-200/80 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${pickProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Items Aisle Checklist (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 pb-36 sm:pb-8">
                {Object.entries(itemsByAisle).map(([aisleName, aisleItems]) => (
                  <section key={aisleName} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-700 bg-white/80 py-1.5 px-3 rounded-xl border border-slate-200/80">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{aisleName}</span>
                      </div>
                      <span className="text-slate-500 font-bold shrink-0">{aisleItems.length} SKUs</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {aisleItems.map((item) => {
                        const isPicked = Boolean(pickedItemIds[item.id]);

                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleItemPicked(item.id)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] select-none ${
                              isPicked
                                ? "bg-emerald-50/60 border-emerald-300 shadow-xs"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* 44px Tactile Thumb Checkbox */}
                              <div
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold transition-all shrink-0 ${
                                  isPicked
                                    ? "bg-primary text-white shadow-xs scale-105"
                                    : "border-2 border-slate-300 bg-slate-50 text-transparent"
                                }`}
                              >
                                <Check className="w-5 h-5 stroke-[3]" />
                              </div>

                              {/* Thumbnail */}
                              <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden relative shrink-0 border border-slate-100">
                                <Image
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              </div>

                              {/* Product Info */}
                              <div className="min-w-0">
                                <h4
                                  className={`text-xs sm:text-sm font-bold tracking-tight line-clamp-2 ${
                                    isPicked ? "line-through text-slate-400" : "text-surface-dark"
                                  }`}
                                >
                                  {item.product.name}
                                </h4>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <span>{item.product.packSize}</span>
                                  <span>•</span>
                                  <span>₹{item.unitPrice}</span>
                                </div>
                              </div>
                            </div>

                            {/* Quantity High-Contrast Badge */}
                            <div className="shrink-0 flex flex-col items-center justify-center pl-1">
                              <div className="px-2.5 py-1 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center shadow-xs">
                                <span className="font-black text-xs sm:text-sm leading-none">
                                  x{item.quantity}
                                </span>
                                <span className="text-[8px] uppercase tracking-wider text-slate-300 font-bold">
                                  pcs
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              {/* Sticky Safe-Area Station Action Footer */}
              <div className="fixed sm:sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-border-subtle shadow-2xl pb-[calc(env(safe-area-inset-bottom,0px)+14px)] shrink-0 z-30">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="hidden sm:block text-xs text-slate-500 font-medium">
                    {selectedOrder.status === "PENDING" && (
                      <span>Tap <strong>Start Picking</strong> to lock order and begin floor collection.</span>
                    )}
                    {selectedOrder.status === "PACKING" && (
                      <span>Verify all items and seal into a SABQuick branded bag.</span>
                    )}
                    {selectedOrder.status === "READY_FOR_PICKUP" && (
                      <span className="text-emerald-700 font-bold">
                        Order packed and staged in Dispatch Bay.
                      </span>
                    )}
                  </div>

                  <div className="w-full sm:w-auto flex items-center gap-2">
                    {selectedOrder.status === "PENDING" && (
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => handleTransitionStatus("PACKING")}
                        disabled={actionLoading}
                        className="w-full sm:w-auto h-12 px-6 rounded-xl font-black text-sm gap-2 shadow-md bg-primary hover:bg-primary-dark"
                      >
                        <Layers className="w-5 h-5" />
                        <span>START PICKING ORDER</span>
                      </Button>
                    )}

                    {selectedOrder.status === "PACKING" && (
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => handleTransitionStatus("READY_FOR_PICKUP")}
                        disabled={actionLoading}
                        className={`w-full sm:w-auto h-12 px-6 rounded-xl font-black text-sm gap-2 shadow-md transition-all ${
                          isFullyPicked
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/50"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                      >
                        <PackageCheck className="w-5 h-5" />
                        <span>
                          {isFullyPicked
                            ? "MARK PACKED & READY FOR RIDER"
                            : `MARK PACKED (${pickedCount}/${totalItemCount})`}
                        </span>
                      </Button>
                    )}

                    {selectedOrder.status === "READY_FOR_PICKUP" && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setPrintModalOpen(true)}
                        className="w-full sm:w-auto h-12 px-6 rounded-xl font-black text-sm gap-2 border-emerald-500 text-emerald-700 bg-emerald-50"
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>PACKED &amp; READY (PRINT SLIP)</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3 text-emerald-600 shadow-xs">
                <PackageCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-surface-dark">
                {queueOrders.length === 0 ? "Packing Queue is Clear!" : "Select an Order"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {queueOrders.length === 0
                  ? "All orders have been picked and packed. New incoming orders will appear here automatically."
                  : "Tap an active order from the queue to open its aisle checklist."}
              </p>
              {queueOrders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileTab("queue")}
                  className="mt-4 md:hidden rounded-xl font-bold text-xs"
                >
                  View Queue ({queueOrders.length})
                </Button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Bag Slip Print Preview Modal */}
      {selectedOrder && (
        <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-2xl p-5">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-surface-dark flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                SABQuick Bag Label Simulation
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Print ready thermal slip for staging tote.
              </DialogDescription>
            </DialogHeader>

            {/* Thermal Slip Preview Frame */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3.5 font-mono text-xs text-slate-800 space-y-2.5">
              <div className="flex flex-col items-center pb-2 border-b border-dashed border-slate-300 gap-1">
                <Logo variant="thermal" size={150} />
                <div className="text-[9px] text-slate-500 font-bold tracking-wider">HUB #01 - AMBIKAPUR, CHHATTISGARH</div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>ORDER: {selectedOrder.orderNumber}</span>
                  <span>{new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div>CUSTOMER: {selectedOrder.customer.name || "Customer"}</div>
                <div>PHONE: {selectedOrder.customer.phone || "N/A"}</div>
                <div className="text-[10px] text-slate-600 truncate">
                  ADDR: {selectedOrder.address?.flatBuilding}, {selectedOrder.address?.streetArea}
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300">
                <div className="font-bold text-[10px] uppercase text-slate-500 mb-1">
                  ITEMS MANIFEST ({selectedOrder.items.length} SKUs):
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {selectedOrder.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-[10px]">
                      <span className="truncate max-w-[200px]">{it.product.name}</span>
                      <span className="font-bold">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between font-bold text-xs">
                <span>TOTAL AMOUNT:</span>
                <span>₹{selectedOrder.totalAmount} ({selectedOrder.paymentMethod})</span>
              </div>

              <div className="text-center pt-1 text-[9px] text-slate-500 font-bold">
                *** SABQUICK SUPERFAST DELIVERY ***
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrintModalOpen(false)}
                className="rounded-xl text-xs font-bold w-full"
              >
                Close Slip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Unpicked Confirmation Dialog */}
      <Dialog open={unpickedConfirmModalOpen} onOpenChange={setUnpickedConfirmModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Unchecked Items Remaining!
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Only {pickedCount} of {totalItemCount} items have been checked. Are you sure you want to mark this order packed and summon riders?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnpickedConfirmModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Continue Checking
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => executeStatusChange("READY_FOR_PICKUP")}
              disabled={actionLoading}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Force Pack &amp; Notify Riders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
