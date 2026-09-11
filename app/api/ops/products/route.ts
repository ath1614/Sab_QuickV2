import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createProductSchema = z.object({
  title: z.string().trim().min(1, "Product title is required"),
  slug: z.string().trim().min(1, "Product slug is required"),
  categoryId: z.string().min(1, "Category ID is required"),
  mrp: z.number().positive("MRP must be greater than 0"),
  salePrice: z.number().positive("Sale price must be greater than 0"),
  unitQuantity: z.string().trim().min(1, "Unit quantity is required (e.g. 500 ml, 1 kg)"),
  stockCount: z.number().int().min(0).default(0),
  imageUrl: z.string().trim().min(1, "Image URL is required"),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
});

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
    const parseResult = createProductSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const {
      title,
      slug,
      categoryId,
      mrp,
      salePrice,
      unitQuantity,
      stockCount,
      imageUrl,
      tags,
      description,
    } = parseResult.data;

    // Strict pricing validation: salePrice <= mrp
    if (salePrice > mrp) {
      return NextResponse.json(
        { error: `Discounted sale price (₹${salePrice}) cannot be greater than MRP (₹${mrp}).` },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Selected category or subcategory does not exist." },
        { status: 404 }
      );
    }

    // Normalize slug
    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const existingProduct = await prisma.product.findUnique({
      where: { slug: cleanSlug },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: `Product slug '${cleanSlug}' already exists.` },
        { status: 400 }
      );
    }

    // Dynamic discount percentage calculation
    const discountPercent = Math.round(((mrp - salePrice) / mrp) * 100);

    const product = await prisma.product.create({
      data: {
        title,
        slug: cleanSlug,
        categoryId,
        mrp,
        salePrice,
        unitQuantity,
        stockCount,
        isAvailable: stockCount > 0,
        imageUrl,
        tags: tags || [],
        description: description || null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        product: {
          ...product,
          discountPercent,
        },
        message: "Product created successfully.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/ops/products error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create product." },
      { status: 500 }
    );
  }
}
