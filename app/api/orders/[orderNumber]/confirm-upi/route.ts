import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { z } from "zod";

export const dynamic = "force-dynamic";

const confirmUpiSchema = z.object({
  utr: z.string().optional(),
  appUsed: z.string().optional(),
});

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

    const body = await req.json().catch(() => ({}));
    const parseResult = confirmUpiSchema.safeParse(body);
    const utr = parseResult.success && parseResult.data.utr ? parseResult.data.utr.trim() : null;
    const appUsed = parseResult.success && parseResult.data.appUsed ? parseResult.data.appUsed.trim() : "UPI";

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

    const txnId = utr || `UPI-${Date.now()}`;

    // Transition order to PAID and CONFIRMED
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: "CONFIRMED",
        paymentTxnId: txnId,
        offlineCollectionMethod: appUsed,
      },
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
          paymentMethod: updatedOrder.paymentMethod,
          paymentStatus: updatedOrder.paymentStatus,
          paymentTxnId: txnId,
          createdAt: updatedOrder.createdAt,
        })
      );
    } catch (redisErr) {
      console.warn("[Redis publish error on confirm-upi]:", redisErr);
    }

    return NextResponse.json({
      success: true,
      orderNumber: updatedOrder.orderNumber,
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
      paymentTxnId: txnId,
    });
  } catch (error: any) {
    console.error("[confirm-upi error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to confirm UPI payment." },
      { status: 500 }
    );
  }
}
