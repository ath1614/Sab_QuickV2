"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

/**
 * Programmatic helper to request push notification permission
 * Can be called upon user interaction (e.g. order checkout or toggle).
 */
export async function promptPushPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let status = await PushNotifications.checkPermissions();
    if (status.receive !== "granted") {
      status = await PushNotifications.requestPermissions();
    }
    if (status.receive === "granted") {
      await PushNotifications.register();
      return true;
    }
    return false;
  } catch (err) {
    console.warn("[PushNotifications] promptPushPermissions error:", err);
    return false;
  }
}

/**
 * Reports what the device knows about push to the server so
 * /api/notifications/status can explain a silent "no notifications" without
 * attaching Xcode to a TestFlight build.
 */
async function reportPushClientStatus(payload: {
  permission: string;
  registered: boolean;
  fcmReady?: boolean;
  error?: string | null;
}) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const platform = Capacitor.getPlatform().toUpperCase();
    const signature = JSON.stringify({ ...payload, platform });

    // The manager mounts on every navigation; only send a changed report.
    if (localStorage.getItem("sabquick_push_status_report") === signature) return;

    const body = { ...payload, platform, reportedAt: new Date().toISOString() };
    const res = await fetch("/api/notifications/client-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });

    if (res.ok) {
      try {
        localStorage.setItem("sabquick_push_status_report", signature);
      } catch {
        // Private mode: report again next launch, harmless.
      }
    }
  } catch (err) {
    console.warn("[PushNotifications] Could not report push status:", err);
  }
}

/**
 * Global Push Notification Lifecycle Controller
 *
 * Manages push notification registration, channel setup, foreground audio chime,
 * and deep-linking when a user taps an order status push notification.
 */
export function PushNotificationManager() {
  const { data: session } = useSession();
  const router = useRouter();
  const sessionUserIdRef = React.useRef(session?.user?.id);
  sessionUserIdRef.current = session?.user?.id;

  // Play audio chime for foreground notification
  const playAlertSound = React.useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.51);

      if (navigator?.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    } catch {
      // Audio policies may mute background chimes
    }
  }, []);

  const syncTokenToServer = React.useCallback(async (tokenVal: string) => {
    if (!tokenVal) return;
    try {
      const res = await fetch("/api/notifications/register-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenVal,
          platform: Capacitor.getPlatform().toUpperCase(),
          deviceModel: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        void reportPushClientStatus({
          permission: "granted",
          registered: true,
          fcmReady: data.fcmReady !== false,
          error: data.pushError || null,
        });
      } else {
        void reportPushClientStatus({
          permission: "granted",
          registered: false,
          error: data.error || `Device registration failed (HTTP ${res.status}).`,
        });
      }
    } catch (syncErr: any) {
      console.warn("[PushNotifications] server sync notice:", syncErr);
      void reportPushClientStatus({
        permission: "granted",
        registered: false,
        error: syncErr?.message || "Device registration request failed.",
      });
    }
  }, []);

  // Main native push lifecycle effect - runs once on mount
  React.useEffect(() => {
    let cleanupListeners: (() => void) | undefined;

    async function initPush() {
      if (!Capacitor.isNativePlatform()) return;

      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        // 1. Set up High Priority Notification Channels for Android
        if (Capacitor.getPlatform() === "android") {
          try {
            await PushNotifications.createChannel({
              id: "sabquick_orders",
              name: "SABQuick Order Updates",
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
              name: "SABQuick Staff Alerts",
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

        // 2. Attach ALL listeners FIRST before calling register() per official Capacitor docs
        const regListener = await PushNotifications.addListener(
          "registration",
          async (token) => {
            if (!token?.value) return;
            console.log("[PushNotifications] Device push token obtained:", token.value.substring(0, 16) + "...");

            void reportPushClientStatus({ permission: "granted", registered: true });

            try {
              localStorage.setItem("sabquick_device_token", token.value);
            } catch (storageErr) {
              console.warn("[PushNotifications] Could not save token to localStorage:", storageErr);
            }

            // Sync with backend if user is authenticated
            if (sessionUserIdRef.current) {
              await syncTokenToServer(token.value);
            }
          }
        );

        const errListener = await PushNotifications.addListener(
          "registrationError",
          (error) => {
            console.warn("[PushNotifications] native registration failed:", error);
            void reportPushClientStatus({
              permission: "unknown",
              registered: false,
              error: String(
                (error as any)?.error || (error as any)?.message || error
              ),
            });
          }
        );

        const recListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[PushNotifications] Received in foreground:", notification.title);
            playAlertSound();
          }
        );

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

        // 3. Check and request permission (triggers Apple native prompt on iOS if notDetermined)
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive !== "granted") {
          permStatus = await PushNotifications.requestPermissions();
        }

        // 4. If granted, register with APNs / FCM
        if (permStatus.receive === "granted") {
          try {
            await PushNotifications.register();
          } catch (regCallErr) {
            console.warn("[PushNotifications] Push registration call notice:", regCallErr);
          }
        } else {
          console.log("[PushNotifications] User notification status:", permStatus.receive);
          void reportPushClientStatus({
            permission: permStatus.receive,
            registered: false,
            error: "Notification permission was not granted.",
          });
        }
      } catch (err: any) {
        console.warn("[PushNotifications] Native push initialization notice:", err);
        void reportPushClientStatus({
          permission: "unknown",
          registered: false,
          error: String(err?.message || err),
        });
      }
    }

    initPush();

    return () => {
      if (cleanupListeners) {
        cleanupListeners();
      }
    };
  }, [router, syncTokenToServer, playAlertSound]);

  // Sync cached token whenever user logs in or session refreshes
  React.useEffect(() => {
    if (!session?.user?.id || !Capacitor.isNativePlatform()) return;

    let cachedToken: string | null = null;
    try {
      cachedToken = localStorage.getItem("sabquick_device_token");
    } catch {
      // Storage unavailable: fall through to the permission probe.
    }

    if (cachedToken) {
      syncTokenToServer(cachedToken);
      return;
    }

    // No token yet. Record the permission state so a denied prompt is
    // distinguishable from a registration failure in /api/notifications/status
    // (the pre-login report is rejected with 401 and never stored).
    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const status = await PushNotifications.checkPermissions();
        if (status.receive !== "granted") {
          void reportPushClientStatus({
            permission: status.receive,
            registered: false,
            error: "Notification permission was not granted.",
          });
        }
      } catch (err: any) {
        void reportPushClientStatus({
          permission: "unknown",
          registered: false,
          error: String(err?.message || err),
        });
      }
    })();
  }, [session?.user?.id, syncTokenToServer]);

  // In-app floating banner has been removed per UX preference (relying on native OS banners and audio alerts)
  return null;
}
