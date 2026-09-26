"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  TrendingUp,
  DollarSign,
  PackageCheck,
  Clock,
  AlertTriangle,
  Palette,
  Layers,
  Search,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Save,
  Sparkles,
  Sliders,
  Check,
  AlertCircle,
  Store,
  LayoutDashboard,
  FolderTree,
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Bike,
  Trash2,
  Lock,
  Phone,
  Mail,
  Plus,
  ArrowLeft,
  Ticket,
  Tag,
  Percent,
  Copy,
  Edit2,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Logo } from "@/components/brand/Logo";
import { THEME_PRESETS as SHARED_THEME_PRESETS } from "@/components/theme/themePresets";
import { OwnerOrdersTab } from "@/components/owner/OwnerOrdersTab";
import { OwnerCustomersTab } from "@/components/owner/OwnerCustomersTab";

interface ProductItem {
  id: string;
  title: string;
  imageUrl: string;
  packSize: string;
  price: number;
  stockCount: number;
  isAvailable: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface StaffMember {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: "OWNER" | "MANAGER" | "PACKER" | "RIDER";
  roles?: ("OWNER" | "MANAGER" | "PACKER" | "RIDER")[];
  phoneVerified: Date | null;
  createdAt: string;
  riderProfile?: {
    vehicleDetails: string | null;
    isOnline: boolean;
  } | null;
}

interface AnalyticsData {
  todayGMV: number;
  completedOrders: number;
  activeOrders: number;
  avgPackingTimeMinutes: number;
  lowStockCount: number;
  totalProductsCount: number;
}

interface CouponItem {
  id: string;
  code: string;
  description: string | null;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  validFrom: string;
  validTill: string;
  isActive: boolean;
  usageLimit: number | null;
  usedCount: number;
  _count?: {
    orders: number;
  };
}

// Single source of truth for palettes lives in components/theme/themePresets.ts —
// this adapter keeps the legacy { primary, accent, saleTag, bannerUrl } shape.
const THEME_PRESETS = SHARED_THEME_PRESETS.map((p) => ({
  name: p.name,
  primary: p.primaryColor,
  accent: p.accentColor,
  saleTag: p.saleTagText,
  bannerUrl: p.key === "standard" ? "/banners/forest-speed-hero.webp" : "",
}));

export default function OwnerControlPage() {
  const { data: session, status: authStatus } = useSession();
  const [analytics, setAnalytics] = React.useState<AnalyticsData | null>(null);
  const [allProducts, setAllProducts] = React.useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Active Tab State (Overview, Live Orders, Customers CRM, Staff Directory, Coupons, Theme)
  const [activeOwnerTab, setActiveOwnerTab] = React.useState<
    "overview" | "orders" | "customers" | "staff" | "coupons" | "theme"
  >("overview");

  // Staff Hub State
  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [isStaffLoading, setIsStaffLoading] = React.useState(true);
  const [isAddStaffOpen, setIsAddStaffOpen] = React.useState(false);
  const [isEditingStaff, setIsEditingStaff] = React.useState(false);
  const [staffFormData, setStaffFormData] = React.useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    roles: ["PACKER"] as ("MANAGER" | "PACKER" | "RIDER")[],
    role: "PACKER" as "MANAGER" | "PACKER" | "RIDER",
    pin: "",
    vehicleDetails: "",
  });
  const [staffFormSubmitting, setStaffFormSubmitting] = React.useState(false);
  const [staffFormError, setStaffFormError] = React.useState<string | null>(null);
  const [deletingStaffId, setDeletingStaffId] = React.useState<string | null>(null);

  // Coupon Management State
  const [couponsList, setCouponsList] = React.useState<CouponItem[]>([]);
  const [isCouponsLoading, setIsCouponsLoading] = React.useState(true);
  const [isAddCouponOpen, setIsAddCouponOpen] = React.useState(false);
  const [isEditCouponOpen, setIsEditCouponOpen] = React.useState(false);
  const [isDeleteCouponOpen, setIsDeleteCouponOpen] = React.useState(false);
  const [selectedCoupon, setSelectedCoupon] = React.useState<CouponItem | null>(null);

  const [couponFormData, setCouponFormData] = React.useState({
    code: "",
    description: "",
    discountType: "FLAT" as "FLAT" | "PERCENTAGE",
    discountValue: 50,
    minOrderAmount: 199,
    maxDiscount: 100,
    validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    usageLimit: 500,
    isActive: true,
  });
  const [couponFormSubmitting, setCouponFormSubmitting] = React.useState(false);
  const [couponFormError, setCouponFormError] = React.useState<string | null>(null);
  const [copiedCouponCode, setCopiedCouponCode] = React.useState<string | null>(null);

  // Inventory Table filters
  const [inventorySearch, setInventorySearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [toggleStockId, setToggleStockId] = React.useState<string | null>(null);

  // Theme Form State
  const [themeName, setThemeName] = React.useState("Forest Speed (Standard)");
  const [primaryColor, setPrimaryColor] = React.useState("#0B6E4F");
  const [accentColor, setAccentColor] = React.useState("#00C853");
  const [saleTagText, setSaleTagText] = React.useState("⚡ 10-15 Min Delivery Guarantee");
  const [bannerImageUrl, setBannerImageUrl] = React.useState("/banners/forest-speed-hero.webp");
  const [themeSaving, setThemeSaving] = React.useState(false);
  const [themeSuccessMsg, setThemeSuccessMsg] = React.useState("");

  // Scheduled Theme Campaigns (Phase 5 theme engine)
  interface ThemeCampaignItem {
    id: string;
    name: string;
    primaryColor: string;
    accentColor: string;
    saleTagText: string | null;
    bannerImageUrl: string | null;
    validFrom: string;
    validUntil: string;
    priority: number;
    isActive: boolean;
  }
  const [campaigns, setCampaigns] = React.useState<ThemeCampaignItem[]>([]);
  const [campaignsLoading, setCampaignsLoading] = React.useState(false);
  const [campaignForm, setCampaignForm] = React.useState({
    name: "",
    primaryColor: "#0B6E4F",
    accentColor: "#00C853",
    saleTagText: "",
    validFrom: "",
    validUntil: "",
    priority: 0,
    isActive: true,
  });
  const [campaignSaving, setCampaignSaving] = React.useState(false);
  const [campaignMsg, setCampaignMsg] = React.useState<string | null>(null);

  // Fetch initial analytics & catalog
  const fetchOperationsData = React.useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/ops/analytics");
      if (!res.ok) throw new Error("Failed to fetch ops analytics");
      const data = await res.json();
      setAnalytics(data.metrics || null);
      if (data.allProducts) {
        setAllProducts(data.allProducts);
      }
    } catch (e) {
      console.error("Owner analytics fetch error:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch current active theme
  const fetchCurrentTheme = React.useCallback(async () => {
    try {
      const res = await fetch("/api/theme");
      if (!res.ok) return;
      const data = await res.json();
      if (data.themeName) setThemeName(data.themeName);
      if (data.primaryColor) setPrimaryColor(data.primaryColor);
      if (data.accentColor) setAccentColor(data.accentColor);
      if (data.saleTagText) setSaleTagText(data.saleTagText);
      if (data.bannerImageUrl) setBannerImageUrl(data.bannerImageUrl);
    } catch (e) {
      console.error("Theme fetch error:", e);
    }
  }, []);

  // Fetch Staff directory
  const fetchStaff = React.useCallback(async () => {
    try {
      setIsStaffLoading(true);
      const res = await fetch("/api/owner/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      const data = await res.json();
      setStaffList(data.staff || []);
    } catch (err) {
      console.error("Fetch staff error:", err);
    } finally {
      setIsStaffLoading(false);
    }
  }, []);

  const handleOpenEditStaff = (staff: StaffMember) => {
    const assignedRoles = (staff.roles && staff.roles.length > 0 ? staff.roles : [staff.role]).filter(
      (r) => r !== "OWNER"
    ) as ("MANAGER" | "PACKER" | "RIDER")[];

    setStaffFormData({
      id: staff.id,
      name: staff.name || "",
      phone: staff.phone || "",
      email: staff.email || "",
      roles: assignedRoles.length > 0 ? assignedRoles : ["PACKER"],
      role: assignedRoles[0] || "PACKER",
      pin: "",
      vehicleDetails: staff.riderProfile?.vehicleDetails || "",
    });
    setIsEditingStaff(true);
    setStaffFormError(null);
    setIsAddStaffOpen(true);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFormError(null);

    const cleanPhone = staffFormData.phone.trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setStaffFormError("Phone must be a valid 10-digit Indian number starting with 6-9.");
      return;
    }
    if (!/^\d{4}$/.test(staffFormData.pin.trim())) {
      setStaffFormError("Staff PIN must be exactly 4 numeric digits.");
      return;
    }
    if (staffFormData.name.trim().length < 2) {
      setStaffFormError("Full name must be at least 2 characters.");
      return;
    }
    if (staffFormData.roles.length === 0) {
      setStaffFormError("Please select at least one shift role for this staff member.");
      return;
    }

    try {
      setStaffFormSubmitting(true);
      const res = await fetch("/api/owner/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: staffFormData.id || undefined,
          name: staffFormData.name.trim(),
          phone: cleanPhone,
          email: staffFormData.email.trim() || undefined,
          roles: staffFormData.roles,
          role: staffFormData.roles[0] || "PACKER",
          pin: staffFormData.pin.trim(),
          vehicleDetails: staffFormData.vehicleDetails.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save staff member");
      }

      // Success
      setIsAddStaffOpen(false);
      setIsEditingStaff(false);
      setStaffFormData({
        id: "",
        name: "",
        phone: "",
        email: "",
        roles: ["PACKER"],
        role: "PACKER",
        pin: "",
        vehicleDetails: "",
      });
      fetchStaff();
    } catch (err: any) {
      setStaffFormError(err.message || "Failed to save staff member");
    } finally {
      setStaffFormSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate ${name}? They will lose shift access immediately.`)) {
      return;
    }

    try {
      setDeletingStaffId(id);
      const res = await fetch(`/api/owner/staff?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to deactivate staff member");
        return;
      }
      fetchStaff();
    } catch (err) {
      console.error("Delete staff error:", err);
      alert("Network error deactivating staff member.");
    } finally {
      setDeletingStaffId(null);
    }
  };

  // Fetch Coupons directory
  const fetchCoupons = React.useCallback(async () => {
    try {
      setIsCouponsLoading(true);
      const res = await fetch("/api/owner/coupons");
      if (!res.ok) throw new Error("Failed to fetch coupons");
      const data = await res.json();
      setCouponsList(data.coupons || []);
    } catch (err) {
      console.error("Fetch coupons error:", err);
    } finally {
      setIsCouponsLoading(false);
    }
  }, []);

  const handleToggleCouponActive = async (coupon: CouponItem) => {
    try {
      const res = await fetch("/api/owner/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id, isActive: !coupon.isActive }),
      });
      if (res.ok) {
        fetchCoupons();
      }
    } catch (err) {
      console.error("Toggle coupon status error:", err);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponFormSubmitting(true);
    setCouponFormError(null);
    try {
      const cleanCode = couponFormData.code.trim().toUpperCase();
      if (cleanCode.length < 2) {
        setCouponFormError("Coupon code must be at least 2 characters.");
        setCouponFormSubmitting(false);
        return;
      }
      if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
        setCouponFormError("Coupon code can only contain uppercase letters, numbers, hyphens, and underscores.");
        setCouponFormSubmitting(false);
        return;
      }

      const payload = {
        code: cleanCode,
        description: couponFormData.description.trim() || undefined,
        discountType: couponFormData.discountType,
        discountValue: Number(couponFormData.discountValue),
        minOrderAmount: Number(couponFormData.minOrderAmount) || 0,
        maxDiscount: couponFormData.discountType === "PERCENTAGE" && couponFormData.maxDiscount ? Number(couponFormData.maxDiscount) : undefined,
        validTill: new Date(`${couponFormData.validTill}T23:59:59.999Z`).toISOString(),
        usageLimit: couponFormData.usageLimit ? Number(couponFormData.usageLimit) : undefined,
        isActive: couponFormData.isActive,
      };

      const res = await fetch("/api/owner/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create coupon");
      }

      setIsAddCouponOpen(false);
      fetchCoupons();
    } catch (err: unknown) {
      const error = err as Error;
      setCouponFormError(error.message || "An unexpected error occurred");
    } finally {
      setCouponFormSubmitting(false);
    }
  };

  const handleOpenEditCoupon = (coupon: CouponItem) => {
    setSelectedCoupon(coupon);
    setCouponFormError(null);
    setCouponFormData({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscount: coupon.maxDiscount || 100,
      validTill: new Date(coupon.validTill).toISOString().split("T")[0],
      usageLimit: coupon.usageLimit || 500,
      isActive: coupon.isActive,
    });
    setIsEditCouponOpen(true);
  };

  const handleEditCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoupon) return;
    setCouponFormSubmitting(true);
    setCouponFormError(null);
    try {
      const payload = {
        id: selectedCoupon.id,
        description: couponFormData.description.trim() || undefined,
        discountType: couponFormData.discountType,
        discountValue: Number(couponFormData.discountValue),
        minOrderAmount: Number(couponFormData.minOrderAmount) || 0,
        maxDiscount: couponFormData.discountType === "PERCENTAGE" && couponFormData.maxDiscount ? Number(couponFormData.maxDiscount) : undefined,
        validTill: new Date(`${couponFormData.validTill}T23:59:59.999Z`).toISOString(),
        usageLimit: couponFormData.usageLimit ? Number(couponFormData.usageLimit) : undefined,
        isActive: couponFormData.isActive,
      };

      const res = await fetch("/api/owner/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update coupon");
      }

      setIsEditCouponOpen(false);
      setSelectedCoupon(null);
      fetchCoupons();
    } catch (err: unknown) {
      const error = err as Error;
      setCouponFormError(error.message || "An unexpected error occurred");
    } finally {
      setCouponFormSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (force = false) => {
    if (!selectedCoupon) return;
    setCouponFormSubmitting(true);
    try {
      const res = await fetch(`/api/owner/coupons?id=${selectedCoupon.id}${force ? "&force=true" : ""}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresForce) {
          if (confirm(`${data.error}\n\nDo you want to proceed and unlink past orders to delete this coupon?`)) {
            handleDeleteCoupon(true);
            return;
          }
          setCouponFormSubmitting(false);
          return;
        }
        throw new Error(data.error || "Failed to delete coupon");
      }
      setIsDeleteCouponOpen(false);
      setSelectedCoupon(null);
      fetchCoupons();
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || "Failed to delete coupon");
    } finally {
      setCouponFormSubmitting(false);
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCouponCode(code);
    setTimeout(() => setCopiedCouponCode(null), 2000);
  };

  React.useEffect(() => {
    if (authStatus === "authenticated") {
      fetchOperationsData();
      fetchCurrentTheme();
      fetchStaff();
      fetchCoupons();
      const interval = setInterval(() => {
        fetchOperationsData(true);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [authStatus, fetchOperationsData, fetchCurrentTheme, fetchStaff, fetchCoupons]);

  // Instant Stock Toggle Handler
  const handleToggleStock = async (productId: string, currentAvailable: boolean) => {
    setToggleStockId(productId);
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
        alert(`Stock toggle failed: ${err.error || "Unknown error"}`);
        return;
      }

      const data = await res.json();
      setAllProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isAvailable: data.isAvailable } : p))
      );
      // Refresh metrics
      fetchOperationsData(true);
    } catch (err) {
      console.error("Toggle stock error:", err);
    } finally {
      setToggleStockId(null);
    }
  };

  // Save Seasonal Theme Handler
  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setThemeSaving(true);
    setThemeSuccessMsg("");
    try {
      const res = await fetch("/api/ops/theme/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeName,
          primaryColor,
          accentColor,
          saleTagText,
          bannerImageUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to save theme: ${err.error || "Unknown error"}`);
        return;
      }

      // Immediately propagate to current document variables
      if (typeof window !== "undefined") {
        document.documentElement.style.setProperty("--brand-primary", primaryColor);
        document.documentElement.style.setProperty("--brand-accent", accentColor);
      }

      setThemeSuccessMsg("Theme successfully updated & applied globally!");
      setTimeout(() => setThemeSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Save theme error:", err);
      alert("Network error updating seasonal theme.");
    } finally {
      setThemeSaving(false);
    }
  };

  // ---------- Scheduled Theme Campaigns (Phase 5) ----------
  const fetchCampaigns = React.useCallback(async () => {
    try {
      setCampaignsLoading(true);
      const res = await fetch("/api/ops/theme/campaigns");
      if (!res.ok) throw new Error("Failed to load campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("Campaign fetch error:", err);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeOwnerTab === "theme") {
      fetchCampaigns();
    }
  }, [activeOwnerTab, fetchCampaigns]);

  const nowIso = new Date().toISOString().slice(0, 16);
  const campaignStatus = (c: { validFrom: string; validUntil: string; isActive: boolean }) => {
    if (!c.isActive) return "PAUSED";
    const now = Date.now();
    const from = new Date(c.validFrom).getTime();
    const until = new Date(c.validUntil).getTime();
    if (now < from) return "SCHEDULED";
    if (now > until) return "ENDED";
    return "LIVE";
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampaignMsg(null);
    if (!campaignForm.name.trim() || !campaignForm.validFrom || !campaignForm.validUntil) {
      setCampaignMsg("Campaign name and both dates are required.");
      return;
    }
    if (new Date(campaignForm.validUntil) <= new Date(campaignForm.validFrom)) {
      setCampaignMsg("Campaign end must be after its start.");
      return;
    }

    try {
      setCampaignSaving(true);
      const res = await fetch("/api/ops/theme/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignForm.name.trim(),
          primaryColor: campaignForm.primaryColor,
          accentColor: campaignForm.accentColor,
          saleTagText: campaignForm.saleTagText || undefined,
          validFrom: new Date(campaignForm.validFrom).toISOString(),
          validUntil: new Date(campaignForm.validUntil).toISOString(),
          priority: campaignForm.priority,
          isActive: campaignForm.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save campaign");
      }
      setCampaignMsg("Campaign scheduled successfully!");
      setCampaignForm({
        name: "",
        primaryColor: "#0B6E4F",
        accentColor: "#00C853",
        saleTagText: "",
        validFrom: "",
        validUntil: "",
        priority: 0,
        isActive: true,
      });
      fetchCampaigns();
      setTimeout(() => setCampaignMsg(null), 4000);
    } catch (err: any) {
      setCampaignMsg(err.message || "Failed to save campaign");
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/ops/theme/campaigns?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete campaign");
      }
      fetchCampaigns();
    } catch (err: any) {
      console.error("Delete campaign error:", err);
      setCampaignMsg(err.message || "Failed to delete campaign");
    }
  };

  // Apply Theme Preset (fills both the manual form and the campaign scheduler)
  const handleApplyPreset = (preset: typeof THEME_PRESETS[0]) => {
    setThemeName(preset.name);
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
    setSaleTagText(preset.saleTag);
    setBannerImageUrl(preset.bannerUrl);
    setCampaignForm((prev) => ({
      ...prev,
      name: preset.name,
      primaryColor: preset.primary,
      accentColor: preset.accent,
      saleTagText: preset.saleTag,
    }));
  };

  // RBAC Authentication Guard
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Owner Control Center...</p>
        </div>
      </div>
    );
  }

  const role = session?.user?.role;
  if (role !== "OWNER") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-border-subtle">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-surface-dark mb-2">Owner Restricted Area</h2>
          <p className="text-sm text-slate-600 mb-6">
            Only designated <strong>Store Owners</strong> have access to financial metrics, catalog overrides, and store theme customization.
          </p>
          <Link href="/">
            <Button variant="default" className="w-full">
              Return to Store
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filtered Products for Replenishment Table
  const uniqueCategories = Array.from(
    new Set(allProducts.map((p) => p.category.name).filter(Boolean))
  );

  const filteredInventory = allProducts.filter((p) => {
    const q = inventorySearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.category?.name && p.category.name.toLowerCase().includes(q)) ||
      ((p as any).category?.parent?.name && (p as any).category.parent.name.toLowerCase().includes(q)) ||
      ((p as any).slug && (p as any).slug.toLowerCase().includes(q)) ||
      ((p as any).unitQuantity && (p as any).unitQuantity.toLowerCase().includes(q));
    const matchesCategory =
      categoryFilter === "ALL" || (p.category && p.category.name === categoryFilter);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-surface-dark flex flex-col antialiased">
      {/* Top Bar */}
      <header className="bg-white border-b border-border-subtle pt-[env(safe-area-inset-top,0px)] shadow-sm shrink-0 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start space-x-3">
            <div className="flex items-center space-x-2.5">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors shrink-0 shadow-xs"
                title="Back to Storefront"
              >
                <ArrowLeft className="w-4 h-4 text-primary" />
                <span>Store</span>
              </Link>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <Link href="/" title="Back to Storefront">
                <Logo variant="icon" size={36} className="rounded-xl shadow-xs shrink-0 hover:opacity-90" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-surface-dark leading-tight">
                    SabQuick <span className="text-primary">Owner Hub</span>
                  </h1>
                  <Badge variant="default" className="text-[9px] sm:text-[10px] uppercase font-black px-1.5 py-0 bg-primary">
                    PRO
                  </Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Financial metrics, catalog &amp; theme branding
                </p>
              </div>
            </div>

            {/* Mobile Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchOperationsData();
                fetchCurrentTheme();
                fetchStaff();
                fetchCoupons();
              }}
              disabled={isRefreshing}
              className="sm:hidden h-8 w-8 p-0 rounded-xl shrink-0"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            </Button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <Link href="/owner/catalog" className="shrink-0">
              <Button variant="accent" size="sm" className="h-8 sm:h-9 rounded-xl text-xs font-black gap-1.5 shadow-sm px-2.5 sm:px-3">
                <FolderTree className="w-3.5 h-3.5" />
                <span>Catalog &amp; Pricing</span>
              </Button>
            </Link>

            <button
              type="button"
              onClick={() => setActiveOwnerTab("coupons")}
              className="shrink-0"
            >
              <Button variant="outline" size="sm" className="h-8 sm:h-9 rounded-xl text-xs font-bold gap-1.5 px-2.5 sm:px-3 text-slate-700 hover:text-amber-600 hover:border-amber-300">
                <Ticket className="w-3.5 h-3.5 text-amber-600" />
                <span>Coupons</span>
              </Button>
            </button>

            <Link href="/manager" className="shrink-0">
              <Button variant="outline" size="sm" className="h-8 sm:h-9 rounded-xl text-xs font-bold gap-1.5 px-2.5 sm:px-3 text-slate-700">
                <LayoutDashboard className="w-3.5 h-3.5 text-slate-600" />
                <span>Manager</span>
              </Button>
            </Link>

            <Link href="/packer" className="shrink-0">
              <Button variant="outline" size="sm" className="h-8 sm:h-9 rounded-xl text-xs font-bold gap-1.5 px-2.5 sm:px-3 text-slate-700">
                <PackageCheck className="w-3.5 h-3.5 text-primary" />
                <span>Packer</span>
              </Button>
            </Link>

            <Link href="/" className="shrink-0">
              <Button variant="outline" size="sm" className="h-8 sm:h-9 rounded-xl text-xs font-bold gap-1.5 px-2.5 sm:px-3 text-slate-700">
                <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                <span>Store</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchOperationsData();
                fetchCurrentTheme();
                fetchStaff();
                fetchCoupons();
              }}
              disabled={isRefreshing}
              className="hidden sm:inline-flex h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Subheader Navigation Tabs */}
      <div className="bg-white border-b border-border-subtle sticky top-[57px] z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-2.5">
          <button
            type="button"
            onClick={() => setActiveOwnerTab("overview")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeOwnerTab === "overview"
                ? "bg-primary text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Overview &amp; Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveOwnerTab("orders")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeOwnerTab === "orders"
                ? "bg-primary text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Orders Hub</span>
            {analytics && analytics.activeOrders > 0 && (
              <Badge className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0">
                {analytics.activeOrders}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveOwnerTab("customers")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeOwnerTab === "customers"
                ? "bg-primary text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customers CRM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveOwnerTab("staff")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeOwnerTab === "staff"
                ? "bg-primary text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Staff Directory</span>
            <Badge className="bg-slate-200 text-slate-800 font-bold text-[9px] px-1.5 py-0">
              {staffList.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveOwnerTab("coupons")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeOwnerTab === "coupons"
                ? "bg-primary text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Coupons</span>
            <Badge className="bg-slate-200 text-slate-800 font-bold text-[9px] px-1.5 py-0">
              {couponsList.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveOwnerTab("theme")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeOwnerTab === "theme"
                ? "bg-primary text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Theme &amp; Branding</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-32 sm:pb-36 md:pb-12 space-y-8">
        {/* ORDERS HUB TAB */}
        {activeOwnerTab === "orders" && <OwnerOrdersTab />}

        {/* CUSTOMERS CRM TAB */}
        {activeOwnerTab === "customers" && <OwnerCustomersTab />}

        {/* SECTION 1: FINANCIAL & SLA KPI METRIC CARDS */}
        {activeOwnerTab === "overview" && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in">
          {/* GMV Card */}
          <div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Today&apos;s GMV
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-surface-dark tracking-tight">
                ₹{analytics?.todayGMV ? analytics.todayGMV.toLocaleString("en-IN") : "0"}
              </div>
              <p className="text-xs font-semibold text-emerald-600 mt-1">
                Gross Merchandise Value
              </p>
            </div>
          </div>

          {/* Delivered Orders */}
          <div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Delivered Orders
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <PackageCheck className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-surface-dark tracking-tight">
                {analytics?.completedOrders || 0}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Completed & Settled Today
              </p>
            </div>
          </div>

          {/* Average Packing SLA */}
          <div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Avg Floor SLA
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-surface-dark tracking-tight">
                {analytics?.avgPackingTimeMinutes || 2.4} min
              </div>
              <p className="text-xs font-semibold text-emerald-600 mt-1">
                ⚡ Dark Store Packing Speed
              </p>
            </div>
          </div>

          {/* Low Stock SKUs Alert */}
          <div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Depleted / Low Stock
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                {analytics?.lowStockCount || 0} SKUs
              </div>
              <p className="text-xs font-semibold text-rose-600 mt-1">
                Requires replenishment
              </p>
            </div>
          </div>
        </section>
        )}

        {/* SECTION 2: DYNAMIC SEASONAL THEME CUSTOMIZER */}
        {activeOwnerTab === "theme" && (
        <section className="bg-white rounded-3xl p-6 lg:p-8 border border-border-subtle shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-black text-surface-dark tracking-tight">
                  Dynamic Seasonal Theme Engine
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize brand colors, promotional banners, and flash sale banners in real-time across the app.
              </p>
            </div>

            {/* Presets Quick Picker */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Presets:
              </span>
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  {preset.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* ---------- Scheduled Theme Campaigns (Phase 5) ---------- */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-black text-surface-dark uppercase tracking-wider">
                  Scheduled Campaigns
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  Auto-activate palettes by date — overrides the manual theme while live
                </span>
              </div>
              {campaignsLoading && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
            </div>

            {/* Campaign list */}
            <div className="space-y-2">
              {campaigns.length === 0 && !campaignsLoading && (
                <p className="text-xs text-slate-500 bg-white rounded-xl border border-slate-200 p-3">
                  No campaigns scheduled yet. Use a preset below, pick dates, and schedule it.
                </p>
              )}
              {campaigns.map((c) => {
                const status = campaignStatus(c);
                const statusStyles: Record<string, string> = {
                  LIVE: "bg-emerald-100 text-emerald-800 border-emerald-300",
                  SCHEDULED: "bg-blue-100 text-blue-800 border-blue-300",
                  ENDED: "bg-slate-200 text-slate-600 border-slate-300",
                  PAUSED: "bg-amber-100 text-amber-800 border-amber-300",
                };
                return (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex gap-1 shrink-0">
                        <span
                          className="w-6 h-6 rounded-lg border border-black/10"
                          style={{ backgroundColor: c.primaryColor }}
                        />
                        <span
                          className="w-6 h-6 rounded-lg border border-black/10"
                          style={{ backgroundColor: c.accentColor }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-surface-dark truncate">{c.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-black px-1.5 py-0 ${statusStyles[status] || ""}`}
                          >
                            {status}
                          </Badge>
                          {c.priority > 0 && (
                            <span className="text-[9px] font-bold text-slate-400">P{c.priority}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(c.validFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {" "}
                          → {" "}
                          {new Date(c.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCampaign(c.id)}
                      className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Schedule form */}
            <form onSubmit={handleSaveCampaign} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-white rounded-xl border border-slate-200 p-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Campaign</label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="e.g. Diwali Dhamaka"
                  className="h-9 text-xs rounded-lg"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Colors (from presets)</label>
                <div className="flex items-center gap-2 h-9">
                  <input
                    type="color"
                    value={campaignForm.primaryColor}
                    onChange={(e) => setCampaignForm({ ...campaignForm, primaryColor: e.target.value })}
                    className="w-9 h-9 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                    title="Primary color"
                  />
                  <input
                    type="color"
                    value={campaignForm.accentColor}
                    onChange={(e) => setCampaignForm({ ...campaignForm, accentColor: e.target.value })}
                    className="w-9 h-9 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                    title="Accent color"
                  />
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    {campaignForm.primaryColor}/{campaignForm.accentColor}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Starts</label>
                <Input
                  type="datetime-local"
                  value={campaignForm.validFrom}
                  onChange={(e) => setCampaignForm({ ...campaignForm, validFrom: e.target.value })}
                  className="h-9 text-xs rounded-lg"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Ends</label>
                <Input
                  type="datetime-local"
                  value={campaignForm.validUntil}
                  onChange={(e) => setCampaignForm({ ...campaignForm, validUntil: e.target.value })}
                  className="h-9 text-xs rounded-lg"
                  required
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Hero tag text (optional)</label>
                <Input
                  value={campaignForm.saleTagText}
                  onChange={(e) => setCampaignForm({ ...campaignForm, saleTagText: e.target.value })}
                  placeholder="e.g. 🪔 Diwali Dhamaka — Festive Deals Live"
                  className="h-9 text-xs rounded-lg"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  disabled={campaignSaving}
                  className="h-9 px-4 rounded-lg font-black text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white"
                >
                  {campaignSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  <span>Schedule</span>
                </Button>
              </div>
              {campaignMsg && (
                <p className="md:col-span-2 lg:col-span-4 text-[11px] font-bold text-slate-600">
                  {campaignMsg}
                </p>
              )}
            </form>
          </div>

          <form onSubmit={handleSaveTheme} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Theme Controls (2 columns on large screens) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Theme Campaign Name</label>
                  <Input
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value)}
                    placeholder="e.g. Diwali Dhamaka 2026"
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Sale Tag Banner Text</label>
                  <Input
                    value={saleTagText}
                    onChange={(e) => setSaleTagText(e.target.value)}
                    placeholder="e.g. ⚡ 10-15 Min Delivery Guarantee"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Color Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Primary Brand Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 text-xs font-mono rounded-xl uppercase"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      required
                    />
                  </div>
                </div>

                {/* Accent Color Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Accent Kinetic Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 text-xs font-mono rounded-xl uppercase"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Banner Hero Image URL</label>
                <Input
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                  placeholder="/banners/forest-speed-hero.webp"
                  className="h-10 text-xs rounded-xl font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={themeSaving}
                  className="h-11 px-6 rounded-xl font-black text-xs gap-2 bg-primary hover:bg-primary/90 text-white shadow-md"
                >
                  {themeSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>SAVE & APPLY THEME GLOBALLY</span>
                </Button>

                {themeSuccessMsg && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4" />
                    {themeSuccessMsg}
                  </span>
                )}
              </div>
            </div>

            {/* Live Interactive Preview Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Live UI Skin Preview
                </span>
                <Badge variant="outline" className="text-[10px] bg-white font-bold">
                  Preview
                </Badge>
              </div>

              {/* Mock Header and Tag */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div
                  className="text-xs font-bold px-2.5 py-1 rounded-full inline-block text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {saleTagText || "⚡ Fast 10-15 Min Delivery"}
                </div>
                <div className="text-sm font-black text-surface-dark">
                  SabQuick • {themeName}
                </div>
              </div>

              {/* Mock Buttons with Dynamic Inline Styles */}
              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full h-10 rounded-xl font-black text-xs text-white shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>Primary Button (e.g. Add to Cart)</span>
                </button>

                <button
                  type="button"
                  className="w-full h-10 rounded-xl font-black text-xs text-surface-dark shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  style={{ backgroundColor: accentColor }}
                >
                  <span>Accent Button (e.g. 15-Min Express)</span>
                </button>
              </div>
            </div>
          </form>
        </section>
        )}

        {/* SECTION 3: DARK-STORE STAFF & SHIFT MANAGEMENT HUB */}
        {activeOwnerTab === "staff" && (
        <section className="bg-white rounded-3xl p-6 lg:p-8 border border-border-subtle shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-black text-surface-dark tracking-tight">
                  Staff &amp; Shift Management Hub
                </h2>
                <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                  Zero-SMS PIN Clock-In
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign 4-digit PINs for instant shift clock-in without SMS delays. Manage Managers, Order Packers, and Delivery Riders.
              </p>
            </div>

            {/* Add Staff CTA */}
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setStaffFormError(null);
                  setIsAddStaffOpen(true);
                }}
                className="h-9 px-4 rounded-xl text-xs font-black gap-1.5 shadow-sm bg-primary hover:bg-primary/90 text-white shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Staff Member</span>
              </Button>
            </div>
          </div>

          {/* Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Total Staff</span>
              <span className="text-base font-black text-surface-dark">{staffList.length}</span>
            </div>
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700">Managers</span>
              <span className="text-base font-black text-purple-800">
                {staffList.filter((s) => s.role === "MANAGER").length}
              </span>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700">Packers</span>
              <span className="text-base font-black text-blue-800">
                {staffList.filter((s) => s.role === "PACKER").length}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700">Delivery Riders</span>
              <span className="text-base font-black text-emerald-800">
                {staffList.filter((s) => s.role === "RIDER").length}
              </span>
            </div>
          </div>

          {/* Mobile Staff Touch Cards (< md) */}
          <div className="block md:hidden space-y-3">
            {isStaffLoading ? (
              <div className="py-8 text-center text-slate-500 font-medium">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                Loading staff records...
              </div>
            ) : staffList.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No staff members registered. Click &quot;+ Add Staff Member&quot; to begin.
              </div>
            ) : (
              staffList.map((staff) => {
                const isOwnerAccount = staff.role === "OWNER" || staff.phone === "9109066668";

                return (
                  <div
                    key={staff.id}
                    className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 font-black text-slate-700 flex items-center justify-center text-sm shadow-xs">
                          {staff.name ? staff.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-surface-dark">{staff.name || "Unnamed"}</span>
                            {isOwnerAccount && (
                              <Badge className="bg-amber-500 text-white font-black text-[9px] px-1 py-0">
                                OWNER
                              </Badge>
                            )}
                          </div>
                          <span className="font-mono text-xs text-slate-600 font-semibold block">
                            +91 {staff.phone}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 justify-end">
                        {(staff.roles && staff.roles.length > 0 ? staff.roles : [staff.role]).map((r) => (
                          <Badge
                            key={r}
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 ${
                              r === "OWNER"
                                ? "bg-amber-500 text-white"
                                : r === "MANAGER"
                                ? "bg-purple-600 text-white"
                                : r === "PACKER"
                                ? "bg-blue-600 text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {staff.email && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                    )}

                    {staff.riderProfile?.vehicleDetails && (
                      <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{staff.riderProfile.vehicleDetails}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Shift PIN:</span>
                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span className="font-mono font-bold text-xs tracking-wider text-surface-dark">
                            ••••
                          </span>
                        </div>
                      </div>

                      {!isOwnerAccount && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditStaff(staff)}
                            className="h-8 px-2 text-slate-700 hover:text-primary hover:bg-slate-100 text-xs font-bold gap-1 rounded-xl"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-primary" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingStaffId === staff.id}
                            onClick={() => handleDeleteStaff(staff.id, staff.name || "Staff")}
                            className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1 rounded-xl"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Deactivate</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Staff Table (>= md) */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Mobile &amp; Email</th>
                  <th className="py-3 px-4">Shift Roles</th>
                  <th className="py-3 px-4">Shift Clock-In PIN</th>
                  <th className="py-3 px-4">Vehicle / Details</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isStaffLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                      Loading staff records...
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                      No staff members registered. Click &quot;+ Add Staff Member&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => {
                    const isOwnerAccount = staff.role === "OWNER" || staff.phone === "9109066668";

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Name & Avatar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 font-black text-slate-700 flex items-center justify-center text-xs shrink-0">
                              {staff.name ? staff.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div>
                              <div className="font-bold text-surface-dark flex items-center gap-1.5">
                                <span>{staff.name || "Unnamed"}</span>
                                {isOwnerAccount && (
                                  <Badge className="bg-amber-500 text-white font-black text-[9px] px-1 py-0">
                                    OWNER
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                Added {new Date(staff.createdAt).toLocaleDateString("en-IN")}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Phone & Email */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-800">
                            +91 {staff.phone}
                          </div>
                          {staff.email ? (
                            <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                              {staff.email}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No email linked</span>
                          )}
                        </td>

                        {/* Role Badges */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(staff.roles && staff.roles.length > 0 ? staff.roles : [staff.role]).map((r) => (
                              <Badge
                                key={r}
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 ${
                                  r === "OWNER"
                                    ? "bg-amber-500 text-white"
                                    : r === "MANAGER"
                                    ? "bg-purple-600 text-white"
                                    : r === "PACKER"
                                    ? "bg-blue-600 text-white"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </td>

                        {/* Shift PIN (masked — PINs are never sent to the client) */}
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono font-black text-xs tracking-wider text-surface-dark">
                              ••••
                            </span>
                          </div>
                        </td>

                        {/* Vehicle / Station */}
                        <td className="py-3 px-4 text-slate-600">
                          {staff.riderProfile?.vehicleDetails ? (
                            <div className="flex items-center gap-1.5 font-medium max-w-[160px] truncate">
                              <Bike className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="truncate">{staff.riderProfile.vehicleDetails}</span>
                            </div>
                          ) : staff.roles?.includes("PACKER") || staff.role === "PACKER" ? (
                            <span className="text-slate-500">Dark-Store Packing Line</span>
                          ) : staff.roles?.includes("MANAGER") || staff.role === "MANAGER" ? (
                            <span className="text-slate-500">Operations Console</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {isOwnerAccount ? (
                            <span className="text-[11px] font-bold text-amber-600">Protected</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditStaff(staff)}
                                className="h-8 px-2 text-slate-700 hover:text-primary hover:bg-slate-100 text-xs font-bold gap-1 rounded-xl"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-primary" />
                                <span>Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingStaffId === staff.id}
                                onClick={() => handleDeleteStaff(staff.id, staff.name || "Staff")}
                                className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1 rounded-xl"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Deactivate</span>
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {/* SECTION 4: PROMOTIONS & DISCOUNT COUPONS HUB */}
        {activeOwnerTab === "coupons" && (
        <section id="coupons-section" className="bg-white rounded-3xl p-6 lg:p-8 border border-border-subtle shadow-sm space-y-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-black text-surface-dark tracking-tight">
                  Promotions &amp; Discount Coupons Hub
                </h2>
                <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200">
                  Cart Vouchers
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Create, monitor, and toggle promotional coupon codes applied by customers at checkout.
              </p>
            </div>

            {/* Create Coupon CTA */}
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setCouponFormError(null);
                  setCouponFormData({
                    code: "",
                    description: "",
                    discountType: "FLAT",
                    discountValue: 50,
                    minOrderAmount: 199,
                    maxDiscount: 100,
                    validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    usageLimit: 500,
                    isActive: true,
                  });
                  setIsAddCouponOpen(true);
                }}
                className="h-9 px-4 rounded-xl text-xs font-black gap-1.5 shadow-sm bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create New Coupon</span>
              </Button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Total Vouchers</span>
              <span className="text-base font-black text-surface-dark">{couponsList.length}</span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700">Active Live</span>
              <span className="text-base font-black text-emerald-800">
                {couponsList.filter((c) => c.isActive).length}
              </span>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700">Total Redemptions</span>
              <span className="text-base font-black text-blue-800">
                {couponsList.reduce((acc, c) => acc + c.usedCount, 0)}
              </span>
            </div>
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700">Orders Benefited</span>
              <span className="text-base font-black text-purple-800">
                {couponsList.reduce((acc, c) => acc + (c._count?.orders || 0), 0)}
              </span>
            </div>
          </div>

          {/* Mobile Cards (sm:hidden) */}
          <div className="space-y-3 sm:hidden">
            {isCouponsLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                <span>Loading promotional vouchers...</span>
              </div>
            ) : couponsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                No coupons configured yet. Click &quot;+ Create New Coupon&quot; to offer discounts.
              </div>
            ) : (
              couponsList.map((coupon) => {
                const isExpired = new Date() > new Date(coupon.validTill);
                return (
                  <div key={coupon.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black tracking-wider bg-white px-2.5 py-1 rounded-lg border border-slate-300 text-surface-dark shadow-2xs">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyCouponCode(coupon.code)}
                          className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 text-xs"
                          title="Copy Code"
                        >
                          {copiedCouponCode === coupon.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleCouponActive(coupon)}
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border transition-all ${
                          coupon.isActive && !isExpired
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {isExpired ? "EXPIRED" : coupon.isActive ? "ACTIVE" : "DISABLED"}
                      </button>
                    </div>

                    <div className="text-xs text-slate-600">
                      <p className="font-medium">{coupon.description || "Promotional Discount Coupon"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-slate-400">Discount: </span>
                        <span className="font-bold text-amber-700">
                          {coupon.discountType === "FLAT"
                            ? `₹${coupon.discountValue} FLAT`
                            : `${coupon.discountValue}% OFF${coupon.maxDiscount ? ` (Cap ₹${coupon.maxDiscount})` : ""}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Min Order: </span>
                        <span className="font-bold text-slate-700">₹{coupon.minOrderAmount}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Used: </span>
                        <span className="font-bold text-slate-700">{coupon.usedCount} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : ""}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Expires: </span>
                        <span className="font-bold text-slate-700">
                          {new Date(coupon.validTill).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditCoupon(coupon)}
                        className="h-8 px-3 text-xs font-bold gap-1 rounded-xl"
                      >
                        <Edit2 className="w-3 h-3 text-slate-600" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCoupon(coupon);
                          setIsDeleteCouponOpen(true);
                        }}
                        className="h-8 px-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1 rounded-xl"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Coupons Table (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto border border-border-subtle rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount Type &amp; Value</th>
                  <th className="py-3 px-4">Min Order</th>
                  <th className="py-3 px-4">Redemptions</th>
                  <th className="py-3 px-4">Valid Till</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isCouponsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                        <span>Loading promotional vouchers...</span>
                      </div>
                    </td>
                  </tr>
                ) : couponsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No coupons configured yet. Click &quot;+ Create New Coupon&quot; to launch promotions.
                    </td>
                  </tr>
                ) : (
                  couponsList.map((coupon) => {
                    const isExpired = new Date() > new Date(coupon.validTill);
                    return (
                      <tr key={coupon.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Coupon Code & Desc */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-surface-dark">
                              {coupon.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyCouponCode(coupon.code)}
                              className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Copy Code"
                            >
                              {copiedCouponCode === coupon.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {coupon.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 max-w-[200px] truncate">
                              {coupon.description}
                            </p>
                          )}
                        </td>

                        {/* Discount Value */}
                        <td className="py-3.5 px-4 font-bold">
                          {coupon.discountType === "FLAT" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              ₹{coupon.discountValue} FLAT OFF
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                              {coupon.discountValue}% OFF {coupon.maxDiscount ? `(Cap ₹${coupon.maxDiscount})` : ""}
                            </span>
                          )}
                        </td>

                        {/* Min Order Amount */}
                        <td className="py-3.5 px-4 text-slate-700 font-semibold font-mono">
                          ₹{coupon.minOrderAmount}
                        </td>

                        {/* Redemptions */}
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="font-mono font-bold">
                            {coupon.usedCount}
                            {coupon.usageLimit && <span className="text-slate-400 font-normal"> / {coupon.usageLimit}</span>}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {coupon._count?.orders ? `${coupon._count.orders} orders` : "0 orders"}
                          </div>
                        </td>

                        {/* Valid Till */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className={isExpired ? "text-rose-600 font-bold" : "font-medium"}>
                            {new Date(coupon.validTill).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isExpired ? "Expired" : "Expires 11:59 PM"}
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCouponActive(coupon)}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                              coupon.isActive && !isExpired
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${coupon.isActive && !isExpired ? "bg-emerald-500" : "bg-slate-400"}`} />
                            <span>{isExpired ? "Expired" : coupon.isActive ? "Active" : "Disabled"}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditCoupon(coupon)}
                              className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-primary hover:bg-slate-100"
                              title="Edit Coupon"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCoupon(coupon);
                                setIsDeleteCouponOpen(true);
                              }}
                              className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              title="Delete Coupon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {/* SECTION 5: INVENTORY REPLENISHMENT & CATALOG OVERRIDE TABLE */}
        {activeOwnerTab === "overview" && (
        <section className="bg-white rounded-3xl p-6 lg:p-8 border border-border-subtle shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-black text-surface-dark tracking-tight">
                  Inventory Replenishment & Stock Master
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor current dark-store SKU stock levels and toggle real-time catalog availability.
              </p>
            </div>

            {/* Search & Category Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <Input
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder="Search catalog..."
                  className="h-9 pl-8 pr-3 text-xs rounded-xl"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs h-9 rounded-xl border border-slate-300 bg-white px-3 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Categories ({allProducts.length})</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile High-Density Touch Cards (< md) */}
          <div className="block md:hidden space-y-3">
            {isLoading ? (
              <div className="py-8 text-center text-slate-500 font-medium">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                Loading inventory records...
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No matching products found in catalog.
              </div>
            ) : (
              filteredInventory.map((product) => {
                const isLowStock = product.stockCount < 15;
                const isUpdating = toggleStockId === product.id;

                return (
                  <div
                    key={product.id}
                    className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white relative shrink-0 overflow-hidden border border-slate-200 p-0.5">
                        <Image
                          src={product.imageUrl}
                          alt={product.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                            {product.category?.name || "General"}
                          </span>
                          <span className="text-xs font-black text-slate-900 font-mono">
                            ₹{product.price}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-surface-dark truncate mt-0.5" title={product.title}>
                          {product.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {product.packSize}
                          </span>
                          <span className="text-slate-300">&bull;</span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded font-bold text-[10px] ${
                              isLowStock
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {product.stockCount} units
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${product.isAvailable ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <span className={`text-xs font-bold ${product.isAvailable ? "text-emerald-700" : "text-rose-600"}`}>
                          {product.isAvailable ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>

                      <Button
                        variant={product.isAvailable ? "outline" : "default"}
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleToggleStock(product.id, product.isAvailable)}
                        className={`h-8 px-3 rounded-xl text-xs font-black transition-all ${
                          product.isAvailable
                            ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {isUpdating ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : product.isAvailable ? (
                          "Mark Out-of-Stock"
                        ) : (
                          "Mark In-Stock"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">SKU Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Pack Size</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock Count</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">1-Click Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                      Loading inventory records...
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                      No matching products found in catalog.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((product) => {
                    const isLowStock = product.stockCount < 15;
                    const isUpdating = toggleStockId === product.id;

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Thumbnail & Title */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 relative shrink-0 overflow-hidden border border-slate-200">
                              <Image
                                src={product.imageUrl}
                                alt={product.title}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 font-bold text-surface-dark max-w-[200px] truncate">
                              {product.title}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {product.category?.name || "General"}
                        </td>

                        {/* Pack Size */}
                        <td className="py-3 px-4 text-slate-500">
                          {product.packSize}
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4 font-black text-slate-900">
                          ₹{product.price}
                        </td>

                        {/* Stock Count */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              isLowStock
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {product.stockCount} units
                          </span>
                        </td>

                        {/* Availability Status */}
                        <td className="py-3 px-4">
                          {product.isAvailable ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              In Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              Out of Stock
                            </span>
                          )}
                        </td>

                        {/* Toggle Button */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant={product.isAvailable ? "outline" : "default"}
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleToggleStock(product.id, product.isAvailable)}
                            className={`h-8 px-3 rounded-lg text-xs font-black transition-all ${
                              product.isAvailable
                                ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {isUpdating ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : product.isAvailable ? (
                              "Mark Out-of-Stock"
                            ) : (
                              "Mark In-Stock"
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}

          {/* ADD / EDIT STAFF DIALOG MODAL */}
        <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  {isEditingStaff ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-surface-dark">
                    {isEditingStaff ? "Edit Dark-Store Staff" : "Add Dark-Store Staff"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {isEditingStaff
                      ? "Update staff roles, shift PIN, and details."
                      : "Assign a 4-digit shift PIN for instant, zero-SMS portal access."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {staffFormError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{staffFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4 py-2">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={staffFormData.name}
                  onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>

              {/* Mobile & Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" /> Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="h-10 px-2.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center text-xs font-bold text-slate-600 select-none">
                      +91
                    </span>
                    <Input
                      type="tel"
                      maxLength={10}
                      value={staffFormData.phone}
                      onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value.replace(/\D/g, "") })}
                      placeholder="9876543210"
                      className="h-10 text-xs font-mono font-semibold rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-primary" /> Gmail Address
                  </label>
                  <Input
                    type="email"
                    value={staffFormData.email}
                    onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                    placeholder="staff@gmail.com"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* MULTI-ROLE SELECTION */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary" /> Shift Roles <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Select all that apply</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { role: "MANAGER" as const, label: "Manager", desc: "Catalog & Pricing", emoji: "👔" },
                    { role: "PACKER" as const, label: "Packer", desc: "Order Packing Station", emoji: "📦" },
                    { role: "RIDER" as const, label: "Rider", desc: "Delivery Fleet", emoji: "🛵" },
                  ].map((item) => {
                    const isSelected = staffFormData.roles.includes(item.role);
                    return (
                      <button
                        type="button"
                        key={item.role}
                        onClick={() => {
                          let newRoles = [...staffFormData.roles];
                          if (isSelected) {
                            if (newRoles.length > 1) {
                              newRoles = newRoles.filter((r) => r !== item.role);
                            }
                          } else {
                            newRoles.push(item.role);
                          }
                          setStaffFormData({
                            ...staffFormData,
                            roles: newRoles,
                            role: newRoles[0],
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-black flex items-center gap-1">
                            <span>{item.emoji}</span>
                            <span>{item.label}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="accent-emerald-600 pointer-events-none"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4-Digit Shift PIN */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" /> 4-Digit Shift PIN <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={staffFormData.pin}
                  onChange={(e) => setStaffFormData({ ...staffFormData, pin: e.target.value.replace(/\D/g, "") })}
                  placeholder="1234"
                  className="h-10 text-center text-base font-black font-mono tracking-widest rounded-xl"
                  required
                />
              </div>

              {/* Rider vehicle details (conditional) */}
              {staffFormData.roles.includes("RIDER") && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-primary" /> Vehicle Type &amp; Reg Number
                  </label>
                  <Input
                    value={staffFormData.vehicleDetails}
                    onChange={(e) => setStaffFormData({ ...staffFormData, vehicleDetails: e.target.value })}
                    placeholder="e.g. Hero Optima EV - CG 15 AB 1234"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              )}

              <DialogFooter className="pt-3 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="h-10 rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={staffFormSubmitting}
                  className="h-10 rounded-xl text-xs font-black bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm"
                >
                  {staffFormSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isEditingStaff ? "Save Staff Changes" : "Register Staff Member"}</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL: ADD PROMOTIONAL COUPON */}
        <Dialog open={isAddCouponOpen} onOpenChange={setIsAddCouponOpen}>
          <DialogContent className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Ticket className="w-4 h-4" />
                </div>
                <DialogTitle className="text-base font-black text-surface-dark">
                  Create Promotional Coupon
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Configure a discount voucher for customers to apply in checkout.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateCoupon} className="space-y-3.5 pt-2">
              {couponFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{couponFormError}</span>
                </div>
              )}

              {/* Code & Type Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" /> Voucher Code <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={couponFormData.code}
                    onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WELCOME50"
                    className="h-10 text-xs font-mono font-bold uppercase rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-600" /> Discount Type
                  </label>
                  <select
                    value={couponFormData.discountType}
                    onChange={(e) => setCouponFormData({ ...couponFormData, discountType: e.target.value as "FLAT" | "PERCENTAGE" })}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="FLAT">₹ Flat Discount</option>
                    <option value="PERCENTAGE">% Percentage Off</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Public Description
                </label>
                <Input
                  value={couponFormData.description}
                  onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })}
                  placeholder="e.g. Flat ₹50 OFF on grocery orders above ₹199"
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              {/* Discount Value & Min Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {couponFormData.discountType === "FLAT" ? "Discount Amount (₹)" : "Percentage Value (%)"} <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={couponFormData.discountType === "PERCENTAGE" ? 100 : 10000}
                    value={couponFormData.discountValue}
                    onChange={(e) => setCouponFormData({ ...couponFormData, discountValue: Number(e.target.value) })}
                    className="h-10 text-xs font-bold rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Min Order Subtotal (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={couponFormData.minOrderAmount}
                    onChange={(e) => setCouponFormData({ ...couponFormData, minOrderAmount: Number(e.target.value) })}
                    className="h-10 text-xs font-bold rounded-xl"
                  />
                </div>
              </div>

              {/* Max Discount Cap (if percentage) & Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {couponFormData.discountType === "PERCENTAGE" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Max Discount Cap (₹)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={couponFormData.maxDiscount}
                      onChange={(e) => setCouponFormData({ ...couponFormData, maxDiscount: Number(e.target.value) })}
                      placeholder="e.g. 100"
                      className="h-10 text-xs font-bold rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Usage Limit (Orders)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={couponFormData.usageLimit}
                      onChange={(e) => setCouponFormData({ ...couponFormData, usageLimit: Number(e.target.value) })}
                      placeholder="e.g. 500"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" /> Valid Till Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={couponFormData.validTill}
                    onChange={(e) => setCouponFormData({ ...couponFormData, validTill: e.target.value })}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs space-y-1 text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Customer Cart Preview</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Code <strong className="font-mono">{couponFormData.code || "COUPON"}</strong> gives{" "}
                  <strong>
                    {couponFormData.discountType === "FLAT"
                      ? `₹${couponFormData.discountValue} FLAT OFF`
                      : `${couponFormData.discountValue}% OFF (up to ₹${couponFormData.maxDiscount})`}
                  </strong>{" "}
                  on orders above ₹{couponFormData.minOrderAmount}.
                </p>
              </div>

              <DialogFooter className="pt-3 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddCouponOpen(false)}
                  className="h-10 rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={couponFormSubmitting}
                  className="h-10 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm"
                >
                  {couponFormSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save &amp; Activate Coupon</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL: EDIT PROMOTIONAL COUPON */}
        <Dialog open={isEditCouponOpen} onOpenChange={setIsEditCouponOpen}>
          <DialogContent className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Edit2 className="w-4 h-4" />
                </div>
                <DialogTitle className="text-base font-black text-surface-dark">
                  Edit Coupon: {selectedCoupon?.code}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Update discount values, minimum thresholds, or expiry dates.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditCoupon} className="space-y-3.5 pt-2">
              {couponFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{couponFormError}</span>
                </div>
              )}

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Discount Type</label>
                  <select
                    value={couponFormData.discountType}
                    onChange={(e) => setCouponFormData({ ...couponFormData, discountType: e.target.value as "FLAT" | "PERCENTAGE" })}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700"
                  >
                    <option value="FLAT">₹ Flat Discount</option>
                    <option value="PERCENTAGE">% Percentage Off</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {couponFormData.discountType === "FLAT" ? "Discount (₹)" : "Discount (%)"}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={couponFormData.discountType === "PERCENTAGE" ? 100 : 10000}
                    value={couponFormData.discountValue}
                    onChange={(e) => setCouponFormData({ ...couponFormData, discountValue: Number(e.target.value) })}
                    className="h-10 text-xs font-bold rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <Input
                  value={couponFormData.description}
                  onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Min Order Subtotal (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    value={couponFormData.minOrderAmount}
                    onChange={(e) => setCouponFormData({ ...couponFormData, minOrderAmount: Number(e.target.value) })}
                    className="h-10 text-xs font-bold rounded-xl"
                  />
                </div>

                {couponFormData.discountType === "PERCENTAGE" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Max Discount Cap (₹)</label>
                    <Input
                      type="number"
                      min="1"
                      value={couponFormData.maxDiscount}
                      onChange={(e) => setCouponFormData({ ...couponFormData, maxDiscount: Number(e.target.value) })}
                      className="h-10 text-xs font-bold rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Usage Limit</label>
                    <Input
                      type="number"
                      min="1"
                      value={couponFormData.usageLimit}
                      onChange={(e) => setCouponFormData({ ...couponFormData, usageLimit: Number(e.target.value) })}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Valid Till & Active Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Valid Till Date</label>
                  <Input
                    type="date"
                    value={couponFormData.validTill}
                    onChange={(e) => setCouponFormData({ ...couponFormData, validTill: e.target.value })}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={couponFormData.isActive}
                      onChange={(e) => setCouponFormData({ ...couponFormData, isActive: e.target.checked })}
                      className="accent-primary w-4 h-4 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">Active in Checkout</span>
                  </label>
                </div>
              </div>

              <DialogFooter className="pt-3 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditCouponOpen(false)}
                  className="h-10 rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={couponFormSubmitting}
                  className="h-10 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
                >
                  {couponFormSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL: DELETE CONFIRMATION */}
        <Dialog open={isDeleteCouponOpen} onOpenChange={setIsDeleteCouponOpen}>
          <DialogContent className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <DialogHeader className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <DialogTitle className="text-center text-base font-black text-surface-dark">
                Delete Coupon {selectedCoupon?.code}?
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-slate-500">
                Are you sure you want to permanently remove this coupon? Customers will no longer be able to apply it.
              </DialogDescription>
            </DialogHeader>

            {selectedCoupon?._count?.orders && selectedCoupon._count.orders > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Active Order Redemptions Detected</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  This coupon has been used in <strong>{selectedCoupon._count.orders}</strong> past order(s).
                  Permanent deletion will safely unlink order records while preserving customer receipts.
                </p>
              </div>
            )}

            <DialogFooter className="pt-2 gap-2 sm:gap-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteCouponOpen(false)}
                className="h-10 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              {selectedCoupon?.isActive && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    if (selectedCoupon) {
                      await handleToggleCouponActive(selectedCoupon);
                      setIsDeleteCouponOpen(false);
                    }
                  }}
                  className="h-10 rounded-xl text-xs font-bold"
                >
                  Disable Instead
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                disabled={couponFormSubmitting}
                onClick={() => handleDeleteCoupon(true)}
                className="h-10 rounded-xl text-xs font-black gap-1.5 shadow-sm"
              >
                {couponFormSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Forever</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
