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

    const secret = process.env.RAZORPAY_KEY_SECRET || "your_razorpay_secret";

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
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.CONFIRMED,
        razorpayPaymentId,
        razorpaySignature,
      },
    });

    // Notify packer tablets and dispatch boards via Redis Pub/Sub
    await updateOrderStatus(orderId, OrderStatus.CONFIRMED);

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
