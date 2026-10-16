import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import redis from "@/lib/redis";

export const dynamic = "force-dynamic";

const CATEGORIES_CACHE_KEY = "cache:categories:v1";

export async function GET() {
  try {
    // 1. Check Redis memory cache
    try {
      const cached = await redis.get(CATEGORIES_CACHE_KEY);
      if (cached) {
        return new NextResponse(cached, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
          },
        });
      }
    } catch (cacheErr) {
      // Redis unavailable: seamlessly fall back to PostgreSQL
    }

    const categories = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: { displayRank: "asc" },
      include: {
        subCategories: {
          orderBy: { displayRank: "asc" },
          include: {
            _count: {
              select: { products: true },
            },
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    const payload = JSON.stringify({ categories });

    // Cache in Redis for 60 seconds
    try {
      await redis.set(CATEGORIES_CACHE_KEY, payload, "EX", 60);
    } catch {}

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("[GET /api/categories error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories." },
      { status: 500 }
    );
  }
}
