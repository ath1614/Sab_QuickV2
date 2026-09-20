"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  FolderTree,
  LayoutDashboard,
  PackageCheck,
  Bike,
  ShoppingBag,
  Clock,
  MapPin,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";

interface MobileOperationsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPhoneVerification?: () => void;
  onOpenLocationPicker?: () => void;
}

export function MobileOperationsSheet({
  isOpen,
  onOpenChange,
  onOpenPhoneVerification,
  onOpenLocationPicker,
}: MobileOperationsSheetProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const user = session?.user;
  const role = user?.role || "CUSTOMER";
  const isPhoneVerified = Boolean(user?.phoneVerified);

  const handleLinkClick = () => {
    onOpenChange(false);
  };

  const getRoleBadgeVariant = (r?: string) => {
    switch (r) {
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
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="w-full max-h-[88dvh] rounded-t-3xl p-0 flex flex-col bg-slate-50 border-t border-border-subtle shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom,16px)]"
      >
        {/* Handle / Drag Pill */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-3 shrink-0" />

        {/* Header with User Info */}
        <div className="px-5 pb-4 border-b border-border-subtle bg-white shrink-0">
          <SheetHeader className="text-left space-y-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-base border border-primary/20 shrink-0">
                  {user?.name?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-base font-black text-surface-dark truncate">
                    {user?.name || "SabQuick User"}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground truncate">
                    {user?.email || "Signed In"}
                  </SheetDescription>
                </div>
              </div>

              <Badge
                variant={getRoleBadgeVariant(role)}
                className="text-[10px] uppercase font-black px-2.5 py-1 shrink-0"
              >
                {role}
              </Badge>
            </div>

            {/* Phone Verification Status */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {isPhoneVerified ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    +91 {user?.phone} (Verified)
                  </span>
                ) : (
                  <span className="text-amber-800 font-semibold flex items-center gap-1 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Phone not verified
                  </span>
                )}
              </div>

              {!isPhoneVerified && onOpenPhoneVerification && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenPhoneVerification();
                  }}
                  className="text-xs font-black text-amber-700 hover:text-amber-800 underline underline-offset-2"
                >
                  Verify Now
                </button>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Operations & Navigation Options */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Operations & Management Hubs (Shown to Staff / Owner) */}
          {["OWNER", "MANAGER", "PACKER", "RIDER"].includes(role) && (
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
                Operations &amp; Staff Cockpits
              </span>

              <div className="grid grid-cols-1 gap-2">
                {/* 1. Owner Executive Hub */}
                {role === "OWNER" && (
                  <Link
                    href="/owner"
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      pathname === "/owner"
                        ? "bg-amber-50/80 border-amber-300 shadow-xs ring-1 ring-amber-400"
                        : "bg-white border-border-subtle hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                        <TrendingUp className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-surface-dark flex items-center gap-1.5">
                          <span>Owner Executive Hub</span>
                          <Badge variant="default" className="text-[9px] px-1 py-0 bg-amber-500">
                            PRO
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          GMV revenue, dark-store metrics &amp; theme branding
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}

                {/* 2. Catalog & Dual Pricing Master */}
                {["OWNER", "MANAGER"].includes(role) && (
                  <Link
                    href="/owner/catalog"
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      pathname === "/owner/catalog"
                        ? "bg-emerald-50/80 border-emerald-300 shadow-xs ring-1 ring-emerald-400"
                        : "bg-white border-border-subtle hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <FolderTree className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-surface-dark">
                          Catalog &amp; Dual Pricing
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Add SKUs, categories, subcategories &amp; MRP discounts
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}

                {/* 3. Manager Kanban Dispatch */}
                {["OWNER", "MANAGER"].includes(role) && (
                  <Link
                    href="/manager"
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      pathname === "/manager"
                        ? "bg-slate-200 border-slate-400 shadow-xs ring-1 ring-slate-400"
                        : "bg-white border-border-subtle hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                        <LayoutDashboard className="w-5 h-5 text-slate-700" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-surface-dark">
                          Manager Dispatch Kanban
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Live floor orchestration, SLA tracking &amp; rider assignment
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}

                {/* 4. Packer Floor Station */}
                {["OWNER", "MANAGER", "PACKER"].includes(role) && (
                  <Link
                    href="/packer"
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      pathname === "/packer"
                        ? "bg-emerald-50/80 border-emerald-300 shadow-xs ring-1 ring-emerald-400"
                        : "bg-white border-border-subtle hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        <PackageCheck className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-surface-dark">
                          Packer Floor Station
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Aisle-by-aisle bagging, audio chimes &amp; barcode picking
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}

                {/* 5. Rider Delivery Fleet */}
                {["OWNER", "MANAGER", "RIDER"].includes(role) && (
                  <Link
                    href="/rider/dashboard"
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      pathname === "/rider/dashboard"
                        ? "bg-primary-accent/15 border-primary-accent shadow-xs ring-1 ring-primary-accent"
                        : "bg-white border-border-subtle hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-accent/20 text-surface-dark flex items-center justify-center font-bold">
                        <Bike className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-surface-dark">
                          Rider Delivery Console
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Shift online/offline, accept dispatch &amp; 4-digit OTP handoff
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Customer & General Store Navigation */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
              Store &amp; Orders
            </span>

            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/"
                onClick={handleLinkClick}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  pathname === "/"
                    ? "bg-primary/5 border-primary/40 shadow-xs"
                    : "bg-white border-border-subtle hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-surface-dark">
                      SabQuick Storefront
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Browse groceries, fresh dairy, snacks &amp; 10-min delivery
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/orders"
                onClick={handleLinkClick}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  pathname?.startsWith("/orders")
                    ? "bg-primary/5 border-primary/40 shadow-xs"
                    : "bg-white border-border-subtle hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-surface-dark">
                      My Orders &amp; Tracking
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Active deliveries, delivery OTPs &amp; past receipts
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              {onOpenLocationPicker && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenLocationPicker();
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-border-subtle bg-white hover:bg-slate-50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary flex items-center justify-center font-bold">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-surface-dark">
                        Delivery Geofence &amp; Map Pin
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Check 2.5 km dark-store SLA coverage &amp; doorstep pin
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Legal Links & Sign Out */}
        <div className="p-4 border-t border-border-subtle bg-white shrink-0 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
            <Link
              href="/privacy"
              onClick={() => onOpenChange(false)}
              className="hover:text-primary transition-colors underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link
              href="/terms"
              onClick={() => onOpenChange(false)}
              className="hover:text-primary transition-colors underline-offset-2 hover:underline"
            >
              Terms of Service
            </Link>
            <span>&bull;</span>
            <Link
              href="/refund"
              onClick={() => onOpenChange(false)}
              className="hover:text-primary transition-colors underline-offset-2 hover:underline"
            >
              Refund Policy
            </Link>
            <span>&bull;</span>
            <Link
              href="/delete-account"
              onClick={() => onOpenChange(false)}
              className="text-rose-500 hover:text-rose-700 transition-colors underline-offset-2 hover:underline"
            >
              Delete Account
            </Link>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              signOut({ callbackUrl: "/" });
            }}
            className="w-full h-11 rounded-xl text-xs font-black text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-2 shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of SabQuick</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
