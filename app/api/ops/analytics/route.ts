import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
        { error: "Forbidden: Manager or Owner role required." },
        { status: 403 }
      );
    }

    // 1. Time Boundaries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 2. Fetch today's orders
    const todayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfToday },
      },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        packedAt: true,
      },
    });

    // Today's GMV: Sum of totalAmount excluding CANCELLED
    const validOrders = todayOrders.filter(
      (o) => o.status !== OrderStatus.CANCELLED
    );
    const todayGMV = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Completed orders
    const completedOrders = todayOrders.filter(
      (o) => o.status === OrderStatus.DELIVERED
    ).length;

    // Active orders in pipeline
    const activeStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.PACKING,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.OUT_FOR_DELIVERY,
    ];
    const activeOrders = todayOrders.filter((o) =>
      activeStatuses.includes(o.status)
    ).length;

    // Average Packing Time (Duration between createdAt and packedAt in minutes)
    const packedOrders = todayOrders.filter((o) => o.packedAt !== null);
    let avgPackingTimeMinutes = 2.4; // Dark store standard baseline
    if (packedOrders.length > 0) {
      const totalMinutes = packedOrders.reduce((sum, o) => {
        const diff =
          (new Date(o.packedAt!).getTime() - new Date(o.createdAt).getTime()) /
          60000;
        return sum + Math.max(0.5, diff);
      }, 0);
      avgPackingTimeMinutes =
        Math.round((totalMinutes / packedOrders.length) * 10) / 10;
    }

    // 3. Low stock products (stockCount < 15 or isAvailable === false)
    const lowStockProducts = await prisma.product.findMany({
      where: {
        OR: [{ stockCount: { lt: 15 } }, { isAvailable: false }],
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { stockCount: "asc" },
    });

    // 4. All products catalog for owner replenishment table
    const allProducts = await prisma.product.findMany({
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ isAvailable: "asc" }, { stockCount: "asc" }],
    });

    return NextResponse.json({
      success: true,
      metrics: {
        todayGMV,
        completedOrders,
        activeOrders,
        avgPackingTimeMinutes,
        lowStockCount: lowStockProducts.length,
        totalProductsCount: allProducts.length,
      },
      lowStockProducts,
      allProducts,
    });
  } catch (error: any) {
    console.error("[GET /api/ops/analytics error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch operations analytics." },
      { status: 500 }
    );
  }
}
