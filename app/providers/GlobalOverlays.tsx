"use client";

import { CartDrawer } from "@/components/cart/CartDrawer";
import { FloatingCartPill } from "@/components/cart/FloatingCartPill";

/**
 * App-wide cart overlays. Previously mounted only on the storefront page,
 * which left the bottom-nav Cart tab dead on /categories (and any other
 * page). app/page.tsx no longer renders its own copies.
 */
export function GlobalOverlays() {
  return (
    <>
      <CartDrawer />
      <FloatingCartPill />
    </>
  );
}
