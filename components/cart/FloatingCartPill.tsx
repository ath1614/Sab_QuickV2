"use client";

import * as React from "react";
import { ShoppingBag, ChevronRight, ChevronDown } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

/**
 * Blinkit-style floating cart pill — compact, sits directly above the
 * bottom nav. When an active-order bar is present it stacks BELOW it;
 * tapping the caret minimizes it to a small dot so the two floating
 * bars never collide (and it can be re-expanded any time).
 */
export function FloatingCartPill() {
  const { items, openCart, getItemTotal, isPillMinimized, setPillMinimized } =
    useCartStore();

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

  // Minimized: tiny round dot — tap to restore.
  if (isPillMinimized) {
    return (
      <button
        type="button"
        aria-label={`Expand cart, ${totalQuantity} items, ₹${itemTotal}`}
        onClick={() => setPillMinimized(false)}
        className={`fixed right-3 bottom-[calc(4.9rem+env(safe-area-inset-bottom,0px))] md:right-8 md:bottom-8 z-40 w-11 h-11 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center transition-all duration-300 ease-out active:scale-95 ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
        }`}
      >
        <ShoppingBag className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary-accent text-surface-dark text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
          {totalQuantity}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] md:inset-x-auto md:right-8 md:bottom-8 z-40 transition-all duration-300 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
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
      <div className="max-w-md mx-auto md:mx-0 flex items-center justify-between gap-2 bg-primary text-white rounded-full pl-3.5 pr-2 py-2 shadow-lg shadow-primary/30 cursor-pointer select-none active:scale-[0.98] hover:bg-primary-hover transition-all">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <ShoppingBag className="w-4.5 h-4.5" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 bg-primary-accent text-surface-dark text-[9px] font-black rounded-full flex items-center justify-center ring-1 ring-primary/20">
              {totalQuantity}
            </span>
          </div>
          <span className="text-xs font-black whitespace-nowrap">
            ₹{itemTotal}
          </span>
          <span className="hidden xs:inline text-[10px] font-semibold text-emerald-100 whitespace-nowrap">
            • Superfast delivery
          </span>
        </div>
        <div className="flex items-center shrink-0">
          <span className="text-[11px] font-black uppercase tracking-wider mr-0.5">
            View Cart
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
          {/* Minimize caret — keeps the pill out of the active-order bar's way */}
          <button
            type="button"
            aria-label="Minimize cart pill"
            onClick={(e) => {
              e.stopPropagation();
              setPillMinimized(true);
            }}
            className="ml-1 w-7 h-7 rounded-full hover:bg-white/15 active:scale-90 flex items-center justify-center transition-all"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
