import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryIdOrSlug = searchParams.get("categoryId");
    const search = searchParams.get("search")?.trim();
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

    // Filter by search term
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    // Filter by stock availability
    if (inStockOnly) {
      where.isAvailable = true;
      where.stockCount = { gt: 0 };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [{ isAvailable: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("[GET /api/products error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch products." },
      { status: 500 }
    );
  }
}
