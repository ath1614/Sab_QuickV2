/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { ProductData } from "@/components/catalog/ProductCard";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Plus,
  Minus,
  X,
  ShieldCheck,
  Truck,
  Sparkles,
  Info,
  Clock,
} from "lucide-react";

interface ProductDetailModalProps {
  product: ProductData | null;
  isOpen: boolean;
  onClose: () => void;
  cartQuantity: number;
  onAddToCart: (product: ProductData) => void;
  onIncrement: (product: ProductData) => void;
  onDecrement: (product: ProductData) => void;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  cartQuantity,
  onAddToCart,
  onIncrement,
  onDecrement,
}: ProductDetailModalProps) {
  const [imageError, setImageError] = React.useState<boolean>(false);

  // Reset image error state when product changes
  React.useEffect(() => {
    setImageError(false);
  }, [product?.id]);

  if (!product) return null;

  const discountPercent =
    product.mrp > product.salePrice
      ? Math.round(((product.mrp - product.salePrice) / product.mrp) * 100)
      : 0;

  const savingsAmount = product.mrp > product.salePrice ? product.mrp - product.salePrice : 0;
  const isOutOfStock = !product.isAvailable || product.stockCount <= 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Visually Hidden Title for Accessibility */}
        <DialogTitle className="sr-only">{product.title} Details</DialogTitle>

        {/* Modal Header & Close Button */}
        <div className="relative bg-slate-50 border-b border-slate-100 flex items-center justify-center p-6 pt-10">
          {/* Close button with high-contrast pill */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white flex items-center justify-center transition-all shadow-2xs active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div className="absolute top-4 left-4 z-10">
              <span className="bg-primary-accent text-surface-dark text-xs font-black px-2.5 py-1 rounded-lg shadow-xs tracking-wider">
                {discountPercent}% OFF
              </span>
            </div>
          )}

          {/* 10 MINS Express Delivery Pill */}
          <div className="absolute bottom-3 left-4 z-10">
            <div className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-xs text-slate-800 border border-slate-200 text-xs px-2.5 py-1 rounded-lg font-bold shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-[#0B6E4F] text-[#0B6E4F]" />
              <span>10 MINS DELIVERY</span>
            </div>
          </div>

          {/* Product Image Display */}
          <div className="w-48 h-48 sm:w-56 sm:h-56 relative flex items-center justify-center">
            {!imageError && product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                onError={() => setImageError(true)}
                className="w-full h-full object-contain drop-shadow-sm transition-transform hover:scale-105 duration-300"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl">
                  {product.title.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {product.category?.name || "Grocery"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Product Details Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[55vh] overflow-y-auto">
          {/* Unit Quantity & Category Breadcrumb */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-block text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md font-mono">
              {product.unitQuantity}
            </span>
            {product.category?.name && (
              <span className="text-xs font-semibold text-primary">
                {product.category.name}
              </span>
            )}
          </div>

          {/* Product Title */}
          <div>
            <h2 className="text-lg sm:text-xl font-black text-surface-dark leading-snug">
              {product.title}
            </h2>
            {savingsAmount > 0 && (
              <p className="text-xs font-bold text-emerald-600 mt-1">
                You save ₹{savingsAmount} on this item
              </p>
            )}
          </div>

          {/* Product Description Section */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>Product Details & Highlights</span>
            </h3>
            {product.description?.trim() ? (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line font-medium bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                {product.description}
              </p>
            ) : (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-surface-dark">
                  Quality Guaranteed by SabQuick Dark Store
                </p>
                <p className="text-slate-500 leading-relaxed">
                  Hand-picked and stored under strict temperature controls in our Ambikapur facility. Delivered in sealed tamper-evident bags within 10-15 minutes.
                </p>
              </div>
            )}
          </div>

          {/* Tags / Badges */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md capitalize"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Store Assurance Trust Badges */}
          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100/80 text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Genuine Quality</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/10 text-primary">
              <Truck className="w-4 h-4 text-primary shrink-0" />
              <span>Instant Local Dispatch</span>
            </div>
          </div>
        </div>

        {/* Sticky Modal Footer with Pricing & Add-to-Cart Stepper */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-between gap-4 shadow-md">
          {/* Price Block */}
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Price</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-surface-dark">
                ₹{product.salePrice}
              </span>
              {product.mrp > product.salePrice && (
                <span className="text-xs text-slate-400 line-through font-medium">
                  ₹{product.mrp}
                </span>
              )}
            </div>
          </div>

          {/* Add to Cart Stepper */}
          <div className="w-36">
            {isOutOfStock ? (
              <Button
                disabled
                size="sm"
                variant="outline"
                className="w-full h-11 text-xs font-bold text-slate-400 bg-slate-50 border-slate-200 rounded-xl select-none"
              >
                OUT OF STOCK
              </Button>
            ) : cartQuantity > 0 ? (
              <div className="flex items-center justify-between h-11 bg-primary text-white rounded-xl px-2 shadow-md font-bold text-sm select-none">
                <button
                  type="button"
                  onClick={() => onDecrement(product)}
                  aria-label="Decrease quantity"
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/20 active:scale-95 rounded-lg transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono text-sm px-2">{cartQuantity}</span>
                <button
                  type="button"
                  onClick={() => onIncrement(product)}
                  aria-label="Increase quantity"
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/20 active:scale-95 rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => onAddToCart(product)}
                className="w-full h-11 bg-primary hover:bg-primary-dark text-white font-black text-sm rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                + ADD TO CART
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
