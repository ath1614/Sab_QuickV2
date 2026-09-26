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
          {/* Discount Badge in Kinetic Green */}
          {discountPercent > 0 && (
            <div className="absolute top-2 left-2 z-10">
              <span className="bg-primary-accent text-surface-dark text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs tracking-wider">
                {discountPercent}% OFF
              </span>
            </div>
          )}

          {/* Speed Pill positioned at bottom-left of image */}
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <div className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-xs text-slate-800 border border-slate-200 text-[9px] px-1.5 py-0.5 rounded-md font-bold shadow-xs">
              <Zap className="w-2.5 h-2.5 fill-[#0B6E4F] text-[#0B6E4F]" />
              <span>10 MINS</span>
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

        {/* Unit Quantity Pill (+ low-stock urgency hint) */}
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="inline-block text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
            {product.unitQuantity}
          </span>
          {isLowStock && (
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-wide">
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
          <span className="text-sm font-black text-surface-dark tracking-tight">
            ₹{product.salePrice}
          </span>
          {product.mrp > product.salePrice && (
            <span className="text-[11px] text-muted-foreground line-through">
              ₹{product.mrp}
            </span>
          )}
        </div>

        {/* Action Button / Stepper */}
        <div className="w-24">
          {isOutOfStock ? (
            <Button
              disabled
              size="sm"
              variant="outline"
              className="w-full h-8 text-[10px] font-bold text-slate-400 bg-slate-50 border-slate-200 rounded-lg select-none"
            >
              OUT OF STOCK
            </Button>
          ) : cartQuantity > 0 ? (
            <div className="flex items-center justify-between h-8 bg-primary text-white rounded-lg px-1 shadow-sm font-bold text-xs select-none">
              <button
                type="button"
                onClick={() => onDecrement?.(product)}
                className="w-6 h-6 flex items-center justify-center hover:bg-white/20 active:scale-90 rounded transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-xs">{cartQuantity}</span>
              <button
                type="button"
                onClick={() => onIncrement?.(product)}
                className="w-6 h-6 flex items-center justify-center hover:bg-white/20 active:scale-90 rounded transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onAddToCart?.(product)}
              className="w-full h-8 border-primary text-primary hover:bg-primary hover:text-white font-bold text-xs rounded-lg transition-all active:scale-95 shadow-2xs"
            >
              + ADD
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
