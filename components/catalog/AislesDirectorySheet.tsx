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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LayoutGrid,
  Search,
  Zap,
  ChevronRight,
  Milk,
  Cookie,
  CupSoda,
  UtensilsCrossed,
  Apple,
  Coffee,
  Heart,
  Baby,
  Flame,
  Layers,
  ShoppingBag,
} from "lucide-react";
import { ParentCategoryItem } from "./CategoryNav";

interface AislesDirectorySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories?: ParentCategoryItem[];
  activeCategorySlug?: string;
  activeSubSlug?: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] sm:h-[80vh] rounded-t-[32px] p-0 flex flex-col bg-slate-50 border-t border-slate-200 overflow-hidden shadow-2xl"
      >
        {/* Grab Handle */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 pb-3 border-b border-slate-200 bg-white shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-black text-slate-950 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" />
                <span>Store Aisles & Categories</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 mt-0.5">
                Quickly browse our full Ambikapur dark store inventory
              </SheetDescription>
            </div>
            <Badge
              variant="accent"
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border-emerald-300"
            >
              <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              10-15m
            </Badge>
          </div>

          {/* Quick Filter Search Input inside Aisle Sheet */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter aisles (e.g. Dairy, Snacks, Cold Drinks)..."
              className="w-full h-10 pl-10 pr-4 bg-slate-50 border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Scrollable Aisles List & Subcategory Chips */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pb-20">
          {/* Top All-Catalog Option */}
          <button
            type="button"
            onClick={() => handleSelectAisle("all")}
            className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all group ${
              activeCategorySlug === "all" || !activeCategorySlug
                ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                : "bg-white text-slate-900 border-slate-200 hover:border-primary/50 hover:bg-emerald-50/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  activeCategorySlug === "all" || !activeCategorySlug
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black tracking-tight">All Catalog Aisles</div>
                <div
                  className={`text-xs ${
                    activeCategorySlug === "all" || !activeCategorySlug
                      ? "text-emerald-100"
                      : "text-slate-500"
                  }`}
                >
                  Browse all 18+ dark store items without filter
                </div>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                activeCategorySlug === "all" || !activeCategorySlug
                  ? "text-white"
                  : "text-slate-400"
              }`}
            />
          </button>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
              <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No matching aisles found</p>
              <p className="text-xs text-slate-400 mt-1">Try another search keyword</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCategories.map((cat) => {
                const IconComponent = CATEGORY_ICONS[cat.slug] || Layers;
                const isCatActive = activeCategorySlug === cat.slug;

                return (
                  <div
                    key={cat.id}
                    className={`rounded-2xl border bg-white p-4 transition-all shadow-xs ${
                      isCatActive
                        ? "border-primary ring-2 ring-primary/20 bg-emerald-50/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Parent Category Header */}
                    <div
                      onClick={() => handleSelectAisle(cat.slug)}
                      className="flex items-center justify-between cursor-pointer group pb-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-primary transition-colors">
                            {cat.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {cat.subCategories?.length || 0} Sub-aisles
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                    </div>

                    {/* Subcategories Chip List */}
                    {cat.subCategories && cat.subCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 mt-2">
                        {cat.subCategories.map((sub) => {
                          const isSubActive = isCatActive && activeSubSlug === sub.slug;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAisle(cat.slug, sub.slug);
                              }}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                                isSubActive
                                  ? "bg-primary text-white border-primary shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-950"
                              }`}
                            >
                              {sub.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
