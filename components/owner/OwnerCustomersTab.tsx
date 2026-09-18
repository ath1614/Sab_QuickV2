"use client";

import * as React from "react";
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  IndianRupee,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  ExternalLink,
  Edit2,
  Clock,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CustomerOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  itemsCount: number;
}

interface CustomerItem {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  phoneVerified: boolean;
  createdAt: string;
  ordersCount: number;
  lifetimeSpend: number;
  recentOrders: CustomerOrder[];
  addresses: {
    id: string;
    label: string;
    flatBuilding: string;
    streetArea: string;
  }[];
}

interface CustomersKpis {
  totalCustomers: number;
  verifiedCustomers: number;
  repeatCustomers: number;
  totalLifetimeRevenue: number;
}

export function OwnerCustomersTab() {
  const [customers, setCustomers] = React.useState<CustomerItem[]>([]);
  const [kpis, setKpis] = React.useState<CustomersKpis>({
    totalCustomers: 0,
    verifiedCustomers: 0,
    repeatCustomers: 0,
    totalLifetimeRevenue: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<"ALL" | "REPEAT" | "HIGH_VALUE">("ALL");

  // Customer Orders Modal
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerItem | null>(null);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = React.useState(false);

  // Edit Customer Modal
  const [editingCustomer, setEditingCustomer] = React.useState<CustomerItem | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editPhoneVerified, setEditPhoneVerified] = React.useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);

  // Notifications
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const fetchCustomers = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const url = searchQuery
        ? `/api/owner/customers?search=${encodeURIComponent(searchQuery)}`
        : `/api/owner/customers`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load customers.");

      setCustomers(data.customers || []);
      if (data.kpis) setKpis(data.kpis);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const handleOpenEdit = (c: CustomerItem) => {
    setEditingCustomer(c);
    setEditName(c.name || "");
    setEditPhone(c.phone || "");
    setEditPhoneVerified(c.phoneVerified);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      setIsSubmittingEdit(true);
      const res = await fetch("/api/owner/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCustomer.id,
          name: editName.trim(),
          phone: editPhone.trim(),
          phoneVerified: editPhoneVerified,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update customer.");

      setToastMsg(`Customer "${data.customer.name || data.customer.phone}" updated!`);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save customer.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Filter logic
  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      if (filterType === "REPEAT") return c.ordersCount >= 2;
      if (filterType === "HIGH_VALUE") return c.lifetimeSpend >= 1000;
      return true;
    });
  }, [customers, filterType]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <Badge className="bg-emerald-500 text-slate-950 font-black text-[9px]">DELIVERED</Badge>;
      case "CANCELLED":
        return <Badge className="bg-rose-500 text-white font-black text-[9px]">CANCELLED</Badge>;
      case "OUT_FOR_DELIVERY":
        return <Badge className="bg-amber-500 text-slate-950 font-black text-[9px]">OUT FOR DELIVERY</Badge>;
      default:
        return <Badge className="bg-blue-500 text-white font-black text-[9px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-4 bg-emerald-950/80 border-2 border-emerald-500/60 rounded-2xl flex items-center justify-between text-xs text-emerald-200 animate-in fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-950/80 border-2 border-red-500/60 rounded-2xl flex items-center justify-between text-xs text-red-200 animate-in fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Total Customers</p>
            <h3 className="text-xl sm:text-2xl font-black text-white">{kpis.totalCustomers}</h3>
          </div>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Phone Verified</p>
            <h3 className="text-xl sm:text-2xl font-black text-white">{kpis.verifiedCustomers}</h3>
          </div>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Repeat Buyers</p>
            <h3 className="text-xl sm:text-2xl font-black text-white">{kpis.repeatCustomers}</h3>
          </div>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Customer GMV</p>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              ₹{kpis.totalLifetimeRevenue.toLocaleString("en-IN")}
            </h3>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border-2 border-slate-800 rounded-3xl p-3 sm:p-4 shadow-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search by customer name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 bg-slate-950 border-2 border-slate-700 text-xs text-white rounded-xl focus:border-emerald-400 font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === "ALL"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
            }`}
          >
            All Customers ({customers.length})
          </button>
          <button
            onClick={() => setFilterType("REPEAT")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === "REPEAT"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
            }`}
          >
            Repeat Buyers
          </button>
          <button
            onClick={() => setFilterType("HIGH_VALUE")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === "HIGH_VALUE"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
            }`}
          >
            ₹1,000+ Spend
          </button>
          <button
            onClick={fetchCustomers}
            className="p-2.5 bg-slate-800 border-2 border-slate-700 hover:bg-slate-700 rounded-xl transition-colors text-slate-300 hover:text-white shrink-0"
            title="Refresh Customers"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Customers List / Table */}
      {isLoading && customers.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="font-semibold">Loading customer records...</span>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-md">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-black text-white">No Customers Found</h3>
          <p className="text-xs text-slate-300 max-w-sm mx-auto">
            {searchQuery
              ? `No customer profiles matching "${searchQuery}".`
              : "Customers will automatically appear here when they register or place orders."}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b-2 border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Phone / Verification</th>
                  <th className="py-3.5 px-4">Member Since</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-4 text-right">Lifetime Spend</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-800/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 font-black flex items-center justify-center text-xs shrink-0">
                          {(cust.name || cust.phone || "U").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{cust.name || "Anonymous Shopper"}</p>
                          {cust.email && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {cust.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <p className="font-mono font-bold text-white flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          {cust.phone || "No phone linked"}
                        </p>
                        {cust.phoneVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            Unverified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                      {new Date(cust.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-black text-sm text-white bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
                        {cust.ordersCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-black text-sm text-emerald-400 font-mono">
                        ₹{cust.lifetimeSpend.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setIsOrdersModalOpen(true);
                          }}
                          className="h-8 px-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl gap-1"
                          title="View Order History"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Orders</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleOpenEdit(cust)}
                          className="h-8 px-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl gap-1"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch Cards */}
          <div className="md:hidden divide-y-2 divide-slate-800">
            {filteredCustomers.map((cust) => (
              <div key={cust.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 font-black flex items-center justify-center text-xs shrink-0">
                      {(cust.name || cust.phone || "U").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm">{cust.name || "Anonymous Shopper"}</h4>
                      <p className="font-mono text-xs text-slate-300 font-semibold">{cust.phone || "No phone"}</p>
                    </div>
                  </div>
                  {cust.phoneVerified ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                      Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      Unverified
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Orders Placed</span>
                    <strong className="text-white text-sm font-black">{cust.ordersCount}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Lifetime Spend</span>
                    <strong className="text-emerald-400 text-sm font-black font-mono">
                      ₹{cust.lifetimeSpend.toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setIsOrdersModalOpen(true);
                    }}
                    className="flex-1 h-9 text-xs font-black bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Orders ({cust.ordersCount})</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenEdit(cust)}
                    className="h-9 px-3 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CUSTOMER ORDER HISTORY MODAL */}
      {isOrdersModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-2xl p-6 text-white space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 font-black flex items-center justify-center text-xs shrink-0">
                  {(selectedCustomer.name || selectedCustomer.phone || "U").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {selectedCustomer.name || "Anonymous Shopper"}
                  </h3>
                  <p className="text-xs text-slate-300 font-mono">
                    {selectedCustomer.phone} &bull; {selectedCustomer.ordersCount} total orders
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOrdersModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Saved Addresses Summary */}
            {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  Saved Addresses ({selectedCustomer.addresses.length})
                </span>
                <div className="space-y-1">
                  {selectedCustomer.addresses.map((a) => (
                    <p key={a.id} className="text-xs text-slate-300">
                      <strong className="text-white">[{a.label}]</strong> {a.flatBuilding}, {a.streetArea}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders List */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                Past Orders Manifest
              </h4>

              {selectedCustomer.recentOrders.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  This customer has not placed any orders yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {selectedCustomer.recentOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border-2 border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-white">
                            #{ord.orderNumber}
                          </span>
                          {getStatusBadge(ord.status)}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(ord.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          &bull; {ord.itemsCount} SKU(s)
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-base text-emerald-400 font-mono block">
                          ₹{ord.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                size="sm"
                onClick={() => setIsOrdersModalOpen(false)}
                className="h-10 px-5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER DETAILS MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md p-6 text-white space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="text-sm font-black flex items-center gap-2 text-white">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                Edit Customer Details
              </h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">Customer Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">Phone Number</label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950 border-2 border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-white block">Phone Verified Status</span>
                  <span className="text-[10px] text-slate-400">Mark whether phone OTP verification is complete</span>
                </div>
                <input
                  type="checkbox"
                  checked={editPhoneVerified}
                  onChange={(e) => setEditPhoneVerified(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCustomer(null)}
                  className="h-10 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="h-10 px-5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md gap-2"
                >
                  {isSubmittingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
