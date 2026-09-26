import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createRazorpayOrderSchema = z.object({
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

    const body = await req.json().catch(() => ({}));
    const parseResult = createRazorpayOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId } = parseResult.data;

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

    // Amount in paise (1 INR = 100 paise)
    const amount = Math.round(order.totalAmount * 100);

    let razorpayOrderId: string;

    try {
      const rzpOrder = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt: order.orderNumber,
      });
      razorpayOrderId = rzpOrder.id;
    } catch (err: any) {
      // In development / test environments with placeholder dummy keys, provide a fallback test order ID
      const isPlaceholder =
        !process.env.RAZORPAY_KEY_ID ||
        process.env.RAZORPAY_KEY_ID.includes("xxxxxx") ||
        process.env.RAZORPAY_KEY_SECRET === "your_razorpay_secret";

      if (isPlaceholder || process.env.NODE_ENV !== "production") {
        console.warn(
          "Razorpay API error with placeholder/test keys. Using local test order ID for development:",
          err?.message || err
        );
        razorpayOrderId = `order_test_${order.orderNumber.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}`;
      } else {
        throw err;
      }
    }

    // Update order in PostgreSQL with razorpayOrderId
    await prisma.order.update({
      where: { id: orderId },
      data: {
        razorpayOrderId,
      },
    });

    return NextResponse.json({
      success: true,
      razorpayOrderId,
      amount,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "rzp_test_xxxxxx",
    });
  } catch (error: any) {
    console.error("[POST /api/payments/razorpay/create-order error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Razorpay order." },
      { status: 500 }
    );
  }
}
