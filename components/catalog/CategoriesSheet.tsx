"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { LayoutGrid } from "lucide-react";
import { ParentCategoryItem } from "./CategoryNav";
import { ProductData } from "./ProductCard";
import { CategoriesDirectory } from "./CategoriesDirectory";
import { useCartStore } from "@/store/useCartStore";

interface CategoriesSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Bottom-nav "Categories" sheet — hosts the new circle-grid Categories
 * Directory (mobile-app parity). Tapping a circle opens the subcategory
 * panel with items; "View all" deep-links into the filtered grid.
 */
export function CategoriesSheet({ isOpen, onOpenChange }: CategoriesSheetProps) {
  const [categories, setCategories] = React.useState<ParentCategoryItem[]>([]);
  const [products, setProducts] = React.useState<ProductData[]>([]);
  const [loading, setLoading] = React.useState(false);

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);

  const cartQuantities = React.useMemo(() => {
    const q: Record<string, number> = {};
    for (const ci of cartItems) q[ci.product.id] = ci.quantity;
    return q;
  }, [cartItems]);

  React.useEffect(() => {
    if (!isOpen || categories.length > 0) return;
    setLoading(true);
    Promise.all([
      fetch("/api/categories").then((r) => (r.ok ? r.json() : { categories: [] })),
      fetch("/api/products").then((r) => (r.ok ? r.json() : { products: [] })),
    ])
      .then(([catData, prodData]) => {
        setCategories(catData.categories || []);
        setProducts(prodData.products || []);
      })
      .catch((err) => console.warn("CategoriesSheet load failed:", err))
      .finally(() => setLoading(false));
  }, [isOpen, categories.length]);

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

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[88vh] p-0 rounded-t-3xl bg-[var(--sq-fog)] flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
          <SheetTitle className="text-lg font-black text-[var(--sq-ink)] flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <span>Categories</span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Browse the store by category and subcategory
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {loading ? (
            <div className="grid grid-cols-3 gap-3 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-[var(--sq-radius-md)] bg-white animate-pulse"
                />
              ))}
            </div>
          ) : (
            <CategoriesDirectory
              categories={categories}
              productCounts={productCounts}
              products={products}
              cartQuantities={cartQuantities}
              onAddToCart={addItem}
              onIncrement={addItem}
              onDecrement={(p) => removeItem(p.id)}
              onProductClick={() => {
                // Detail modal lives on the page; close the sheet so the
                // page's modal is visible after navigation.
                onOpenChange(false);
              }}
              onSelectCategory={() => {
                onOpenChange(false);
                // Deep-link to the home filtered grid.
                window.location.href = "/";
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
