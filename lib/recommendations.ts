import prisma from "@/lib/prisma";
import { ProductData } from "@/components/catalog/ProductCard";

/**
 * Affinity Mapping Rules:
 * - Tags containing 'dairy' or 'milk' -> Recommend 'bread-and-butter', 'bakery', 'biscuits', 'tea-partner', 'bread', 'butter'
 * - Tags containing 'noodles' or 'instant' -> Recommend 'soft-drinks', 'chips', 'snacks', 'cold-drink', 'drinks', 'cola'
 * - Tags containing 'chips' or 'snacks'/'snack' -> Recommend 'cold-drinks', 'cold-drink', 'dips', 'drinks', 'cola', 'juice'
 */
export async function getRecommendations(
  cartProductIds: string[]
): Promise<ProductData[]> {
  const cleanCartIds = (cartProductIds || []).filter(Boolean);

  // If no items in cart, return top 4 best-selling / in-stock products
  if (cleanCartIds.length === 0) {
    const popularProducts = await prisma.product.findMany({
      where: {
        isAvailable: true,
        stockCount: { gt: 0 },
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: {
        stockCount: "desc",
      },
      take: 4,
    });

    return popularProducts.map(formatProduct);
  }

  // 1. Fetch current cart products to inspect their tags and categories
  const cartProducts = await prisma.product.findMany({
    where: {
      id: { in: cleanCartIds },
    },
    select: {
      id: true,
      tags: true,
      category: {
        select: { slug: true, name: true },
      },
    },
  });

  const cartTags = new Set<string>();
  cartProducts.forEach((p) => {
    p.tags.forEach((t) => cartTags.add(t.toLowerCase()));
    if (p.category?.slug) {
      cartTags.add(p.category.slug.toLowerCase());
    }
  });

  // 2. Determine target companion tags and companion category slugs based on affinity rules
  const targetTagsSet = new Set<string>();
  const targetCategorySlugs = new Set<string>();

  const hasTagMatch = (substrings: string[]) =>
    Array.from(cartTags).some((tag) =>
      substrings.some((sub) => tag.includes(sub))
    );

  // Dairy & Breakfast -> Bread, Bakery, Biscuits, Tea Partner
  if (hasTagMatch(["dairy", "milk", "butter", "paneer", "curd", "cheese", "eggs"])) {
    ["bread-and-butter", "bakery", "biscuits", "tea-partner", "bread", "butter", "cookies", "rusk", "breakfast"].forEach(
      (t) => targetTagsSet.add(t)
    );
    ["bread-and-butter", "biscuits-and-cookies"].forEach((c) => targetCategorySlugs.add(c));
  }

  // Tea, Coffee & Beverages -> Milk, Sugar, Biscuits, Snacks
  if (hasTagMatch(["tea", "coffee", "chai", "beverage", "hot-drinks"])) {
    ["milk", "dairy", "biscuits", "cookies", "sugar", "rusk", "snacks"].forEach(
      (t) => targetTagsSet.add(t)
    );
    ["milk", "biscuits-and-cookies"].forEach((c) => targetCategorySlugs.add(c));
  }

  // Instant Foods & Noodles -> Cold Drinks, Chips, Snacks
  if (hasTagMatch(["noodles", "instant", "instant-foods", "instant-snack", "maggi", "pasta"])) {
    ["soft-drinks", "chips", "snacks", "cold-drink", "drinks", "cola", "sauce"].forEach(
      (t) => targetTagsSet.add(t)
    );
    ["soft-drinks", "chips-and-crisps"].forEach((c) => targetCategorySlugs.add(c));
  }

  // Snacks, Munchies & Chips -> Cold Drinks, Juices, Dips
  if (hasTagMatch(["chips", "snack", "snacks", "munchies", "crisps", "namkeen"])) {
    ["cold-drinks", "cold-drink", "drinks", "dips", "cola", "juice", "soft-drinks"].forEach(
      (t) => targetTagsSet.add(t)
    );
    ["soft-drinks", "fruit-juices"].forEach((c) => targetCategorySlugs.add(c));
  }

  // Cold Drinks & Juices -> Snacks, Chips, Munchies
  if (hasTagMatch(["drinks", "cola", "juice", "soft-drinks", "soda"])) {
    ["chips", "snacks", "munchies", "crisps", "instant"].forEach(
      (t) => targetTagsSet.add(t)
    );
    ["chips-and-crisps", "noodles-and-pasta"].forEach((c) => targetCategorySlugs.add(c));
  }

  // Staples (Atta, Rice, Dal) -> Spices, Cooking Oil, Salt
  if (hasTagMatch(["atta", "flour", "rice", "dal", "pulses", "grains", "oil", "ghee"])) {
    ["spices", "masala", "salt", "sugar", "oil", "ghee", "vegetables"].forEach(
      (t) => targetTagsSet.add(t)
    );
  }

  // Fresh Vegetables & Fruits -> Lemon, Chili, Coriander, Spices
  if (hasTagMatch(["veggie", "vegetable", "fruit", "onion", "potato", "tomato"])) {
    ["coriander", "lemon", "chili", "ginger", "garlic", "spices", "oil"].forEach(
      (t) => targetTagsSet.add(t)
    );
  }

  // Cleaning & Household
  if (hasTagMatch(["detergent", "cleaner", "dishwash", "wash"])) {
    ["scrubber", "sponge", "handwash", "soap", "trash-bags"].forEach(
      (t) => targetTagsSet.add(t)
    );
  }

  const targetTags = Array.from(targetTagsSet);
  const companionCategories = Array.from(targetCategorySlugs);

  let recommendedProducts: any[] = [];

  if (targetTags.length > 0 || companionCategories.length > 0) {
    recommendedProducts = await prisma.product.findMany({
      where: {
        id: { notIn: cleanCartIds },
        isAvailable: true,
        stockCount: { gt: 0 },
        OR: [
          ...(targetTags.length > 0 ? [{ tags: { hasSome: targetTags } }] : []),
          ...(companionCategories.length > 0
            ? [{ category: { slug: { in: companionCategories } } }]
            : []),
        ],
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: {
        stockCount: "desc",
      },
      take: 4,
    });
  }

  // 3. If fewer than 4 products matched affinity rules, backfill with other popular in-stock items
  if (recommendedProducts.length < 4) {
    const alreadyFoundIds = [
      ...cleanCartIds,
      ...recommendedProducts.map((p) => p.id),
    ];
    const fillCount = 4 - recommendedProducts.length;

    const backfillProducts = await prisma.product.findMany({
      where: {
        id: { notIn: alreadyFoundIds },
        isAvailable: true,
        stockCount: { gt: 0 },
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: {
        stockCount: "desc",
      },
      take: fillCount,
    });

    recommendedProducts = [...recommendedProducts, ...backfillProducts];
  }

  return recommendedProducts.slice(0, 4).map(formatProduct);
}

function formatProduct(p: any): ProductData {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    mrp: p.mrp,
    salePrice: p.salePrice,
    unitQuantity: p.unitQuantity,
    stockCount: p.stockCount,
    isAvailable: p.isAvailable,
    imageUrl: p.imageUrl,
    tags: p.tags,
    category: p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          slug: p.category.slug,
        }
      : undefined,
  };
}
