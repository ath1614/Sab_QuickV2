/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Plus, Minus, Package, ShoppingBag } from "lucide-react";

export interface ProductData {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  mrp: number;
  salePrice: number;
  unitQuantity: string;
  stockCount: number;
  isAvailable: boolean;
  imageUrl: string;
  tags: string[];
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Blinkit/Flutter-style compact card: image on top with a floating circular
 * ADD control that overlaps its bottom edge (stepper replaces it when the
 * item is in the cart), unit quantity, name and dual pricing below.
 * Designed for narrow 3-column grids where the standard card's footer
 * (price + wide button) overflows.
 */
export function CompactProductCard({
  product,
  cartQuantity = 0,
  onAddToCart,
  onIncrement,
  onDecrement,
  onProductClick,
}: ProductCardProps) {
  const [imageError, setImageError] = React.useState<boolean>(false);

  const discountPercent =
    product.mrp > product.salePrice
      ? Math.round(((product.mrp - product.salePrice) / product.mrp) * 100)
      : 0;

  const isOutOfStock = !product.isAvailable || product.stockCount <= 0;

  const stop = (fn?: (p: ProductData) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn?.(product);
  };

  return (
    <div className="relative flex flex-col rounded-[var(--sq-radius-sm)] border border-[var(--sq-line)] bg-white p-2 shadow-[var(--sq-shadow-card)]">
      <div
        onClick={() => onProductClick?.(product)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onProductClick?.(product);
          }
        }}
        className="cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        aria-label={`View details for ${product.title}`}
      >
        {/* Media — outer box deliberately NOT overflow-hidden so the ADD
            control can overlap the image edge Blinkit-style. */}
        <div className="relative w-full aspect-square">
          <div className="relative w-full h-full rounded-lg bg-[var(--sq-fog)] overflow-hidden flex items-center justify-center">
            {discountPercent > 0 && (
              <span className="absolute top-1 left-1 z-10 bg-[var(--sq-lime)] text-[var(--sq-ink)] text-[8px] font-black px-1.5 py-0.5 rounded-md tracking-wide">
                {discountPercent}% OFF
              </span>
            )}
            {!imageError && product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                onError={() => setImageError(true)}
                className="w-full h-full object-contain p-1.5"
                loading="lazy"
              />
            ) : (
              <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                {product.title.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Floating ADD control (Blinkit parity) */}
          <div className="absolute -bottom-2.5 right-1.5 z-20">
            {isOutOfStock ? (
              <span className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-[7px] font-black text-slate-400 flex items-center justify-center select-none">
                OOS
              </span>
            ) : cartQuantity > 0 ? (
              <div className="flex items-center h-9 rounded-full bg-primary text-white px-1 shadow-md select-none">
                <button
                  type="button"
                  onClick={stop(onDecrement)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-white/20 active:scale-90 rounded-full transition-all"
                  aria-label={`Decrease ${product.title}`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-black font-mono min-w-[14px] text-center">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={stop(onIncrement)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-white/20 active:scale-90 rounded-full transition-all"
                  aria-label={`Increase ${product.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={stop(onAddToCart)}
                aria-label={`Add ${product.title} to cart`}
                className="w-9 h-9 rounded-full bg-primary text-white border-2 border-white flex items-center justify-center shadow-md hover:opacity-90 active:scale-90 transition-all"
              >
                <Plus className="w-5 h-5" strokeWidth={2.75} />
              </button>
            )}
          </div>
        </div>

        {/* Details — spaced below the floating control */}
        <div className="mt-3.5">
          <span className="text-[9px] font-black uppercase tracking-wide text-stone-500 font-mono">
            {product.unitQuantity}
          </span>
          <h3
            className="mt-0.5 text-[11px] font-bold text-surface-dark line-clamp-2 leading-snug min-h-[28px]"
            title={product.title}
          >
            {product.title}
          </h3>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-sm font-display font-bold text-surface-dark tracking-tight">
              ₹{product.salePrice}
            </span>
            {product.mrp > product.salePrice && (
              <span className="text-[10px] text-stone-400 line-through">
                ₹{product.mrp}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );}

interface ProductCardProps {
  product: ProductData;
  cartQuantity?: number;
  onAddToCart?: (product: ProductData) => void;
  onIncrement?: (product: ProductData) => void;
  onDecrement?: (product: ProductData) => void;
  onProductClick?: (product: ProductData) => void;
}

export function ProductCard({
  product,
  cartQuantity = 0,
  onAddToCart,
  onIncrement,
  onDecrement,
  onProductClick,
}: ProductCardProps) {
  const [imageError, setImageError] = React.useState<boolean>(false);

  const discountPercent =
    product.mrp > product.salePrice
      ? Math.round(((product.mrp - product.salePrice) / product.mrp) * 100)
      : 0;

  const isOutOfStock = !product.isAvailable || product.stockCount <= 0;
  const isLowStock = !isOutOfStock && product.stockCount <= 5;

  const handleCardClick = () => {
    onProductClick?.(product);
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border-subtle bg-white p-3.5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all">
      {/* Top Media & Details - Click to open product modal */}
      <div
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl select-none"
        aria-label={`View details for ${product.title}`}
      >
        <div className="relative w-full aspect-square rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100 group-hover:bg-slate-100/50 transition-colors">
          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div className="absolute top-2 left-2 z-10">
              <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs tracking-wider">
                {discountPercent}% OFF
              </span>
            </div>
          )}

          {/* Speed Pill positioned at bottom-left of image */}
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <div className="inline-flex items-center gap-1 bg-slate-900/85 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold shadow-xs backdrop-blur-xs">
              <Zap className="w-2.5 h-2.5 fill-primary-accent text-primary-accent" />
              <span>EXPRESS</span>
            </div>
          </div>

          {/* Product Image with Fallback */}
          {!imageError && product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 gap-1 p-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                {product.title.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[10px] text-muted-foreground line-clamp-1">
                {product.category?.name || "Grocery"}
              </span>
            </div>
          )}
        </div>

        {/* Unit Quantity Pill (+ low-stock urgency hint) — WCAG AA: #57534E on #F5F5F4 = 6.9:1 */}
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="inline-block text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md font-mono">
            {product.unitQuantity}
          </span>
          {isLowStock && (
            <span className="text-[10px] font-black text-rose-700 uppercase tracking-wide">
              Only {product.stockCount} left
            </span>
          )}
        </div>

        {/* Product Title */}
        <h3
          className="mt-1.5 text-xs font-bold text-surface-dark line-clamp-2 leading-snug group-hover:text-primary transition-colors"
          title={product.title}
        >
          {product.title}
        </h3>
      </div>

      {/* Pricing & Add Trigger */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Prices */}
        <div className="flex flex-col">
          <span className="text-sm font-display font-bold text-surface-dark tracking-tight">
            ₹{product.salePrice}
          </span>
          {product.mrp > product.salePrice && (
            <span className="text-[11px] text-muted-foreground line-through">
              ₹{product.mrp}
            </span>
          )}
        </div>

        {/* Action Button / Stepper — 40px hit area (Apple HIG minimum) */}
        <div className="w-24">
          {isOutOfStock ? (
            <Button
              disabled
              size="sm"
              variant="outline"
              className="w-full h-10 text-[10px] font-bold text-slate-400 bg-slate-50 border-slate-200 rounded-lg select-none"
            >
              OUT OF STOCK
            </Button>
          ) : cartQuantity > 0 ? (
            <div className="flex items-center justify-between h-10 bg-primary text-white rounded-lg px-1 shadow-sm font-bold text-xs select-none">
              <button
                type="button"
                onClick={() => onDecrement?.(product)}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/20 active:scale-90 rounded transition-all"
                aria-label={`Decrease ${product.title}`}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs">{cartQuantity}</span>
              <button
                type="button"
                onClick={() => onIncrement?.(product)}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/20 active:scale-90 rounded transition-all"
                aria-label={`Increase ${product.title}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onAddToCart?.(product)}
              className="w-full h-10 border-2 border-primary text-primary hover:bg-primary hover:text-white font-black text-xs rounded-lg transition-all active:scale-95 shadow-2xs"
            >
              + ADD
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
