/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  ShoppingBag,
  X,
  Plus,
  Minus,
} from "lucide-react";
import { CATEGORY_ICONS, ParentCategoryItem, SubCategoryItem } from "@/components/catalog/CategoryNav";
import { ProductData } from "@/components/catalog/ProductCard";
import { ProductDetailModal } from "@/components/catalog/ProductDetailModal";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";

/** Helper to get thumbnail image for a subcategory (with fallback to first product image) */
function getSubcategoryImage(
  sub: SubCategoryItem,
  parent: ParentCategoryItem,
  products: ProductData[]
): string | null {
  if (sub.imageUrl && (sub.imageUrl.startsWith("http") || sub.imageUrl.startsWith("/"))) return sub.imageUrl;
  const prod = products.find(
    (p) =>
      (p.category?.id === sub.id || p.category?.slug === sub.slug) &&
      p.imageUrl &&
      (p.imageUrl.startsWith("http") || p.imageUrl.startsWith("/"))
  );
  if (prod?.imageUrl) return prod.imageUrl;
  if (parent.imageUrl && (parent.imageUrl.startsWith("http") || parent.imageUrl.startsWith("/"))) return parent.imageUrl;
  return null;
}

/** Helper to get thumbnail image for a category */
function getCategoryImage(cat: ParentCategoryItem, products: ProductData[]): string | null {
  if (cat.imageUrl && (cat.imageUrl.startsWith("http") || cat.imageUrl.startsWith("/"))) return cat.imageUrl;
  const prod = products.find(
    (p) =>
      (p.category?.id === cat.id || cat.subCategories?.some((s) => s.id === p.category?.id)) &&
      p.imageUrl &&
      (p.imageUrl.startsWith("http") || p.imageUrl.startsWith("/"))
  );
  if (prod?.imageUrl) return prod.imageUrl;
  return null;
}

/* -------------------------------------------------------------------------- */
/* Split Product Card (Theme-Dynamic, No ETA Chip, Compact & High-Density)     */
/* -------------------------------------------------------------------------- */
interface SplitProductCardProps {
  product: ProductData;
  cartQuantity: number;
  onAddToCart: (p: ProductData) => void;
  onIncrement: (p: ProductData) => void;
  onDecrement: (p: ProductData) => void;
  onProductClick: (p: ProductData) => void;
}

