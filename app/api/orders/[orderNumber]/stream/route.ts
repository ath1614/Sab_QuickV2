import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: {
    orderNumber: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { orderNumber } = params;

    // 1. Session & Role Authentication Check
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch Order from PostgreSQL
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        address: true,
        customer: {
          select: { id: true, name: true, phone: true },
        },
        rider: {
          include: {
            riderProfile: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Order not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Authorization: Owner or authorized internal staff
    const userRole = session.user.role;
    const isOwner = session.user.id === order.customerId;
    const isAuthorizedStaff = ["RIDER", "PACKER", "MANAGER", "OWNER"].includes(
      userRole
    );

    if (!isOwner && !isAuthorizedStaff) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You do not have access to track this order." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Setup Server-Sent Events (SSE) Stream
    const encoder = new TextEncoder();
    const subscriber = redis.duplicate();

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial snapshot event
        const initialSnapshot = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryOtp: order.deliveryOtp,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          handlingFee: order.handlingFee,
          tipAmount: order.tipAmount,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
          packedAt: order.packedAt,
          deliveredAt: order.deliveredAt,
          address: {
            id: order.address.id,
            label: order.address.label,
            flatBuilding: order.address.flatBuilding,
            streetArea: order.address.streetArea,
            landmark: order.address.landmark,
            latitude: order.address.latitude,
            longitude: order.address.longitude,
          },
          rider: order.rider
            ? {
                id: order.rider.id,
                name: order.rider.name,
                phone: order.rider.phone,
                vehicleDetails:
                  order.rider.riderProfile?.vehicleDetails || null,
              }
            : null,
          items: order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            title: item.product.title,
            unitQuantity: item.product.unitQuantity,
            imageUrl: item.product.imageUrl,
            price: item.price,
            quantity: item.quantity,
          })),
        };

        controller.enqueue(
          encoder.encode(
            `event: initial_state\ndata: ${JSON.stringify(initialSnapshot)}\n\n`
          )
        );

        // Subscribe to real-time status updates on Redis channel
        try {
          await subscriber.subscribe(`orders:status:${order.id}`);

          subscriber.on("message", (channel, message) => {
            if (channel === `orders:status:${order.id}`) {
              controller.enqueue(
                encoder.encode(`event: status_update\ndata: ${message}\n\n`)
              );
            }
          });
        } catch (subErr) {
          console.error("[SSE Redis Subscriber Error]:", subErr);
        }

        // Periodic keep-alive ping to prevent proxy/browser timeout
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            clearInterval(pingInterval);
          }
        }, 15000);

        // Handle client disconnection
        req.signal.addEventListener("abort", () => {
          clearInterval(pingInterval);
          subscriber.disconnect();
          try {
            controller.close();
          } catch {
            // Stream already closed
          }
        });
      },
      cancel() {
        subscriber.disconnect();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("[SSE Streaming Route Error]:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to establish SSE stream." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
