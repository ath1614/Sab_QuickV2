import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createCashfreeOrder } from "@/lib/cashfree";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import { isOnlinePaymentsEnabled } from "@/lib/env";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createCashfreeOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    if (!isOnlinePaymentsEnabled()) {
      return NextResponse.json(
        { error: "Online payments are temporarily unavailable. Please choose cash on delivery or UPI at delivery." },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    await ensureDatabaseSchema();

    const body = await req.json().catch(() => ({}));
    const parseResult = createCashfreeOrderSchema.safeParse(body);
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
      include: {
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    // Verify ownership
    if (order.customerId !== session.user.id && session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Access denied to this order." },
        { status: 403 }
      );
    }

    // Never derive the return URL from Origin/Host: an attacker could make
    // Cashfree redirect a paying customer to their own site after checkout.
    const configuredBase = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!configuredBase) {
      return NextResponse.json(
        { error: "Payment return URL is not configured on the server." },
        { status: 500 }
      );
    }

    let baseOrigin: string;
    try {
      baseOrigin = new URL(configuredBase).origin;
    } catch {
      return NextResponse.json(
        { error: "Payment return URL is not configured correctly." },
        { status: 500 }
      );
    }

    if (order.paymentStatus !== "PENDING" || order.status !== "PENDING") {
      return NextResponse.json(
        { error: "This order is no longer awaiting payment." },
        { status: 409 }
      );
    }

    const returnUrl = `${baseOrigin}/pay/verify?order_id=${encodeURIComponent(order.orderNumber)}`;

    const customerPhone = (order.customer?.phone || session.user.phone || "").replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(customerPhone)) {
      return NextResponse.json(
        { error: "A verified mobile number is required for online payment. Please log in again." },
        { status: 400 }
      );
    }

    const cashfreeRes = await createCashfreeOrder({
      orderId: order.orderNumber,
      orderAmount: order.totalAmount,
      customerId: order.customerId,
      customerPhone,
      customerName: order.customer?.name || session.user.name || "Customer",
      customerEmail: order.customer?.email || session.user.email || undefined,
      returnUrl,
    });

    // Save Cashfree order details on Order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        cashfreeOrderId: cashfreeRes.cfOrderId,
        cashfreeMerchantOrderId: cashfreeRes.merchantOrderId,
      },
    });

    return NextResponse.json({
      success: true,
      paymentSessionId: cashfreeRes.paymentSessionId,
      orderId: order.orderNumber,
      cfOrderId: cashfreeRes.cfOrderId,
      mode: cashfreeRes.mode,
      isMock: cashfreeRes.isMock,
      returnUrl,
    });
  } catch (error: any) {
    console.error("[POST /api/payments/cashfree/create-order error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Cashfree payment order." },
      { status: 500 }
    );
  }
}
