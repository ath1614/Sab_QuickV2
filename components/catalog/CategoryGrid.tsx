"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { CATEGORY_ICONS, ParentCategoryItem } from "./CategoryNav";

interface CategoryGridProps {
  categories: ParentCategoryItem[];
  /** Live product counts keyed by parent category id. */
  productCounts: Record<string, number>;
  onSelectCategory: (catSlug: string) => void;
  className?: string;
}

/**
 * Blinkit-style 3×3 (responsive) category tile grid for the storefront home.
 * Shows only parents that actually have products, capped at 9 tiles, with a
 * "See All" card that opens the full aisles directory when there are more.
 */
export function CategoryGrid({
  categories,
  productCounts,
  onSelectCategory,
  className,
}: CategoryGridProps) {
  const tilesWithStock = categories.filter(
    (c) => (productCounts[c.id] ?? 0) > 0
  );

  if (tilesWithStock.length === 0) {
    return null;
  }

  const showMoreTile = tilesWithStock.length > 9;
  const visibleTiles = tilesWithStock.slice(0, showMoreTile ? 8 : 9);

  return (
    <section className={cn("space-y-3", className)} aria-label="Shop by category">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-surface-dark flex items-center gap-2">
          Shop by Category
        </h2>
        {showMoreTile && (
          <button
            type="button"
            onClick={() => onSelectCategory("all")}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
          >
            See All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2.5 sm:gap-3">
        {visibleTiles.map((cat) => {
          const IconComponent = CATEGORY_ICONS[cat.slug] || ShoppingBag;
          const count = productCounts[cat.id] ?? 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.slug)}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-border-subtle bg-white p-3 sm:p-4 shadow-xs hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 select-none"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 flex items-center justify-center overflow-hidden group-hover:bg-emerald-100 transition-colors">
                {cat.imageUrl && cat.imageUrl.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                )}
              </div>
              <div className="text-center space-y-0.5">
                <span className="block text-[11px] sm:text-xs font-bold text-surface-dark leading-tight line-clamp-2">
                  {cat.name}
                </span>
                <span className="block text-[10px] font-semibold text-muted-foreground">
                  {count} item{count === 1 ? "" : "s"}
                </span>
              </div>
            </button>
          );
        })}

        {showMoreTile && (
          <button
            type="button"
            onClick={() => onSelectCategory("all")}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3 sm:p-4 hover:bg-primary/10 active:scale-[0.97] transition-all select-none"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-primary">
              All Aisles
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
