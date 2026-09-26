"use client";

import * as React from "react";
import Link from "next/link";
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
  RefreshCw,
  ExternalLink,
  Save,
  Sparkles,
  Check,
  AlertCircle,
  Store,
  LayoutDashboard,
  FolderTree,
  Users,
  UserPlus,
  Shield,
  Bike,
  Trash2,
  Plus,
  ArrowLeft,
  Ticket,
  Copy,
  Edit2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand/Logo";
import { THEME_PRESETS as SHARED_THEME_PRESETS } from "@/components/theme/themePresets";
import { OwnerOrdersTab } from "@/components/owner/OwnerOrdersTab";
import { OwnerCustomersTab } from "@/components/owner/OwnerCustomersTab";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const [saleTagText, setSaleTagText] = React.useState("10-15 Min Delivery Guarantee");
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
                Dark Store Packing Speed
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
              <div className="md:col-span-2 lg:grid-cols-3 lg:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Hero tag text (optional)</label>
                <Input
                  value={campaignForm.saleTagText}
                  onChange={(e) => setCampaignForm({ ...campaignForm, saleTagText: e.target.value })}
                  placeholder="e.g. Diwali Dhamaka - Festive Deals Live"
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

          {/* ---------- Manual Theme Override Form ---------- */}
          <form onSubmit={handleSaveTheme} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Theme Name</label>
              <Input
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="e.g. Diwali Festive Gold"
                className="h-10 rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Hero Sale Tag Text</label>
              <Input
                value={saleTagText}
                onChange={(e) => setSaleTagText(e.target.value)}
                placeholder="10-15 Min Delivery Guarantee"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Primary Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 rounded-xl cursor-pointer border border-slate-300 p-1 bg-white"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 font-mono text-xs rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Accent Color (CTAs)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-10 rounded-xl cursor-pointer border border-slate-300 p-1 bg-white"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 font-mono text-xs rounded-xl"
                />
              </div>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Hero Banner Image URL</label>
              <Input
                value={bannerImageUrl}
                onChange={(e) => setBannerImageUrl(e.target.value)}
                placeholder="/banners/forest-speed-hero.webp"
                className="h-10 font-mono text-xs rounded-xl"
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={themeSaving}
                className="h-11 px-6 rounded-xl font-black gap-2 bg-primary hover:bg-primary/90 text-white"
              >
                {themeSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save &amp; Apply Theme Globally
              </Button>
              {themeSuccessMsg && (
                <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                  <Sparkles className="w-4 h-4" />
                  {themeSuccessMsg}
                </span>
              )}
            </div>
          </form>
        </section>
        )}

        {/* SECTION 3: INVENTORY REPLENISHMENT (Overview tab) */}
        {activeOwnerTab === "overview" && (
        <section className="bg-white rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-base font-black text-surface-dark tracking-tight">
                  Live Inventory &amp; Replenishment
                </h2>
                <p className="text-[11px] text-slate-500">
                  Toggle SKUs in/out of stock instantly — reflects on the storefront in real time
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder="Search SKUs..."
                  className="pl-8 h-9 w-40 sm:w-56 text-xs rounded-xl"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-xl border border-border-subtle bg-white text-xs font-bold px-2.5 outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="ALL">All Categories</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-border-subtle">
                <tr className="text-left text-slate-500 font-black uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5 hidden sm:table-cell">Category</th>
                  <th className="px-4 py-2.5">Price</th>
                  <th className="px-4 py-2.5">Stock</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.imageUrl} alt="" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-surface-dark truncate max-w-[180px]">{p.title}</div>
                          <div className="text-[10px] text-slate-400">{p.packSize}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-slate-600 font-medium">
                      {p.category?.name}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-surface-dark">₹{p.price}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-bold ${p.isAvailable ? "text-emerald-600" : "text-rose-500"}`}>
                        {p.isAvailable ? "In Stock" : "Out of Stock"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStock(p.id, p.isAvailable)}
                        disabled={toggleStockId === p.id}
                        className={`h-7 px-3 rounded-lg text-[10px] font-black transition-all ${
                          p.isAvailable
                            ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {toggleStockId === p.id ? "..." : p.isAvailable ? "Mark Out" : "Restock"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {/* SECTION 4: STAFF DIRECTORY TAB */}
        {activeOwnerTab === "staff" && (
        <section className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-surface-dark flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Staff Directory
            </h2>
            <Button onClick={() => { setIsEditingStaff(false); setIsAddStaffOpen(true); }} className="rounded-xl font-bold gap-1.5 h-9">
              <UserPlus className="w-4 h-4" /> Add Staff
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {staffList.map((s) => {
              const assignedRoles = (s.roles && s.roles.length > 0 ? s.roles : [s.role]).filter((r) => r !== "OWNER");
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-border-subtle p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
                        {s.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-surface-dark truncate">{s.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">+91 {s.phone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEditStaff(s)} className="h-7 w-7 p-0">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteStaff(s.id, s.name || "staff")} disabled={deletingStaffId === s.id} className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {assignedRoles.map((r) => (
                      <Badge key={r} variant="secondary" className="text-[9px] font-black uppercase px-1.5 py-0">
                        {r}
                      </Badge>
                    ))}
                    {s.riderProfile?.isOnline && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase px-1.5 py-0">
                        Online
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!isStaffLoading && staffList.length === 0 && (
            <p className="text-xs text-slate-500 bg-white rounded-xl border border-border-subtle p-4 text-center">
              No staff yet. Add packers, riders and managers to run the floor.
            </p>
          )}
        </section>
        )}

        {/* SECTION 5: COUPONS TAB */}
        {activeOwnerTab === "coupons" && (
        <section className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-surface-dark flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Coupons &amp; Promotions
            </h2>
            <Button onClick={() => { setIsAddCouponOpen(true); }} className="rounded-xl font-bold gap-1.5 h-9">
              <Plus className="w-4 h-4" /> New Coupon
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {couponsList.map((c) => (
              <div key={c.id} className={`bg-white rounded-2xl border p-4 shadow-xs ${c.isActive ? "border-emerald-200" : "border-border-subtle opacity-80"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-black text-xs text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20 shrink-0">
                      {c.code}
                    </span>
                    <span className="text-xs font-bold text-surface-dark truncate">
                      {c.discountType === "FLAT" ? `Flat ₹${c.discountValue} OFF` : `${c.discountValue}% OFF`}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => copyCouponCode(c.code)} className="h-7 w-7 p-0">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEditCoupon(c)} className="h-7 w-7 p-0">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedCoupon(c); setIsDeleteCouponOpen(true); }} className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-1">
                  {c.description || (c.minOrderAmount > 0 ? `Valid on orders above ₹${c.minOrderAmount}` : "Valid on all orders")}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                    <span>Used {c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}×</span>
                    <span>·</span>
                    <span>Till {new Date(c.validTill).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCouponActive(c)}
                    className={`h-6 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                      c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {c.isActive ? "Live" : "Paused"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!isCouponsLoading && couponsList.length === 0 && (
            <p className="text-xs text-slate-500 bg-white rounded-xl border border-border-subtle p-4 text-center">
              No coupons yet. Create your first promo to drive orders.
            </p>
          )}
        </section>
        )}
      </main>

      {/* ---------- Staff Add/Edit Dialog ---------- */}
      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingStaff ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
            <DialogDescription>
              Staff log in with their mobile number + 4-digit PIN for shift access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateStaff} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Full Name</label>
              <Input value={staffFormData.name} onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })} placeholder="e.g. Rahul Kumar" className="h-10 rounded-xl" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Mobile Number</label>
              <Input value={staffFormData.phone} onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value.replace(/\D/g, "") })} maxLength={10} inputMode="numeric" placeholder="10-digit number" className="h-10 rounded-xl font-mono" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">{isEditingStaff ? "Reset PIN (leave blank to keep current)" : "4-Digit Shift PIN"}</label>
              <Input value={staffFormData.pin} onChange={(e) => setStaffFormData({ ...staffFormData, pin: e.target.value.replace(/\D/g, "") })} maxLength={4} inputMode="numeric" type="password" placeholder="••••" className="h-10 rounded-xl font-mono tracking-widest" required={!isEditingStaff} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Shift Roles</label>
              <div className="flex flex-wrap gap-2">
                {(["PACKER", "RIDER", "MANAGER"] as const).map((r) => {
                  const active = staffFormData.roles.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setStaffFormData((prev) => ({
                        ...prev,
                        roles: active ? prev.roles.filter((x) => x !== r) : [...prev.roles, r],
                      }))}
                      className={`h-8 px-3 rounded-xl text-[11px] font-black uppercase tracking-wide border transition-all ${
                        active ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-border-subtle hover:border-primary/40"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
            {staffFormData.roles.includes("RIDER") && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Vehicle Details (Rider)</label>
                <Input value={staffFormData.vehicleDetails} onChange={(e) => setStaffFormData({ ...staffFormData, vehicleDetails: e.target.value })} placeholder="e.g. Hero Splendor · BR-01-AB-1234" className="h-10 rounded-xl" />
              </div>
            )}
            {staffFormError && (
              <p className="text-xs text-rose-600 font-bold">{staffFormError}</p>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddStaffOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={staffFormSubmitting} className="rounded-xl font-black">
                {staffFormSubmitting ? "Saving..." : isEditingStaff ? "Update Staff" : "Add Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- Coupon Create Dialog ---------- */}
      <Dialog open={isAddCouponOpen} onOpenChange={setIsAddCouponOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Coupon</DialogTitle>
            <DialogDescription>
              Customers can apply this code at cart checkout.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCoupon} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Coupon Code</label>
              <Input value={couponFormData.code} onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })} placeholder="FESTIVE50" className="h-10 rounded-xl font-mono font-black tracking-wider" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Discount Type</label>
                <select
                  value={couponFormData.discountType}
                  onChange={(e) => setCouponFormData({ ...couponFormData, discountType: e.target.value as "FLAT" | "PERCENTAGE" })}
                  className="h-10 w-full rounded-xl border border-border-subtle bg-white text-xs font-bold px-2.5 outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="FLAT">Flat ₹ Off</option>
                  <option value="PERCENTAGE">Percentage %</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Discount Value</label>
                <Input type="number" value={couponFormData.discountValue} onChange={(e) => setCouponFormData({ ...couponFormData, discountValue: Number(e.target.value) })} className="h-10 rounded-xl font-mono" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Min Order (₹)</label>
                <Input type="number" value={couponFormData.minOrderAmount} onChange={(e) => setCouponFormData({ ...couponFormData, minOrderAmount: Number(e.target.value) })} className="h-10 rounded-xl font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Valid Till</label>
                <Input type="date" value={couponFormData.validTill} onChange={(e) => setCouponFormData({ ...couponFormData, validTill: e.target.value })} className="h-10 rounded-xl" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Description (optional)</label>
              <Input value={couponFormData.description} onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })} placeholder="Festive savings on all orders" className="h-10 rounded-xl" />
            </div>
            {couponFormError && <p className="text-xs text-rose-600 font-bold">{couponFormError}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddCouponOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={couponFormSubmitting} className="rounded-xl font-black">
                {couponFormSubmitting ? "Creating..." : "Create Coupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- Coupon Edit Dialog ---------- */}
      <Dialog open={isEditCouponOpen} onOpenChange={setIsEditCouponOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Coupon {selectedCoupon?.code}</DialogTitle>
            <DialogDescription>Update discount, validity or description.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCoupon} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Discount Type</label>
                <select
                  value={couponFormData.discountType}
                  onChange={(e) => setCouponFormData({ ...couponFormData, discountType: e.target.value as "FLAT" | "PERCENTAGE" })}
                  className="h-10 w-full rounded-xl border border-border-subtle bg-white text-xs font-bold px-2.5 outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="FLAT">Flat ₹ Off</option>
                  <option value="PERCENTAGE">Percentage %</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Discount Value</label>
                <Input type="number" value={couponFormData.discountValue} onChange={(e) => setCouponFormData({ ...couponFormData, discountValue: Number(e.target.value) })} className="h-10 rounded-xl font-mono" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Min Order (₹)</label>
                <Input type="number" value={couponFormData.minOrderAmount} onChange={(e) => setCouponFormData({ ...couponFormData, minOrderAmount: Number(e.target.value) })} className="h-10 rounded-xl font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Valid Till</label>
                <Input type="date" value={couponFormData.validTill} onChange={(e) => setCouponFormData({ ...couponFormData, validTill: e.target.value })} className="h-10 rounded-xl" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Description</label>
              <Input value={couponFormData.description} onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })} className="h-10 rounded-xl" />
            </div>
            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
              <span className="text-xs font-bold text-slate-700">Coupon Active</span>
              <button
                type="button"
                onClick={() => setCouponFormData({ ...couponFormData, isActive: !couponFormData.isActive })}
                className={`h-6 px-3 rounded-lg text-[10px] font-black uppercase ${couponFormData.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
              >
                {couponFormData.isActive ? "Live" : "Paused"}
              </button>
            </div>
            {couponFormError && <p className="text-xs text-rose-600 font-bold">{couponFormError}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditCouponOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={couponFormSubmitting} className="rounded-xl font-black">
                {couponFormSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- Coupon Delete Confirm ---------- */}
      <Dialog open={isDeleteCouponOpen} onOpenChange={setIsDeleteCouponOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedCoupon?.code}?</DialogTitle>
            <DialogDescription>
              This permanently removes the coupon. Past orders keep their discounts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsDeleteCouponOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={() => handleDeleteCoupon()} disabled={couponFormSubmitting} className="rounded-xl font-black">
              {couponFormSubmitting ? "Deleting..." : "Delete Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
