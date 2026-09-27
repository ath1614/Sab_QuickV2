"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ShoppingBag, X } from "lucide-react";
import { CATEGORY_ICONS, ParentCategoryItem } from "./CategoryNav";
import { ProductCard, ProductData } from "./ProductCard";

interface CategoriesDirectoryProps {
  categories: ParentCategoryItem[];
  /** Live product counts keyed by parent category id. */
  productCounts: Record<string, number>;
  /** All products (unfiltered) for the subcategory sidebar grid. */
  products: ProductData[];
  cartQuantities: Record<string, number>;
  onAddToCart: (product: ProductData) => void;
  onIncrement: (product: ProductData) => void;
  onDecrement: (product: ProductData) => void;
  onProductClick: (product: ProductData) => void;
  /** Browse a category with the classic filtered-grid experience. */
  onSelectCategory: (catSlug: string) => void;
  className?: string;
}

type ActivePanel = {
  category: ParentCategoryItem;
  subId: string | null; // null = All in this category
} | null;

/**
 * Categories Directory — mobile-app parity, per product decision:
 *
 *  • Entry: EVERY category as a circle card on one screen (image, name,
 *    live item count) — replaces the old side "aisle" wording.
 *  • Tap a circle: a side panel (sheet on mobile, sidebar on desktop)
 *    opens listing the category's SUBCATEGORIES; items show in the panel
 *    with an "All" option. "Open full aisle" switches to the classic
 *    filtered grid on the page behind.
 */
