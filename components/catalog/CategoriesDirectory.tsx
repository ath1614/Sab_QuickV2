"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, ShoppingBag, LayoutGrid } from "lucide-react";
import { CATEGORY_ICONS, ParentCategoryItem } from "./CategoryNav";

interface CategoriesDirectoryProps {
  categories: ParentCategoryItem[];
  /** Live product counts keyed by parent category id. */
  productCounts: Record<string, number>;
  className?: string;
  maxDisplay?: number;
}

const DEFAULT_MAX_CATEGORIES = 10;

function CategoryCircleButton({
  cat,
  onClick,
}: {
  cat: ParentCategoryItem;
  onClick: () => void;
}) {
  const [imageError, setImageError] = React.useState(false);
  const IconComponent = CATEGORY_ICONS[cat.slug] || ShoppingBag;
  const hasImage = Boolean(
    cat.imageUrl &&
      !imageError &&
      (cat.imageUrl.startsWith("http") || cat.imageUrl.startsWith("/"))
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 focus:outline-none select-none transition-transform active:scale-90"
      title={`Browse ${cat.name}`}
    >
      {/* Circular Image Container: 100% circular avatar with subtle inset frame for zoomed-out look */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white border border-slate-200/90 shadow-2xs group-hover:shadow-md group-hover:border-primary/50 group-hover:ring-2 group-hover:ring-primary/20 flex items-center justify-center p-1 overflow-hidden transition-all duration-200">
        <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-center justify-center">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cat.imageUrl!}
              alt={cat.name}
              className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/5">
              <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
          )}
        </div>
      </div>

      {/* Category Name Under Circle */}
      <span className="block text-[10px] sm:text-[11px] md:text-xs font-bold text-slate-800 text-center leading-tight line-clamp-2 max-w-[68px] sm:max-w-[80px] group-hover:text-primary transition-colors">
        {cat.name}
      </span>
    </button>
  );
}

/**
 * Categories Directory for Homepage (Blinkit & Zepto Parity):
 *
 *  • Circular avatar button with category image/icon centered inside.
 *  • Category image is rendered as a clean circle with an inset frame for breathing room (no square corners).
 *  • Category name placed cleanly below the circle.
 *  • Truncation: When > 10 categories exist, shows the top 9 categories
 *    plus a 10th "+N MORE" circular action button leading to `/categories`.
 *  • 5-column layout on mobile creates two balanced rows of 5 circles.
 */
export function CategoriesDirectory({
  categories,
  productCounts,
  className,
  maxDisplay = DEFAULT_MAX_CATEGORIES,
}: CategoriesDirectoryProps) {
  const router = useRouter();

  const withStock = categories.filter((c) => (productCounts[c.id] ?? 0) > 0);
  if (withStock.length === 0) return null;

  const hasOverflow = withStock.length > maxDisplay;
  // If overflow, show first (maxDisplay - 1) items + 1 circular "More" button
  const displayedCategories = hasOverflow ? withStock.slice(0, maxDisplay - 1) : withStock;
  const remainingCount = withStock.length - (maxDisplay - 1);

  return (
    <section className={cn("space-y-3.5", className)} aria-label="Shop by category">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-surface-dark tracking-tight">
          <span className="sq-marker">Explore by Category</span>
        </h2>
        <button
          type="button"
          onClick={() => router.push("/categories")}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 select-none"
        >
          Browse all ({withStock.length}) <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modern Circular Category Grid: 5 columns on mobile, up to 10 on desktop */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-x-2 gap-y-3.5 sm:gap-x-4 sm:gap-y-6 place-items-center">
        {displayedCategories.map((cat) => (
          <CategoryCircleButton
            key={cat.id}
            cat={cat}
            onClick={() => router.push(`/categories?category=${cat.slug}`)}
          />
        ))}

        {/* 10th Slot: Circular "+N More / All Aisles" Button when categories exceed 10 */}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => router.push("/categories")}
            className="group flex flex-col items-center gap-1.5 focus:outline-none select-none transition-transform active:scale-90"
            title="Browse all categories"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-emerald-50/80 border-2 border-dashed border-primary/40 text-primary flex flex-col items-center justify-center shadow-2xs group-hover:bg-primary group-hover:text-white transition-all duration-200">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight mt-0.5">
                +{remainingCount} MORE
              </span>
            </div>
            <span className="block text-[10px] sm:text-[11px] md:text-xs font-black text-primary text-center leading-tight">
              All Aisles
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
