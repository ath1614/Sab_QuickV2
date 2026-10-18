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

    // Resolve any raw 64-char hex APNs tokens to FCM registration tokens
    const validTokens: string[] = [];
    const validTokenRecords: Array<{ id: string; token: string }> = [];

    for (const d of deviceTokens) {
      if (d.platform === "IOS" && /^[a-fA-F0-9]{64}$/.test(d.token)) {
        try {
          const tokenObj = await (app.options.credential as any)?.getAccessToken?.();
          if (tokenObj?.access_token) {
            const exchangeApns = async (isSandbox: boolean) => {
              const res = await fetch("https://iid.googleapis.com/iid/v1:batchImport", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${tokenObj.access_token}`,
                  access_token_auth: "true",
                },
                body: JSON.stringify({
                  application: "com.sabquick.app",
                  sandbox: isSandbox,
                  apns_tokens: [d.token],
                }),
              });
              const data = await res.json().catch(() => null);
              return data?.results?.[0]?.registration_token || null;
            };

            let fcmToken = await exchangeApns(false);
            if (!fcmToken) fcmToken = await exchangeApns(true);

            if (fcmToken) {
              await prisma.deviceToken.update({
                where: { id: d.id },
                data: { token: fcmToken },
              }).catch(() => null);
              validTokens.push(fcmToken);
              validTokenRecords.push({ id: d.id, token: fcmToken });
              continue;
            }
          }
        } catch (exErr) {
          console.warn("[On-the-fly APNs exchange warning]:", exErr);
        }
      } else {
        validTokens.push(d.token);
        validTokenRecords.push({ id: d.id, token: d.token });
      }
    }

    if (validTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const channelId = payload.channelId || "sabquick_orders";

    const response = await messaging.sendEachForMulticast({
      tokens: validTokens,
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
        if (code === "messaging/registration-token-not-registered") {
          staleTokenIds.push(validTokenRecords[idx].id);
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
        const otpNote = order.deliveryOtp ? ` • Share OTP ${order.deliveryOtp}` : "";
        body = order.rider?.name
          ? `${order.rider.name} is on the way with your order #${order.orderNumber}${otpNote} (superfast delivery).`
          : `Your SabQuick rider is speeding to your doorstep with order #${order.orderNumber}${otpNote} (superfast delivery).`;
        break;

      case OrderStatus.DELIVERED:
        title = "Order Delivered! 🎉";
        body = `Order #${order.orderNumber} has been delivered. Thank you for shopping with SabQuick!`;
        break;

      case OrderStatus.CANCELLED:
        title = "Order Cancelled ⚠️";
        body =
          order.paymentStatus === "REFUNDED" || order.paymentStatus === "PAID"
            ? `Order #${order.orderNumber} was cancelled by store. Full refund of ₹${order.totalAmount.toFixed(2)} has been initiated to your original payment method.`
            : `Order #${order.orderNumber} was cancelled.`;
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

/**
 * Alerts assigned delivery partner (Rider) when an order is ready for pickup.
 */
export async function sendRiderAssignedAlert(
  riderId: string,
  order: {
    id: string;
    orderNumber: string;
  }
): Promise<void> {
  const title = `🚴 New Delivery Assigned!`;
  const body = `Order #${order.orderNumber} is ready for pickup at SabQuick Dark Store.`;

  await sendPushToUser(riderId, {
    title,
    body,
    channelId: "sabquick_staff_orders",
    sound: "order_alert",
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      url: `/rider/dashboard`,
    },
  });
}