export function CategoriesDirectory({
  categories,
  productCounts,
  products,
  cartQuantities,
  onAddToCart,
  onIncrement,
  onDecrement,
  onProductClick,
  onSelectCategory,
  className,
}: CategoriesDirectoryProps) {
  const [panel, setPanel] = React.useState<ActivePanel>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);

  const withStock = categories.filter((c) => (productCounts[c.id] ?? 0) > 0);

  const openPanel = (cat: ParentCategoryItem, sheet: boolean) => {
    setPanel({ category: cat, subId: null });
    setMobileSheetOpen(sheet);
  };

  const closePanel = () => {
    setPanel(null);
    setMobileSheetOpen(false);
  };

  const panelProducts = React.useMemo(() => {
    if (!panel) return [];
    const cat = panel.category;
    const subIds = new Set(cat.subCategories?.map((s) => s.id));
    return products.filter((p) => {
      const cid = p.category?.id;
      if (panel.subId) return cid === panel.subId;
      return cid === cat.id || (cid && subIds.has(cid));
    });
  }, [panel, products]);

  if (withStock.length === 0) return null;

  const circleGrid = (sheetMode: boolean) => (
    <div
      className={cn(
        "grid grid-cols-3 xs:grid-cols-4 gap-3 sm:gap-4",
        sheetMode ? "grid-cols-4" : "sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9"
      )}
    >
      {withStock.map((cat) => {
        const IconComponent = CATEGORY_ICONS[cat.slug] || ShoppingBag;
        const count = productCounts[cat.id] ?? 0;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => openPanel(cat, sheetMode)}
            className="sq-pressable group flex flex-col items-center gap-2 p-2 sm:p-3 rounded-[var(--sq-radius-md)] bg-white border border-[var(--sq-line)] shadow-[var(--sq-shadow-card)] hover:shadow-[var(--sq-shadow-pop)] hover:border-primary/30 select-none"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-50 border border-[var(--sq-line)] flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-primary/25 transition-all">
              {cat.imageUrl && cat.imageUrl.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <IconComponent className="w-7 h-7 text-primary" />
              )}
            </div>
            <div className="text-center space-y-0.5">
              <span className="block text-[11px] sm:text-xs font-bold text-[var(--sq-ink)] leading-tight line-clamp-2">
                {cat.name}
              </span>
              <span className="block text-[10px] font-semibold text-[var(--sq-ink-faint)]">
                {count} item{count === 1 ? "" : "s"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );

  const subcategorySidebar = (panelState: NonNullable<ActivePanel>) => {
    const cat = panelState.category;
    const subs = cat.subCategories ?? [];
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--sq-line)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-50 border border-[var(--sq-line)] overflow-hidden shrink-0 flex items-center justify-center">
              {cat.imageUrl && cat.imageUrl.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
              ) : (
                React.createElement(CATEGORY_ICONS[cat.slug] || ShoppingBag, {
                  className: "w-4.5 h-4.5 text-primary",
                })
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-[var(--sq-ink)] truncate">{cat.name}</p>
              <p className="text-[10px] text-[var(--sq-ink-faint)]">
                {panelProducts.length} item{panelProducts.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close categories panel"
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-[var(--sq-ink-soft)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subcategory list — the side panel the user asked for */}
        <div className="px-3 py-3 space-y-1.5 overflow-y-auto max-h-[38vh] md:max-h-none">
          <button
            type="button"
            onClick={() => setPanel({ ...panelState, subId: null })}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-[var(--sq-radius-xs)] text-xs font-bold transition-all",
              panelState.subId === null
                ? "bg-[var(--sq-lime)] text-[var(--sq-ink)] shadow-[0_2px_10px_rgba(200,245,49,0.35)]"
                : "bg-[var(--sq-fog)] text-[var(--sq-ink-soft)] hover:bg-slate-100"
            )}
          >
            <span>All {cat.name}</span>
            <span className="text-[10px] font-mono">{productCounts[cat.id] ?? 0}</span>
          </button>
          {subs.map((sub) => {
            const subCount = products.filter((p) => p.category?.id === sub.id).length;
            const active = panelState.subId === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setPanel({ ...panelState, subId: sub.id })}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-[var(--sq-radius-xs)] text-xs font-bold transition-all",
                  active
                    ? "bg-[var(--sq-lime)] text-[var(--sq-ink)] shadow-[0_2px_10px_rgba(200,245,49,0.35)]"
                    : "bg-[var(--sq-fog)] text-[var(--sq-ink-soft)] hover:bg-slate-100"
                )}
              >
                <span className="truncate">{sub.name}</span>
                <span className="text-[10px] font-mono shrink-0 ml-2">{subCount}</span>
              </button>
            );
          })}
        </div>

        {/* Items in the selected (sub)category */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {panelProducts.length === 0 ? (
            <p className="text-xs text-[var(--sq-ink-faint)] text-center py-8">
              Nothing here yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {panelProducts.slice(0, 12).map((p) => (
                <div key={p.id} className="[&>div]:!w-full">
                  <ProductCard
                    product={p}
                    cartQuantity={cartQuantities[p.id] || 0}
                    onAddToCart={onAddToCart}
                    onIncrement={onIncrement}
                    onDecrement={onDecrement}
                    onProductClick={onProductClick}
                  />
                </div>
              ))}
            </div>
          )}
          {panelProducts.length > 12 && (
            <button
              type="button"
              onClick={() => {
                closePanel();
                onSelectCategory(cat.slug);
              }}
              className="sq-cta w-full mt-3 py-2.5 text-xs inline-flex items-center justify-center gap-1"
            >
              View all {panelProducts.length} items <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-[var(--sq-line)]">
          <button
            type="button"
            onClick={() => {
              closePanel();
              onSelectCategory(cat.slug);
            }}
            className="w-full py-2.5 rounded-[var(--sq-radius-sm)] border border-primary/30 text-primary text-xs font-black hover:bg-primary/5 inline-flex items-center justify-center gap-1"
          >
            Open full {cat.name} aisle <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className={cn("space-y-3", className)} aria-label="Shop by category">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-[var(--sq-ink)]">
          <span className="sq-marker">Categories</span>
        </h2>
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
        >
          Browse all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Desktop: circle grid + persistent sidebar when a category is active */}
      <div className="hidden md:grid md:grid-cols-[1fr_360px] gap-6 items-start">
        <div>{circleGrid(false)}</div>
        {panel && (
          <aside className="sq-card sticky top-24 overflow-hidden animate-in fade-in slide-in-from-right-2 duration-200 h-[520px]">
            {subcategorySidebar(panel)}
          </aside>
        )}
      </div>

      {/* Mobile: circle grid opens a bottom sheet with the same sidebar */}
      <div className="md:hidden">
        {circleGrid(true)}
        {mobileSheetOpen && panel && (
          <div className="fixed inset-0 z-[80] flex items-end" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="Close"
              onClick={closePanel}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
            />
            <div className="relative w-full max-h-[82vh] bg-white rounded-t-[var(--sq-radius-lg)] shadow-[var(--sq-shadow-pop)] animate-in slide-in-from-bottom-4 duration-250 flex flex-col">
              <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[var(--sq-line)] shrink-0" />
              {subcategorySidebar(panel)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
