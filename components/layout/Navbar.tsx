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
import { Logo } from "@/components/brand/Logo";

interface NavbarProps {
  cartCount?: number;
  onOpenCart?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export function Navbar({
  cartCount,
  onOpenCart,
  searchQuery = "",
  onSearchChange,
}: NavbarProps) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = React.useState(false);
  const storeItems = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.openCart);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const totalCartQty = storeItems.reduce((acc, item) => acc + item.quantity, 0);
  const displayCartCount = mounted
    ? cartCount !== undefined
      ? cartCount
      : totalCartQty
    : 0;

  const handleOpenCart = onOpenCart || openCart;
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [phoneDrawerOpen, setPhoneDrawerOpen] = React.useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false);

  const [activeAddress, setActiveAddress] = React.useState<SavedAddressData>({
    label: "Home",
    flatBuilding: "Flat 402, Royal Residency",
    streetArea: "Barakhamba Road, Connaught Place",
    latitude: 28.619,
    longitude: 77.214,
    distanceKm: 0.75,
    estimatedMinutes: 11,
  });

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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Interactive Geofence Address Trigger */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center hover:opacity-95 transition-opacity" title="SabQuick Home">
              <span className="hidden sm:inline-block">
                <Logo variant="compact" size={38} />
              </span>
              <span className="inline-block sm:hidden">
                <Logo variant="icon" size={40} />
              </span>
            </Link>

            <div className="border-l border-slate-200 pl-3">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="accent"
                  className="inline-flex gap-1 text-[10px] tracking-wide uppercase cursor-pointer hover:bg-primary-accent/80 transition-colors py-0.5 px-2"
                  onClick={() => setLocationPickerOpen(true)}
                  title="Click to check or change delivery geofence"
                >
                  <Zap className="w-3 h-3 fill-surface-dark" /> {activeAddress.estimatedMinutes} Mins
                </Badge>
              </div>

              {/* Interactive Address Selector Pill */}
              <button
                type="button"
                onClick={() => setLocationPickerOpen(true)}
                className="flex items-center text-xs text-muted-foreground gap-1.5 hover:text-primary transition-colors text-left group mt-0.5"
                title="Change delivery address & map pin"
              >
                <MapPin className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-surface-dark max-w-[150px] sm:max-w-[180px] truncate underline-offset-2 group-hover:underline">
                  {activeAddress.flatBuilding || activeAddress.streetArea}
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
          <div className="flex items-center space-x-2 sm:space-x-3">
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
              <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2">
                {/* User Info & Role Badge */}
                <div className="hidden sm:flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-surface-dark truncate max-w-[120px]">
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
                    <button
                      onClick={() => setPhoneDrawerOpen(true)}
                      className="text-[10px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-0.5 animate-pulse"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Verify Phone
                    </button>
                  )}
                </div>

                {/* Operations Quick Links */}
                {user.role === "RIDER" && (
                  <Link
                    href="/rider/dashboard"
                    className="h-9 px-3 rounded-xl bg-primary-accent text-surface-dark font-black text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary-accent/90 transition-all"
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>Rider Hub</span>
                  </Link>
                )}

                {["PACKER", "MANAGER", "OWNER"].includes(user.role as string) && (
                  <Link
                    href="/packer"
                    className="h-9 px-3 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-emerald-200 transition-all"
                    title="Packer Picking Station"
                  >
                    <PackageCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="hidden sm:inline">Packer</span>
                  </Link>
                )}

                {["MANAGER", "OWNER"].includes(user.role as string) && (
                  <Link
                    href="/manager"
                    className="h-9 px-3 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-200 transition-all"
                    title="Live Manager Kanban Board"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-slate-700" />
                    <span className="hidden sm:inline">Manager</span>
                  </Link>
                )}

                {user.role === "OWNER" && (
                  <Link
                    href="/owner"
                    className="h-9 px-3 rounded-xl bg-amber-100 text-amber-900 font-black text-xs flex items-center gap-1.5 shadow-sm hover:bg-amber-200 transition-all"
                    title="Owner Executive Control"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
                    <span className="hidden sm:inline">Owner</span>
                  </Link>
                )}

                {/* Role Switcher Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="rounded-xl h-9 text-xs gap-1 border-border-subtle"
                  title="Switch Persona / Role"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Role</span>
                </Button>

                {/* Logout Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-xl h-9 w-9 p-0 text-muted-foreground hover:text-red-600"
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
                className="rounded-xl h-10 px-3.5 text-xs font-semibold gap-1.5 border-border-subtle hover:bg-slate-50"
              >
                <LogIn className="w-4 h-4 text-primary" />
                <span>Login / Fast Roles</span>
              </Button>
            )}

            {/* Quick Cart Trigger */}
            <Button
              variant="default"
              onClick={handleOpenCart}
              className="relative gap-2 rounded-xl h-10 sm:h-11 px-3.5 sm:px-4 shadow-sm hover:shadow-md"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="font-semibold hidden sm:inline">Cart</span>
              <span className="bg-primary-accent text-surface-dark text-xs font-bold px-1.5 py-0.5 rounded-full">
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
    </>
  );
}
