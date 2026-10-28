import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

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

    const effectiveRoles = session.user.roles?.length
      ? session.user.roles
      : [session.user.role];
    const isStaff = effectiveRoles.includes("OWNER") || effectiveRoles.includes("MANAGER");

    if (order.customerId !== session.user.id && !isStaff) {
      return NextResponse.json(
        { error: "Forbidden: Access denied to verify this order." },
        { status: 403 }
      );
    }

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.DELIVERED) {
      return NextResponse.json(
        { error: "This order can no longer be confirmed as paid." },
        { status: 409 }
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

    // Query Cashfree for payment attempts. A recovered/retried order lives under
    // a suffixed merchant order id, so always ask for the id we actually created.
    const payments = await getCashfreeOrderPayments(
      order.cashfreeMerchantOrderId || order.orderNumber
    );

    // Look for successful transaction
    const successfulPayment = payments.find(
      (p) =>
        p.payment_status === "SUCCESS" &&
        p.payment_amount === order.totalAmount &&
        p.payment_currency === "INR"
    );

    if (payments.some((p) => p.payment_status === "SUCCESS") && !successfulPayment) {
      return NextResponse.json(
        {
          error:
            "A payment was found but its amount or currency does not match this order. The store will review it.",
        },
        { status: 409 }
      );
    }

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
      include: {
        items: true,
      },
    });

    // Broadcast to packers and rider dispatch via Redis Pub/Sub
    await updateOrderStatus(order.id, OrderStatus.CONFIRMED);

    // Dispatch New Order Alert to store staff (Packers, Managers, Owner)
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
