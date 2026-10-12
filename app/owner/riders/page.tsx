"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bike,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Smartphone,
  CreditCard,
  DollarSign,
  TrendingUp,
  Share2,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";

interface RiderApplication {
  id: string;
  name: string;
  phone: string;
  city: string;
  vehicleType: string;
  licenseNumber?: string | null;
  emergencyPhone?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

interface ActiveRider {
  id: string;
  name: string;
  phone: string;
  isOnline: boolean;
  vehicleDetails: string;
  lifetimeDeliveries: number;
  todayDeliveries: number;
  todayEarnings: number;
  totalEarnings: number;
  joinedAt: string;
}

export default function OwnerRidersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [applications, setApplications] = React.useState<RiderApplication[]>([]);
  const [activeRiders, setActiveRiders] = React.useState<ActiveRider[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"applicants" | "fleet">("applicants");
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const fetchRiderData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/ops/riders");
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          router.push("/owner/passcode");
          return;
        }
        throw new Error("Failed to load riders data");
      }
      const data = await res.json();
      setApplications(data.applications || []);
      setActiveRiders(data.activeRiders || []);
    } catch (err: any) {
      console.error("[OwnerRidersPage Error]:", err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    if (session?.user && ["OWNER", "MANAGER"].includes(session.user.role)) {
      fetchRiderData();
    } else if (status === "unauthenticated") {
      router.push("/owner/passcode");
    }
  }, [session, status, fetchRiderData, router]);

  const handleAction = async (applicationId: string, action: "APPROVE" | "REJECT") => {
    try {
      setActionLoadingId(applicationId);
      const res = await fetch("/api/ops/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed.");

      setToastMessage(data.message);
      setTimeout(() => setToastMessage(null), 4000);
      fetchRiderData();
    } catch (err: any) {
      alert(err.message || "Failed to process application.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyApplyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/rider/apply`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const pendingApps = applications.filter((a) => a.status === "PENDING");
  const processedApps = applications.filter((a) => a.status !== "PENDING");

  const totalDeliveries = activeRiders.reduce((sum, r) => sum + r.lifetimeDeliveries, 0);
  const totalFleetPayouts = activeRiders.reduce((sum, r) => sum + r.totalEarnings, 0);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
        <p className="text-xs text-slate-400">Loading Fleet &amp; Rider Operations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-emerald-500 selection:text-white pb-12">
      {/* Header with Safe Area Notch Protection */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <Link
            href="/owner"
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-auto" />
            <span className="text-slate-600">/</span>
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Bike className="w-3.5 h-3.5" />
              Fleet &amp; Riders
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyApplyLink}
            className="h-8 px-2.5 rounded-xl text-xs font-bold bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? "Link Copied!" : "Share /rider/apply"}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchRiderData}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between shadow-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-400 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Fleet KPI Summary Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl text-white">
            <CardContent className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Active Fleet
              </span>
              <p className="text-2xl font-black text-white">{activeRiders.length}</p>
              <p className="text-[10px] text-emerald-400">
                {activeRiders.filter((r) => r.isOnline).length} currently online
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl text-white">
            <CardContent className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Pending Applicants
              </span>
              <p className="text-2xl font-black text-amber-400">{pendingApps.length}</p>
              <p className="text-[10px] text-slate-400">Awaiting owner review</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl text-white">
            <CardContent className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                Lifetime Drops
              </span>
              <p className="text-2xl font-black text-white">{totalDeliveries}</p>
              <p className="text-[10px] text-slate-400">Completed by fleet</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl text-white">
            <CardContent className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Total Fleet Pay (₹)
              </span>
              <p className="text-2xl font-black text-emerald-400">₹{totalFleetPayouts}</p>
              <p className="text-[10px] text-slate-400">₹30/order + 100% tips</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("applicants")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "applicants"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <span>Applicant Inquiries</span>
            {pendingApps.length > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingApps.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("fleet")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "fleet"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <span>Active Delivery Fleet ({activeRiders.length})</span>
          </button>
        </div>

        {/* Tab 1: Applicants */}
        {activeTab === "applicants" && (
          <div className="space-y-4">
            {pendingApps.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-3">
                <Bike className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">No Pending Applications</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All applicant inquiries have been reviewed. Share the public link to recruit new riders.
                </p>
                <Button
                  onClick={handleCopyApplyLink}
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700 gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Copy /rider/apply Link
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {pendingApps.map((app) => (
                  <Card key={app.id} className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 text-white space-y-3 shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-black text-white">{app.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-mono text-white font-bold">+91 {app.phone}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 bg-amber-950/30 font-bold">
                        PENDING
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Hub / Area</span>
                        <span className="font-semibold text-slate-200">{app.city}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Vehicle</span>
                        <span className="font-semibold text-emerald-400">{app.vehicleType}</span>
                      </div>
                      {app.licenseNumber && (
                        <div className="col-span-2 pt-1 border-t border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block">DL / Gov ID</span>
                          <span className="font-mono text-slate-300 text-[11px]">{app.licenseNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoadingId === app.id}
                        onClick={() => handleAction(app.id, "REJECT")}
                        className="h-8 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border-slate-700"
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        disabled={actionLoadingId === app.id}
                        onClick={() => handleAction(app.id, "APPROVE")}
                        className="h-8 px-4 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md gap-1"
                      >
                        {actionLoadingId === app.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve Partner
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Past Processed History */}
            {processedApps.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Past Reviewed Applications ({processedApps.length})
                </span>
                <div className="divide-y divide-slate-800/60 bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden text-xs">
                  {processedApps.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="text-slate-400 ml-2 font-mono text-[11px]">+91 {p.phone}</span>
                        <span className="text-slate-500 ml-2">({p.vehicleType})</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold ${
                          p.status === "APPROVED"
                            ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/30"
                            : "text-slate-400 border-slate-700"
                        }`}
                      >
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Active Fleet */}
        {activeTab === "fleet" && (
          <div className="space-y-3">
            {activeRiders.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-3">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">No Active Fleet Partners</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When you approve applicant inquiries from the Applicants tab, they will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeRiders.map((rider) => (
                  <Card key={rider.id} className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 text-white space-y-3 shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-black text-white">{rider.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-mono text-white font-bold">+91 {rider.phone}</span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2 py-0.5 ${
                          rider.isOnline
                            ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/40 animate-pulse"
                            : "text-slate-500 border-slate-700 bg-slate-900"
                        }`}
                      >
                        {rider.isOnline ? "ONLINE (AVAILABLE)" : "OFFLINE"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Today Drops</span>
                        <span className="font-black text-emerald-400 text-sm">{rider.todayDeliveries}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Lifetime Drops</span>
                        <span className="font-black text-white text-sm">{rider.lifetimeDeliveries}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Total Earnings</span>
                        <span className="font-black text-emerald-400 text-sm">₹{rider.totalEarnings}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>Vehicle: {rider.vehicleDetails}</span>
                      <span>₹30 / completed delivery</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
