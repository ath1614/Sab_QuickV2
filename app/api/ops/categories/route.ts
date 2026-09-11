import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  parentId: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Owner or Manager role required." },
        { status: 403 }
      );
    }

    // Fetch hierarchical categories
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ displayRank: "asc" }, { name: "asc" }],
      include: {
        subCategories: {
          orderBy: [{ displayRank: "asc" }, { name: "asc" }],
          include: {
            products: {
              orderBy: { title: "asc" },
            },
            _count: {
              select: { products: true },
            },
          },
        },
        products: {
          orderBy: { title: "asc" },
        },
        _count: {
          select: { products: true, subCategories: true },
        },
      },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error("[GET /api/ops/categories error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load categories." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Owner or Manager role required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = createCategorySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, slug, parentId, imageUrl } = parseResult.data;

    // Normalize slug
    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Check slug uniqueness
    const existingSlug = await prisma.category.findUnique({
      where: { slug: cleanSlug },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: `Category slug '${cleanSlug}' already exists.` },
        { status: 400 }
      );
    }

    // If parentId provided, verify parent exists
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent category not found." },
          { status: 404 }
        );
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: cleanSlug,
        parentId: parentId || null,
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.json(
      { success: true, category, message: "Category created successfully." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/ops/categories error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create category." },
      { status: 500 }
    );
  }
}
