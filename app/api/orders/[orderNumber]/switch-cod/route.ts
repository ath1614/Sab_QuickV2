import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { orderNumber } = params;
    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: "Order number is required." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    // Verify ownership
    if (order.customerId !== session.user.id && session.user.role !== "OWNER") {
      return NextResponse.json(
        { success: false, error: "Access denied to this order." },
        { status: 403 }
      );
    }

    // Only an unpaid, still-pending online checkout may switch to COD. A paid,
    // delivered, cancelled, or already-fulfilling order must never be rewritten.
    if (
      order.status !== OrderStatus.PENDING ||
      order.paymentStatus !== PaymentStatus.PENDING ||
      order.paymentMethod !== PaymentMethod.ONLINE_PREPAID
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "This order can no longer be switched to Cash on Delivery.",
          code: "ORDER_NOT_SWITCHABLE",
        },
        { status: 409 }
      );
    }

    const claimed = await prisma.order.updateMany({
      where: {
        id: order.id,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.ONLINE_PREPAID,
      },
      data: {
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.CONFIRMED,
      },
    });

    if (claimed.count === 0) {
      return NextResponse.json(
        { success: false, error: "This order changed while you were switching it." },
        { status: 409 }
      );
    }

    const updatedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });

    // Notify dark store dispatch channel via Redis
    try {
      await redis.publish(
        "orders:dispatch",
        JSON.stringify({
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          customerId: updatedOrder.customerId,
          totalAmount: updatedOrder.totalAmount,
          deliveryOtp: updatedOrder.deliveryOtp,
          paymentMethod: "CASH_ON_DELIVERY",
          paymentStatus: "PENDING",
          createdAt: updatedOrder.createdAt,
        })
      );
    } catch (redisErr) {
      console.warn("[Redis publish error on switch-cod]:", redisErr);
    }

    return NextResponse.json({
      success: true,
      orderNumber: updatedOrder.orderNumber,
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      paymentMethod: updatedOrder.paymentMethod,
    });
  } catch (error: any) {
    console.error("[switch-cod error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to switch to Cash on Delivery." },
      { status: 500 }
    );
  }
}
