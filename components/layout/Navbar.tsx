"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Zap,
  MapPin,
  ShoppingBag,
  Clock,
  ShieldCheck,
  Search,
  LogIn,
  LogOut,
  User,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Bike,
  PackageCheck,
  LayoutDashboard,
  TrendingUp,
  Crown,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AuthModal } from "@/components/auth/AuthModal";
import { PhoneVerificationDrawer } from "@/components/auth/PhoneVerificationDrawer";
import {
  LocationPickerModal,
  SavedAddressData,
} from "@/components/location/LocationPickerModal";

import { useCartStore } from "@/store/useCartStore";
import { useAuthModalStore } from "@/store/useAuthModalStore";
import { MobileOperationsSheet } from "./MobileOperationsSheet";

interface NavbarProps {
  cartCount?: number;
  onOpenCart?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

const DEFAULT_STORE_ADDRESS: SavedAddressData = {
  label: "Home",
  flatBuilding: "Gandhi Chowk",
  streetArea: "Ambikapur, Chhattisgarh",
  latitude: 23.131617,
  longitude: 83.191015,
  distanceKm: 0.5,
  estimatedMinutes: 8,
};

const SEARCH_PLACEHOLDERS = [
  "Search 'milk, bread, butter'...",
  "Search 'Maggi, chips, snacks'...",
  "Search 'cold drinks, juices'...",
  "Search 'atta, rice, dal, oil'...",
  "Search 'fresh vegetables, onions'...",
];

export function Navbar({
  cartCount,
  onOpenCart,
  searchQuery = "",
  onSearchChange,
}: NavbarProps) {
  const { data: session, status } = useSession();
  const { items: storeItems, openCart } = useCartStore();
  const { isOpen: authModalOpen, setIsOpen: setAuthModalOpen } = useAuthModalStore();
  const [totalCartQty, setTotalCartQty] = React.useState(0);
  const [placeholderIndex, setPlaceholderIndex] = React.useState(0);

  // Rotate search placeholder every 3.5s for dynamic Blinkit/Zepto feel
  React.useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Sync client state after hydration
  React.useEffect(() => {
    const qty = storeItems.reduce((acc, item) => acc + item.quantity, 0);
    setTotalCartQty(qty);
  }, [storeItems]);

  const displayCartCount = status !== "loading"
    ? typeof cartCount === "number"
      ? cartCount
      : totalCartQty
    : 0;

  const handleOpenCart = onOpenCart || openCart;
  const [phoneDrawerOpen, setPhoneDrawerOpen] = React.useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false);
  const [operationsSheetOpen, setOperationsSheetOpen] = React.useState(false);

  const [activeAddress, setActiveAddress] = React.useState<SavedAddressData>(DEFAULT_STORE_ADDRESS);

  // Sync user saved address when logged in
  React.useEffect(() => {
    async function loadUserAddress() {
      if (!session?.user?.id) {
        setActiveAddress(DEFAULT_STORE_ADDRESS);
        return;
      }
      try {
        const res = await fetch("/api/addresses");
        if (res.ok) {
          const data = await res.json();
          if (data.addresses && data.addresses.length > 0) {
            const first = data.addresses[0];
            setActiveAddress({
              id: first.id,
              label: first.label,
              flatBuilding: first.flatBuilding,
              streetArea: first.streetArea,
              landmark: first.landmark,
              latitude: first.latitude,
              longitude: first.longitude,
              distanceKm: 0.5,
              estimatedMinutes: 10,
            });
          } else {
            setActiveAddress(DEFAULT_STORE_ADDRESS);
          }
        }
      } catch (err) {
        console.warn("Failed to load user address in Navbar:", err);
      }
    }
    loadUserAddress();
  }, [session?.user?.id]);

  const user = session?.user;
  const isPhoneVerified = Boolean(user?.phoneVerified);

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "OWNER":
        return "default" as const;
      case "MANAGER":
        return "dark" as const;
      case "RIDER":
        return "accent" as const;
      case "PACKER":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-xs pt-[env(safe-area-inset-top,0px)] w-full transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
          {/* ========================================================= */}
          {/* 1. MOBILE TIER 1: BRAND, 10-MIN PROMISE & PROFILE HUB     */}
          {/* ========================================================= */}
          <div className="flex sm:hidden items-center justify-between gap-2 h-14 pt-1">
            {/* Left: Brand Logo + Superfast 10 Mins Pill + Address Selector */}
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/" className="shrink-0 py-0.5" title="SabQuick Home">
                <img
                  src="/brand/navbar-logo.png"
                  alt="SabQuick"
                  className="h-8 max-w-[135px] w-auto object-contain shrink-0"
                />
              </Link>

              <div className="border-l border-slate-200 pl-2 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-black text-emerald-950 uppercase tracking-tight">
                    Superfast
                  </span>
                </div>

