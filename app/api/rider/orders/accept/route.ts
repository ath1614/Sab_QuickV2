import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { updateOrderStatus } from "@/lib/orderStatus";
import { z } from "zod";

export const dynamic = "force-dynamic";

const acceptOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
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

    if (session.user.role !== "RIDER") {
      return NextResponse.json(
        { error: "Forbidden: Rider role required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = acceptOrderSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId } = parseResult.data;
    const riderId = session.user.id;

    // Check if rider already has an active order
    const existingActiveOrder = await prisma.order.findFirst({
      where: {
        riderId,
        status: { in: [OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY] },
      },
    });

    if (existingActiveOrder) {
      return NextResponse.json(
        {
          error: `You already have an active order #${existingActiveOrder.orderNumber} in transit. Please complete it first.`,
        },
        { status: 409 }
      );
    }

    // Atomic transaction: Verify order is available and assign rider
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      if (order.status !== OrderStatus.READY_FOR_PICKUP) {
        throw new Error(
          `Order is not ready for pickup (Current Status: ${order.status}).`
        );
      }

      if (order.riderId !== null) {
        throw new Error("Order has already been accepted by another rider.");
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          riderId,
          status: OrderStatus.OUT_FOR_DELIVERY,
        },
      });
    });

    // Broadcast status update via SSE and Redis pub/sub
    await updateOrderStatus(orderId, OrderStatus.OUT_FOR_DELIVERY, riderId);

    return NextResponse.json({
      success: true,
      orderId,
      message: "Order accepted successfully and in transit.",
    });
  } catch (error: any) {
    console.error("[POST /api/rider/orders/accept error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept order" },
      { status: 400 }
    );
  }
}
