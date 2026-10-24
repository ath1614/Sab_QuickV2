import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { updateOrderStatus } from "@/lib/orderStatus";
import { z } from "zod";

export const dynamic = "force-dynamic";

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
  razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = verifyPaymentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parseResult.data;

    const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!secret || secret === "your_razorpay_secret") {
      return NextResponse.json(
        { error: "Razorpay payment gateway secret is not configured on this server." },
        { status: 500 }
      );
    }

    // Verify order exists and matches razorpayOrderId
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json(
        { error: "Razorpay order ID does not match registered order." },
        { status: 400 }
      );
    }

    // Verify HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Update order in PostgreSQL
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.CONFIRMED,
        razorpayPaymentId,
        razorpaySignature,
      },
      include: { items: true },
    });

    // Notify packer tablets and dispatch boards via Redis Pub/Sub
    await updateOrderStatus(orderId, OrderStatus.CONFIRMED);

    // Prepaid orders no longer alert staff at creation: the new-order push is
    // sent here, once the payment is actually confirmed.
    try {
      const { sendNewOrderStaffAlert } = await import("@/lib/notifications");
      sendNewOrderStaffAlert({
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        totalAmount: updatedOrder.totalAmount,
        itemCount: updatedOrder.items.length,
      }).catch((e) => console.warn("[FCM New Order Alert Warning]:", e));
    } catch (pushErr) {
      console.warn("[Push Notification Import Warning]:", pushErr);
    }

    return NextResponse.json({
      success: true,
      orderNumber: updatedOrder.orderNumber,
      message: "Payment verified successfully. Order confirmed.",
    });
  } catch (error: any) {
    console.error("[POST /api/payments/razorpay/verify error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment." },
      { status: 500 }
    );
  }
}
