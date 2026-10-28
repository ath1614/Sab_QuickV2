import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { updateOrderStatus } from "@/lib/orderStatus";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import redis from "@/lib/redis";

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

    // Reject stale/replayed deliveries. Cashfree sends Unix seconds; accept
    // milliseconds too so a dashboard test does not fail a valid event.
    const rawTimestamp = Number(timestamp);
    const timestampMs = rawTimestamp < 1_000_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60_000) {
      return NextResponse.json({ error: "Stale webhook timestamp." }, { status: 401 });
    }

    // Verify HMAC-SHA256 signature
    const isValid = verifyCashfreeWebhookSignature({
      signature,
      timestamp,
      rawBody,
    });

    if (!isValid) {
      console.warn("Invalid Cashfree webhook signature rejected.");
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
    const paymentAmount = Number(paymentData.payment_amount ?? payload.orderAmount);
    const paymentCurrency = String(paymentData.payment_currency || "INR").toUpperCase();

    if (!orderNumber) {
      return NextResponse.json({ message: "No order_id in webhook payload, ignored." });
    }

    // Handle successful payment events
    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus === "SUCCESS") {
      // Cashfree reports the merchant order id. On a recovered/retried payment
      // that id carries a suffix, so match the persisted gateway reference too.
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { orderNumber },
            { id: orderNumber },
            { cashfreeMerchantOrderId: orderNumber },
            { cashfreeOrderId: orderNumber },
          ],
        },
      });

      if (order) {
        // Exact amount and currency are part of the payment contract. A valid
        // signature for a ₹1 payment must never settle a ₹500 order.
        if (
          !Number.isFinite(paymentAmount) ||
          paymentAmount !== order.totalAmount ||
          paymentCurrency !== "INR"
        ) {
          console.warn(
            `[Cashfree Webhook] Amount/currency mismatch for ${order.orderNumber}: got ${paymentAmount} ${paymentCurrency}, expected ${order.totalAmount} INR`
          );
          return NextResponse.json(
            { error: "Payment amount or currency does not match the order." },
            { status: 409 }
          );
        }

        if (order.paymentStatus === PaymentStatus.PAID) {
          return NextResponse.json({ status: "OK", received: true, duplicate: true });
        }

        // Interim replay guard. The durable WebhookEvent table replaces this in
        // the payment-ledger migration; this already prevents concurrent
        // duplicate alerts in the common case.
        const eventKey = `webhook:cashfree:${String(cfPaymentId || order.id)}:${eventType || paymentStatus}`;
        const firstDelivery = await redis.set(eventKey, "1", "EX", 7 * 24 * 60 * 60, "NX");
        if (!firstDelivery) {
          return NextResponse.json({ status: "OK", received: true, duplicate: true });
        }

        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
            cashfreePaymentId: String(cfPaymentId || order.cashfreePaymentId || "webhook_verified"),
            cashfreePaymentStatus: "SUCCESS",
          },
          include: {
            items: true,
          },
        });

        await updateOrderStatus(order.id, OrderStatus.CONFIRMED);

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

        console.log(`Order ${order.orderNumber} successfully confirmed via Cashfree webhook.`);
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
