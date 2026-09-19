import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID or orderNumber is required." },
        { status: 400 }
      );
    }

    // Find the target order belonging to the current user
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
        customerId: session.user.id,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    // Never cancel orders that are already paid or fulfilled
    if (
      order.paymentStatus === PaymentStatus.PAID ||
      order.status === OrderStatus.OUT_FOR_DELIVERY ||
      order.status === OrderStatus.DELIVERED
    ) {
      return NextResponse.json(
        { error: "This order has already been paid or is in delivery and cannot be cancelled." },
        { status: 400 }
      );
    }

    // If already cancelled, return success idempotent
    if (order.status === OrderStatus.CANCELLED) {
      return NextResponse.json({
        success: true,
        orderNumber: order.orderNumber,
        message: "Order is already cancelled.",
      });
    }

    // Atomically restore product stock and mark order as CANCELLED & FAILED
    await prisma.$transaction(async (tx) => {
      // 1. Restore product inventory
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockCount: { increment: item.quantity },
            isAvailable: true,
          },
        });
      }

      // 2. Mark order as CANCELLED and paymentStatus as FAILED
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
        },
      });

      // 3. If a coupon was used, decrement its usedCount
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: {
            usedCount: { decrement: 1 },
          },
        });
      }
    });

    console.log(
      `[Order Cancelled]: ${order.orderNumber} cancelled by user. Reason: ${reason || "Unsuccessful payment / dropped checkout"}`
    );

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      message: "Order cancelled successfully and inventory released.",
    });
  } catch (error: any) {
    console.error("[POST /api/orders/cancel error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel order." },
      { status: 500 }
    );
  }
}
