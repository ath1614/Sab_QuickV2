"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Zap,
  ShoppingBag,
  Clock,
  Sparkles,
  Layers,
  Database,
  Server,
  CheckCircle2,
  AlertCircle,
  Truck,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { CategoryNav, ParentCategoryItem } from "@/components/catalog/CategoryNav";
import { ProductCard, ProductData } from "@/components/catalog/ProductCard";
import { ProductDetailModal } from "@/components/catalog/ProductDetailModal";
import { AisleProductRow } from "@/components/catalog/AisleProductRow";
import { SearchBar } from "@/components/catalog/SearchBar";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCartStore } from "@/store/useCartStore";
import { Logo } from "@/components/brand/Logo";
import { SplashScreen } from "@/components/brand/SplashScreen";
import { CustomLoadingScreen } from "@/components/ui/CustomLoadingScreen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface ThemeInfo {
  themeName: string;
  primaryColor: string;
  accentColor: string;
  saleTagText: string;
  bannerImageUrl?: string | null;
}

function StorefrontContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const categoryParam = searchParams.get("category") || "all";
  const subParam = searchParams.get("sub") || undefined;
  const initialSearch = searchParams.get("search") || "";

  // Data state
  const [theme, setTheme] = React.useState<ThemeInfo>({
    themeName: "Forest Speed (Standard)",
    primaryColor: "#0B6E4F",
    accentColor: "#00C853",
    saleTagText: "⚡ 10-15 Min Delivery Guarantee",
  });
  const [categories, setCategories] = React.useState<ParentCategoryItem[]>([]);
  const [products, setProducts] = React.useState<ProductData[]>([]);
  const [activeSearch, setActiveSearch] = React.useState<string>(initialSearch);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState<boolean>(true);

  // Product Detail Modal State
  const [selectedProduct, setSelectedProduct] = React.useState<ProductData | null>(null);
  const [productDetailModalOpen, setProductDetailModalOpen] = React.useState<boolean>(false);

  const handleProductClick = (product: ProductData) => {
    setSelectedProduct(product);
    setProductDetailModalOpen(true);
  };

  // Cart store
  const { items: cartItems, addItem, removeItem, openCart } = useCartStore();
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Cart Quantities Lookup
  const cartQuantities = React.useMemo(() => {
    const qMap: Record<string, number> = {};
    cartItems.forEach((ci) => {
      qMap[ci.product.id] = ci.quantity;
    });
    return qMap;
  }, [cartItems]);

  // Grouped Aisles for "All Fresh Dark Store Catalog"
  const groupedAisles = React.useMemo(() => {
    if (categoryParam !== "all" || activeSearch.trim() !== "") {
      return [];
    }

    const map = new Map<
      string,
      {
        id: string;
        name: string;
        slug: string;
        imageUrl?: string | null;
        products: ProductData[];
      }
    >();

    // Seed map with categories in displayRank order
    categories.forEach((cat) => {
      map.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        imageUrl: cat.imageUrl,
        products: [],
      });
    });

    products.forEach((prod) => {
      const catId = prod.category?.id;
      if (catId && map.has(catId)) {
        map.get(catId)!.products.push(prod);
      } else {
        // Check if prod belongs to a subcategory whose parent is in map
        let assigned = false;
        for (const parent of categories) {
          if (parent.subCategories?.some((s) => s.id === catId)) {
            map.get(parent.id)?.products.push(prod);
            assigned = true;
            break;
          }
        }
        if (!assigned && prod.category) {
          if (!map.has(prod.category.id)) {
            map.set(prod.category.id, {
              id: prod.category.id,
              name: prod.category.name,
              slug: prod.category.slug,
              products: [],
            });
          }
          map.get(prod.category.id)!.products.push(prod);
        }
      }
    });

    return Array.from(map.values()).filter((g) => g.products.length > 0);
  }, [categories, products, categoryParam, activeSearch]);

  // Cold-start splash screen runs only once per session
  const [showSplash, setShowSplash] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const alreadyShown = sessionStorage.getItem("sq_splash_seen");
      if (!alreadyShown) {
        setShowSplash(true);
        sessionStorage.setItem("sq_splash_seen", "true");
      }
    }
  }, []);

  // 1. Fetch Theme & Categories
  React.useEffect(() => {
    async function loadMetadata() {
      try {
        const [themeRes, catRes] = await Promise.all([
          fetch("/api/theme"),
          fetch("/api/categories"),
        ]);

        if (themeRes.ok) {
          const themeData = await themeRes.json();
          setTheme(themeData);
        }

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }
      } catch (err) {
        console.warn("Failed to load store metadata:", err);
      }
    }

    loadMetadata();

    // Check auth_error query param
    const err = searchParams.get("auth_error");
    if (err) {
      if (err === "unauthorized_role") {
        const role = searchParams.get("role") || "Current Role";
        setAuthError(`Access Denied: Your role (${role}) is not authorized to access internal staff portals.`);
      } else if (err === "unauthenticated") {
        setAuthError("Please log in to access staff portals.");
      }
    }
  }, [searchParams]);

  // Synchronize activeSearch if URL query param changes
  React.useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    setActiveSearch(urlSearch);
  }, [searchParams]);

  // 2. Fetch Products based on Category & Search
  React.useEffect(() => {
    async function loadProducts() {
      setIsLoadingProducts(true);
      try {
        // When searching, bypass category scoping so user can find items across the entire catalog
        const hasSearch = Boolean(activeSearch && activeSearch.trim().length > 0);
        const targetCategory = hasSearch
          ? ""
          : (subParam || (categoryParam !== "all" ? categoryParam : ""));

        const queryParams = new URLSearchParams();

        if (targetCategory) {
          queryParams.set("categoryId", targetCategory);
        }
        if (hasSearch) {
          queryParams.set("search", activeSearch.trim());
        }

        const url = `/api/products${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
        const res = await fetch(url);

        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    loadProducts();
  }, [categoryParam, subParam, activeSearch]);

  // Category navigation selector
  const handleSelectCategory = (catSlug: string, subSlug?: string) => {
    const params = new URLSearchParams();
    if (catSlug && catSlug !== "all") {
      params.set("category", catSlug);
    }
    if (subSlug && subSlug !== "all") {
      params.set("sub", subSlug);
    }
    // Clear search on category click
    setActiveSearch("");

    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/");
  };

  // Search submission
  const handleSearchSubmit = (query: string) => {
    const trimmed = query.trim();
    setActiveSearch(trimmed);
    const params = new URLSearchParams();
    if (trimmed) {
      params.set("search", trimmed);
    }
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/");

    // Smooth scroll down to products
    setTimeout(() => {
      const el = document.getElementById("product-grid");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-surface-dark font-sans selection:bg-primary selection:text-white">
      {/* Animated SabQuick Initial Splash Screen */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Main Authenticated Navbar */}
      <Navbar
        searchQuery={activeSearch}
        onSearchChange={setActiveSearch}
      />

      {/* Sticky Two-Tier Category Navigation */}
      <div id="category-nav">
        <CategoryNav
          categories={categories}
          activeCategorySlug={categoryParam}
          activeSubSlug={subParam}
          onSelectCategory={handleSelectCategory}
        />
      </div>

      {/* Main Storefront Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-32 md:pb-12 space-y-6">
        {/* Auth Error Banner (if unauthorized route requested) */}
        {authError && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
              <span className="font-semibold">{authError}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuthError(null)}
              className="text-xs text-amber-800 hover:bg-amber-100 font-bold"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Dynamic Seasonal Marketing Hero Banner */}
        <section className="relative z-30 rounded-3xl bg-surface-dark bg-gradient-to-r from-primary via-[#064E3B] to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-white/10">
          {/* Background Ambient Circles (Clipped within card bounds) */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary-accent/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2.5">
                <Badge
                  variant="accent"
                  className="gap-1.5 uppercase font-black tracking-wider text-[11px] py-1 px-3 bg-primary-accent text-surface-dark shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 fill-surface-dark" />
                  10-15 Min Delivery
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-md">
                {theme.saleTagText}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium drop-shadow-xs max-w-lg">
                Fresh milk, dairy staples, farm produce, and midnight munchies dispatched from our Ambikapur dark store within minutes.
              </p>
            </div>

            {/* Live SearchBar Integrated into Hero */}
            <div className="w-full md:w-auto md:min-w-[360px] lg:min-w-[440px]">
              <SearchBar
                initialQuery={activeSearch}
                onSearchSubmit={handleSearchSubmit}
                onAddToCart={addItem}
                placeholder="Search milk, bread, chips, colas..."
              />
            </div>
          </div>
        </section>

        {/* Active Search / Category Filter Header */}
        <div id="product-grid" className="flex items-center justify-between border-b border-border-subtle pb-3 scroll-mt-24">
          <div>
            <h2 className="text-lg font-black text-surface-dark flex items-center gap-2">
              <span>
                {activeSearch
                  ? `Search results for "${activeSearch}"`
                  : subParam
                  ? `Aisle: ${subParam.replace(/-/g, " ").toUpperCase()}`
                  : categoryParam !== "all"
                  ? `Category: ${categoryParam.replace(/-/g, " ").toUpperCase()}`
                  : "All Fresh Dark Store Catalog"}
              </span>
              <Badge variant="outline" className="text-xs font-mono font-bold">
                {products.length} Items
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Guaranteed 10-15 minute doorstep delivery within your 2.5 km geofence.
            </p>
          </div>

          {activeSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearchSubmit("")}
              className="text-xs text-primary underline"
            >
              Clear Search
            </Button>
          )}
        </div>

        {/* High-Density Product Grid */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-border-subtle p-3.5 bg-white space-y-3">
                <Skeleton className="w-full aspect-square rounded-xl" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-border-subtle p-8 space-y-4">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-surface-dark">No products found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                We couldn&apos;t find any grocery items matching your current filter. Try browsing other aisles or clearing search.
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleSelectCategory("all")}
              className="rounded-xl font-bold"
            >
              View All 18 Catalog Items
            </Button>
          </div>
        ) : groupedAisles.length > 0 ? (
          <div className="space-y-10">
            {groupedAisles.map((group) => (
              <AisleProductRow
                key={group.id}
                categoryTitle={group.name}
                categorySlug={group.slug}
                categoryImageUrl={group.imageUrl}
                products={group.products}
                cartQuantities={cartQuantities}
                onAddToCart={addItem}
                onIncrement={addItem}
                onDecrement={(p) => removeItem(p.id)}
                onProductClick={handleProductClick}
                onSeeAll={(slug) => handleSelectCategory(slug)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {products.map((product) => {
              const itemInCart = cartItems.find(
                (ci) => ci.product.id === product.id
              );
              const cartQuantity = itemInCart ? itemInCart.quantity : 0;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartQuantity={cartQuantity}
                  onAddToCart={addItem}
                  onIncrement={addItem}
                  onDecrement={(p) => removeItem(p.id)}
                  onProductClick={handleProductClick}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Slide-Over Quick Cart Drawer */}
      <CartDrawer />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={productDetailModalOpen}
        onClose={() => setProductDetailModalOpen(false)}
        cartQuantity={selectedProduct ? cartQuantities[selectedProduct.id] || 0 : 0}
        onAddToCart={addItem}
        onIncrement={addItem}
        onDecrement={(p) => removeItem(p.id)}
      />

      {/* Store Footer & Legal Disclosures (Mandatory for App Store & Play Store Compliance) */}
      <footer className="mt-16 sm:mt-20 border-t border-border-subtle bg-white py-10 pb-28 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground border-b border-slate-100 pb-6">
            <div className="flex items-center space-x-2.5">
              <Logo variant="icon" size={28} className="rounded-lg shrink-0" />
              <div>
                <span className="font-extrabold text-surface-dark block text-sm">SabQuick Technologies</span>
                <span className="text-[11px] text-slate-500">Hyper-Local 10-15 Min Grocery Fulfillment &bull; Ambikapur, Chhattisgarh</span>
              </div>
            </div>

            {/* Legal & App Store Compliance Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-semibold text-slate-600">
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link href="/refund" className="hover:text-primary transition-colors">
                Refund &amp; Cancellation
              </Link>
              <Link href="/delete-account" className="hover:text-rose-600 transition-colors">
                Delete Account
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <span>&copy; {new Date().getFullYear()} SabQuick Retail. All rights reserved. Registered Indian MSME.</span>
            <span>Customer Support: contact@sabquick.com | +91 9109066668</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <React.Suspense fallback={<CustomLoadingScreen message="Loading SabQuick Catalog..." />}>
      <StorefrontContent />
    </React.Suspense>
  );
}
