import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/orderStatus";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  status: z.nativeEnum(OrderStatus),
  riderId: z.string().optional(),
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

    const userRole = session.user.role;
    if (!["PACKER", "MANAGER", "OWNER"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: Store operations authorization required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = updateStatusSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId, status, riderId } = parseResult.data;

    const effectiveRoles = session.user.roles?.length
      ? session.user.roles
      : [userRole];
    const isManager = effectiveRoles.includes("MANAGER") || effectiveRoles.includes("OWNER");

    // Packers may move an order through packing, but they may not cancel it,
    // mark it delivered, or perform any manager-only transition.
    if (!isManager && status !== OrderStatus.PACKING && status !== OrderStatus.READY_FOR_PICKUP) {
      return NextResponse.json(
        { error: "Forbidden: a Packer cannot perform this order transition." },
        { status: 403 }
      );
    }

    // Update status and broadcast via SSE
    const updated = await updateOrderStatus(orderId, status, riderId);

    // If rider was assigned, dispatch high-priority push notification to rider
    if (riderId) {
      try {
        const { sendRiderAssignedAlert } = await import("@/lib/notifications");
        sendRiderAssignedAlert(riderId, {
          id: updated.id,
          orderNumber: updated.orderNumber,
        }).catch((e) => console.warn("[FCM Rider Alert Warning]:", e));
      } catch (importErr) {
        console.warn("[FCM Import Warning]:", importErr);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      packedAt: updated.packedAt,
      deliveredAt: updated.deliveredAt,
      riderId: updated.riderId,
    });
  } catch (error: any) {
    console.error("[POST /api/ops/orders/status error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update order status." },
      { status: 500 }
    );
  }
}
