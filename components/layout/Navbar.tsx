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
  Boxes,
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
import { BRAND_ASSETS } from "@/lib/assets";
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

/** Staff destinations, surfaced through one compact menu on tablet/desktop. */
const STAFF_HUBS = [
  {
    href: "/packer",
    label: "Packer Station",
    description: "Pick and pack live orders",
    icon: PackageCheck,
    roles: ["PACKER", "MANAGER", "OWNER"],
  },
  {
    href: "/manager",
    label: "Manager Board",
    description: "Dispatch and rider kanban",
    icon: LayoutDashboard,
    roles: ["MANAGER", "OWNER"],
  },
  {
    href: "/owner",
    label: "Owner Console",
    description: "Revenue, catalog and settings",
    icon: TrendingUp,
    roles: ["OWNER"],
  },
  {
    href: "/rider/dashboard",
    label: "Rider Hub",
    description: "Deliveries, shift and earnings",
    icon: Bike,
    roles: ["RIDER"],
  },
];

function OperationsMenu({
  role,
  roles,
}: {
  role?: string | null;
  roles?: string[] | null;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const closeIfOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("touchstart", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("touchstart", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const roleList = roles?.length ? roles : role ? [role] : [];
  const hubs = STAFF_HUBS.filter((hub) => hub.roles.some((r) => roleList.includes(r)));
  if (hubs.length === 0) return null;

  return (
    <div className="relative hidden md:block shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Staff operations"
        className="flex items-center gap-1.5 h-10 px-2 lg:px-3 rounded-xl border border-border-subtle bg-white hover:bg-slate-50 text-xs font-bold text-surface-dark transition-colors"
      >
        <Boxes className="w-4 h-4 text-primary shrink-0" />
        <span className="hidden lg:inline">Ops</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border-subtle bg-white shadow-xl p-1.5 z-50"
        >
          {hubs.map((hub) => {
            const Icon = hub.icon;
            return (
              <Link
                key={hub.href}
                href={hub.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-start gap-2.5 rounded-xl px-2.5 py-2.5 hover:bg-slate-50 transition-colors"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-surface-dark">{hub.label}</span>
                  <span className="block text-[11px] text-muted-foreground leading-snug">
                    {hub.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
              <Link href="/" className="shrink-0 py-0.5" title="SABQuick Home">
                <img
                  src={BRAND_ASSETS.navbarLogo}
                  alt="SABQuick"
                  data-boot-logo="nav"
                  className="h-9 max-w-[120px] w-auto object-contain shrink-0 drop-shadow-xs"
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
                  className="flex items-center text-[11px] text-muted-foreground gap-0.5 hover:text-primary transition-colors text-left font-semibold text-surface-dark max-w-[125px] xs:max-w-[155px] truncate min-h-[36px] py-1"
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
                className="pl-11 pr-20 h-11 w-full bg-slate-50/90 border-slate-200/90 hover:bg-slate-100/70 focus-visible:bg-white focus-visible:border-emerald-600 focus-visible:ring-3 focus-visible:ring-emerald-500/15 rounded-2xl text-base sm:text-[12.5px] font-medium placeholder:text-slate-400 shadow-2xs transition-all"
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
          {/* 3. TABLET + DESKTOP ROW (>= sm)                            */}
          {/* Three tiers keep the row inside the viewport on every      */}
          {/* device App Store review uses:                              */}
          {/*   sm–md (640–767)  : logo, search, account, cart           */}
          {/*   md–xl (768–1279) : + address, Ops menu, verify, cart     */}
          {/*   xl+   (1280+)    : + full name/role, map, sign out       */}
          {/* Everything is min-w-0 so the search field absorbs slack.   */}
          {/* ========================================================= */}
          <div className="hidden sm:flex h-16 lg:h-20 items-center gap-2 lg:gap-3 w-full min-w-0">
            {/* Logo & Interactive Geofence Address Trigger */}
            <div className="flex items-center gap-2 lg:gap-3 shrink-0 min-w-0">
              <Link href="/" className="flex items-center hover:opacity-90 transition-opacity shrink-0 py-1" title="SABQuick Home">
                <img
                  src={BRAND_ASSETS.navbarLogo}
                  alt="SABQuick"
                  className="h-8 lg:h-11 max-w-[104px] lg:max-w-[140px] w-auto object-contain shrink-0 drop-shadow-xs"
                />
              </Link>

              <div className="hidden md:block border-l border-slate-200 pl-2 lg:pl-3 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="accent"
                    className="inline-flex gap-1 text-[9px] lg:text-[10px] tracking-wide uppercase cursor-pointer hover:bg-primary-accent/80 transition-colors py-0.2 px-1.5 lg:px-2"
                    onClick={() => setLocationPickerOpen(true)}
                    title="Click to check or change delivery geofence"
                  >
                    <Zap className="w-2.5 h-2.5 lg:w-3 lg:h-3 fill-surface-dark" /> Superfast
                  </Badge>
                </div>

                {/* Interactive Address Selector Pill */}
                <button
                  type="button"
                  onClick={() => setLocationPickerOpen(true)}
                  className="flex items-center text-[11px] lg:text-xs text-muted-foreground gap-1 hover:text-primary transition-colors text-left group mt-0.5 max-w-[150px] xl:max-w-[220px] min-h-[32px]"
                  title="Change delivery address & map pin"
                >
                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                  <span className="font-semibold text-surface-dark truncate underline-offset-2 group-hover:underline">
                    {activeAddress.streetArea || activeAddress.flatBuilding}
                  </span>
                  <span className="text-slate-400 text-[11px] hidden xl:inline shrink-0">
                    ({activeAddress.distanceKm} km)
                  </span>
                </button>
              </div>
            </div>

            {/* Search — flexes to fill whatever the other tiers leave over */}
            <div className="flex flex-1 min-w-0 max-w-md relative group">
              <div className="absolute left-2.5 lg:left-3 top-1/2 -translate-y-1/2 w-6 h-6 lg:w-7 lg:h-7 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0 pointer-events-none transition-transform group-focus-within:scale-105">
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <Input
                type="text"
                placeholder={placeholderIndex % 2 === 0 ? "Search groceries…" : SEARCH_PLACEHOLDERS[placeholderIndex]}
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10 lg:pl-11 pr-10 xl:pr-20 h-10 lg:h-11 w-full bg-slate-50/90 border-slate-200/90 hover:bg-slate-100/70 focus-visible:bg-white focus-visible:border-emerald-600 focus-visible:ring-3 focus-visible:ring-emerald-500/15 rounded-2xl text-base lg:text-sm placeholder:text-slate-400 shadow-2xs transition-all"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange?.("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center active:scale-90 transition-all"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              ) : (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden xl:flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs pointer-events-none">
                  <Zap className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                  <span>SUPERFAST</span>
                </div>
              )}
            </div>

            {/* Actions & Authentication */}
            <div className="flex items-center gap-1 lg:gap-1.5 shrink-0">
              {/* Geofence picker. Visible only at 640–767: below that the
                  phone header has its address button, from md up the address
                  pill opens the same sheet. Without this, iPad mini portrait
                  (744 px) had no way to change the delivery location. */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLocationPickerOpen(true)}
                className="hidden sm:inline-flex md:hidden h-10 w-10 rounded-xl border-border-subtle hover:bg-slate-50"
                title="Map & Geofence"
                aria-label="Map and geofence"
              >
                <MapPin className="w-4 h-4 text-primary" />
              </Button>

              {/* Authentication Controller */}
              {status === "loading" ? (
                <div className="h-9 w-9 bg-slate-100 rounded-lg animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-1 lg:gap-1.5">
                  {/* Verify phone: icon-only until there is room for the label */}
                  {!isPhoneVerified && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setPhoneDrawerOpen(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-9 px-2 xl:px-3 rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                      title="Verify Phone Number"
                      aria-label="Verify phone number"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span className="hidden xl:inline whitespace-nowrap font-bold text-xs">Verify Phone</span>
                    </Button>
                  )}

                  {/* Staff hubs collapse into one menu so the row never
                      outgrows an iPad / small laptop. */}
                  <OperationsMenu
                    role={user.role}
                    roles={(user as any).roles}
                  />

                  {/* Account — opens the operations sheet on every width */}
                  <button
                    type="button"
                    onClick={() => setOperationsSheetOpen(true)}
                    className="flex items-center gap-2 p-1 xl:pl-2.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-border-subtle transition-all text-right group cursor-pointer shrink-0"
                    title="View Account Profile, Orders & Legal Policies"
                  >
                    <div className="hidden xl:flex flex-col items-end min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-surface-dark truncate max-w-[110px] group-hover:text-primary transition-colors">
                          {user.name || user.email?.split("@")[0]}
                        </span>
                        {user.role && user.role !== "CUSTOMER" && (
                          <Badge variant={getRoleBadgeVariant(user.role)} className="text-[9px] py-0 px-1.5 uppercase font-bold">
                            {user.role}
                          </Badge>
                        )}
                      </div>

                      {isPhoneVerified && (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          +91 {user.phone}
                        </span>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0 border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                      {user.role === "OWNER" ? <Crown className="w-3.5 h-3.5 text-amber-500" /> : (user.name?.[0] || "U").toUpperCase()}
                    </div>
                  </button>

                  {/* Sign out (also available inside the account sheet) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="hidden xl:inline-flex rounded-xl h-9 w-9 p-0 text-muted-foreground hover:text-red-600"
                    title="Sign Out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="rounded-xl h-9 sm:h-10 px-2.5 sm:px-3.5 text-[11px] sm:text-xs font-semibold gap-1 sm:gap-1.5 border-border-subtle hover:bg-slate-50 whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span>Sign In</span>
                </Button>
              )}

              {/* Quick Cart Trigger (Desktop & Tablet only; mobile uses bottom nav) */}
              <Button
                variant="default"
                onClick={handleOpenCart}
                className="relative gap-1.5 rounded-xl h-10 lg:h-11 px-2.5 lg:px-4 shadow-sm hover:shadow-md shrink-0"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="font-semibold hidden lg:inline">Cart</span>
                <span className="bg-primary-accent text-surface-dark text-[10px] lg:text-xs font-bold px-1.5 py-0.5 rounded-full">
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
