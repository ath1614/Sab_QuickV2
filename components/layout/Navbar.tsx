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
  latitude: 23.129243,
  longitude: 83.190082,
  distanceKm: 0.5,
  estimatedMinutes: 10,
};

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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-sm pt-[env(safe-area-inset-top,0px)] w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Logo & Interactive Geofence Address Trigger */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">
            <Link href="/" className="flex items-center hover:opacity-90 transition-opacity shrink-0 py-1" title="SabQuick Home">
              {/* h-full inside the fixed-height row so the lockup never clips */}
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
                  <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-surface-dark" /> {activeAddress.estimatedMinutes} Mins
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

          {/* Search Input */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search 5,000+ groceries, dairy, snacks..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10 h-11 bg-slate-50 border-border-subtle focus-visible:ring-primary rounded-xl"
            />
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
                {/* Mobile Operations & Role Switcher Trigger */}
                <button
                  type="button"
                  onClick={() => setOperationsSheetOpen(true)}
                  className="sm:hidden flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-border-subtle text-surface-dark transition-colors shrink-0"
                  title="Open Operations & Role Hub"
                >
                  <div className="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                    {user.role === "OWNER" ? "👑" : user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-700 max-w-[55px] truncate">
                    {user.role}
                  </span>
                </button>

                {/* Desktop User Info & Role Badge - Clickable to open Account & Policies Sheet */}
                <button
                  type="button"
                  onClick={() => setOperationsSheetOpen(true)}
                  className="hidden sm:flex items-center gap-2 p-1 pl-2.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-border-subtle transition-all text-right group cursor-pointer"
                  title="View Account Profile, Orders & Legal Policies"
                >
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-surface-dark truncate max-w-[120px] group-hover:text-primary transition-colors">
                        {user.name || user.email?.split("@")[0]}
                      </span>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="text-[9px] py-0 px-1.5 uppercase font-bold">
                        {user.role}
                      </Badge>
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
                    {user.role === "OWNER" ? "👑" : (user.name?.[0] || "U").toUpperCase()}
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

                {/* Logout Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-xl h-8 w-8 sm:h-9 sm:w-9 p-0 text-muted-foreground hover:text-red-600"
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
