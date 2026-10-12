import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryIdOrSlug = searchParams.get("categoryId");
    const search = (searchParams.get("search") || searchParams.get("q"))?.trim();
    const inStockOnly = searchParams.get("inStockOnly") === "true";

    const where: Prisma.ProductWhereInput = {};

    // Filter by category (handles parent categories, subcategories, IDs, and slugs)
    if (categoryIdOrSlug && categoryIdOrSlug !== "all") {
      const matchedCategory = await prisma.category.findFirst({
        where: {
          OR: [{ id: categoryIdOrSlug }, { slug: categoryIdOrSlug }],
        },
        include: { subCategories: true },
      });

      if (matchedCategory) {
        if (matchedCategory.subCategories.length > 0) {
          // It's a parent category: include products from all its subcategories
          const allCategoryIds = [
            matchedCategory.id,
            ...matchedCategory.subCategories.map((s) => s.id),
          ];
          where.categoryId = { in: allCategoryIds };
        } else {
          // It's a subcategory
          where.categoryId = matchedCategory.id;
        }
      } else {
        // Fallback directly matching ID
        where.categoryId = categoryIdOrSlug;
      }
    }

    // Filter by comprehensive search term (searches titles, descriptions, categories, parent aisles, tags, and pack sizes)
    if (search) {
      const trimmedSearch = search.trim();
      const tokens = trimmedSearch
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      if (tokens.length === 1) {
        const singleToken = tokens[0];
        where.OR = [
          { title: { contains: singleToken, mode: "insensitive" } },
          { description: { contains: singleToken, mode: "insensitive" } },
          { slug: { contains: singleToken, mode: "insensitive" } },
          { unitQuantity: { contains: singleToken, mode: "insensitive" } },
          {
            category: {
              OR: [
                { name: { contains: singleToken, mode: "insensitive" } },
                { slug: { contains: singleToken, mode: "insensitive" } },
                {
                  parent: {
                    OR: [
                      { name: { contains: singleToken, mode: "insensitive" } },
                      { slug: { contains: singleToken, mode: "insensitive" } },
                    ],
                  },
                },
              ],
            },
          },
          { tags: { has: singleToken } },
        ];
      } else if (tokens.length > 1) {
        // Multi-word query (e.g. "Maggi noodles"):
        // Every token must match the product so irrelevant single-word items are excluded
        where.AND = tokens.map((token) => ({
          OR: [
            { title: { contains: token, mode: "insensitive" } },
            { description: { contains: token, mode: "insensitive" } },
            { unitQuantity: { contains: token, mode: "insensitive" } },
            {
              category: {
                OR: [
                  { name: { contains: token, mode: "insensitive" } },
                  {
                    parent: {
                      name: { contains: token, mode: "insensitive" },
                    },
                  },
                ],
              },
            },
            { tags: { has: token } },
          ],
        }));
      }
    }

    // Filter by stock availability
    if (inStockOnly) {
      where.isAvailable = true;
      where.stockCount = { gt: 0 };
    }

    let products = await prisma.product.findMany({
      where,
      include: {
        category: {
          include: {
            parent: true,
          },
        },
      },
      orderBy: [{ isAvailable: "desc" }, { createdAt: "desc" }],
    });

    // When searching, sort by relevance scoring matching Blinkit / Zepto
    if (search) {
      const qLower = search.trim().toLowerCase();
      const tokens = qLower.split(/\s+/).filter((t) => t.length > 0);

      products = products.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();

        // Exact match
        if (titleA === qLower) scoreA += 200;
        if (titleB === qLower) scoreB += 200;

        // Starts with search phrase
        if (titleA.startsWith(qLower)) scoreA += 100;
        if (titleB.startsWith(qLower)) scoreB += 100;

        // Contains full search phrase
        if (titleA.includes(qLower)) scoreA += 60;
        if (titleB.includes(qLower)) scoreB += 60;

        // Token match scoring in title
        tokens.forEach((t) => {
          if (titleA.includes(t)) scoreA += 35;
          if (titleB.includes(t)) scoreB += 35;
          if (a.category?.name.toLowerCase().includes(t)) scoreA += 10;
          if (b.category?.name.toLowerCase().includes(t)) scoreB += 10;
        });

        // In-stock priority
        if (a.isAvailable && a.stockCount > 0) scoreA += 15;
        if (b.isAvailable && b.stockCount > 0) scoreB += 15;

        return scoreB - scoreA;
      });
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error("[GET /api/products error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch products." },
      { status: 500 }
    );
  }
}
