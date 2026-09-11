import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const toggleStockSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  isAvailable: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userRole = session.user.role;
    if (!["MANAGER", "OWNER"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: Manager or Owner role required to modify inventory." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = toggleStockSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { productId, isAvailable } = parseResult.data;

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { isAvailable },
      select: {
        id: true,
        title: true,
        isAvailable: true,
        stockCount: true,
      },
    });

    return NextResponse.json({
      success: true,
      productId: updatedProduct.id,
      title: updatedProduct.title,
      isAvailable: updatedProduct.isAvailable,
      stockCount: updatedProduct.stockCount,
    });
  } catch (error: any) {
    console.error("[POST /api/ops/inventory/toggle-stock error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update inventory status." },
      { status: 500 }
    );
  }
}
