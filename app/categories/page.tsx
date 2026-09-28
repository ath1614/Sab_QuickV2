/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { CATEGORY_ICONS, ParentCategoryItem } from "@/components/catalog/CategoryNav";
import { ProductCard, ProductData } from "@/components/catalog/ProductCard";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";

/**
 * Full-screen Categories experience (mobile-app parity):
 *
 *   Entry     → EVERY category as a whole-circle card (even 0-item ones),
 *               with a search field, on a scrollable page.
 *   Category  → back arrow + name, "Search in <Category>" field, a LEFT
 *               SIDE PANEL of subcategories (All + each with live counts)
 *               beside a scrollable product grid — exactly like the old
 *               Flutter app. Both columns scroll independently.
 */
export default function CategoriesPage() {
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);

  const [categories, setCategories] = React.useState<ParentCategoryItem[]>([]);
  const [products, setProducts] = React.useState<ProductData[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [activeCatId, setActiveCatId] = React.useState<string | null>(null);
  const [activeSubId, setActiveSubId] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState("");

  const cartQuantities = React.useMemo(() => {
    const q: Record<string, number> = {};
    for (const ci of cartItems) q[ci.product.id] = ci.quantity;
    return q;
  }, [cartItems]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/categories").then((r) => (r.ok ? r.json() : { categories: [] })),
      fetch("/api/products").then((r) => (r.ok ? r.json() : { products: [] })),
    ])
      .then(([catData, prodData]) => {
        if (cancelled) return;
        setCategories(catData.categories || []);
        setProducts(prodData.products || []);
      })
      .catch((err) => console.warn("Categories page load failed:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const productCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.id] = products.filter(
        (p) =>
          p.category?.id === cat.id ||
          (p.category?.id && cat.subCategories?.some((s) => s.id === p.category?.id))
      ).length;
    }
    return counts;
  }, [categories, products]);

  const activeCat = categories.find((c) => c.id === activeCatId) || null;

  const panelProducts = React.useMemo(() => {
    if (!activeCat) return [];
    const subIds = new Set(activeCat.subCategories?.map((s) => s.id));
    let list = products.filter((p) => {
      const cid = p.category?.id;
      if (activeSubId) return cid === activeSubId;
      return cid === activeCat.id || (cid && subIds.has(cid));
    });
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeCat, activeSubId, searchText, products]);

  const openCategory = (cat: ParentCategoryItem) => {
    setActiveCatId(cat.id);
    setActiveSubId(null);
    setSearchText("");
    window.scrollTo({ top: 0 });
  };

  const backToAll = () => {
    setActiveCatId(null);
    setActiveSubId(null);
    setSearchText("");
  };

  const entrySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.trim();
    if (q.length >= 2) {
      router.push(`/?search=${encodeURIComponent(q)}`);
    }
  };

  /* ---------------------------- CATEGORY VIEW ---------------------------- */
  if (activeCat) {
    const IconComponent = CATEGORY_ICONS[activeCat.slug] || ShoppingBag;
    const subs = activeCat.subCategories ?? [];
    return (
      <div className="min-h-screen bg-[var(--sq-fog)] text-[var(--sq-ink)] font-sans">
        {/* Top bar: back + category identity */}
        <div className="sticky top-0 z-30 bg-[var(--sq-fog)]/95 backdrop-blur-md border-b border-[var(--sq-line)] pt-[env(safe-area-inset-top,0px)]">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={backToAll}
              aria-label="Back to all categories"
              className="w-9 h-9 rounded-full bg-white border border-[var(--sq-line)] flex items-center justify-center shadow-[var(--sq-shadow-card)] sq-pressable shrink-0"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-[var(--sq-line)] overflow-hidden flex items-center justify-center shrink-0">
              {activeCat.imageUrl && activeCat.imageUrl.startsWith("http") ? (
                <img src={activeCat.imageUrl} alt={activeCat.name} className="w-full h-full object-cover" />
              ) : (
                <IconComponent className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-black font-display truncate leading-tight">
                {activeCat.name}
              </h1>
              <p className="text-[11px] text-[var(--sq-ink-faint)] font-semibold">
                {productCounts[activeCat.id] ?? 0} items
              </p>
            </div>
          </div>
          {/* Search within the category */}
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--sq-ink-faint)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={`Search in ${activeCat.name}...`}
                className="w-full h-11 pl-10 pr-10 rounded-[var(--sq-radius-sm)] bg-white border border-[var(--sq-line)] text-sm font-medium placeholder:text-[var(--sq-ink-faint)] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[var(--sq-ink-soft)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Side panel + product grid — both columns scroll independently */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 flex gap-4 items-start">
          {/* LEFT: subcategory side panel */}
          <aside className="w-[38%] max-w-[220px] shrink-0 bg-white rounded-[var(--sq-radius-md)] border border-[var(--sq-line)] shadow-[var(--sq-shadow-card)] overflow-y-auto max-h-[calc(100dvh-220px)] sticky top-[124px]">
            <div className="p-2 space-y-1">
              <button
                type="button"
                onClick={() => setActiveSubId(null)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-[var(--sq-radius-xs)] text-[11px] sm:text-xs font-bold text-left transition-all",
                  activeSubId === null
                    ? "bg-[var(--sq-lime)] text-[var(--sq-ink)] shadow-[0_2px_10px_rgba(200,245,49,0.35)]"
                    : "text-[var(--sq-ink-soft)] hover:bg-[var(--sq-fog)]"
                )}
              >
                <span className="truncate">All {activeCat.name}</span>
                <span className="text-[10px] font-mono shrink-0 ml-1.5">
                  {productCounts[activeCat.id] ?? 0}
                </span>
              </button>
              {subs.map((sub) => {
                const subCount = products.filter((p) => p.category?.id === sub.id).length;
                const active = activeSubId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveSubId(sub.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-[var(--sq-radius-xs)] text-[11px] sm:text-xs font-bold text-left transition-all",
                      active
                        ? "bg-[var(--sq-lime)] text-[var(--sq-ink)] shadow-[0_2px_10px_rgba(200,245,49,0.35)]"
                        : "text-[var(--sq-ink-soft)] hover:bg-[var(--sq-fog)]"
                    )}
                  >
                    <span className="truncate">{sub.name}</span>
                    <span className="text-[10px] font-mono shrink-0 ml-1.5">{subCount}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* RIGHT: product grid (page scrolls naturally) */}
          <section className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-56 rounded-[var(--sq-radius-md)] bg-white animate-pulse" />
                ))}
              </div>
            ) : panelProducts.length === 0 ? (
              <div className="bg-white rounded-[var(--sq-radius-md)] border border-[var(--sq-line)] p-10 text-center space-y-2">
                <ShoppingBag className="w-8 h-8 text-[var(--sq-ink-faint)] mx-auto" />
                <p className="text-sm font-bold">Nothing here yet</p>
                <p className="text-xs text-[var(--sq-ink-faint)]">
                  {searchText
                    ? "No items match your search in this category."
                    : "Items will appear here as soon as they're added to this category."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {panelProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    cartQuantity={cartQuantities[p.id] || 0}
                    onAddToCart={addItem}
                    onIncrement={addItem}
                    onDecrement={(item) => removeItem(item.id)}
                    onProductClick={() => {
                      /* detail modal lives on the storefront */
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  /* ----------------------------- ENTRY VIEW ------------------------------ */
  return (
    <div className="min-h-screen bg-[var(--sq-fog)] text-[var(--sq-ink)] font-sans">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-black font-display">All Categories</h1>
          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label="Refresh categories"
            className="w-10 h-10 rounded-full bg-white border border-[var(--sq-line)] flex items-center justify-center shadow-[var(--sq-shadow-card)] sq-pressable"
          >
            <RefreshCw className={cn("w-4.5 h-4.5 text-primary", loading && "animate-spin")} />
          </button>
        </div>

        {/* Catalog-wide search — jumps into the storefront results */}
        <div className="relative mt-4">
          <Search className="w-4.5 h-4.5 text-[var(--sq-ink-faint)] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            onBlur={entrySearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") entrySearch(e as unknown as React.ChangeEvent<HTMLInputElement>);
            }}
            placeholder="Search the full catalog..."
            className="w-full h-12 pl-11 pr-4 rounded-[var(--sq-radius-sm)] bg-white border border-[var(--sq-line)] text-sm font-medium placeholder:text-[var(--sq-ink-faint)] focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-[var(--sq-radius-md)] bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-5 pb-10">
            {categories.map((cat) => {
              const IconComponent = CATEGORY_ICONS[cat.slug] || ShoppingBag;
              const count = productCounts[cat.id] ?? 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => openCategory(cat)}
                  className="sq-pressable flex flex-col items-center gap-2.5 p-4 rounded-[var(--sq-radius-md)] bg-white border border-[var(--sq-line)] shadow-[var(--sq-shadow-card)] hover:shadow-[var(--sq-shadow-pop)] hover:border-primary/30 select-none"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-50 border border-[var(--sq-line)] flex items-center justify-center overflow-hidden">
                    {cat.imageUrl && cat.imageUrl.startsWith("http") ? (
                      <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <IconComponent className="w-10 h-10 text-primary" />
                    )}
                  </div>
                  <div className="text-center space-y-0.5">
                    <span className="block text-xs sm:text-sm font-bold leading-tight line-clamp-2">
                      {cat.name}
                    </span>
                    <span className="block text-[10px] sm:text-[11px] font-semibold text-[var(--sq-ink-faint)]">
                      {count} item{count === 1 ? "" : "s"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="pb-6 text-center">
          <Link href="/" className="text-xs font-bold text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
