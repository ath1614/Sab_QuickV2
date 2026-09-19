import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { updateOrderStatus } from "@/lib/orderStatus";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";
    const rawBody = await req.text();

    if (!signature || !timestamp) {
      return NextResponse.json(
        { error: "Missing webhook signature or timestamp headers." },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA256 signature
    const isValid = verifyCashfreeWebhookSignature({
      signature,
      timestamp,
      rawBody,
    });

    if (!isValid && process.env.NODE_ENV === "production") {
      console.warn("⚠️ Invalid Cashfree webhook signature rejected.");
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 401 }
      );
    }

    await ensureDatabaseSchema();

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const eventType = payload.type || payload.event;
    const data = payload.data || {};
    const orderData = data.order || {};
    const paymentData = data.payment || {};

    const orderNumber = orderData.order_id || payload.orderId;
    const cfPaymentId = paymentData.cf_payment_id || payload.referenceId;
    const paymentStatus = paymentData.payment_status || payload.txStatus;

    if (!orderNumber) {
      return NextResponse.json({ message: "No order_id in webhook payload, ignored." });
    }

    // Handle successful payment events
    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus === "SUCCESS") {
      const order = await prisma.order.findFirst({
        where: {
          OR: [{ orderNumber }, { id: orderNumber }],
        },
      });

      if (order && order.paymentStatus !== PaymentStatus.PAID) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
            cashfreePaymentId: String(cfPaymentId || order.cashfreePaymentId || "webhook_verified"),
            cashfreePaymentStatus: "SUCCESS",
          },
        });

        await updateOrderStatus(order.id, OrderStatus.CONFIRMED);
        console.log(`✅ Order ${order.orderNumber} successfully confirmed via Cashfree webhook.`);
      }
    }

    return NextResponse.json({ status: "OK", received: true });
  } catch (error: any) {
    console.error("[POST /api/payments/cashfree/webhook error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal webhook handler error." },
      { status: 500 }
    );
  }
}
