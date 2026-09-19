import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createCashfreeOrder } from "@/lib/cashfree";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createCashfreeOrderSchema = z.object({
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

    const origin =
      req.headers.get("origin") ||
      req.headers.get("host") ||
      process.env.NEXTAUTH_URL ||
      "https://srv1985371.hstgr.cloud";

    const returnUrl = origin.startsWith("http")
      ? `${origin}/orders/${order.orderNumber}`
      : `https://${origin}/orders/${order.orderNumber}`;

    const cashfreeRes = await createCashfreeOrder({
      orderId: order.orderNumber,
      orderAmount: order.totalAmount,
      customerId: order.customerId,
      customerPhone: order.customer?.phone || session.user.phone || "9999999999",
      customerName: order.customer?.name || session.user.name || "Customer",
      customerEmail: order.customer?.email || session.user.email || undefined,
      returnUrl,
    });

    // Save Cashfree order details on Order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        cashfreeOrderId: cashfreeRes.cfOrderId,
      },
    });

    return NextResponse.json({
      success: true,
      paymentSessionId: cashfreeRes.paymentSessionId,
      orderId: order.orderNumber,
      cfOrderId: cashfreeRes.cfOrderId,
      mode: cashfreeRes.mode,
      isMock: cashfreeRes.isMock,
    });
  } catch (error: any) {
    console.error("[POST /api/payments/cashfree/create-order error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Cashfree payment order." },
      { status: 500 }
    );
  }
}