                {/* Interactive Address Selector Pill */}
                <button
                  type="button"
                  onClick={() => setLocationPickerOpen(true)}
                  className="flex items-center text-[11px] text-muted-foreground gap-0.5 hover:text-primary transition-colors text-left font-semibold text-surface-dark max-w-[125px] xs:max-w-[155px] truncate"
                  title="Change delivery location"
                >
                  <span className="truncate">
                    {activeAddress.streetArea || activeAddress.flatBuilding}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
              </div>
            </div>

            {/* Right: Quick Profile Avatar / Staff Operations Trigger / Login */}
            <div className="flex items-center gap-1.5 shrink-0">
              {status === "loading" ? (
                <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
              ) : user ? (
                <button
                  type="button"
                  onClick={() => setOperationsSheetOpen(true)}
                  className="flex items-center gap-1.5 p-1 rounded-full bg-slate-100 hover:bg-slate-200/90 border border-slate-200/80 transition-all active:scale-95 shadow-2xs"
                  title="Open Account, Orders & Profile"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0 relative">
                    {user.role === "OWNER" ? (
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      (user.name?.[0] || user.phone?.[0] || "U").toUpperCase()
                    )}
                    {isPhoneVerified && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full"></span>
                    )}
                  </div>
                  {user.role && user.role !== "CUSTOMER" && (
                    <span className="text-[9px] font-black uppercase text-slate-700 pr-1 max-w-[48px] truncate">
                      {user.role}
                    </span>
                  )}
                </button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="rounded-full h-8 px-3 text-[11px] font-bold gap-1 border-primary/30 text-primary hover:bg-primary/5 shadow-2xs"
                >
                  <LogIn className="w-3 h-3 text-primary" />
                  <span>Login</span>
                </Button>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. MOBILE TIER 2: SPICY QUICK-COMMERCE SEARCH BAR        */}
          {/* ========================================================= */}
          <div className="block sm:hidden pb-2.5 pt-1 w-full">
            <div className="relative w-full group">
              {/* Left Search Icon with subtle emerald badge */}
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0 pointer-events-none transition-transform group-focus-within:scale-105">
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>

              {/* The Input with generous, unambiguous padding */}
              <Input
                type="text"
                placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-11 pr-20 h-11 w-full bg-slate-50/90 border-slate-200/90 hover:bg-slate-100/70 focus-visible:bg-white focus-visible:border-emerald-600 focus-visible:ring-3 focus-visible:ring-emerald-500/15 rounded-2xl text-[12.5px] font-medium placeholder:text-slate-400 shadow-2xs transition-all"
              />

              {/* Right Side: Clear Button OR Spicy 10-Min Micro-Badge */}
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange?.("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center active:scale-90 transition-all"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              ) : (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs pointer-events-none">
                  <Zap className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                  <span>SUPERFAST</span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. DESKTOP SINGLE ROW (Spacious header on >= sm screens)  */}
          {/* ========================================================= */}
          <div className="hidden sm:flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-4 w-full">
            {/* Logo & Interactive Geofence Address Trigger */}
            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">
              <Link href="/" className="flex items-center hover:opacity-90 transition-opacity shrink-0 py-1" title="SabQuick Home">
                <img
                  src="/brand/navbar-logo.png"
                  alt="SabQuick"
                  className="h-9 sm:h-11 max-w-[150px] sm:max-w-none w-auto object-contain shrink-0"
                />
              </Link>

              <div className="border-l border-slate-200 pl-2 sm:pl-3 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="accent"
                    className="inline-flex gap-1 text-[9px] sm:text-[10px] tracking-wide uppercase cursor-pointer hover:bg-primary-accent/80 transition-colors py-0.2 px-1.5 sm:px-2"
                    onClick={() => setLocationPickerOpen(true)}
                    title="Click to check or change delivery geofence"
                  >
                    <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-surface-dark" /> Superfast
                  </Badge>
                </div>

                {/* Interactive Address Selector Pill */}
                <button
                  type="button"
                  onClick={() => setLocationPickerOpen(true)}
                  className="flex items-center text-[11px] sm:text-xs text-muted-foreground gap-1 hover:text-primary transition-colors text-left group mt-0.5"
                  title="Change delivery address & map pin"
                >
                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                  <span className="font-semibold text-surface-dark max-w-[105px] xs:max-w-[140px] sm:max-w-[180px] truncate underline-offset-2 group-hover:underline">
                    {activeAddress.streetArea || activeAddress.flatBuilding}
                  </span>
                  <span className="text-slate-400 text-[11px] hidden md:inline">
                    ({activeAddress.distanceKm} km away)
                  </span>
                </button>
              </div>
            </div>

