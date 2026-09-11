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

  // 2. Determine target companion tags based on affinity rules
  const targetTagsSet = new Set<string>();

  const hasTagMatch = (substrings: string[]) =>
    Array.from(cartTags).some((tag) =>
      substrings.some((sub) => tag.includes(sub))
    );

  if (hasTagMatch(["dairy", "milk"])) {
    ["bread-and-butter", "bakery", "biscuits", "tea-partner", "bread", "butter"].forEach(
      (t) => targetTagsSet.add(t)
    );
  }

  if (hasTagMatch(["noodles", "instant", "instant-foods", "instant-snack"])) {
    ["soft-drinks", "chips", "snacks", "cold-drink", "drinks", "cola"].forEach(
      (t) => targetTagsSet.add(t)
    );
  }

  if (hasTagMatch(["chips", "snack", "snacks", "munchies"])) {
    ["cold-drinks", "cold-drink", "drinks", "dips", "cola", "juice", "soft-drinks"].forEach(
      (t) => targetTagsSet.add(t)
    );
  }

  const targetTags = Array.from(targetTagsSet);

  let recommendedProducts: any[] = [];

  if (targetTags.length > 0) {
    recommendedProducts = await prisma.product.findMany({
      where: {
        id: { notIn: cleanCartIds },
        isAvailable: true,
        stockCount: { gt: 0 },
        tags: {
          hasSome: targetTags,
        },
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
