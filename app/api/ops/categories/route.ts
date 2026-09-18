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
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to create category.";
    console.error("[POST /api/ops/categories error]:", errorMsg);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

// DELETE /api/ops/categories?id=...&force=true
export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const force = searchParams.get("force") === "true";

    if (!id) {
      return NextResponse.json({ error: "Category ID is required." }, { status: 400 });
    }

    const targetCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: { select: { id: true, name: true } },
      },
    });

    if (!targetCategory) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    const subIds = targetCategory.subCategories.map((s) => s.id);
    const categoryIdsToCheck = [id, ...subIds];

    // Check count of products associated with this category or any child subcategories
    const productCount = await prisma.product.count({
      where: {
        categoryId: { in: categoryIdsToCheck },
      },
    });

    if (productCount > 0 && !force) {
      return NextResponse.json(
        {
          error: `This ${targetCategory.parentId ? "sub-aisle" : "aisle"} contains ${productCount} SKU(s). Please confirm deletion.`,
          productCount,
          subCategoryCount: targetCategory.subCategories.length,
          requiresConfirmation: true,
        },
        { status: 400 }
      );
    }

    // If force is confirmed, clean up child products and subcategories
    if (productCount > 0) {
      // First delete any order items associated or cascade
      // Note: OrderItem has cascade or restrict. Let's delete products
      await prisma.product.deleteMany({
        where: { categoryId: { in: categoryIdsToCheck } },
      });
    }

    // Delete subcategories if this is a parent category
    if (subIds.length > 0) {
      await prisma.category.deleteMany({
        where: { id: { in: subIds } },
      });
    }

    // Delete the target category itself
    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `"${targetCategory.name}" ${targetCategory.parentId ? "sub-aisle" : "aisle"} deleted successfully.`,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to delete category.";
    console.error("[DELETE /api/ops/categories error]:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// PATCH /api/ops/categories - Update Aisle or Sub-Aisle details
const updateCategorySchema = z.object({
  id: z.string().min(1, "Category ID is required"),
  name: z.string().trim().min(1, "Name is required").optional(),
  slug: z.string().trim().min(1, "Slug is required").optional(),
  imageUrl: z.string().nullable().optional(),
  displayRank: z.number().int().optional(),
});

export async function PATCH(req: NextRequest) {
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
    const parseResult = updateCategorySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { id, name, slug, imageUrl, displayRank } = parseResult.data;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    let cleanSlug = existingCategory.slug;
    if (slug) {
      cleanSlug = slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const slugCollision = await prisma.category.findFirst({
        where: {
          slug: cleanSlug,
          NOT: { id },
        },
      });

      if (slugCollision) {
        return NextResponse.json(
          { error: `Category slug '${cleanSlug}' is already taken.` },
          { status: 400 }
        );
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug: cleanSlug } : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
        ...(displayRank !== undefined ? { displayRank } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      category: updatedCategory,
      message: `Aisle "${updatedCategory.name}" updated successfully.`,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to update category.";
    console.error("[PATCH /api/ops/categories error]:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
