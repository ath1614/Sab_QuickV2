import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";

const CLEANUP_THROTTLE_KEY = "order:hygiene:last_run";
const ABANDONED_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Sweeps and cancels abandoned online orders where payment was never completed
 * within 10 minutes, atomically returning the reserved stock back to the dark store.
 *
 * Throttled to execute at most once per 60 seconds across all processes.
 */
export async function cleanupAbandonedOrders(): Promise<number> {
  try {
    // 1. Concurrency throttle via Redis (skip if executed in the last 60 seconds)
    const acquiredLock = await redis.set(CLEANUP_THROTTLE_KEY, Date.now().toString(), "EX", 60, "NX");
    if (!acquiredLock) {
      return 0;
    }

    const cutoffTime = new Date(Date.now() - ABANDONED_TIMEOUT_MS);

    // 2. Query abandoned online orders older than 10 minutes
    const abandonedOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: {
          in: [
            PaymentMethod.ONLINE_PREPAID,
            PaymentMethod.CASHFREE,
            PaymentMethod.RAZORPAY,
          ],
        },
        createdAt: { lt: cutoffTime },
      },
      include: {
        items: true,
      },
      take: 20, // Process in controlled batches
    });

    if (abandonedOrders.length === 0) {
      return 0;
    }

    let cleanedCount = 0;

    for (const order of abandonedOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // Re-check order status within transaction lock
          const freshOrder = await tx.order.findUnique({
            where: { id: order.id },
            select: { status: true, paymentStatus: true },
          });

          if (!freshOrder || freshOrder.paymentStatus === PaymentStatus.PAID || freshOrder.status !== OrderStatus.PENDING) {
            return;
          }

          // A. Restore reserved stock back to the product catalog
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockCount: { increment: item.quantity },
                isAvailable: true,
              },
            });
          }

          // B. Cancel order and mark payment as failed/abandoned
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.CANCELLED,
              paymentStatus: PaymentStatus.FAILED,
            },
          });

          // C. Revert coupon usage count if applied
          if (order.couponId) {
            await tx.coupon.update({
              where: { id: order.couponId },
              data: {
                usedCount: { decrement: 1 },
              },
            });
          }
        });

        cleanedCount++;
      } catch (orderErr) {
        console.warn(`[Order Hygiene] Failed to clean abandoned order ${order.orderNumber}:`, orderErr);
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Order Hygiene] Auto-released stock for ${cleanedCount} abandoned pending order(s).`);
      // Invalidate storefront catalog cache so restored stock displays immediately
      await redis.del("cache:products:home:v1").catch(() => {});
    }

    return cleanedCount;
  } catch (err) {
    console.warn("[Order Hygiene] Error during cleanup sweep:", err);
    return 0;
  }
}
