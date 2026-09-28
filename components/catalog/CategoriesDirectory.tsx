"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { CATEGORY_ICONS, ParentCategoryItem } from "./CategoryNav";

interface CategoriesDirectoryProps {
  categories: ParentCategoryItem[];
  /** Live product counts keyed by parent category id. */
  productCounts: Record<string, number>;
  className?: string;
}

/**
 * Categories Directory for Homepage (Blinkit Parity):
 *
 *  • Every category displayed as a high-density card in a clean grid.
 *  • Tapping ANY category navigates directly to `/categories?category=<slug>`
 *    opening the dedicated split-screen subcategory browser.
 *  • "Browse all" navigates to `/categories`.
 *  • No popup sheets or unscrollable modals.
 */
export function CategoriesDirectory({
  categories,
  productCounts,
  className,
}: CategoriesDirectoryProps) {
  const router = useRouter();

  const withStock = categories.filter((c) => (productCounts[c.id] ?? 0) > 0);
  if (withStock.length === 0) return null;

  return (
    <section className={cn("space-y-3", className)} aria-label="Shop by category">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-[var(--sq-ink)]">
          <span className="sq-marker">Categories</span>
        </h2>
        <button
          type="button"
          onClick={() => router.push("/categories")}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 select-none"
        >
          Browse all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* High-density grid: 4 columns on mobile, 6 to 9 on larger screens */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 gap-2 sm:gap-3.5">
        {withStock.map((cat) => {
          const IconComponent = CATEGORY_ICONS[cat.slug] || ShoppingBag;
          const count = productCounts[cat.id] ?? 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => router.push(`/categories?category=${cat.slug}`)}
              className="sq-pressable group flex flex-col items-center gap-1.5 p-2 sm:p-2.5 rounded-2xl bg-white border border-[var(--sq-line)] shadow-[var(--sq-shadow-card)] hover:shadow-md hover:border-primary/40 select-none transition-all"
            >
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50/70 border border-emerald-100/60 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                {cat.imageUrl && cat.imageUrl.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-contain p-1"
                    loading="lazy"
                  />
                ) : (
                  <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                )}
              </div>
              <div className="text-center w-full space-y-0.5">
                <span className="block text-[11px] sm:text-xs font-bold text-[var(--sq-ink)] leading-tight line-clamp-2">
                  {cat.name}
                </span>
                <span className="block text-[9px] sm:text-[10px] font-semibold text-[var(--sq-ink-faint)]">
                  {count} item{count === 1 ? "" : "s"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
