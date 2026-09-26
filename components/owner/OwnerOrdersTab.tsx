"use client";

import * as React from "react";
import {
  Package,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bike,
  Printer,
  ChevronRight,
  Filter,
  Eye,
  User,
  MapPin,
  DollarSign,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Logo } from "@/components/brand/Logo";

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  aisle?: string;
  product: {
    title: string;
    imageUrl?: string;
    salePrice?: number;
    unitQuantity?: string;
  };
}

export interface StoreOrder {
  id: string;
  orderNumber: string;
  status: "PENDING" | "PACKING" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  handlingFee: number;
  tipAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  deliveredAt?: string | null;
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
  };
  rider?: {
    id: string;
    name: string | null;
    phone: string | null;
    riderProfile?: {
      vehicleDetails: string | null;
    } | null;
  } | null;
  address?: {
    flatBuilding: string;
    streetArea: string;
    landmark?: string | null;
  } | null;
  items: OrderItem[];
}

interface RiderOption {
  id: string;
  name: string | null;
  phone: string | null;
}

interface OwnerOrdersTabProps {
  orders?: StoreOrder[];
  riders?: RiderOption[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const STATUS_FILTERS = [
  { label: "All Orders", value: "ALL" },
  { label: "Pending", value: "PENDING", color: "bg-amber-500" },
  { label: "Packing", value: "PACKING", color: "bg-blue-500" },
  { label: "Ready", value: "READY_FOR_PICKUP", color: "bg-purple-500" },
  { label: "Out for Delivery", value: "OUT_FOR_DELIVERY", color: "bg-orange-500" },
  { label: "Delivered", value: "DELIVERED", color: "bg-emerald-500" },
  { label: "Cancelled", value: "CANCELLED", color: "bg-rose-500" },
];

export function OwnerOrdersTab(props: OwnerOrdersTabProps = {}) {
  const [fetchedOrders, setFetchedOrders] = React.useState<StoreOrder[]>([]);
  const [fetchedRiders, setFetchedRiders] = React.useState<RiderOption[]>([]);
  const [fetchLoading, setFetchLoading] = React.useState(true);

  const fetchOrdersData = React.useCallback(async () => {
    setFetchLoading(true);
    try {
      const res = await fetch("/api/ops/orders");
      if (res.ok) {
        const data = await res.json();
        if (data.orders) setFetchedOrders(data.orders);
        if (data.riders) setFetchedRiders(data.riders);
      }
    } catch (e) {
      console.error("Failed to fetch ops orders:", e);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (props.orders === undefined) {
      fetchOrdersData();
    }
  }, [props.orders, fetchOrdersData]);

  const orders = props.orders !== undefined ? props.orders : fetchedOrders;
  const riders = props.riders !== undefined ? props.riders : fetchedRiders;
  const isLoading = props.isLoading !== undefined ? props.isLoading : fetchLoading;
  const onRefresh = props.onRefresh || fetchOrdersData;

  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedOrder, setSelectedOrder] = React.useState<StoreOrder | null>(null);
  const [printModalOrder, setPrintModalOrder] = React.useState<StoreOrder | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  // Filter orders
  const filteredOrders = React.useMemo(() => {
    return (orders || []).filter((o) => {
      if (!o) return false;
      const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.orderNumber?.toLowerCase().includes(q) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(q)) ||
        (o.customer?.phone && String(o.customer.phone).includes(q)) ||
        (o.rider?.name && o.rider.name.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  // Update status handler
  const handleUpdateStatus = async (orderId: string, newStatus: string, riderId?: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/ops/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status: newStatus,
          riderId: riderId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update order status");
        return;
      }

      onRefresh();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
    } catch (err: any) {
      console.error("Update status error:", err);
      alert("Network error updating order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-black text-[10px]">PENDING</Badge>;
      case "PACKING":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-black text-[10px]">PACKING</Badge>;
      case "READY_FOR_PICKUP":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-black text-[10px]">READY FOR PICKUP</Badge>;
      case "OUT_FOR_DELIVERY":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300 font-black text-[10px]">OUT FOR DELIVERY</Badge>;
      case "DELIVERED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-black text-[10px]">DELIVERED</Badge>;
      case "CANCELLED":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-black text-[10px]">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-black text-surface-dark tracking-tight">
                Store Orders Management
              </h2>
              <Badge variant="default" className="text-[10px] font-black bg-primary">
                {orders.length} TOTAL
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live order pipeline, rider assignment, delivery tracking, and receipts.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 self-start sm:self-auto shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh Pipeline</span>
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.value === "ALL"
                ? (orders || []).length
                : (orders || []).filter((o) => o?.status === f.value).length;

            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
                  statusFilter === f.value
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    statusFilter === f.value
                      ? "bg-slate-800 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order #, customer name, phone, or rider..."
            className="h-10 pl-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
          />
        </div>
      </div>

      {/* Orders List / Table */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span>Syncing orders with PostgreSQL pipeline...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Orders Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchQuery
              ? `No orders matching "${searchQuery}". Try clearing search.`
              : "No orders found in this status category."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table (hidden on mobile) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">SKUs & Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned Rider</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const totalUnits = (order.items || []).reduce((sum, it) => sum + (it?.quantity || 1), 0);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Order Number & Time */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900">
                            {order.orderNumber}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono py-0 px-1 text-slate-500">
                            {order.paymentMethod}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""} &bull; {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">
                          {order.customer?.name || "Customer"}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          +91 {order.customer?.phone || "N/A"}
                        </span>
                        {order.address && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                            {order.address.flatBuilding}, {order.address.streetArea}
                          </div>
                        )}
                      </td>

                      {/* Items & Total */}
                      <td className="px-4 py-3.5">
                        <div className="font-black text-slate-900">
                          ₹{order.totalAmount || 0}
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {(order.items || []).length} SKUs ({totalUnits} pcs)
                        </span>
                      </td>

                      {/* Status Selector */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1.5">
                          {getStatusBadge(order.status)}
                          <div>
                            <select
                              value={order.status}
                              disabled={updatingId === order.id}
                              onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                              className="text-[11px] font-bold h-7 rounded-lg border border-slate-300 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                            >
                              <option value="PENDING">Pending</option>
                              <option value="PACKING">Packing</option>
                              <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                              <option value="DELIVERED">Delivered</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Rider */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <select
                            value={order.rider?.id || ""}
                            disabled={updatingId === order.id}
                            onChange={(e) => handleUpdateStatus(order.id, order.status, e.target.value)}
                            className="text-[11px] font-bold h-7 rounded-lg border border-slate-300 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-[150px] truncate"
                          >
                            <option value="">-- Unassigned --</option>
                            {(riders || []).map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name || "Rider"} ({r.phone ? String(r.phone).slice(-4) : "...."})
                              </option>
                            ))}
                          </select>
                          {order.rider && (
                            <span className="text-[10px] text-emerald-700 font-bold block">
                              Assigned: {order.rider.name || "Rider"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrder(order)}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>Details</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPrintModalOrder(order)}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-700 hover:border-emerald-300"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Order Cards (< lg) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
            {filteredOrders.map((order) => {
              const totalUnits = (order.items || []).reduce((sum, it) => sum + (it?.quantity || 1), 0);

              return (
                <div
                  key={order.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-sm text-slate-900">
                        {order.orderNumber}
                      </span>
                      <Badge variant="outline" className="text-[9px] font-mono py-0 px-1 text-slate-500">
                        {order.paymentMethod}
                      </Badge>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block">
                        {order.customer?.name || "Customer"}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        +91 {order.customer?.phone || "N/A"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 text-sm block">
                        ₹{order.totalAmount || 0}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {(order.items || []).length} SKUs ({totalUnits} pcs)
                      </span>
                    </div>
                  </div>

                  {order.address && (
                    <div className="text-[11px] text-slate-500 flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate">
                        {order.address.flatBuilding}, {order.address.streetArea}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        Status
                      </label>
                      <select
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className="w-full text-xs font-bold h-8 rounded-xl border border-slate-300 bg-white px-2 text-slate-700 focus:outline-none"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="PACKING">Packing</option>
                        <option value="READY_FOR_PICKUP">Ready</option>
                        <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        Rider
                      </label>
                      <select
                        value={order.rider?.id || ""}
                        disabled={updatingId === order.id}
                        onChange={(e) => handleUpdateStatus(order.id, order.status, e.target.value)}
                        className="w-full text-xs font-bold h-8 rounded-xl border border-slate-300 bg-white px-2 text-slate-700 focus:outline-none truncate"
                      >
                        <option value="">-- Assign --</option>
                        {riders.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name || "Rider"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrder(order)}
                      className="h-8 px-3 rounded-xl text-xs font-bold text-slate-700 gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Manifest Details</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPrintModalOrder(order)}
                      className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-700"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="sm:max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <DialogTitle className="text-base font-black text-surface-dark flex items-center gap-2">
                    <span>Order {selectedOrder.orderNumber}</span>
                    {getStatusBadge(selectedOrder.status)}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 pt-0.5">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Customer & Address Details */}
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Customer Information</span>
                  <span className="text-[11px] font-mono text-slate-500">+91 {selectedOrder.customer?.phone || "N/A"}</span>
                </div>
                <div className="text-slate-600 font-medium">
                  {selectedOrder.customer?.name || "Customer"}
                </div>
                {selectedOrder.address && (
                  <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200">
                    <span className="font-bold text-slate-700">Delivery Address: </span>
                    {selectedOrder.address.flatBuilding}, {selectedOrder.address.streetArea}
                    {selectedOrder.address.landmark ? ` (Near ${selectedOrder.address.landmark})` : ""}
                  </div>
                )}
              </div>

              {/* Items Manifest */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 block text-xs">
                  Ordered Items ({(selectedOrder.items || []).length} SKUs):
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  {(selectedOrder.items || []).map((it) => (
                    <div key={it.id} className="p-2.5 flex items-center justify-between bg-white text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {it.product?.title || "Product"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {it.aisle || "Grocery"} &bull; Qty: {it.quantity}
                        </span>
                      </div>
                      <div className="font-black text-slate-800 text-right">
                        ₹{it.price * it.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Items Subtotal:</span>
                  <span>₹{selectedOrder.subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Delivery Fee:</span>
                  <span>₹{selectedOrder.deliveryFee}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Handling Fee:</span>
                  <span>₹{selectedOrder.handlingFee}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 text-sm pt-1.5 border-t border-slate-200">
                  <span>Total Amount Paid ({selectedOrder.paymentMethod}):</span>
                  <span className="text-primary">₹{selectedOrder.totalAmount}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-between sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrintModalOrder(selectedOrder)}
                className="rounded-xl text-xs font-bold gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Receipt</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl text-xs font-bold bg-slate-900"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* THERMAL PRINT SLIP MODAL */}
      {printModalOrder && (
        <Dialog open={!!printModalOrder} onOpenChange={() => setPrintModalOrder(null)}>
          <DialogContent className="sm:max-w-sm bg-white rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>Thermal Order Receipt Preview</span>
              </DialogTitle>
            </DialogHeader>

            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 font-mono text-xs text-slate-800 space-y-2.5">
              <div className="flex flex-col items-center pb-2 border-b border-dashed border-slate-300 gap-1">
                <Logo variant="compact" size={24} />
                <div className="text-[10px] text-slate-500 font-bold tracking-wider">
                  SABQUICK DARK STORE #01 - AMBIKAPUR
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>ORDER: {printModalOrder.orderNumber}</span>
                  <span>{printModalOrder.createdAt ? new Date(printModalOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
                <div>CUSTOMER: {printModalOrder.customer?.name || "Customer"}</div>
                <div>PHONE: {printModalOrder.customer?.phone || "N/A"}</div>
                {printModalOrder.address && (
                  <div className="text-[10px] text-slate-600 truncate">
                    ADDR: {printModalOrder.address.flatBuilding}, {printModalOrder.address.streetArea}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300">
                <div className="font-bold text-[10px] uppercase text-slate-500 mb-1">
                  ITEMS ({(printModalOrder.items || []).length} SKUs):
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {(printModalOrder.items || []).map((it) => (
                    <div key={it.id} className="flex justify-between text-[10px]">
                      <span className="truncate max-w-[180px]">{it.product?.title || "Product"}</span>
                      <span className="font-bold">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between font-bold text-xs">
                <span>TOTAL:</span>
                <span>₹{printModalOrder.totalAmount} ({printModalOrder.paymentMethod})</span>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrintModalOrder(null)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  window.print();
                  setPrintModalOrder(null);
                }}
                className="rounded-xl font-bold bg-primary text-white"
              >
                Trigger Printer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
