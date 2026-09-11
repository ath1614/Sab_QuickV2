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
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  Store,
  Layers,
  Check,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [pickedItemIds, setPickedItemIds] = React.useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = React.useState(false);
  const [printModalOpen, setPrintModalOpen] = React.useState(false);
  const [unpickedConfirmModalOpen, setUnpickedConfirmModalOpen] = React.useState(false);

  const prevPendingCountRef = React.useRef<number>(0);

  // Synthesize Web Audio chime for new incoming orders
  const playChime = React.useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.14); // A5

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.46);
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

      const pendingOrders = orderList.filter((o) => o.status === "PENDING");
      if (pendingOrders.length > prevPendingCountRef.current && prevPendingCountRef.current > 0) {
        playChime();
      }
      prevPendingCountRef.current = pendingOrders.length;

      // Auto-select first active order if none is selected
      setSelectedOrderId((currentId) => {
        if (currentId && orderList.some((o) => o.id === currentId)) {
          return currentId;
        }
        const activeOrders = orderList.filter(
          (o) => o.status === "PENDING" || o.status === "PACKING"
        );
        return activeOrders.length > 0 ? activeOrders[0].id : orderList[0]?.id || null;
      });
    } catch (err) {
      console.error("Ops orders fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [playChime]);

  // Initial fetch and 4s polling
  React.useEffect(() => {
    if (authStatus === "authenticated") {
      fetchOrders();
      const interval = setInterval(() => {
        fetchOrders(true);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [authStatus, fetchOrders]);

  // Filter queue orders (Packer cares primarily about PENDING and PACKING, with READY as recent archive)
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

  // Toggle item picked checkbox
  const toggleItemPicked = (itemId: string) => {
    setPickedItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Status transitions via /api/ops/orders/status
  const handleTransitionStatus = async (newStatus: "PACKING" | "READY_FOR_PICKUP") => {
    if (!selectedOrder) return;

    // If transitioning to READY_FOR_PICKUP, verify all items picked
    if (newStatus === "READY_FOR_PICKUP") {
      const totalItems = selectedOrder.items.length;
      const pickedCount = selectedOrder.items.filter((item) => pickedItemIds[item.id]).length;
      if (pickedCount < totalItems) {
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
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Network error updating status.");
    } finally {
      setActionLoading(false);
    }
  };

  // RBAC Authentication Guard
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Floor Station...</p>
        </div>
      </div>
    );
  }

  const role = session?.user?.role;
  const isAuthorized = role && ["PACKER", "MANAGER", "OWNER"].includes(role);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-border-subtle">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-surface-dark mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            The Tablet Floor Packer Station requires <strong>PACKER</strong>, <strong>MANAGER</strong>, or <strong>OWNER</strong> authorization.
          </p>
          <div className="space-y-2">
            <Link href="/" className="w-full inline-block">
              <Button variant="default" className="w-full">
                Return to Store
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Selected Order Progress
  const totalItemCount = selectedOrder?.items.length || 0;
  const pickedCount = selectedOrder?.items.filter((i) => pickedItemIds[i.id]).length || 0;
  const isFullyPicked = totalItemCount > 0 && pickedCount === totalItemCount;
  const pickProgressPercent = totalItemCount > 0 ? Math.round((pickedCount / totalItemCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-surface-dark flex flex-col antialiased select-none">
      {/* Top Station Header */}
      <header className="h-16 bg-white border-b border-border-subtle px-4 lg:px-6 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <Logo variant="icon" size={40} className="rounded-xl shadow-xs shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-surface-dark leading-tight">
                SabQuick <span className="text-primary">Floor Station</span>
              </h1>
              <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-300 font-bold px-1.5 py-0">
                TABLET MODE
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Aisle picking & Dark-store fulfillment
            </p>
          </div>
        </div>

        {/* Quick Operations Bar */}
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled((v) => !v)}
            className={`h-9 px-3 rounded-xl text-xs gap-1.5 font-bold ${
              soundEnabled ? "border-emerald-300 text-emerald-700 bg-emerald-50/50" : "text-slate-500"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span className="hidden md:inline">{soundEnabled ? "Audio Chime ON" : "Muted"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders()}
            disabled={isRefreshing}
            className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span className="hidden md:inline">Sync</span>
          </Button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {role === "MANAGER" || role === "OWNER" ? (
            <Link href="/manager">
              <Button variant="ghost" size="sm" className="h-9 rounded-xl text-xs font-bold text-slate-600">
                Manager Board <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          ) : null}

          <div className="flex items-center gap-2 pl-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Live Feed</span>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Orders Queue (35% width, min 320px) */}
        <aside className="w-[35%] min-w-[320px] max-w-[420px] bg-white border-r border-border-subtle flex flex-col overflow-hidden">
          {/* Queue Tab Header */}
          <div className="p-3 bg-slate-50 border-b border-border-subtle flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Packing Queue
              </span>
              <Badge variant="default" className="text-xs px-2 py-0 bg-primary font-bold">
                {queueOrders.length}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {readyOrders.length} Ready for dispatch
            </span>
          </div>

          {/* Orders List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle p-2 space-y-2">
            {isLoading ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
                <p className="text-xs font-medium text-slate-500">Scanning order queue...</p>
              </div>
            ) : queueOrders.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-4">
                <PackageCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-slate-800">Queue is Clear!</h4>
                <p className="text-xs text-slate-500 mt-1">All incoming orders have been packed.</p>
              </div>
            ) : (
              queueOrders.map((order) => {
                const isSelected = order.id === selectedOrderId;
                const totalUnits = order.items.reduce((acc, it) => acc + it.quantity, 0);

                // Urgency styles
                let urgencyBadge = (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <Clock className="w-3 h-3 mr-1" /> {order.elapsedMinutes}m
                  </span>
                );

                if (order.urgency === "WARNING") {
                  urgencyBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                      <Clock className="w-3 h-3 mr-1" /> {order.elapsedMinutes}m SLA
                    </span>
                  );
                } else if (order.urgency === "CRITICAL") {
                  urgencyBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-sm animate-pulse">
                      <AlertCircle className="w-3 h-3 mr-1" /> {order.elapsedMinutes}m URGENT
                    </span>
                  );
                }

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left p-3.5 rounded-xl transition-all flex flex-col gap-2 relative border ${
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
                      <div className="font-semibold text-slate-800 truncate max-w-[140px]">
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
                        {order.items.length} SKUs ({totalUnits} pcs)
                      </span>
                      <span className="font-bold text-slate-700">₹{order.totalAmount}</span>
                    </div>
                  </button>
                );
              })
            )}

            {/* Ready for Pickup Accordion Preview */}
            {readyOrders.length > 0 && (
              <div className="pt-4 mt-4 border-t border-slate-200">
                <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Packed & Ready</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {readyOrders.length}
                  </Badge>
                </div>
                <div className="space-y-1.5 mt-2">
                  {readyOrders.map((ro) => (
                    <button
                      key={ro.id}
                      onClick={() => setSelectedOrderId(ro.id)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                        ro.id === selectedOrderId
                          ? "bg-slate-200 border-slate-400 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-bold">{ro.orderNumber}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {ro.rider ? `Rider: ${ro.rider.name}` : "Awaiting rider"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Column: Active Focused Picking Stage (65% width) */}
        <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {selectedOrder ? (
            <>
              {/* Order Detail Banner */}
              <div className="p-4 sm:p-5 bg-white border-b border-border-subtle shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-surface-dark tracking-tight">
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
                      className="font-bold uppercase text-[11px]"
                    >
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>
                      Customer: <strong>{selectedOrder.customer.name || "Walk-in/App Customer"}</strong>
                    </span>
                    <span>
                      Phone: <strong>{selectedOrder.customer.phone || "Not recorded"}</strong>
                    </span>
                    <span>
                      Destination: <strong>{selectedOrder.address?.flatBuilding}, {selectedOrder.address?.streetArea}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintModalOpen(true)}
                    className="h-10 px-3.5 rounded-xl text-xs font-bold gap-1.5 border-slate-300"
                  >
                    <Printer className="w-4 h-4 text-slate-700" />
                    <span>Print Bag Slip</span>
                  </Button>
                </div>
              </div>

              {/* Picking Progress Indicator */}
              <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                    Picking Progress:
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    {pickedCount} of {totalItemCount} Items Checked ({pickProgressPercent}%)
                  </span>
                </div>
                <div className="w-48 bg-emerald-200/80 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${pickProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Items Aisle Checklist (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {Object.entries(itemsByAisle).map(([aisleName, aisleItems]) => (
                  <section key={aisleName} className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 bg-white/70 py-1.5 px-3 rounded-lg border border-slate-200/80">
                      <Store className="w-4 h-4 text-primary" />
                      <span>{aisleName}</span>
                      <span className="text-slate-400 font-normal">({aisleItems.length} SKUs)</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {aisleItems.map((item) => {
                        const isPicked = Boolean(pickedItemIds[item.id]);

                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleItemPicked(item.id)}
                            className={`min-h-[64px] p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                              isPicked
                                ? "bg-emerald-50/50 border-emerald-300 shadow-sm"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Large 44px touch target tactile checkbox */}
                              <div
                                className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold transition-all shrink-0 ${
                                  isPicked
                                    ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                                    : "border-2 border-slate-300 bg-slate-50 text-transparent hover:border-primary"
                                }`}
                              >
                                <Check className="w-6 h-6 stroke-[3]" />
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
                                  className={`text-sm sm:text-base font-bold tracking-tight truncate ${
                                    isPicked ? "line-through text-slate-400" : "text-surface-dark"
                                  }`}
                                >
                                  {item.product.name}
                                </h4>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                  <span>{item.product.packSize}</span>
                                  <span>•</span>
                                  <span>₹{item.unitPrice} each</span>
                                </div>
                              </div>
                            </div>

                            {/* Quantity High-Contrast Badge */}
                            <div className="shrink-0 flex items-center gap-3">
                              <div className="h-10 px-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm tracking-wide shadow-sm">
                                x{item.quantity} UNITS
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              {/* Station Action Footer (Always pinned at bottom) */}
              <div className="p-4 sm:p-5 bg-white border-t border-border-subtle shadow-lg flex items-center justify-between gap-4 shrink-0">
                <div className="text-xs text-slate-500 font-medium">
                  {selectedOrder.status === "PENDING" && (
                    <span>Tap <strong>Start Picking</strong> to lock order and begin floor traversal.</span>
                  )}
                  {selectedOrder.status === "PACKING" && (
                    <span>Check all items and pack into SabQuick safety sealed tote.</span>
                  )}
                  {selectedOrder.status === "READY_FOR_PICKUP" && (
                    <span className="text-emerald-700 font-bold">
                      Order packed and staged in Dispatch Bay.
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {selectedOrder.status === "PENDING" && (
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => handleTransitionStatus("PACKING")}
                      disabled={actionLoading}
                      className="h-12 px-6 rounded-xl font-black text-sm gap-2 shadow-md hover:shadow-lg bg-primary"
                    >
                      <Layers className="w-5 h-5" />
                      <span>START PICKING</span>
                    </Button>
                  )}

                  {selectedOrder.status === "PACKING" && (
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => handleTransitionStatus("READY_FOR_PICKUP")}
                      disabled={actionLoading}
                      className={`h-12 px-6 rounded-xl font-black text-sm gap-2 shadow-md hover:shadow-lg transition-all ${
                        isFullyPicked
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/50"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      <PackageCheck className="w-5 h-5" />
                      <span>MARK ORDER PACKED & NOTIFY RIDERS</span>
                    </Button>
                  )}

                  {selectedOrder.status === "READY_FOR_PICKUP" && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setPrintModalOpen(true)}
                      className="h-12 px-6 rounded-xl font-black text-sm gap-2 border-emerald-500 text-emerald-700 bg-emerald-50"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>PACKED & READY (PRINT SLIP)</span>
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <PackageCheck className="w-16 h-16 text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-700">No Order Selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Select an order from the left queue to begin dark-store aisle picking.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Bag Slip Print Preview Modal */}
      {selectedOrder && (
        <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-surface-dark flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                SabQuick Bag Label Simulation
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Print ready thermal slip for staging tote.
              </DialogDescription>
            </DialogHeader>

            {/* Thermal Slip Preview Frame */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 font-mono text-xs text-slate-800 space-y-3">
              <div className="flex flex-col items-center pb-2 border-b border-dashed border-slate-300 gap-1.5">
                <Logo variant="thermal" size={170} />
                <div className="text-[10px] text-slate-500 font-bold tracking-wider">HUB #104 - CONNAUGHT PLACE</div>
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

              <div className="text-center pt-2 text-[10px] text-slate-500">
                *** SCAN TO DISPATCH / HANDOVER ***
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrintModalOpen(false)}
                className="rounded-xl"
              >
                Close
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  window.print();
                  setPrintModalOpen(false);
                }}
                className="rounded-xl font-bold bg-primary"
              >
                Trigger Printer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Unpicked Items Confirmation Modal */}
      <Dialog open={unpickedConfirmModalOpen} onOpenChange={setUnpickedConfirmModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Unchecked Items In Order
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-1">
              You have {totalItemCount - pickedCount} item(s) that have not been checked off on the floor checklist. Do you want to mark this order as completely packed regardless?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:justify-end pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnpickedConfirmModalOpen(false)}
              className="rounded-xl"
            >
              Cancel & Continue Picking
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => executeStatusChange("READY_FOR_PICKUP")}
              className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Override & Mark Packed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
