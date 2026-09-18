import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateProductSchema = z.object({
  title: z.string().trim().min(1).optional(),
  mrp: z.number().positive().optional(),
  salePrice: z.number().positive().optional(),
  stockCount: z.number().int().min(0).optional(),
  unitQuantity: z.string().trim().min(1).optional(),
  imageUrl: z.string().trim().min(1).optional(),
  isAvailable: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const parseResult = updateProductSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const currentProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!currentProduct) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    const newMrp = parseResult.data.mrp ?? currentProduct.mrp;
    const newSalePrice = parseResult.data.salePrice ?? currentProduct.salePrice;

    if (newSalePrice > newMrp) {
      return NextResponse.json(
        {
          error: `Discounted sale price (₹${newSalePrice}) cannot exceed MRP (₹${newMrp}).`,
        },
        { status: 400 }
      );
    }

    const updateData: any = { ...parseResult.data };

    // Auto-sync availability with stock count if stockCount is updated
    if (parseResult.data.stockCount !== undefined) {
      if (parseResult.data.isAvailable === undefined) {
        updateData.isAvailable = parseResult.data.stockCount > 0;
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: "Product updated successfully.",
    });
  } catch (error: any) {
    console.error("[PUT /api/ops/products/[id] error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    await ensureDatabaseSchema();

    // Clean up order items referencing this product first to prevent FK constraint violation
    await prisma.orderItem.deleteMany({
      where: { productId: id },
    });

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Product "${existingProduct.title}" deleted successfully.`,
    });
  } catch (error: any) {
    console.error("[DELETE /api/ops/products/[id] error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete product." },
      { status: 500 }
    );
  }
}
