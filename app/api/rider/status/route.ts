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

    if (session.user.role !== "RIDER") {
      return NextResponse.json(
        { error: "Forbidden: Rider role required." },
        { status: 403 }
      );
    }

    const riderId = session.user.id;

    // 1. Get or Create RiderProfile
    let profile = await prisma.riderProfile.findUnique({
      where: { userId: riderId },
    });

    if (!profile) {
      profile = await prisma.riderProfile.create({
        data: {
          userId: riderId,
          isOnline: false,
          vehicleDetails: "Electric Two-Wheeler (SabQuick Express)",
        },
      });
    }

    // 2. Aggregate Today's Metrics
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Delivered orders for this rider
    const completedOrders = await prisma.order.findMany({
      where: {
        riderId,
        status: OrderStatus.DELIVERED,
        updatedAt: { gte: startOfToday },
      },
      select: {
        id: true,
        totalAmount: true,
        tipAmount: true,
        paymentMethod: true,
        paymentStatus: true,
      },
    });

    const completedOrdersCount = completedOrders.length;

    // Sum of collected cash / doorstep UPI
    const totalCollectedCash = completedOrders
      .filter(
        (o) =>
          (o.paymentMethod === "UPI_DOORSTEP" ||
            o.paymentMethod === "CASH_ON_DELIVERY") &&
          o.paymentStatus === "PAID"
      )
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Total Tips earned
    const totalTips = completedOrders.reduce((sum, o) => sum + o.tipAmount, 0);

    // Formula: ₹30 flat base payout per delivered order + 100% customer tips
    const basePayoutPerOrder = 30;
    const estimatedEarnings = completedOrdersCount * basePayoutPerOrder + totalTips;

    // 3. Active Assigned Order for this Rider
    const activeOrder = await prisma.order.findFirst({
      where: {
        riderId,
        status: { in: [OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY] },
      },
      include: {
        address: true,
        customer: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                unitQuantity: true,
                imageUrl: true,
                salePrice: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 4. Available Orders Ready for Pickup (unassigned)
    const availableOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.READY_FOR_PICKUP,
        riderId: null,
      },
      include: {
        address: true,
        customer: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                unitQuantity: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      isOnline: profile.isOnline,
      vehicleDetails: profile.vehicleDetails,
      stats: {
        completedOrdersCount,
        totalCollectedCash,
        totalTips,
        basePayoutPerOrder,
        estimatedEarnings,
      },
      activeOrder,
      availableOrders,
    });
  } catch (error: any) {
    console.error("[GET /api/rider/status error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch rider status" },
      { status: 500 }
    );
  }
}
