"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Layers,
  Milk,
  Cookie,
  CupSoda,
  UtensilsCrossed,
  Apple,
  ShoppingBag,
  Coffee,
  Flame,
  Heart,
  Baby,
} from "lucide-react";

export interface SubCategoryItem {
  id: string;
  name: string;
  slug: string;
  displayRank: number;
}

export interface ParentCategoryItem {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  displayRank: number;
  subCategories: SubCategoryItem[];
}

interface CategoryNavProps {
  categories: ParentCategoryItem[];
  activeCategorySlug: string;
  activeSubSlug?: string;
  onSelectCategory: (catSlug: string, subSlug?: string) => void;
}

export const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "dairy-and-breakfast": Milk,
  "snacks-and-munchies": Cookie,
  "cold-drinks-and-juices": CupSoda,
  "instant-foods": UtensilsCrossed,
  "fruits-and-vegetables": Apple,
  "tea-coffee-health-drinks": Coffee,
  "personal-care": Heart,
  "baby-care": Baby,
  "atta-rice-dal": Flame,
};

export function CategoryNav({
  categories,
  activeCategorySlug,
  activeSubSlug,
  onSelectCategory,
}: CategoryNavProps) {
  const activeParent = categories.find((c) => c.slug === activeCategorySlug);

  return (
    <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2">
        {/* Level 1: Main Aisles (Parent Categories) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
          {/* All Aisles Pill */}
          <button
            type="button"
            onClick={() => onSelectCategory("all")}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all select-none",
              activeCategorySlug === "all"
                ? "bg-primary text-white shadow-sm ring-1 ring-primary"
                : "bg-slate-100 hover:bg-slate-200/80 text-surface-dark border border-border-subtle/60"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>All Aisles</span>
          </button>

          {/* Parent Category Aisle Buttons */}
          {categories.map((cat) => {
            const isActive = activeCategorySlug === cat.slug;
            const IconComponent = CATEGORY_ICONS[cat.slug] || ShoppingBag;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.slug)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all select-none",
                  isActive
                    ? "bg-primary text-white shadow-sm ring-1 ring-primary"
                    : "bg-slate-100 hover:bg-slate-200/80 text-surface-dark border border-border-subtle/60"
                )}
              >
                {cat.imageUrl && cat.imageUrl.startsWith("http") ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-4 h-4 object-contain rounded-sm"
                  />
                ) : (
                  <IconComponent className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-primary")} />
                )}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Level 2: Sub-Aisle Tabs (Displayed when parent is selected) */}
        {activeParent && activeParent.subCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 pt-1.5 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-primary" /> Sub-Aisles:
            </span>

            {/* All In This Parent */}
            <button
              type="button"
              onClick={() => onSelectCategory(activeParent.slug)}
              className={cn(
                "shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all select-none",
                !activeSubSlug || activeSubSlug === "all"
                  ? "bg-primary-accent text-surface-dark font-bold shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-muted-foreground hover:text-surface-dark"
              )}
            >
              All {activeParent.name}
            </button>

            {/* Subcategories */}
            {activeParent.subCategories.map((sub) => {
              const isSubActive = activeSubSlug === sub.slug;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectCategory(activeParent.slug, sub.slug)}
                  className={cn(
                    "shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all select-none",
                    isSubActive
                      ? "bg-primary-accent text-surface-dark font-bold shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-muted-foreground hover:text-surface-dark"
                  )}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