function SplitProductCard({
  product,
  cartQuantity,
  onAddToCart,
  onIncrement,
  onDecrement,
  onProductClick,
}: SplitProductCardProps) {
  const [imageError, setImageError] = React.useState(false);

  const discountPercent =
    product.mrp > product.salePrice
      ? Math.round(((product.mrp - product.salePrice) / product.mrp) * 100)
      : 0;

  const isOutOfStock = !product.isAvailable || product.stockCount <= 0;

  return (
    <div className="group relative flex flex-col justify-between rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-2 sm:p-3 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all select-none">
      {/* Clickable Area: Image & Information */}
      <div
        onClick={() => onProductClick(product)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onProductClick(product);
          }
        }}
        className="cursor-pointer focus:outline-none"
        aria-label={`View details for ${product.title}`}
      >
        {/* Media Container */}
        <div className="relative w-full aspect-square rounded-lg sm:rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100 group-hover:bg-slate-100/50 transition-colors">
          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div className="absolute top-1.5 left-1.5 z-10">
              <span className="bg-primary text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs tracking-wide">
                {discountPercent}% OFF
              </span>
            </div>
          )}

          {/* Product Image */}
          {!imageError && product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-contain p-1.5 sm:p-2 group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 gap-1 p-2 text-center">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                {product.title.slice(0, 2).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Unit Quantity */}
        <div className="mt-2">
          <span className="inline-block text-[10px] sm:text-[11px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-mono">
            {product.unitQuantity}
          </span>
        </div>

        {/* Title */}
        <h3
          className="mt-1 text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-primary transition-colors min-h-[28px]"
          title={product.title}
        >
          {product.title}
        </h3>
      </div>

      {/* Pricing & Add Controls Row */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
        {/* Price display */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs sm:text-sm font-black font-display text-slate-900 tracking-tight leading-tight">
            ₹{product.salePrice}
          </span>
          {product.mrp > product.salePrice && (
            <span className="text-[10px] text-slate-400 line-through leading-none">
              ₹{product.mrp}
            </span>
          )}
        </div>

        {/* Action Button: Dynamic Theme + ADD or Stepper */}
        <div className="shrink-0">
          {isOutOfStock ? (
            <span className="inline-block text-[9px] sm:text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded select-none">
              OOS
            </span>
          ) : cartQuantity > 0 ? (
            <div className="flex items-center h-7 sm:h-8 rounded-lg bg-primary text-white px-0.5 sm:px-1 shadow-xs font-bold text-xs select-none">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecrement(product);
                }}
                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-white/20 active:scale-90 rounded transition-all"
                aria-label={`Decrease ${product.title}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-xs px-1 min-w-[16px] text-center">
                {cartQuantity}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIncrement(product);
                }}
                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-white/20 active:scale-90 rounded transition-all"
                aria-label={`Increase ${product.title}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
              aria-label={`Add ${product.title} to cart`}
              className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary hover:text-white text-primary text-[11px] sm:text-xs font-black transition-all active:scale-95 shadow-2xs select-none flex items-center justify-center gap-0.5"
            >
              + ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Categories Inner Content                                              */
/* -------------------------------------------------------------------------- */
function CategoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get("category");
  const subParam = searchParams.get("sub");
  const productParam = searchParams.get("product");

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);

  const [categories, setCategories] = React.useState<ParentCategoryItem[]>([]);
  const [products, setProducts] = React.useState<ProductData[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [activeCatId, setActiveCatId] = React.useState<string | null>(null);
  const [activeSubId, setActiveSubId] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState("");

  // In-page product detail modal
  const [selectedProduct, setSelectedProduct] = React.useState<ProductData | null>(null);

  // Cart quantity lookup
  const cartQuantities = React.useMemo(() => {
    const q: Record<string, number> = {};
    for (const ci of cartItems) q[ci.product.id] = ci.quantity;
    return q;
  }, [cartItems]);

  // Fetch initial catalog
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

  // Sync category and subcategory from URL search params
  React.useEffect(() => {
    if (categories.length === 0) return;

    if (categoryParam) {
      const found = categories.find(
        (c) => c.slug === categoryParam || c.id === categoryParam
      );
      if (found) {
        setActiveCatId(found.id);

        if (subParam) {
          const foundSub = found.subCategories?.find(
            (s) => s.slug === subParam || s.id === subParam
          );
          setActiveSubId(foundSub ? foundSub.id : null);
        } else {
          setActiveSubId(null);
        }
      }
    } else {
      setActiveCatId(null);
      setActiveSubId(null);
    }
  }, [categoryParam, subParam, categories]);

  // Sync product modal from URL if ?product=id is present
  React.useEffect(() => {
    if (!productParam || products.length === 0) return;
    const match = products.find((p) => p.id === productParam);
    if (match) setSelectedProduct(match);
  }, [productParam, products]);

  const activeCat = categories.find((c) => c.id === activeCatId) || null;

  // Filter products for active category + subcategory + search
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

  // Open category handler
  const openCategory = (cat: ParentCategoryItem) => {
    setActiveCatId(cat.id);
    setActiveSubId(null);
    setSearchText("");
    router.push(`/categories?category=${cat.slug}`, { scroll: false });
  };

  // Back to All Categories view
  const backToAll = () => {
    setActiveCatId(null);
    setActiveSubId(null);
    setSearchText("");
    router.push("/categories", { scroll: false });
  };

  // Select subcategory handler
  const handleSelectSubcategory = (subId: string | null) => {
    setActiveSubId(subId);
    setSearchText("");
    if (!activeCat) return;
    if (subId) {
      const sub = activeCat.subCategories?.find((s) => s.id === subId);
      router.push(`/categories?category=${activeCat.slug}&sub=${sub?.slug || subId}`, {
        scroll: false,
      });
    } else {
      router.push(`/categories?category=${activeCat.slug}`, { scroll: false });
    }
  };

  /* -------------------------------------------------------------------------- */
  /* VIEW 1: CATEGORY DETAIL SPLIT-SCREEN VIEW                                  */
  /* -------------------------------------------------------------------------- */
  if (activeCat) {
    const IconComponent = CATEGORY_ICONS[activeCat.slug] || ShoppingBag;
    const subs = activeCat.subCategories ?? [];
    const catImage = getCategoryImage(activeCat, products);

    // Active subcategory name for the header above the search bar
    const activeSubName = activeSubId
      ? subs.find((s) => s.id === activeSubId)?.name || activeCat.name
      : `All ${activeCat.name}`;

    return (
      <div className="h-[100dvh] flex flex-col bg-white text-[var(--sq-ink)] font-sans overflow-hidden">
        {/* Notch / Safe Area Inset */}
        <div className="pt-[env(safe-area-inset-top,0px)] bg-white shrink-0" />

        {/* Top Header Bar: Clean & Spacious (No ETA, No Item Count, Search shifted below) */}
        <header className="shrink-0 bg-white border-b border-slate-200 z-20 shadow-2xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center gap-3">
            <button
              type="button"
              onClick={backToAll}
              aria-label="Back to all categories"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors shrink-0 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center">
                {catImage ? (
                  <img src={catImage} alt={activeCat.name} className="w-full h-full object-cover" />
                ) : (
                  <IconComponent className="w-4 h-4 text-primary" />
                )}
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 truncate leading-tight font-display">
                {activeCat.name}
              </h1>
            </div>
          </div>
        </header>

        {/* Main Docked Split-Screen: Left Rail (Subcategories) + Right Panel (Products) */}
        <div className="flex-1 min-h-0 flex overflow-hidden max-w-7xl w-full mx-auto">
          {/* LEFT RAIL: Subcategories with circular icon on top and text below */}
          <aside className="w-[78px] sm:w-[86px] md:w-28 lg:w-32 shrink-0 bg-slate-50 border-r border-slate-200/90 h-full overflow-y-auto no-scrollbar select-none py-1">
            <div className="flex flex-col space-y-0.5">
              {/* "All" Subcategory Pill */}
              <button
                type="button"
                onClick={() => handleSelectSubcategory(null)}
                className={cn(
                  "relative flex flex-col items-center justify-center py-2.5 px-1 transition-all cursor-pointer text-center",
                  activeSubId === null
                    ? "bg-white text-surface-dark font-black shadow-2xs"
                    : "text-slate-600 hover:bg-slate-200/40 font-semibold"
                )}
              >
                {/* Active Indicator Bar on right edge */}
                {activeSubId === null && (
                  <span className="absolute right-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-l-full" />
                )}

                {/* Circular Icon */}
                <div
                  className={cn(
                    "w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 mb-1 transition-transform",
                    activeSubId === null
                      ? "ring-2 ring-primary bg-white shadow-xs"
                      : "bg-white border border-slate-200/80"
                  )}
                >
                  {catImage ? (
                    <img src={catImage} alt="All" className="w-full h-full object-cover" />
                  ) : (
                    <IconComponent className="w-5 h-5 text-primary" />
                  )}
                </div>

                {/* Subcategory Label */}
                <span className="text-[10px] sm:text-[11px] leading-tight line-clamp-2 text-center break-words px-0.5 max-w-full">
                  All
                </span>
              </button>

              {/* Individual Subcategories */}
              {subs.map((sub) => {
                const active = activeSubId === sub.id;
                const subImg = getSubcategoryImage(sub, activeCat, products);

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSelectSubcategory(sub.id)}
                    className={cn(
                      "relative flex flex-col items-center justify-center py-2.5 px-1 transition-all cursor-pointer text-center",
                      active
                        ? "bg-white text-surface-dark font-black shadow-2xs"
                        : "text-slate-600 hover:bg-slate-200/40 font-semibold"
                    )}
                  >
                    {/* Active Indicator Bar on right edge */}
                    {active && (
                      <span className="absolute right-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-l-full" />
                    )}

                    {/* Circular Thumbnail Icon */}
                    <div
                      className={cn(
                        "w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 mb-1 transition-transform",
                        active
                          ? "ring-2 ring-primary bg-white shadow-xs scale-105"
                          : "bg-white border border-slate-200/80"
                      )}
                    >
                      {subImg ? (
                        <img
                          src={subImg}
                          alt={sub.name}
                          className="w-full h-full object-contain p-0.5"
                          loading="lazy"
                        />
                      ) : (
                        <IconComponent className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    {/* Subcategory Label */}
                    <span className="text-[10px] sm:text-[11px] leading-[13px] line-clamp-2 text-center break-words hyphens-auto px-0.5 w-full max-w-full overflow-hidden text-ellipsis">
                      {sub.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* RIGHT PANEL: Subcategory Name Header + Shifted Search Bar + Products Grid */}
          <main className="flex-1 min-h-0 h-full overflow-y-auto bg-slate-50/60 p-2 sm:p-4 pb-28 md:pb-12">
            {/* 1. Subcategory Name Header (Clean, No Item Count) */}
            <div className="pb-1 px-0.5">
              <h2 className="text-sm sm:text-base font-black text-slate-900 font-display">
                {activeSubName}
              </h2>
            </div>

            {/* 2. Shifted Search Bar (Positioned below the Subcategory Name) */}
            <div className="relative mt-2 mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={`Search in ${activeSubName}...`}
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs transition-all"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 3. Product Grid Content */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-60 rounded-xl bg-white animate-pulse" />
                ))}
              </div>
            ) : panelProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-3 mt-4">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No products found</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {searchText
                    ? `No items match "${searchText}" in this subcategory.`
                    : "Products will appear here as soon as they are added."}
                </p>
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="inline-flex items-center text-xs font-bold text-primary hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {panelProducts.map((p) => (
                  <SplitProductCard
                    key={p.id}
                    product={p}
                    cartQuantity={cartQuantities[p.id] || 0}
                    onAddToCart={addItem}
                    onIncrement={addItem}
                    onDecrement={(item) => removeItem(item.id)}
                    onProductClick={(item) => setSelectedProduct(item)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        {/* In-page Product Details Modal */}
        <ProductDetailModal
          product={selectedProduct}
          isOpen={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          cartQuantity={selectedProduct ? cartQuantities[selectedProduct.id] || 0 : 0}
          onAddToCart={addItem}
          onIncrement={addItem}
          onDecrement={(item) => removeItem(item.id)}
        />
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* VIEW 2: ALL CATEGORIES DIRECTORY VIEW (Theme-Dynamic, No Item Counts)      */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50/70 text-[var(--sq-ink)] font-sans pb-28 md:pb-16">
      {/* Header with Safe Area Inset */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-2xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-display">
              All Categories
            </h1>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            disabled={loading}
            aria-label="Refresh categories"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors active:scale-95"
          >
            <RefreshCw className={cn("w-4 h-4 text-slate-600", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4">
        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto mb-5">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search all categories or products..."
            className="w-full h-11 sm:h-12 pl-11 pr-10 rounded-2xl bg-white border border-slate-200 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText("")}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Grid (4 columns on mobile, 6-8 on tablet/desktop) */}
        {loading ? (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3.5 md:gap-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3.5 md:gap-4">
            {categories
              .filter((c) => {
                if (!searchText.trim()) return true;
                const q = searchText.toLowerCase();
                return (
                  c.name.toLowerCase().includes(q) ||
                  c.subCategories?.some((s) => s.name.toLowerCase().includes(q))
                );
              })
              .map((cat) => {
                const IconComponent = CATEGORY_ICONS[cat.slug] || ShoppingBag;
                const catImg = getCategoryImage(cat, products);

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => openCategory(cat)}
                    className="group flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all select-none cursor-pointer text-center"
                  >
                    {/* Thumbnail Image */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-slate-50 border border-slate-200/80 flex items-center justify-center p-1 group-hover:scale-105 transition-transform duration-200">
                      {catImg ? (
                        <img
                          src={catImg}
                          alt={cat.name}
                          className="w-full h-full object-cover rounded-lg"
                          loading="lazy"
                        />
                      ) : (
                        <IconComponent className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                      )}
                    </div>

                    {/* Category Title */}
                    <div className="w-full flex items-center justify-center min-h-[32px] mt-1.5 px-0.5">
                      <span className="block w-full text-[10px] sm:text-xs font-bold text-slate-800 line-clamp-2 leading-[13px] sm:leading-[15px] text-center break-words hyphens-auto group-hover:text-primary transition-colors">
                        {cat.name}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs font-bold text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page Export with Suspense Boundary                                         */
/* -------------------------------------------------------------------------- */
export default function CategoriesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-bold">Loading categories...</span>
          </div>
        </div>
      }
    >
      <CategoriesContent />
    </React.Suspense>
  );
}