            {/* Desktop Search Input */}
            <div className="flex flex-1 max-w-md relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0 pointer-events-none transition-transform group-focus-within:scale-105">
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <Input
                type="text"
                placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-11 pr-20 h-11 w-full bg-slate-50/90 border-slate-200/90 hover:bg-slate-100/70 focus-visible:bg-white focus-visible:border-emerald-600 focus-visible:ring-3 focus-visible:ring-emerald-500/15 rounded-2xl text-xs placeholder:text-slate-400 shadow-2xs transition-all"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange?.("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center active:scale-90 transition-all"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              ) : (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs pointer-events-none">
                  <Zap className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                  <span>SUPERFAST</span>
                </div>
              )}
            </div>

            {/* Actions & Authentication */}
            <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
              {/* Interactive Map & Geofence Picker Trigger */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocationPickerOpen(true)}
                className="hidden lg:inline-flex gap-1.5 rounded-xl border-border-subtle hover:bg-slate-50 text-xs font-semibold"
              >
                <MapPin className="w-3.5 h-3.5 text-primary" /> Map & Geofence
              </Button>

              {/* Authentication Controller */}
              {status === "loading" ? (
                <div className="h-8 w-16 sm:h-9 sm:w-24 bg-slate-100 rounded-lg animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Desktop User Info & Role Badge - Clickable to open Account & Policies Sheet */}
                  <button
                    type="button"
                    onClick={() => setOperationsSheetOpen(true)}
                    className="flex items-center gap-2 p-1 pl-2.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-border-subtle transition-all text-right group cursor-pointer"
                    title="View Account Profile, Orders & Legal Policies"
                  >
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-surface-dark truncate max-w-[120px] group-hover:text-primary transition-colors">
                          {user.name || user.email?.split("@")[0]}
                        </span>
                        {user.role && user.role !== "CUSTOMER" && (
                          <Badge variant={getRoleBadgeVariant(user.role)} className="text-[9px] py-0 px-1.5 uppercase font-bold">
                            {user.role}
                          </Badge>
                        )}
                      </div>

                      {/* Phone verification indicator */}
                      {isPhoneVerified ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          +91 {user.phone}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Verify Phone
                        </span>
                      )}
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0 border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                      {user.role === "OWNER" ? <Crown className="w-3.5 h-3.5 text-amber-500" /> : (user.name?.[0] || "U").toUpperCase()}
                    </div>
                  </button>

                  {/* Operations Quick Links */}
                  {user.role === "RIDER" && (
                    <Link
                      href="/rider/dashboard"
                      className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-primary-accent text-surface-dark font-black text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary-accent/90 transition-all"
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Rider Hub</span>
                    </Link>
                  )}

                  {["PACKER", "MANAGER", "OWNER"].includes(user.role as string) && (
                    <Link
                      href="/packer"
                      className="hidden sm:flex h-9 px-3 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs items-center gap-1.5 shadow-sm hover:bg-emerald-200 transition-all"
                      title="Packer Picking Station"
                    >
                      <PackageCheck className="w-3.5 h-3.5 text-primary" />
                      <span>Packer</span>
                    </Link>
                  )}

                  {["MANAGER", "OWNER"].includes(user.role as string) && (
                    <Link
                      href="/manager"
                      className="hidden sm:flex h-9 px-3 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs items-center gap-1.5 shadow-sm hover:bg-slate-200 transition-all"
                      title="Live Manager Kanban Board"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-slate-700" />
                      <span>Manager</span>
                    </Link>
                  )}

                  {user.role === "OWNER" && (
                    <Link
                      href="/owner"
                      className="hidden sm:flex h-9 px-3 rounded-xl bg-amber-100 text-amber-900 font-black text-xs items-center gap-1.5 shadow-sm hover:bg-amber-200 transition-all"
                      title="Owner Executive Control"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
                      <span>Owner</span>
                    </Link>
                  )}

                  {/* Logout Button (Desktop only; mobile uses bottom navigation Account tab) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="hidden sm:inline-flex rounded-xl h-8 w-8 sm:h-9 sm:w-9 p-0 text-muted-foreground hover:text-red-600"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="rounded-xl h-8 sm:h-10 px-2.5 sm:px-3.5 text-[11px] sm:text-xs font-semibold gap-1 sm:gap-1.5 border-border-subtle hover:bg-slate-50"
                >
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span>Sign In</span>
                </Button>
              )}

              {/* Quick Cart Trigger (Desktop & Tablet only; mobile uses bottom nav) */}
              <Button
                variant="default"
                onClick={handleOpenCart}
                className="hidden sm:inline-flex relative gap-1.5 rounded-xl h-8 sm:h-11 px-2.5 sm:px-4 shadow-sm hover:shadow-md"
              >
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="font-semibold hidden sm:inline">Cart</span>
                <span className="bg-primary-accent text-surface-dark text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {displayCartCount}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Modals & Drawers */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <PhoneVerificationDrawer
        open={phoneDrawerOpen}
        onOpenChange={setPhoneDrawerOpen}
        initialPhone={user?.phone}
      />
      <LocationPickerModal
        open={locationPickerOpen}
        onOpenChange={setLocationPickerOpen}
        onAddressSaved={setActiveAddress}
        currentAddress={activeAddress}
      />
      <MobileOperationsSheet
        isOpen={operationsSheetOpen}
        onOpenChange={setOperationsSheetOpen}
        onOpenPhoneVerification={() => setPhoneDrawerOpen(true)}
        onOpenLocationPicker={() => setLocationPickerOpen(true)}
      />
    </>
  );
}
