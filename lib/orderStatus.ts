import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import { createCashfreeRefund } from "@/lib/cashfree";

export interface StatusUpdatePayload {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
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
 * initiates automated refunds if cancelled after payment, restores inventory,
 * and publishes notifications to Redis pub/sub channels:
 * 1. orders:status:${orderId} (for live customer tracking SSE)
 * 2. orders:dispatch (for manager and rider real-time dashboards)
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  riderId?: string
) {
  // Fetch existing order to check payment and stock details
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!existingOrder) {
    throw new Error(`Order ${orderId} not found`);
  }

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

  // Handle Cancellation: Automatic Refund & Stock Restoration
  if (newStatus === OrderStatus.CANCELLED) {
    const isOnlinePrepaid =
      existingOrder.paymentMethod === PaymentMethod.ONLINE_PREPAID ||
      existingOrder.paymentMethod === PaymentMethod.CASHFREE ||
      existingOrder.paymentMethod === (PaymentMethod as any).ONLINE_UPI ||
      existingOrder.paymentMethod === PaymentMethod.RAZORPAY;

    if (existingOrder.paymentStatus === PaymentStatus.PAID && isOnlinePrepaid) {
      try {
        console.log(
          `[Auto-Refund] Processing Cashfree refund of ₹${existingOrder.totalAmount} for cancelled order ${existingOrder.orderNumber}`
        );
        await createCashfreeRefund({
          orderId: existingOrder.orderNumber,
          refundAmount: existingOrder.totalAmount,
          refundNote: `Automated refund for cancelled order #${existingOrder.orderNumber}`,
          refundSpeed: "STANDARD",
        });
        updateData.paymentStatus = PaymentStatus.REFUNDED;
      } catch (refundErr) {
        console.error(
          `[Auto-Refund Error] Failed to process Cashfree refund for ${existingOrder.orderNumber}:`,
          refundErr
        );
      }
    }

    // Atomically restore stock back to dark store catalog
    try {
      for (const item of existingOrder.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stockCount: { increment: item.quantity },
            isAvailable: true,
          },
        });
      }
      if (existingOrder.couponId) {
        await prisma.coupon.update({
          where: { id: existingOrder.couponId },
          data: { usedCount: { decrement: 1 } },
        });
      }
      await redis.del("cache:products:home:v1").catch(() => {});
    } catch (stockErr) {
      console.warn(`[Stock Restoration Error] Order ${existingOrder.orderNumber}:`, stockErr);
    }
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

  // 3. Dispatch Firebase Cloud Messaging push notification to customer device
  try {
    const { sendOrderStatusPushNotification } = await import("@/lib/notifications");
    sendOrderStatusPushNotification(orderId, newStatus).catch((pushErr) => {
      console.warn(`[Push Notification Dispatch Warning order:${orderId}]:`, pushErr);
    });
  } catch (err) {
    console.warn(`[Push Notification Import Warning order:${orderId}]:`, err);
  }

  return updatedOrder;
}
