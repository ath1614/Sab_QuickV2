"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

/**
 * Global Push Notification Lifecycle Controller
 *
 * Manages push notification registration, channel setup, foreground alerts,
 * and deep-linking when a user taps an order status push notification.
 */
export function PushNotificationManager() {
  const { data: session } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    let isMounted = true;
    let cleanupListeners: (() => void) | undefined;

    async function initPush() {
      // 1. Mobile App Flow (Capacitor Android / iOS)
      if (Capacitor.isNativePlatform()) {
        try {
          const { PushNotifications } = await import("@capacitor/push-notifications");

          // Set up High Priority Notification Channels for Android
          if (Capacitor.getPlatform() === "android") {
            try {
              await PushNotifications.createChannel({
                id: "sabquick_orders",
                name: "Order Updates",
                description: "Live tracking, dispatch and delivery alerts for your groceries",
                importance: 5,
                visibility: 1,
                sound: "default",
                vibration: true,
                lights: true,
                lightColor: "#0B6E4F",
              });

              await PushNotifications.createChannel({
                id: "sabquick_staff_orders",
                name: "Store Staff Alerts",
                description: "Instant order notifications for packers and store managers",
                importance: 5,
                visibility: 1,
                sound: "default",
                vibration: true,
                lights: true,
                lightColor: "#00C853",
              });
            } catch (chanErr) {
              console.warn("[PushNotifications] channel creation notice:", chanErr);
            }
          }

          // Check & request permission
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === "prompt") {
            permStatus = await PushNotifications.requestPermissions();
          }

          if (permStatus.receive === "granted") {
            // Register with APNs / FCM
            await PushNotifications.register();
          }

          // Registration Token Handler
          const regListener = await PushNotifications.addListener(
            "registration",
            async (token) => {
              if (!isMounted || !token?.value) return;
              console.log("[PushNotifications] Device FCM token obtained:", token.value.substring(0, 16) + "...");

              // If session exists, persist token to database
              if (session?.user?.id) {
                try {
                  await fetch("/api/notifications/register-device", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      token: token.value,
                      platform: Capacitor.getPlatform().toUpperCase(),
                      deviceModel: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
                    }),
                  });
                } catch (regErr) {
                  console.warn("[PushNotifications] server sync warning:", regErr);
                }
              }
            }
          );

          // Registration Error Handler
          const errListener = await PushNotifications.addListener(
            "registrationError",
            (error) => {
              console.warn("[PushNotifications] registration failed:", error);
            }
          );

          // Foreground Notification Received
          const recListener = await PushNotifications.addListener(
            "pushNotificationReceived",
            (notification) => {
              console.log("[PushNotifications] Received in foreground:", notification.title);
            }
          );

          // Notification Tapped / Action Performed
          const actListener = await PushNotifications.addListener(
            "pushNotificationActionPerformed",
            (action) => {
              const data = action.notification.data;
              console.log("[PushNotifications] Notification tapped:", data);
              if (data?.url) {
                router.push(data.url);
              } else if (data?.orderNumber) {
                router.push(`/orders/${data.orderNumber}`);
              }
            }
          );

          cleanupListeners = () => {
            regListener.remove();
            errListener.remove();
            recListener.remove();
            actListener.remove();
          };
        } catch (err) {
          console.warn("[PushNotifications] Native push initialization skipped or failed:", err);
        }
      }
    }

    initPush();

    return () => {
      isMounted = false;
      if (cleanupListeners) {
        cleanupListeners();
      }
    };
  }, [session?.user?.id, router]);

  return null;
}
