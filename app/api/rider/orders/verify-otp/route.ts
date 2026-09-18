import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { updateOrderStatus } from "@/lib/orderStatus";
import { z } from "zod";

export const dynamic = "force-dynamic";

const verifyOtpSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  enteredOtp: z
    .string()
    .trim()
    .length(4, "Delivery OTP must be exactly 4 digits"),
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

    const userRoles = session.user.roles || [session.user.role];
    if (!userRoles.includes("RIDER") && session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Rider role required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = verifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId, enteredOtp } = parseResult.data;
    const riderId = session.user.id;

    // Fetch order from PostgreSQL
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    if (order.riderId !== riderId) {
      return NextResponse.json(
        { error: "Forbidden: You are not the assigned delivery partner for this order." },
        { status: 403 }
      );
    }

    if (order.status === OrderStatus.DELIVERED) {
      return NextResponse.json(
        { error: "Order has already been marked as delivered." },
        { status: 400 }
      );
    }

    // Compare OTP
    if (enteredOtp.trim() !== order.deliveryOtp.trim()) {
      return NextResponse.json(
        { error: "Invalid Delivery OTP. Please verify the 4-digit code with customer." },
        { status: 400 }
      );
    }

    // OTP matched: Update order to DELIVERED and paymentStatus to PAID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
        paymentStatus: PaymentStatus.PAID,
      },
    });

    // Broadcast SSE update to customer screen and dispatch dashboard
    await updateOrderStatus(orderId, OrderStatus.DELIVERED, riderId);

    return NextResponse.json({
      success: true,
      message: "Order delivered and verified successfully.",
      orderNumber: order.orderNumber,
    });
  } catch (error: any) {
    console.error("[POST /api/rider/orders/verify-otp error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify OTP." },
      { status: 500 }
    );
  }
}
