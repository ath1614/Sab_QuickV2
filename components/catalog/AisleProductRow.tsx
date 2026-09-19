/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { ProductCard, ProductData } from "@/components/catalog/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from "lucide-react";

interface AisleProductRowProps {
  categoryTitle: string;
  categorySlug: string;
  categoryImageUrl?: string | null;
  products: ProductData[];
  cartQuantities: Record<string, number>;
  onAddToCart: (product: ProductData) => void;
  onIncrement: (product: ProductData) => void;
  onDecrement: (product: ProductData) => void;
  onProductClick: (product: ProductData) => void;
  onSeeAll: (categorySlug: string) => void;
}

export function AisleProductRow({
  categoryTitle,
  categorySlug,
  categoryImageUrl,
  products,
  cartQuantities,
  onAddToCart,
  onIncrement,
  onDecrement,
  onProductClick,
  onSeeAll,
}: AisleProductRowProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  React.useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScrollability, { passive: true });
      window.addEventListener("resize", checkScrollability);
      return () => {
        el.removeEventListener("scroll", checkScrollability);
        window.removeEventListener("resize", checkScrollability);
      };
    }
  }, [products]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -400 : 400;
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="space-y-3 pt-2 pb-4">
      {/* Aisle Row Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {categoryImageUrl && (
            <div className="w-8 h-8 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 p-0.5">
              <img
                src={categoryImageUrl}
                alt={categoryTitle}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-surface-dark truncate">
                {categoryTitle}
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono font-bold shrink-0">
                {products.length} Items
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Controls: Desktop Scroll Chevrons + See All Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Scroll Chevrons (Desktop only) */}
          <div className="hidden md:flex items-center gap-1 mr-1">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* See All Pill Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSeeAll(categorySlug)}
            className="h-8 px-2.5 sm:px-3 text-xs font-black text-primary hover:text-primary-dark hover:bg-primary/10 rounded-xl gap-1 shrink-0 group transition-all"
          >
            <span>See All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Horizontal Carousel Container */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pt-1 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {products.map((product) => {
          const cartQty = cartQuantities[product.id] || 0;
          return (
            <div
              key={product.id}
              className="w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start flex flex-col"
            >
              <ProductCard
                product={product}
                cartQuantity={cartQty}
                onAddToCart={onAddToCart}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onProductClick={onProductClick}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
