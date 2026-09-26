"use client";

import * as React from "react";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

/**
 * Blinkit-style floating cart pill.
 * Appears whenever the cart holds items; tapping opens the cart drawer.
 * Sits above the mobile bottom nav (md:hidden there) and floats
 * bottom-right on desktop where no persistent cart trigger exists.
 */
export function FloatingCartPill() {
  const { items, openCart, getItemTotal } = useCartStore();

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemTotal = getItemTotal();

  const [isVisible, setIsVisible] = React.useState(false);

  // Defer mount so the pill animates in after first paint (avoids hydration flash).
  React.useEffect(() => {
    if (totalQuantity > 0) {
      const t = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(t);
    }
    setIsVisible(false);
  }, [totalQuantity]);

  if (totalQuantity === 0) return null;

  return (
    <div
      className={`fixed inset-x-4 bottom-[76px] md:inset-x-auto md:right-8 md:bottom-8 z-40 transition-all duration-300 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6 pointer-events-none"
      }`}
      role="button"
      tabIndex={0}
      aria-label={`View cart, ${totalQuantity} items, ₹${itemTotal}`}
      onClick={openCart}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openCart();
        }
      }}
    >
      <div className="max-w-lg mx-auto md:mx-0 flex items-center justify-between gap-3 bg-primary text-white rounded-2xl px-4 py-3 shadow-xl shadow-primary/30 cursor-pointer select-none active:scale-[0.98] hover:bg-primary-hover transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-0.5 bg-white text-primary text-[9px] font-black rounded-full flex items-center justify-center ring-1 ring-primary/20">
              {totalQuantity}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold leading-tight">
              {totalQuantity} item{totalQuantity === 1 ? "" : "s"} in cart
            </div>
            <div className="text-[11px] text-emerald-100 font-semibold">
              ₹{itemTotal} • 10-15 min delivery
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-xs font-black uppercase tracking-wider">
          <span>View Cart</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
