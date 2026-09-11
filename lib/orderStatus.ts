import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { OrderStatus } from "@prisma/client";

export interface StatusUpdatePayload {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  packedAt: Date | null;
  deliveredAt: Date | null;
  rider: {
    id: string;
    name: string | null;
    phone: string | null;
    vehicleDetails: string | null;
  } | null;
  updatedAt: Date;
}

/**
 * Updates an order status in PostgreSQL via Prisma, applies timestamps,
 * and publishes notifications to Redis pub/sub channels:
 * 1. orders:status:${orderId} (for live customer tracking SSE)
 * 2. orders:dispatch (for manager and rider real-time dashboards)
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  riderId?: string
) {
  const updateData: any = {
    status: newStatus,
  };

  if (riderId) {
    updateData.riderId = riderId;
  }

  if (newStatus === OrderStatus.PACKING) {
    updateData.packedAt = null;
  } else if (newStatus === OrderStatus.READY_FOR_PICKUP) {
    updateData.packedAt = new Date();
  }

  if (newStatus === OrderStatus.DELIVERED) {
    updateData.deliveredAt = new Date();
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      address: true,
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

  const payload: StatusUpdatePayload = {
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.orderNumber,
    status: updatedOrder.status,
    packedAt: updatedOrder.packedAt,
    deliveredAt: updatedOrder.deliveredAt,
    rider: updatedOrder.rider
      ? {
          id: updatedOrder.rider.id,
          name: updatedOrder.rider.name,
          phone: updatedOrder.rider.phone,
          vehicleDetails:
            updatedOrder.rider.riderProfile?.vehicleDetails || null,
        }
      : null,
    updatedAt: updatedOrder.updatedAt,
  };

  // 1. Publish to order-specific tracking channel
  try {
    await redis.publish(
      `orders:status:${orderId}`,
      JSON.stringify(payload)
    );
  } catch (err) {
    console.warn(`[Redis Publish Warning orders:status:${orderId}]:`, err);
  }

  // 2. Publish to general store dispatch channel
  try {
    await redis.publish(
      "orders:dispatch",
      JSON.stringify({
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        riderId: updatedOrder.riderId,
        updatedAt: updatedOrder.updatedAt,
      })
    );
  } catch (err) {
    console.warn("[Redis Publish Warning orders:dispatch]:", err);
  }

  return updatedOrder;
}
