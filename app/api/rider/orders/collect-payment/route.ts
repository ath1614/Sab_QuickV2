import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const collectSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  method: z.enum(["UPI_DOORSTEP", "CASH_ON_DELIVERY"], {
    errorMap: () => ({
      message: "Collection method must be UPI_DOORSTEP or CASH_ON_DELIVERY",
    }),
  }),
});

/**
 * Rider marks that they physically collected an offline payment at the
 * doorstep (UPI scan or cash). Records the collector + timestamp so the
 * Owner/Manager Orders Hub and the customer's order view both show
 * "Collected via UPI/Cash" instead of a bare PAID flag.
 */
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
    const isStaff = userRoles.some((r) =>
      ["RIDER", "MANAGER", "OWNER"].includes(r)
    );
    if (!isStaff) {
      return NextResponse.json(
        { error: "Forbidden: Rider or staff role required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = collectSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId, method } = parseResult.data;
    const collectorId = session.user.id;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.paymentStatus === PaymentStatus.PAID && order.offlineCollectedAt) {
      return NextResponse.json(
        {
          success: true,
          message: `Already recorded as collected via ${order.offlineCollectionMethod}.`,
          order,
        },
        { status: 200 }
      );
    }

    const prepaidOnline =
      order.paymentMethod === PaymentMethod.CASHFREE ||
      order.paymentMethod === PaymentMethod.RAZORPAY ||
      order.paymentMethod === PaymentMethod.ONLINE_PREPAID;

    if (prepaidOnline) {
      return NextResponse.json(
        {
          error:
            "This order was prepaid online — no doorstep collection is needed.",
        },
        { status: 400 }
      );
    }

    if (
      order.paymentMethod !== PaymentMethod.UPI_DOORSTEP &&
      order.paymentMethod !== PaymentMethod.CASH_ON_DELIVERY
    ) {
      return NextResponse.json(
        {
          error:
            "Order payment method does not allow doorstep collection.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        offlineCollectionMethod: method,
        offlineCollectedAt: new Date(),
        offlineCollectedBy: collectorId,
      },
      include: {
        offlineCollector: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Recorded: collected via ${method === "UPI_DOORSTEP" ? "UPI" : "Cash"}.`,
      order: updated,
    });
  } catch (error: any) {
    console.error("[POST /api/rider/orders/collect-payment error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record collection." },
      { status: 500 }
    );
  }
}
