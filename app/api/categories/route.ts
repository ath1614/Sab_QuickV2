import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[GET /api/categories error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories." },
      { status: 500 }
    );
  }
}
