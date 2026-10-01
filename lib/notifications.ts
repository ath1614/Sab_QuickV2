import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { getMessaging } from "firebase-admin/messaging";
import prisma from "@/lib/prisma";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import { Role, OrderStatus } from "@prisma/client";

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  channelId?: string;
}

/**
 * Sends a push notification to all active devices registered to a specific user.
 * Cleans up invalid or expired FCM registration tokens automatically.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ successCount: number; failureCount: number }> {
  try {
    await ensureDatabaseSchema();

    const deviceTokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: { id: true, token: true, platform: true },
    });

    if (deviceTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const app = getFirebaseAdminApp();
    const messaging = getMessaging(app);

    const tokens = deviceTokens.map((d) => d.token);
    const channelId = payload.channelId || "sabquick_orders";

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: "high",
        notification: {
          channelId,
          sound: payload.sound || "default",
          icon: "ic_stat_notification",
          color: "#0B6E4F",
          clickAction: "FLUTTER_NOTIFICATION_CLICK", // Compatible across platforms
        },
      },
      apns: {
        payload: {
          aps: {
            sound: payload.sound || "default",
            badge: 1,
            alert: {
              title: payload.title,
              body: payload.body,
            },
          },
        },
      },
    });

    // Clean up stale or unregistered tokens
    const staleTokenIds: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success && res.error) {
        const code = res.error.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          staleTokenIds.push(deviceTokens[idx].id);
        }
      }
    });

    if (staleTokenIds.length > 0) {
      await prisma.deviceToken.deleteMany({
        where: { id: { in: staleTokenIds } },
      }).catch((e) => console.warn("[FCM Cleanup Warning]:", e));
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error: any) {
    console.error("[FCM sendPushToUser Error]:", error?.message || error);
    return { successCount: 0, failureCount: 0 };
  }
}

/**
 * Sends a push notification to all staff members with specified roles (e.g. OWNER, PACKER, RIDER).
 */
export async function sendPushToRoles(
  roles: Role[],
  payload: PushNotificationPayload
): Promise<void> {
  try {
    await ensureDatabaseSchema();

    const staffUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: roles } },
          { roles: { hasSome: roles } },
        ],
      },
      select: { id: true },
    });

    if (staffUsers.length === 0) return;

    await Promise.all(
      staffUsers.map((user) => sendPushToUser(user.id, payload))
    );
  } catch (error: any) {
    console.error("[FCM sendPushToRoles Error]:", error?.message || error);
  }
}

/**
 * Dispatches customer notification based on order status change.
 */
export async function sendOrderStatusPushNotification(
  orderId: string,
  newStatus: OrderStatus
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        rider: true,
      },
    });

    if (!order || !order.customerId) return;

    let title = "";
    let body = "";

    switch (newStatus) {
      case OrderStatus.CONFIRMED:
        title = "Order Confirmed! ⚡";
        body = `Your order #${order.orderNumber} is confirmed! Our dark store team is packing it now.`;
        break;

      case OrderStatus.PACKING:
        title = "Assembling Fresh Items 🛍️";
        body = `Order #${order.orderNumber} is being packed fresh at the SabQuick dark store.`;
        break;

      case OrderStatus.READY_FOR_PICKUP:
        title = "Packed & Ready! 📦";
        body = `Order #${order.orderNumber} is packed and ready for delivery partner pickup.`;
        break;

      case OrderStatus.OUT_FOR_DELIVERY:
        title = "Out for Delivery! 🚴💨";
        body = order.rider?.name
          ? `${order.rider.name} is on the way with your order #${order.orderNumber} (10-15 mins).`
          : `Your SabQuick rider is speeding to your doorstep with order #${order.orderNumber} (10-15 mins).`;
        break;

      case OrderStatus.DELIVERED:
        title = "Order Delivered! 🎉";
        body = `Order #${order.orderNumber} has been delivered. Thank you for shopping with SabQuick!`;
        break;

      case OrderStatus.CANCELLED:
        title = "Order Cancelled ⚠️";
        body = `Order #${order.orderNumber} was cancelled. Any online payment has been refunded.`;
        break;

      default:
        return;
    }

    await sendPushToUser(order.customerId, {
      title,
      body,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: newStatus,
        url: `/orders/${order.orderNumber}`,
      },
    });
  } catch (error: any) {
    console.error("[FCM sendOrderStatusPushNotification Error]:", error?.message || error);
  }
}

/**
 * Alerts store owner and packers of a newly placed order.
 */
export async function sendNewOrderStaffAlert(order: {
  id: string;
  orderNumber: string;
  totalAmount: number;
  itemCount: number;
}): Promise<void> {
  const title = `🔔 New Order #${order.orderNumber}`;
  const body = `₹${order.totalAmount.toFixed(2)} • ${order.itemCount} item${order.itemCount === 1 ? "" : "s"} needs packing!`;

  await sendPushToRoles([Role.OWNER, Role.PACKER, Role.MANAGER], {
    title,
    body,
    channelId: "sabquick_staff_orders",
    sound: "order_alert",
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      url: `/packer`,
    },
  });
}
