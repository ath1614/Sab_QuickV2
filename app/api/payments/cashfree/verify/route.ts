import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { updateOrderStatus } from "@/lib/orderStatus";
import { getCashfreeOrderPayments, isCashfreeConfigured } from "@/lib/cashfree";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import { z } from "zod";

export const dynamic = "force-dynamic";

const verifyCashfreeSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const body = await req.json().catch(() => ({}));
    const parseResult = verifyCashfreeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId } = parseResult.data;

    // Find order by ID or orderNumber
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    // If already paid, return early with success
    if (order.paymentStatus === PaymentStatus.PAID) {
      return NextResponse.json({
        success: true,
        orderNumber: order.orderNumber,
        status: order.status,
        message: "Order is already confirmed and paid.",
      });
    }

    // Query Cashfree for payment attempts
    const payments = await getCashfreeOrderPayments(order.orderNumber);

    // Look for successful transaction
    const successfulPayment = payments.find(
      (p) => p.payment_status === "SUCCESS"
    );

    if (!successfulPayment) {
      // In dev with mock configuration
      if (!isCashfreeConfigured && process.env.NODE_ENV !== "production") {
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
            cashfreePaymentId: `mock_pay_${Date.now()}`,
            cashfreePaymentStatus: "SUCCESS",
          },
        });

        await updateOrderStatus(order.id, OrderStatus.CONFIRMED);

        return NextResponse.json({
          success: true,
          orderNumber: updatedOrder.orderNumber,
          message: "Mock payment verified successfully. Order confirmed.",
        });
      }

      const latestFailure = payments[0];
      return NextResponse.json(
        {
          error:
            latestFailure?.payment_message ||
            "Payment has not been completed or is still processing.",
          payments,
        },
        { status: 400 }
      );
    }

    // Mark as PAID and CONFIRMED in database
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.CONFIRMED,
        cashfreePaymentId: String(successfulPayment.cf_payment_id),
        cashfreePaymentStatus: "SUCCESS",
      },
    });

    // Broadcast to packers and rider dispatch via Redis Pub/Sub
    await updateOrderStatus(order.id, OrderStatus.CONFIRMED);

    return NextResponse.json({
      success: true,
      orderNumber: updatedOrder.orderNumber,
      message: "Cashfree payment verified successfully. Order confirmed!",
    });
  } catch (error: any) {
    console.error("[POST /api/payments/cashfree/verify error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify Cashfree payment." },
      { status: 500 }
    );
  }
}
