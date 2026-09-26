"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  LayoutGrid,
  Search,
  ChevronRight,
  ShoppingBag,
  Layers,
} from "lucide-react";
import { CATEGORY_ICONS, ParentCategoryItem } from "./CategoryNav";
import { cn } from "@/lib/utils";

interface AislesDirectorySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories?: ParentCategoryItem[];
  activeCategorySlug?: string;
  activeSubSlug?: string;
}

/**
 * Blinkit-style LEFT-DRAWER aisle explorer.
 *
 * Layout: a full-height drawer sliding in from the left with
 *   - a sticky left rail of parent aisles (active aisle highlighted),
 *   - a right pane showing the selected parent's subcategories as a
 *     responsive tile grid (3 columns), plus "Shop all {parent}".
 */
export function AislesDirectorySheet({
  isOpen,
  onOpenChange,
  categories: initialCategories,
  activeCategorySlug,
  activeSubSlug,
}: AislesDirectorySheetProps) {
  const router = useRouter();
  const [categories, setCategories] = React.useState<ParentCategoryItem[]>(initialCategories || []);
  const [searchFilter, setSearchFilter] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Track the parent being previewed in the right pane. Defaults to the
  // currently-active parent (or the first one).
  const [previewSlug, setPreviewSlug] = React.useState<string | null>(null);

  // Fetch categories if not passed or empty
  React.useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
      return;
    }

    if (isOpen && categories.length === 0) {
      setIsLoading(true);
      fetch("/api/categories")
        .then((res) => res.json())
        .then((data) => {
          setCategories(data.categories || []);
        })
        .catch((err) => console.warn("Failed to load categories in Aisles sheet:", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, initialCategories, categories.length]);

  // (Re)select the previewed parent whenever the drawer opens.
  React.useEffect(() => {
    if (!isOpen) return;
    const active =
      categories.find((c) => c.slug === activeCategorySlug) ||
      categories.find((c) => c.slug === previewSlug) ||
      categories[0];
    setPreviewSlug(active ? active.slug : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, categories]);

  const previewedParent = categories.find((c) => c.slug === previewSlug) || null;

  const handleSelectAisle = (categorySlug: string, subCategorySlug?: string) => {
    onOpenChange(false);

    const params = new URLSearchParams();
    if (categorySlug && categorySlug !== "all") {
      params.set("category", categorySlug);
    }
    if (subCategorySlug && subCategorySlug !== "all") {
      params.set("sub", subCategorySlug);
    }

    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/");

    // Smooth scroll down to products
    setTimeout(() => {
      const el = document.getElementById("product-grid");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  };

  // Filter categories by search term
  const filteredCategories = React.useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((cat) => {
      const matchesParent = cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q);
      const matchesSub = cat.subCategories?.some(
        (sub) => sub.name.toLowerCase().includes(q) || sub.slug.toLowerCase().includes(q)
      );
      return matchesParent || matchesSub;
    });
  }, [categories, searchFilter]);

  // Keep the preview valid when the filter hides the previewed parent.
  React.useEffect(() => {
    if (previewSlug && !filteredCategories.some((c) => c.slug === previewSlug)) {
      setPreviewSlug(filteredCategories[0]?.slug ?? null);
    }
  }, [filteredCategories, previewSlug]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[88%] sm:max-w-md p-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden shadow-2xl"
      >
        {/* Drawer Header */}
        <SheetHeader className="px-4 pt-5 pb-3 border-b border-slate-100 shrink-0 space-y-3">
          <SheetTitle className="text-lg font-black text-slate-950 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <span>All Aisles</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500 sr-only">
            Browse the full SabQuick dark store inventory by aisle
          </SheetDescription>

          {/* Quick Filter Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search aisles (e.g. Dairy, Snacks)..."
              className="w-full h-10 pl-10 pr-4 bg-slate-50 border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary"
            />
          </div>
        </SheetHeader>

        {/* Two-Pane Explorer Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Rail: Parent Aisles */}
          <nav
            aria-label="Parent aisles"
            className="w-[38%] max-w-[190px] shrink-0 bg-slate-50 border-r border-slate-100 overflow-y-auto py-2"
          >
            {/* All Catalog option */}
            <button
              type="button"
              onClick={() => handleSelectAisle("all")}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-3 text-left border-l-4 transition-all",
                activeCategorySlug === "all" || !activeCategorySlug
                  ? "bg-white border-primary text-slate-950"
                  : "border-transparent text-slate-600 hover:bg-white/60"
              )}
            >
              <ShoppingBag className="w-5 h-5 text-primary shrink-0" />
              <span className="text-xs font-bold leading-tight">All Products</span>
            </button>

            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 mx-2 my-1 bg-white rounded-xl animate-pulse" />
              ))}

            {filteredCategories.map((cat) => {
              const IconComponent = CATEGORY_ICONS[cat.slug] || Layers;
              const isActive = previewSlug === cat.slug || activeCategorySlug === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setPreviewSlug(cat.slug)}
                  onDoubleClick={() => handleSelectAisle(cat.slug)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-3 text-left border-l-4 transition-all",
                    isActive
                      ? "bg-white border-primary text-slate-950"
                      : "border-transparent text-slate-600 hover:bg-white/60"
                  )}
                >
                  <IconComponent
                    className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-slate-400")}
                  />
                  <span className="text-xs font-bold leading-tight line-clamp-2">{cat.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Pane: Subcategory Tile Grid */}
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            {!previewedParent ? (
              <div className="text-center py-12 text-slate-400">
                <Layers className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs font-semibold">Select an aisle to browse</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Shop-all-parent card */}
                <button
                  type="button"
                  onClick={() => handleSelectAisle(previewedParent.slug)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-primary text-white shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  <div className="text-left">
                    <div className="text-sm font-black tracking-tight">
                      Shop all {previewedParent.name}
                    </div>
                    <div className="text-[11px] text-emerald-100">
                      {previewedParent.subCategories?.length || 0} sub-aisles
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Subcategory tiles (3-col grid, Blinkit style) */}
                <div className="grid grid-cols-3 gap-2">
                  {previewedParent.subCategories?.map((sub) => {
                    const isSubActive =
                      activeCategorySlug === previewedParent.slug && activeSubSlug === sub.slug;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelectAisle(previewedParent.slug, sub.slug)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 aspect-square rounded-2xl border p-2 text-center transition-all active:scale-[0.96]",
                          isSubActive
                            ? "border-primary bg-emerald-50 ring-1 ring-primary/30"
                            : "border-slate-200 bg-white hover:border-primary/40 hover:bg-emerald-50/40"
                        )}
                      >
                        <span className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-3">
                          {sub.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
