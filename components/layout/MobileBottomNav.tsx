"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  LayoutGrid,
  ShoppingBag,
  Clock,
  User,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";
import { useAuthModalStore } from "@/store/useAuthModalStore";
import { MobileOperationsSheet } from "./MobileOperationsSheet";

function MobileBottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { items, openCart, getItemTotal } = useCartStore();
  const { openAuthModal } = useAuthModalStore();
  const [operationsSheetOpen, setOperationsSheetOpen] = React.useState(false);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemTotal = getItemTotal();

  // Hide bottom nav on dedicated full-screen order tracking or scanner pages
  const isOrderTrackingPage = pathname?.startsWith("/orders/") && pathname !== "/orders/active";
  if (isOrderTrackingPage) {
    return null;
  }

  const isHomeActive = pathname === "/" && !searchParams?.get("category");
  const isCategoryActive = pathname === "/" && Boolean(searchParams?.get("category"));
  const isOrdersActive = pathname?.startsWith("/orders");

  const user = session?.user;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-border-subtle/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)] transition-all"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto items-center px-1">
        {/* 1. Home Tab */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center h-full gap-1 transition-colors select-none",
            isHomeActive
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-surface-dark"
          )}
        >
          <div className="relative">
            <Home className="w-5 h-5" />
            {isHomeActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Home</span>
        </Link>

        {/* 2. Aisles / Categories Tab */}
        <button
          type="button"
          onClick={() => {
            if (pathname === "/") {
              const el = document.getElementById("category-nav");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            } else {
              window.location.href = "/?category=all#category-nav";
            }
          }}
          className={cn(
            "flex flex-col items-center justify-center h-full gap-1 transition-colors select-none",
            isCategoryActive
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-surface-dark"
          )}
        >
          <div className="relative">
            <LayoutGrid className="w-5 h-5" />
            {isCategoryActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Aisles</span>
        </button>

        {/* 3. Cart Trigger (Center Hero with Live Items Badge & Price) */}
        <button
          type="button"
          onClick={openCart}
          className="flex flex-col items-center justify-center h-full gap-1 text-surface-dark transition-transform active:scale-95 select-none relative group"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-primary text-white shadow-md shadow-primary/25">
            <ShoppingBag className="w-5 h-5" />
            {totalQuantity > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-primary-accent text-surface-dark text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-in zoom-in-75">
                {totalQuantity}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-surface-dark tracking-tight">
            {totalQuantity > 0 ? `₹${itemTotal}` : "Cart"}
          </span>
        </button>

        {/* 4. Orders Tab */}
        <Link
          href="/orders"
          className={cn(
            "flex flex-col items-center justify-center h-full gap-1 transition-colors select-none",
            isOrdersActive
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-surface-dark"
          )}
        >
          <div className="relative">
            <Clock className="w-5 h-5" />
            {isOrdersActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Orders</span>
        </Link>

        {/* 5. Account / Operations Tab */}
        {user ? (
          <button
            type="button"
            onClick={() => setOperationsSheetOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center h-full gap-1 transition-colors select-none",
              user.role !== "CUSTOMER"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-surface-dark"
            )}
            title={user.name || "My Account & Operations"}
          >
            <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-surface-dark text-xs font-bold border border-border-subtle">
              {user.role === "OWNER" ? (
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              ) : (
                (user.name?.[0] || "U").toUpperCase()
              )}
            </div>
            <span className="text-[10px] tracking-tight truncate max-w-[55px]">
              {user.role !== "CUSTOMER" ? user.role : user.name?.split(" ")[0] || "Account"}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={openAuthModal}
            className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-primary transition-colors select-none"
          >
            <div className="relative">
              <LogIn className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Sign In</span>
          </button>
        )}
      </div>

      <MobileOperationsSheet
        isOpen={operationsSheetOpen}
        onOpenChange={setOperationsSheetOpen}
      />
    </nav>
  );
}

export function MobileBottomNav() {
  return (
    <React.Suspense fallback={null}>
      <MobileBottomNavInner />
    </React.Suspense>
  );
}
