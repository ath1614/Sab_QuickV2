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
import { CategoriesDirectory } from "@/components/catalog/CategoriesDirectory";
import { ParentCategoryItem } from "@/components/catalog/CategoryNav";
import { ProductCard, ProductData } from "@/components/catalog/ProductCard";
import { ProductDetailModal } from "@/components/catalog/ProductDetailModal";
import { AisleProductRow } from "@/components/catalog/AisleProductRow";
import { SearchBar } from "@/components/catalog/SearchBar";
import { useCartStore } from "@/store/useCartStore";
import { Logo } from "@/components/brand/Logo";
import { SplashScreen } from "@/components/brand/SplashScreen";
import { CustomLoadingScreen } from "@/components/ui/CustomLoadingScreen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { ComingSoonView } from "@/components/store/ComingSoonView";

interface ThemeInfo {
  themeName: string;
  primaryColor: string;
  accentColor: string;
  saleTagText: string;
  bannerImageUrl?: string | null;
  isStoreLive?: boolean;
  launchDate?: string | null;
}

// Maximum cards mounted per rail on the home feed (per-card images dominate
// initial payload; longer lists are available via "See All").
const MAX_RAIL_PRODUCTS = 6;

function StorefrontContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [forcePreview, setForcePreview] = React.useState(false);

  const userRole = session?.user?.role;
  const userRoles: string[] =
    (session?.user as any)?.roles?.length
      ? (session?.user as any).roles
      : [userRole];
  const isStaffOrReviewer =
    userRoles.some((r) => ["OWNER", "MANAGER", "PACKER", "RIDER"].includes(r)) ||
    (session?.user as any)?.phone === "9999999999";

  // URL state
  const categoryParam = searchParams.get("category") || "all";
  const subParam = searchParams.get("sub") || undefined;
  const initialSearch = searchParams.get("search") || "";

  // Data state
  const [theme, setTheme] = React.useState<ThemeInfo>({
    themeName: "Forest Speed (Standard)",
    primaryColor: "#0B6E4F",
    accentColor: "#00C853",
    saleTagText: "⚡ Superfast Delivery Guarantee",
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

  // Deep link: /?product=<id> opens the detail modal (used by the
  // Categories page so "View details" works from there).
  const productParam = searchParams.get("product");
  const productParamHandled = React.useRef(false);
  React.useEffect(() => {
    if (!productParam || productParamHandled.current) return;
    if (products.length === 0) return;
    const target = products.find((p) => p.id === productParam);
    if (target) {
      productParamHandled.current = true;
      handleProductClick(target);
      const url = new URL(window.location.href);
      url.searchParams.delete("product");
      window.history.replaceState({}, "", url.toString());
    }
  }, [productParam, products]);

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

  // Live product counts per parent category (for the 3x3 category grid tiles)
  const categoryProductCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((cat) => {
      counts[cat.id] = products.filter(
        (p) =>
          p.category?.id === cat.id ||
          (p.category?.id && cat.subCategories?.some((s) => s.id === p.category?.id))
      ).length;
    });
    return counts;
  }, [categories, products]);

  // Grouped Aisles for "All Fresh Dark Store Catalog" with Smart Subcategory Balancing
  const groupedAisles = React.useMemo(() => {
    if (categoryParam !== "all" || activeSearch.trim() !== "") {
      return [];
    }

    interface CategoryGroup {
      id: string;
      name: string;
      slug: string;
      imageUrl?: string | null;
      subCategoryBuckets: Map<string, ProductData[]>;
      directProducts: ProductData[];
    }

    const groupMap = new Map<string, CategoryGroup>();

    // 1. Initialize groups with parent categories in displayRank order
    categories.forEach((cat) => {
      const bucketMap = new Map<string, ProductData[]>();
      // Pre-seed subcategory buckets in subcategory displayRank order
      (cat.subCategories || []).forEach((sub) => {
        bucketMap.set(sub.id, []);
      });

      groupMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        imageUrl: cat.imageUrl,
        subCategoryBuckets: bucketMap,
        directProducts: [],
      });
    });

    // 2. Distribute products into their respective parent & subcategory buckets
    products.forEach((prod) => {
      const catId = prod.category?.id;
      if (!catId) return;

      // Case A: Product is assigned directly to a parent category
      if (groupMap.has(catId)) {
        groupMap.get(catId)!.directProducts.push(prod);
        return;
      }

      // Case B: Product belongs to a subcategory under a known parent
      let assigned = false;
      for (const parent of categories) {
        if (parent.subCategories?.some((s) => s.id === catId)) {
          const group = groupMap.get(parent.id);
          if (group) {
            if (!group.subCategoryBuckets.has(catId)) {
              group.subCategoryBuckets.set(catId, []);
            }
            group.subCategoryBuckets.get(catId)!.push(prod);
            assigned = true;
          }
          break;
        }
      }

      // Case C: Fallback standalone category not in parent list
      if (!assigned && prod.category) {
        if (!groupMap.has(prod.category.id)) {
          groupMap.set(prod.category.id, {
            id: prod.category.id,
            name: prod.category.name,
            slug: prod.category.slug,
            imageUrl: null,
            subCategoryBuckets: new Map(),
            directProducts: [],
          });
        }
        groupMap.get(prod.category.id)!.directProducts.push(prod);
      }
    });

    // 3. Assemble balanced product rails via round-robin across subcategories
    const result: {
      id: string;
      name: string;
      slug: string;
      imageUrl?: string | null;
      products: ProductData[];
    }[] = [];

    groupMap.forEach((group) => {
      const balancedProducts: ProductData[] = [];
      const seenProductIds = new Set<string>();

      // Collect all subcategory buckets that have products
      const activeBuckets: ProductData[][] = [];
      group.subCategoryBuckets.forEach((bucket) => {
        if (bucket.length > 0) activeBuckets.push([...bucket]);
      });

      // If there are direct products, add them as an extra bucket
      if (group.directProducts.length > 0) {
        activeBuckets.push([...group.directProducts]);
      }

      // Round-robin selection: pick 1 product from each subcategory in turn
      let hasMore = true;
      while (hasMore && balancedProducts.length < MAX_RAIL_PRODUCTS) {
        hasMore = false;
        for (const bucket of activeBuckets) {
          if (bucket.length > 0 && balancedProducts.length < MAX_RAIL_PRODUCTS) {
            const nextProd = bucket.shift()!;
            if (!seenProductIds.has(nextProd.id)) {
              seenProductIds.add(nextProd.id);
              balancedProducts.push(nextProd);
            }
            if (bucket.length > 0) hasMore = true;
          }
        }
      }

      if (balancedProducts.length > 0) {
        result.push({
          id: group.id,
          name: group.name,
          slug: group.slug,
          imageUrl: group.imageUrl,
          products: balancedProducts,
        });
      }
    });

    return result;
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

  const isPreLaunchMode = theme.isStoreLive === false;

  if (isPreLaunchMode && !isStaffOrReviewer && !forcePreview) {
    return (
      <>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        <ComingSoonView
          launchDate={theme.launchDate}
          onEnterPreview={() => setForcePreview(true)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-surface-dark font-sans selection:bg-primary selection:text-white">
      {/* Animated SabQuick Initial Splash Screen */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Pre-launch Staff Preview Banner */}
      {isPreLaunchMode && (
        <div className="bg-amber-400 border-b border-amber-500 text-amber-950 px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-900" />
            <span>
              <strong>PRE-LAUNCH PREVIEW MODE:</strong> The public storefront is currently in Coming Soon mode. You are viewing preview as staff/reviewer.
            </span>
          </div>
          {userRoles.includes("OWNER") && (
            <Link
              href="/owner"
              className="bg-amber-950 hover:bg-black text-white px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors shrink-0 shadow-xs"
            >
              Owner Hub &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Main Authenticated Navbar */}
      <Navbar
        searchQuery={activeSearch}
        onSearchChange={setActiveSearch}
      />

      {/* Category browsing lives on the Categories tab/page; the sticky
          top nav pill row was removed per product decision. */}

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

        {/* Dynamic Seasonal Marketing Hero Banner — palette + image both resolve
            from the theme engine (live campaign > manual pin > brand default).
            Mobile diet: ~34% of viewport (was 46%) so products stay above the fold. */}
        <section
          className="relative z-30 rounded-3xl bg-surface-dark bg-gradient-to-r from-primary via-[#064E3B] to-slate-900 text-white p-4 sm:p-8 shadow-xl border border-white/10"
          style={
            theme.bannerImageUrl
              ? {
                  backgroundImage: `linear-gradient(to right, rgba(4,36,28,0.86), rgba(4,36,28,0.55) 55%, rgba(4,36,28,0.35)), url(${theme.bannerImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {/* Background Ambient Circles (Clipped within card bounds) */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary-accent/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div className="space-y-2 sm:space-y-3 max-w-xl">
              <div className="flex items-center gap-2.5">
                <Badge
                  variant="accent"
                  className="gap-1.5 uppercase font-black tracking-wider text-[10px] sm:text-[11px] py-0.5 sm:py-1 px-2 sm:px-3 bg-primary-accent text-surface-dark shadow-sm"
                >
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-surface-dark" />
                  Superfast Delivery
                </Badge>
              </div>
              <h1 className="text-lg sm:text-3xl md:text-4xl font-display font-bold tracking-tight leading-tight text-white drop-shadow-md line-clamp-2">
                {theme.saleTagText}
              </h1>
              <p className="hidden sm:block text-xs md:text-sm text-emerald-100/90 leading-relaxed font-medium drop-shadow-xs max-w-lg">
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

        {/* Categories directory: high-density grid linking to /categories */}
        {categoryParam === "all" && !activeSearch && (
          <CategoriesDirectory
            categories={categories}
            productCounts={categoryProductCounts}
          />
        )}

        {/* Active Search / Category Filter Header */}
        <div id="product-grid" className="flex items-center justify-between border-b border-border-subtle pb-3 scroll-mt-24">
          <div>
            <h2 className="text-lg font-black text-surface-dark flex items-center gap-2">
              <span>
                {activeSearch
                  ? `Search results for "${activeSearch}"`
                  : subParam
                    ? `Category: ${subParam.replace(/-/g, " ").toUpperCase()}`
                    : categoryParam !== "all"
                      ? `Category: ${categoryParam.replace(/-/g, " ").toUpperCase()}`
                      : "All Fresh Dark Store Catalog"}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Superfast doorstep delivery within your 2.5 km geofence.
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
              Browse the Full Catalog
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
                onSeeAll={(slug) => router.push(`/categories?category=${slug}`)}
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

      {/* Slide-Over Quick Cart Drawer — now global (layout.tsx) */}

      {/* Blinkit-Style Floating Cart Pill — now global (layout.tsx) */}

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

      {/* Store Footer & Legal Disclosures (Visible on Web View, Hidden on Mobile App Screens) */}
      <footer className="hidden md:block mt-16 sm:mt-20 border-t border-border-subtle bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground border-b border-slate-100 pb-6">
            <div className="flex items-center space-x-2.5">
              <Logo variant="icon" size={28} className="rounded-lg shrink-0" />
              <div>
                <span className="font-extrabold text-surface-dark block text-sm">SabQuick</span>
                <span className="text-[11px] text-slate-500">Hyper-Local Superfast Grocery Fulfillment &bull; Ambikapur, Chhattisgarh</span>
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
            <span>&copy; {new Date().getFullYear()} SabQuick. All rights reserved. Registered Indian MSME.</span>
            <span>Customer Support: sabsupermart68@gmail.com | +91 9109066668</span>
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
