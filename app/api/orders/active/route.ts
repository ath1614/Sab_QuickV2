import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ order: null });
    }

    const activeOrder = await prisma.order.findFirst({
      where: {
        customerId: session.user.id,
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PACKING,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.OUT_FOR_DELIVERY,
          ],
        },
        // Exclude online orders where payment has not been completed / paid
        NOT: {
          paymentMethod: "CASHFREE",
          paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        rider: {
          include: {
            riderProfile: true,
          },
        },
      },
    });

    if (!activeOrder) {
      return NextResponse.json({ order: null });
    }

    const createdTime = new Date(activeOrder.createdAt).getTime();
    const targetDeliveryTime = createdTime + 15 * 60 * 1000;
    const diffMs = targetDeliveryTime - Date.now();
    const etaMinutes = Math.max(1, Math.min(15, Math.ceil(diffMs / 60000)));

    const itemsCount = activeOrder.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    return NextResponse.json({
      order: {
        id: activeOrder.id,
        orderNumber: activeOrder.orderNumber,
        status: activeOrder.status,
        totalAmount: activeOrder.totalAmount,
        deliveryOtp: activeOrder.deliveryOtp,
        createdAt: activeOrder.createdAt.toISOString(),
        etaMinutes,
        itemsCount,
        rider: activeOrder.rider
          ? {
              id: activeOrder.rider.id,
              name: activeOrder.rider.name,
              phone: activeOrder.rider.phone,
              vehicleDetails:
                activeOrder.rider.riderProfile?.vehicleDetails || null,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/orders/active error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch active order." },
      { status: 500 }
    );
  }
}
