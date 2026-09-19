/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FolderTree,
  Plus,
  ChevronRight,
  ChevronDown,
  Layers,
  Package,
  Sparkles,
  Search,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  Zap,
  TrendingDown,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";

interface ProductData {
  id: string;
  title: string;
  slug: string;
  mrp: number;
  salePrice: number;
  unitQuantity: string;
  stockCount: number;
  isAvailable: boolean;
  imageUrl: string;
  tags: string[];
  description?: string | null;
  categoryId: string;
}

interface SubCategoryData {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  parentId: string | null;
  products: ProductData[];
  _count?: {
    products: number;
  };
}

interface ParentCategoryData {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  parentId: string | null;
  subCategories: SubCategoryData[];
  products: ProductData[];
  _count?: {
    products: number;
    subCategories: number;
  };
}

export default function OwnerCatalogPage() {
  const { data: session, status } = useSession();

  const [categories, setCategories] = React.useState<ParentCategoryData[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Tree View Expand/Collapse state
  const [expandedParents, setExpandedParents] = React.useState<Record<string, boolean>>({});
  const [selectedSubcategory, setSelectedSubcategory] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Modals state
  const [parentModalOpen, setParentModalOpen] = React.useState<boolean>(false);
  const [subModalOpen, setSubModalOpen] = React.useState<boolean>(false);
  const [productModalOpen, setProductModalOpen] = React.useState<boolean>(false);
  const [editProductModalOpen, setEditProductModalOpen] = React.useState<boolean>(false);

  // Add Parent Category Form
  const [parentName, setParentName] = React.useState("");
  const [parentSlug, setParentSlug] = React.useState("");
  const [parentImage, setParentImage] = React.useState("");

  // Add Subcategory Form
  const [subParentId, setSubParentId] = React.useState("");
  const [subName, setSubName] = React.useState("");
  const [subSlug, setSubSlug] = React.useState("");
  const [subImage, setSubImage] = React.useState("");

  // Edit Aisle / Sub-Aisle Form
  const [editCategoryModalOpen, setEditCategoryModalOpen] = React.useState<boolean>(false);
  const [editCatId, setEditCatId] = React.useState<string>("");
  const [editCatName, setEditCatName] = React.useState<string>("");
  const [editCatSlug, setEditCatSlug] = React.useState<string>("");
  const [editCatImage, setEditCatImage] = React.useState<string>("");
  const [editCatIsParent, setEditCatIsParent] = React.useState<boolean>(true);

  // Delete Aisle / Sub-Aisle Confirmation
  const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = React.useState<boolean>(false);
  const [deleteCatId, setDeleteCatId] = React.useState<string>("");
  const [deleteCatName, setDeleteCatName] = React.useState<string>("");
  const [deleteCatIsParent, setDeleteCatIsParent] = React.useState<boolean>(true);
  const [deleteCatSkuCount, setDeleteCatSkuCount] = React.useState<number>(0);
  const [isDeletingCategory, setIsDeletingCategory] = React.useState<boolean>(false);

  // Add Product Form
  const [prodCategoryId, setProdCategoryId] = React.useState("");
  const [prodTitle, setProdTitle] = React.useState("");
  const [prodSlug, setProdSlug] = React.useState("");
  const [prodUnitQuantity, setProdUnitQuantity] = React.useState("");
  const [prodMrp, setProdMrp] = React.useState<string>("");
  const [prodSalePrice, setProdSalePrice] = React.useState<string>("");
  const [prodStock, setProdStock] = React.useState<string>("50");
  const [prodImage, setProdImage] = React.useState("");
  const [prodTags, setProdTags] = React.useState("");
  const [prodDesc, setProdDesc] = React.useState("");

  // Edit Product Form
  const [editProdId, setEditProdId] = React.useState("");
  const [editProdTitle, setEditProdTitle] = React.useState("");
  const [editProdMrp, setEditProdMrp] = React.useState<string>("");
  const [editProdSalePrice, setEditProdSalePrice] = React.useState<string>("");
  const [editProdStock, setEditProdStock] = React.useState<string>("");
  const [editProdUnitQty, setEditProdUnitQty] = React.useState("");
  const [editProdImage, setEditProdImage] = React.useState("");

  // Auto-slug generator helper
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  // Fetch Categories
  const fetchCatalogData = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ops/categories");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load catalog.");
      }
      setCategories(data.categories || []);

      // Auto-expand all parents initially
      const expandedMap: Record<string, boolean> = {};
      (data.categories || []).forEach((c: ParentCategoryData) => {
        expandedMap[c.id] = true;
      });
      setExpandedParents(expandedMap);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while fetching catalog.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (session?.user && ["OWNER", "MANAGER"].includes(session.user.role)) {
      fetchCatalogData();
    }
  }, [session, fetchCatalogData]);

  // Handle Toggle Parent Category Accordion
  const toggleParentExpand = (parentId: string) => {
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  // 1. Submit Add Parent Category
  const handleCreateParentCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim()) return;

    try {
      const res = await fetch("/api/ops/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parentName.trim(),
          slug: parentSlug.trim() || slugify(parentName),
          imageUrl: parentImage.trim() || null,
          parentId: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category.");

      setSuccessMsg(`Parent category "${data.category.name}" created!`);
      setParentModalOpen(false);
      setParentName("");
      setParentSlug("");
      setParentImage("");
      fetchCatalogData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 2. Submit Add Subcategory
  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subParentId || !subName.trim()) return;

    try {
      const res = await fetch("/api/ops/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: subParentId,
          name: subName.trim(),
          slug: subSlug.trim() || slugify(subName),
          imageUrl: subImage.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create subcategory.");

      setSuccessMsg(`Subcategory "${data.category.name}" created!`);
      setSubModalOpen(false);
      setSubName("");
      setSubSlug("");
      setSubImage("");
      fetchCatalogData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 2b. Open Edit Category / Subcategory
  const handleOpenEditCategory = (
    cat: { id: string; name: string; slug: string; imageUrl?: string | null },
    isParent: boolean
  ) => {
    setEditCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatSlug(cat.slug);
    setEditCatImage(cat.imageUrl || "");
    setEditCatIsParent(isParent);
    setEditCategoryModalOpen(true);
  };

  // 2c. Submit Update Category / Subcategory
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/ops/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editCatId,
          name: editCatName.trim(),
          slug: editCatSlug.trim() || slugify(editCatName),
          imageUrl: editCatImage.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category.");

      setSuccessMsg(`Aisle "${data.category.name}" updated successfully!`);
      setEditCategoryModalOpen(false);
      fetchCatalogData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update category.");
    }
  };

  // 2d. Open Delete Category Confirmation
  const handleOpenDeleteCategory = (
    cat: { id: string; name: string },
    isParent: boolean,
    skuCount: number
  ) => {
    setDeleteCatId(cat.id);
    setDeleteCatName(cat.name);
    setDeleteCatIsParent(isParent);
    setDeleteCatSkuCount(skuCount);
    setDeleteCategoryModalOpen(true);
  };

  // 2e. Confirm Delete Category / Subcategory
  const handleConfirmDeleteCategory = async () => {
    try {
      setIsDeletingCategory(true);
      const res = await fetch(`/api/ops/categories?id=${deleteCatId}&force=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete category.");

      setSuccessMsg(data.message || `Deleted "${deleteCatName}".`);
      setDeleteCategoryModalOpen(false);
      fetchCatalogData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete category.");
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // 3. Submit Add Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const numMrp = parseFloat(prodMrp);
    const numSalePrice = parseFloat(prodSalePrice);
    const numStock = parseInt(prodStock, 10) || 0;

    if (!prodCategoryId || !prodTitle.trim() || isNaN(numMrp) || isNaN(numSalePrice)) {
      setErrorMsg("Please fill in all required product fields with valid numbers.");
      return;
    }

    if (numSalePrice > numMrp) {
      setErrorMsg(`Selling price (₹${numSalePrice}) cannot be greater than MRP (₹${numMrp}).`);
      return;
    }

    try {
      const tagsArray = prodTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch("/api/ops/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: prodCategoryId,
          title: prodTitle.trim(),
          slug: prodSlug.trim() || slugify(prodTitle),
          unitQuantity: prodUnitQuantity.trim() || "1 unit",
          mrp: numMrp,
          salePrice: numSalePrice,
          stockCount: numStock,
          imageUrl: prodImage.trim() || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80",
          tags: tagsArray,
          description: prodDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product.");

      setSuccessMsg(`Product "${data.product.title}" created successfully!`);
      setProductModalOpen(false);
      // Reset form
      setProdTitle("");
      setProdSlug("");
      setProdUnitQuantity("");
      setProdMrp("");
      setProdSalePrice("");
      setProdStock("50");
      setProdImage("");
      setProdTags("");
      setProdDesc("");
      fetchCatalogData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 4. Submit Edit Product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const numMrp = parseFloat(editProdMrp);
    const numSalePrice = parseFloat(editProdSalePrice);
    const numStock = parseInt(editProdStock, 10);

    if (isNaN(numMrp) || isNaN(numSalePrice)) {
      setErrorMsg("Please enter valid prices.");
      return;
    }

    if (numSalePrice > numMrp) {
      setErrorMsg(`Selling price (₹${numSalePrice}) cannot exceed MRP (₹${numMrp}).`);
      return;
    }

    try {
      const res = await fetch(`/api/ops/products/${editProdId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editProdTitle.trim(),
          mrp: numMrp,
          salePrice: numSalePrice,
          stockCount: isNaN(numStock) ? undefined : numStock,
          unitQuantity: editProdUnitQty.trim(),
          imageUrl: editProdImage.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update product.");

      setSuccessMsg(`Product "${data.product.title}" updated!`);
      setEditProductModalOpen(false);
      fetchCatalogData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Open Edit Modal
  const openEditModal = (prod: ProductData) => {
    setEditProdId(prod.id);
    setEditProdTitle(prod.title);
    setEditProdMrp(prod.mrp.toString());
    setEditProdSalePrice(prod.salePrice.toString());
    setEditProdStock(prod.stockCount.toString());
    setEditProdUnitQty(prod.unitQuantity);
    setEditProdImage(prod.imageUrl);
    setEditProductModalOpen(true);
  };

  // Live discount calculation for Product Add Modal
  const liveAddMrp = parseFloat(prodMrp) || 0;
  const liveAddSalePrice = parseFloat(prodSalePrice) || 0;
  const liveAddDiscountPercent =
    liveAddMrp > 0 && liveAddSalePrice <= liveAddMrp
      ? Math.round(((liveAddMrp - liveAddSalePrice) / liveAddMrp) * 100)
      : 0;

  // Flattened subcategories for dropdown selectors
  const allSubcategories = React.useMemo(() => {
    const list: { id: string; name: string; parentName: string }[] = [];
    categories.forEach((parent) => {
      parent.subCategories.forEach((sub) => {
        list.push({
          id: sub.id,
          name: sub.name,
          parentName: parent.name,
        });
      });
    });
    return list;
  }, [categories]);

  // Auth gate
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-surface-dark flex items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-accent" />
      </div>
    );
  }

  if (!session?.user || !["OWNER", "MANAGER"].includes(session.user.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-black">Access Restricted</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6">
          This portal requires Store Owner or Hub Manager permissions.
        </p>
        <Link href="/">
          <Button variant="outline" className="text-xs font-bold border-slate-700">
            Return to Storefront
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* 1. TOP APP BAR */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-3 sm:px-8 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Top Title & Navigation */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href={session.user.role === "OWNER" ? "/owner" : "/manager"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border-2 border-slate-700 text-xs font-bold text-white hover:bg-slate-700 transition-colors shadow-xs shrink-0"
                title="Back to Hub"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Back</span>
              </Link>
              <div className="h-4 w-px bg-slate-700" />
              <Logo variant="compact" theme="dark" size={24} />
              <div>
                <h1 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 sm:gap-2">
                  <span>Catalog &amp; Pricing</span>
                  <Badge variant="accent" className="text-[9px] sm:text-[10px] font-black uppercase py-0 px-1.5 bg-emerald-500 text-slate-950">
                    {session.user.role}
                  </Badge>
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-300 hidden sm:block">
                  Categories &bull; Subcategories &bull; Dual MRP / Sale Price Engine
                </p>
              </div>
            </div>
          </div>

          {/* Action Controls: 3 high-contrast buttons visible on ALL mobile screens without horizontal scroll */}
          <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex md:items-center">
            <Button
              size="sm"
              onClick={() => setParentModalOpen(true)}
              className="h-10 text-xs font-black bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-emerald-500 text-white rounded-xl shadow-sm px-2 sm:px-3.5 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">+ Category</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setSubModalOpen(true)}
              className="h-10 text-xs font-black bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-emerald-500 text-white rounded-xl shadow-sm px-2 sm:px-3.5 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">+ Sub-Cat</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                if (allSubcategories.length > 0 && !prodCategoryId) {
                  setProdCategoryId(allSubcategories[0].id);
                }
                setProductModalOpen(true);
              }}
              className="h-10 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-400 rounded-xl shadow-lg px-2 sm:px-4 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate font-black">+ Product</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-32 sm:pb-36 md:pb-12 space-y-6">
        {/* Toast / Alert Banners */}
        {errorMsg && (
          <div className="p-4 bg-red-950/80 border-2 border-red-500/60 rounded-2xl flex items-center justify-between text-xs text-red-200 animate-in fade-in shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-white font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-950/80 border-2 border-emerald-500/60 rounded-2xl flex items-center justify-between text-xs text-emerald-200 animate-in fade-in shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-400 hover:text-white font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search & Quick Metrics */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search categories, subcategories, or products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 bg-slate-900 border-2 border-slate-700 text-xs text-white rounded-xl focus:border-emerald-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="bg-slate-900 px-3.5 py-2 rounded-xl border-2 border-slate-700 font-mono">
              <strong className="text-white font-bold">{categories.length}</strong> Categories
            </span>
            <span className="bg-slate-900 px-3.5 py-2 rounded-xl border-2 border-slate-700 font-mono">
              <strong className="text-white font-bold">{allSubcategories.length}</strong> Subcategories
            </span>
            <button
              onClick={fetchCatalogData}
              className="p-2.5 bg-slate-900 border-2 border-slate-700 hover:bg-slate-800 rounded-xl transition-colors text-slate-300 hover:text-white"
              title="Refresh Catalog"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. TWO-TIER HIERARCHICAL TREE VIEW */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="font-semibold">Loading catalog structure...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-12 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center mx-auto text-emerald-400">
              <FolderTree className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-white">No Categories Found</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto font-medium">
              Start by creating your first Parent Category (e.g., &quot;Dairy &amp; Breakfast&quot;) and subcategories under it.
            </p>
            <Button
              size="sm"
              onClick={() => setParentModalOpen(true)}
              className="h-11 px-6 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg border-2 border-emerald-400"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Category
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {categories
              .filter((parent) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase().trim();
                const parentMatch =
                  parent.name.toLowerCase().includes(q) ||
                  parent.slug.toLowerCase().includes(q);
                const subMatch = parent.subCategories.some(
                  (s) =>
                    s.name.toLowerCase().includes(q) ||
                    s.slug.toLowerCase().includes(q) ||
                    (s.products || []).some(
                      (p) =>
                        p.title.toLowerCase().includes(q) ||
                        p.slug.toLowerCase().includes(q) ||
                        (p.description && p.description.toLowerCase().includes(q)) ||
                        p.unitQuantity.toLowerCase().includes(q) ||
                        p.tags.some((t) => t.toLowerCase().includes(q))
                    )
                );
                return parentMatch || subMatch;
              })
              .map((parent) => {
              const isExpanded = !!expandedParents[parent.id] || Boolean(searchQuery.trim());
              const totalParentSkus = parent.subCategories.reduce(
                (sum, s) => sum + (s.products?.length || 0),
                0
              );

              return (
                <div
                  key={parent.id}
                  className="bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-xl"
                >
                  {/* PARENT CATEGORY HEADER BAR */}
                  <div
                    onClick={() => toggleParentExpand(parent.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/60 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {parent.imageUrl ? (
                        <img
                          src={parent.imageUrl}
                          alt={parent.name}
                          className="w-10 h-10 rounded-xl object-cover border-2 border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xs shrink-0">
                          {parent.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-black text-white">{parent.name}</h2>
                          <Badge variant="outline" className="text-[10px] font-mono text-slate-300 border-slate-600 bg-slate-950">
                            /{parent.slug}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                          {parent.subCategories.length} Subcategories &bull; {totalParentSkus} SKUs
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap self-end sm:self-auto pl-8 sm:pl-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditCategory(parent, true)}
                        className="h-8 px-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs gap-1 border border-slate-700 bg-slate-900"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDeleteCategory(parent, true, totalParentSkus)}
                        className="h-8 px-2.5 text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 rounded-xl text-xs gap-1 border border-rose-500/30 bg-slate-900"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Delete</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSubParentId(parent.id);
                          setSubModalOpen(true);
                        }}
                        className="h-8 px-3 text-xs font-black bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 rounded-xl transition-all shadow-sm gap-1"
                        title="Add Subcategory under this aisle"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>+ Subcategory</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (parent.subCategories.length > 0) {
                            setProdCategoryId(parent.subCategories[0].id);
                          }
                          setProductModalOpen(true);
                        }}
                        className="h-8 px-3 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-md gap-1"
                        title="Add product directly"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>+ Product</span>
                      </Button>
                    </div>
                  </div>

                  {/* EXPANDED SUBCATEGORIES TREE SECTION */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 pt-2 border-t-2 border-slate-800 bg-slate-950 space-y-5">
                      {parent.subCategories.length === 0 ? (
                        <div className="p-6 text-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/80 flex flex-col items-center justify-center gap-3">
                          <Layers className="w-8 h-8 text-emerald-400" />
                          <div>
                            <p className="text-sm font-bold text-white">No subcategories under {parent.name}</p>
                            <p className="text-xs text-slate-300 mt-0.5">
                              Add subcategories like Milk, Bread, Cheese to organize your products.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSubParentId(parent.id);
                              setSubModalOpen(true);
                            }}
                            className="h-9 px-4 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>+ Add First Subcategory</span>
                          </Button>
                        </div>
                      ) : (
                        parent.subCategories.map((sub) => {
                          const filteredProducts = (sub.products || []).filter((p) => {
                            if (!searchQuery.trim()) return true;
                            const q = searchQuery.toLowerCase().trim();
                            return (
                              p.title.toLowerCase().includes(q) ||
                              p.slug.toLowerCase().includes(q) ||
                              (p.description && p.description.toLowerCase().includes(q)) ||
                              p.unitQuantity.toLowerCase().includes(q) ||
                              p.tags.some((t) => t.toLowerCase().includes(q)) ||
                              sub.name.toLowerCase().includes(q) ||
                              sub.slug.toLowerCase().includes(q) ||
                              parent.name.toLowerCase().includes(q) ||
                              parent.slug.toLowerCase().includes(q)
                            );
                          });

                          return (
                            <div
                              key={sub.id}
                              className="border-2 border-slate-800 rounded-2xl p-4 sm:p-5 bg-slate-900/90 space-y-4 shadow-sm"
                            >
                              {/* Subcategory Bar */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b-2 border-slate-800">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                                    {sub.name}
                                  </h3>
                                  <Badge variant="secondary" className="text-[10px] font-mono text-slate-200 bg-slate-800 border border-slate-700">
                                    /{sub.slug}
                                  </Badge>
                                  <span className="text-[11px] text-slate-300 font-mono font-bold">
                                    ({filteredProducts.length} items)
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap self-end sm:self-auto">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenEditCategory(sub, false)}
                                    className="h-8 px-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs gap-1 border border-slate-700 bg-slate-950"
                                    title="Edit Subcategory"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenDeleteCategory(sub, false, filteredProducts.length)}
                                    className="h-8 px-2.5 text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 rounded-xl text-xs gap-1 border border-rose-500/30 bg-slate-950"
                                    title="Delete Subcategory"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Delete</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setProdCategoryId(sub.id);
                                      setProductModalOpen(true);
                                    }}
                                    className="h-8 px-3 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm gap-1 flex items-center"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Add Product</span>
                                  </Button>
                                </div>
                              </div>

                              {/* Products Grid */}
                              {filteredProducts.length === 0 ? (
                                <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 flex items-center justify-between gap-3">
                                  <p className="text-xs font-semibold text-slate-300">
                                    No products in this subcategory matching your search.
                                  </p>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setProdCategoryId(sub.id);
                                      setProductModalOpen(true);
                                    }}
                                    className="h-8 px-3 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 rounded-xl gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    + Add Product
                                  </Button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {filteredProducts.map((prod) => {
                                    const discount =
                                      prod.mrp > prod.salePrice
                                        ? Math.round(((prod.mrp - prod.salePrice) / prod.mrp) * 100)
                                        : 0;

                                    return (
                                      <div
                                        key={prod.id}
                                        className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-3 flex items-start gap-3 hover:border-slate-600 transition-all shadow-xs"
                                      >
                                        <div className="relative w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-1">
                                          {prod.imageUrl ? (
                                            <img
                                              src={prod.imageUrl}
                                              alt={prod.title}
                                              className="w-full h-full object-contain"
                                            />
                                          ) : (
                                            <Package className="w-6 h-6 text-slate-500" />
                                          )}
                                          {discount > 0 && (
                                            <span className="absolute top-0.5 left-0.5 bg-emerald-500 text-slate-950 text-[8px] font-black px-1 rounded shadow-xs">
                                              {discount}%
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-slate-300 font-mono font-semibold">
                                              {prod.unitQuantity}
                                            </span>
                                            <span
                                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                prod.isAvailable && prod.stockCount > 0
                                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                                  : "bg-red-950 text-red-400 border border-red-500/40"
                                              }`}
                                            >
                                              {prod.isAvailable && prod.stockCount > 0
                                                ? `${prod.stockCount} in stock`
                                                : "Out of Stock"}
                                            </span>
                                          </div>

                                          <h4 className="text-xs font-black text-white truncate mt-1" title={prod.title}>
                                            {prod.title}
                                          </h4>

                                          {/* Dual Pricing Display */}
                                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-emerald-400 font-mono">
                                                ₹{prod.salePrice}
                                              </span>
                                              {prod.mrp > prod.salePrice && (
                                                <span className="text-[10px] text-slate-400 line-through font-mono">
                                                  ₹{prod.mrp}
                                                </span>
                                              )}
                                            </div>

                                            <Button
                                              size="sm"
                                              onClick={() => openEditModal(prod)}
                                              className="h-7 px-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700"
                                            >
                                              <Edit2 className="w-3 h-3 mr-1 text-emerald-400" />
                                              Edit
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL 1: ADD PARENT CATEGORY */}
      {parentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex items-start justify-center">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md p-6 text-white space-y-5 shadow-2xl my-4 sm:my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setParentModalOpen(false)}
                  className="h-8 px-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl gap-1 border border-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Back</span>
                </Button>
                <h3 className="text-sm font-black flex items-center gap-2 text-white">
                  <FolderTree className="w-4 h-4 text-emerald-400" />
                  Add Category
                </h3>
              </div>
              <button
                onClick={() => setParentModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateParentCategory} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  Category Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Dairy & Breakfast"
                  value={parentName}
                  onChange={(e) => {
                    setParentName(e.target.value);
                    if (!parentSlug || parentSlug === slugify(parentName)) {
                      setParentSlug(slugify(e.target.value));
                    }
                  }}
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  URL Slug *
                </label>
                <Input
                  required
                  placeholder="e.g. dairy-breakfast"
                  value={parentSlug}
                  onChange={(e) => setParentSlug(e.target.value)}
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  Image URL (Optional)
                </label>
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={parentImage}
                  onChange={(e) => setParentImage(e.target.value)}
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setParentModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button type="submit" className="h-10 px-5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md">
                  Save Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD SUBCATEGORY */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex items-start justify-center">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md p-6 text-white space-y-5 shadow-2xl my-4 sm:my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSubModalOpen(false)}
                  className="h-8 px-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl gap-1 border border-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Back</span>
                </Button>
                <h3 className="text-sm font-black flex items-center gap-2 text-white">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Add Subcategory
                </h3>
              </div>
              <button
                onClick={() => setSubModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubcategory} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  Parent Category *
                </label>
                <select
                  required
                  value={subParentId}
                  onChange={(e) => setSubParentId(e.target.value)}
                  className="w-full h-10 rounded-xl bg-slate-950 border-2 border-slate-700 px-3 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                >
                  <option value="">Select Parent Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  Subcategory Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Milk"
                  value={subName}
                  onChange={(e) => {
                    setSubName(e.target.value);
                    if (!subSlug || subSlug === slugify(subName)) {
                      setSubSlug(slugify(e.target.value));
                    }
                  }}
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  URL Slug *
                </label>
                <Input
                  required
                  placeholder="e.g. milk"
                  value={subSlug}
                  onChange={(e) => setSubSlug(e.target.value)}
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  Image URL (Optional)
                </label>
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={subImage}
                  onChange={(e) => setSubImage(e.target.value)}
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button type="submit" className="h-10 px-5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md">
                  Save Subcategory
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD PRODUCT WITH LIVE DUAL PRICING PREVIEW */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex items-start justify-center">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-3xl text-white shadow-2xl my-4 sm:my-8 animate-in zoom-in-95 max-h-[92vh] flex flex-col overflow-hidden">
            {/* STICKY HEADER WITH PROMINENT BACK BUTTON */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-slate-800 bg-slate-950/95 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setProductModalOpen(false)}
                  className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs gap-1.5 border border-slate-700 shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-400" />
                  <span>Back to Catalog</span>
                </Button>
                <div className="h-5 w-px bg-slate-700 hidden sm:block" />
                <div>
                  <h3 className="text-sm sm:text-base font-black flex items-center gap-2 text-white">
                    <Package className="w-4 h-4 text-emerald-400" />
                    Add New Product
                  </h3>
                  <p className="text-[11px] text-slate-300 hidden sm:block">
                    Dual Pricing Engine &bull; Live Preview
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProductModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm border border-slate-700"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* SCROLLABLE FORM BODY */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Form Controls (3 cols) */}
                <form onSubmit={handleCreateProduct} className="md:col-span-3 space-y-3.5 text-xs">
                  <div>
                    <label className="text-xs font-black text-slate-200 block mb-1.5">
                      Assign Subcategory *
                    </label>
                    <select
                      required
                      value={prodCategoryId}
                      onChange={(e) => setProdCategoryId(e.target.value)}
                      className="w-full h-10 rounded-xl bg-slate-950 border-2 border-slate-700 px-3 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                    >
                      <option value="">Select Subcategory</option>
                      {allSubcategories.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.parentName} &gt; {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-200 block mb-1.5">
                      Product Title *
                    </label>
                    <Input
                      required
                      placeholder="e.g. Amul Taaza Toned Milk"
                      value={prodTitle}
                      onChange={(e) => {
                        setProdTitle(e.target.value);
                        if (!prodSlug || prodSlug === slugify(prodTitle)) {
                          setProdSlug(slugify(e.target.value));
                        }
                      }}
                      className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-black text-slate-200 block mb-1.5">
                        URL Slug *
                      </label>
                      <Input
                        required
                        placeholder="e.g. amul-taaza-toned-milk"
                        value={prodSlug}
                        onChange={(e) => setProdSlug(e.target.value)}
                        className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-200 block mb-1.5">
                        Unit Pack Size *
                      </label>
                      <Input
                        required
                        placeholder="e.g. 500 ml, 1 kg, 6 pcs"
                        value={prodUnitQuantity}
                        onChange={(e) => setProdUnitQuantity(e.target.value)}
                        className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-semibold"
                      />
                    </div>
                  </div>

                  {/* PRICING FIELDS (MRP & SALE PRICE) */}
                  <div className="p-3.5 bg-slate-950 border-2 border-slate-700 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        Dual Pricing Engine (₹)
                      </span>
                      {liveAddDiscountPercent > 0 && (
                        <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-xs">
                          {liveAddDiscountPercent}% OFF
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-300 font-bold block mb-1">
                          MRP (Maximum Retail) *
                        </label>
                        <Input
                          required
                          type="number"
                          step="0.01"
                          min="1"
                          placeholder="e.g. 60"
                          value={prodMrp}
                          onChange={(e) => setProdMrp(e.target.value)}
                          className="h-10 bg-slate-900 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono font-black"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-300 font-bold block mb-1">
                          Sale Price (Discounted) *
                        </label>
                        <Input
                          required
                          type="number"
                          step="0.01"
                          min="1"
                          placeholder="e.g. 48"
                          value={prodSalePrice}
                          onChange={(e) => setProdSalePrice(e.target.value)}
                          className="h-10 bg-slate-900 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-emerald-400 font-mono font-black"
                        />
                      </div>
                    </div>

                    {liveAddSalePrice > liveAddMrp && liveAddMrp > 0 && (
                      <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1 pt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Sale price (₹{liveAddSalePrice}) cannot exceed MRP (₹{liveAddMrp})!
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-black text-slate-200 block mb-1.5">
                        Initial Stock Count
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={prodStock}
                        onChange={(e) => setProdStock(e.target.value)}
                        className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-200 block mb-1.5">
                        Tags (Comma separated)
                      </label>
                      <Input
                        placeholder="dairy, milk, breakfast"
                        value={prodTags}
                        onChange={(e) => setProdTags(e.target.value)}
                        className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-200 block mb-1.5">
                      Image URL *
                    </label>
                    <Input
                      required
                      placeholder="https://images.unsplash.com/..."
                      value={prodImage}
                      onChange={(e) => setProdImage(e.target.value)}
                      className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProductModalOpen(false)}
                      className="h-10 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back / Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={liveAddSalePrice > liveAddMrp && liveAddMrp > 0}
                      className="h-10 px-5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                    >
                      Create &amp; Publish Product
                    </Button>
                  </div>
                </form>

                {/* LIVE VISUAL PREVIEW CARD (2 cols) */}
                <div className="md:col-span-2 flex flex-col justify-center items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary-accent" />
                    Live Storefront Preview
                  </span>

                  {/* Mimic ProductCard Component */}
                  <div className="w-56 bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xl text-slate-900 space-y-2">
                    <div className="relative w-full aspect-square rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
                      {liveAddDiscountPercent > 0 && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="bg-primary-accent text-surface-dark text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs tracking-wider">
                            {liveAddDiscountPercent}% OFF
                          </span>
                        </div>
                      )}

                      <div className="absolute top-2 right-2 z-10">
                        <Badge variant="accent" className="text-[9px] py-0 px-1.5 gap-0.5 font-bold shadow-2xs">
                          <Zap className="w-2.5 h-2.5 fill-surface-dark" /> 10 MINS
                        </Badge>
                      </div>

                      {prodImage ? (
                        <img
                          src={prodImage}
                          alt="Preview"
                          className="w-full h-full object-contain p-2"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                          {prodTitle ? prodTitle.slice(0, 2).toUpperCase() : "SQ"}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="inline-block text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                        {prodUnitQuantity || "Unit Pack"}
                      </span>
                      <h4 className="text-xs font-bold text-surface-dark line-clamp-1 mt-1">
                        {prodTitle || "Product Title Preview"}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-surface-dark font-mono">
                          ₹{liveAddSalePrice > 0 ? liveAddSalePrice : "--"}
                        </span>
                        {liveAddMrp > liveAddSalePrice && liveAddSalePrice > 0 && (
                          <span className="text-[10px] text-muted-foreground line-through font-mono">
                            ₹{liveAddMrp}
                          </span>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="h-7 px-3 text-[10px] font-bold text-primary border-primary/40"
                      >
                        ADD
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: EDIT PRODUCT PRICE & STOCK                          */}
      {/* ------------------------------------------------------------- */}
      {editProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex items-start justify-center">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md p-6 text-white space-y-4 shadow-2xl my-4 sm:my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditProductModalOpen(false)}
                  className="h-8 px-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl gap-1 border border-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Back</span>
                </Button>
                <h3 className="text-sm font-black flex items-center gap-2 text-white">
                  <Edit2 className="w-4 h-4 text-emerald-400" />
                  Edit Product
                </h3>
              </div>
              <button
                onClick={() => setEditProductModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  Product Title *
                </label>
                <Input
                  required
                  value={editProdTitle}
                  onChange={(e) => setEditProdTitle(e.target.value)}
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-black text-slate-200 block mb-1.5">
                    MRP (₹) *
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="1"
                    value={editProdMrp}
                    onChange={(e) => setEditProdMrp(e.target.value)}
                    className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-200 block mb-1.5">
                    Selling Price (₹) *
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="1"
                    value={editProdSalePrice}
                    onChange={(e) => setEditProdSalePrice(e.target.value)}
                    className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-emerald-400 font-mono font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-black text-slate-200 block mb-1.5">
                    Stock Count
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={editProdStock}
                    onChange={(e) => setEditProdStock(e.target.value)}
                    className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-200 block mb-1.5">
                    Unit Quantity
                  </label>
                  <Input
                    value={editProdUnitQty}
                    onChange={(e) => setEditProdUnitQty(e.target.value)}
                    className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  Image URL
                </label>
                <Input
                  value={editProdImage}
                  onChange={(e) => setEditProdImage(e.target.value)}
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditProductModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button type="submit" className="h-10 px-5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: EDIT AISLE / SUB-AISLE                               */}
      {/* ------------------------------------------------------------- */}
      {editCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex items-start justify-center">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md p-6 text-white space-y-4 shadow-2xl my-4 sm:my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditCategoryModalOpen(false)}
                  className="h-8 px-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl gap-1 border border-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Back</span>
                </Button>
                <h3 className="text-sm font-black flex items-center gap-2 text-white">
                  <Edit2 className="w-4 h-4 text-emerald-400" />
                  Edit {editCatIsParent ? "Category" : "Subcategory"}
                </h3>
              </div>
              <button
                onClick={() => setEditCategoryModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  Name *
                </label>
                <Input
                  required
                  value={editCatName}
                  onChange={(e) => {
                    setEditCatName(e.target.value);
                    if (!editCatSlug || editCatSlug === slugify(editCatName)) {
                      setEditCatSlug(slugify(e.target.value));
                    }
                  }}
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  URL Slug *
                </label>
                <Input
                  required
                  value={editCatSlug}
                  onChange={(e) => setEditCatSlug(e.target.value)}
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-200 block mb-1.5">
                  Image URL (Optional)
                </label>
                <Input
                  placeholder="https://..."
                  value={editCatImage}
                  onChange={(e) => setEditCatImage(e.target.value)}
                  className="h-10 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditCategoryModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button type="submit" className="h-10 px-5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: DELETE AISLE / SUB-AISLE CONFIRMATION               */}
      {/* ------------------------------------------------------------- */}
      {deleteCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex items-start justify-center">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md p-6 text-white space-y-4 shadow-2xl my-4 sm:my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteCategoryModalOpen(false)}
                  className="h-8 px-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl gap-1 border border-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-300" />
                  <span>Back</span>
                </Button>
                <h3 className="text-sm font-black flex items-center gap-2 text-rose-400">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  Delete {deleteCatIsParent ? "Category" : "Subcategory"}
                </h3>
              </div>
              <button
                onClick={() => setDeleteCategoryModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-200 text-sm">
                Are you sure you want to permanently delete{" "}
                <strong className="text-white font-black">&quot;{deleteCatName}&quot;</strong>?
              </p>

              {deleteCatSkuCount > 0 ? (
                <div className="p-3.5 rounded-2xl bg-rose-950/80 border-2 border-rose-500/50 text-rose-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-black text-rose-200 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Active SKUs Warning</span>
                  </div>
                  <p className="text-xs leading-relaxed text-rose-200">
                    This {deleteCatIsParent ? "category" : "subcategory"} currently contains{" "}
                    <strong className="text-white font-bold">{deleteCatSkuCount} active product SKU(s)</strong>.
                    Deleting it will permanently remove these products and their order items safely from the catalog!
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs">
                  This {deleteCatIsParent ? "category" : "subcategory"} has 0 active SKUs and can be deleted safely.
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteCategoryModalOpen(false)}
                  disabled={isDeletingCategory}
                  className="h-10 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDeleteCategory}
                  disabled={isDeletingCategory}
                  className="h-10 px-5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white gap-2 shadow-lg"
                >
                  {isDeletingCategory ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>Delete Permanently</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
