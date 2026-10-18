"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Bell, X, ChevronRight } from "lucide-react";

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

interface InAppBanner {
  title: string;
  body: string;
  url?: string;
}

/**
 * Global Push Notification Lifecycle Controller
 *
 * Manages push notification registration, channel setup, foreground alerts,
 * and deep-linking when a user taps an order status push notification.
 */
export function PushNotificationManager() {
  const { data: session } = useSession();
  const router = useRouter();
  const sessionUserIdRef = React.useRef(session?.user?.id);
  sessionUserIdRef.current = session?.user?.id;

  const [activeBanner, setActiveBanner] = React.useState<InAppBanner | null>(null);

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

  const showBanner = React.useCallback((banner: InAppBanner) => {
    setActiveBanner(banner);
    playAlertSound();
  }, [playAlertSound]);

  // Auto-dismiss banner after 6 seconds
  React.useEffect(() => {
    if (!activeBanner) return;
    const timer = setTimeout(() => {
      setActiveBanner(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeBanner]);

  const syncTokenToServer = React.useCallback(async (tokenVal: string) => {
    if (!tokenVal) return;
    try {
      await fetch("/api/notifications/register-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenVal,
          platform: Capacitor.getPlatform().toUpperCase(),
          deviceModel: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        }),
      });
    } catch (syncErr) {
      console.warn("[PushNotifications] server sync notice:", syncErr);
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
          }
        );

        const recListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[PushNotifications] Received in foreground:", notification.title);
            showBanner({
              title: notification.title || "SABQuick Update",
              body: notification.body || "",
              url: notification.data?.url || (notification.data?.orderNumber ? `/orders/${notification.data.orderNumber}` : undefined),
            });
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
        }
      } catch (err) {
        console.warn("[PushNotifications] Native push initialization notice:", err);
      }
    }

    initPush();

    return () => {
      if (cleanupListeners) {
        cleanupListeners();
      }
    };
  }, [router, syncTokenToServer, showBanner]);

  // Sync cached token whenever user logs in or session refreshes
  React.useEffect(() => {
    if (!session?.user?.id || !Capacitor.isNativePlatform()) return;
    try {
      const cachedToken = localStorage.getItem("sabquick_device_token");
      if (cachedToken) {
        syncTokenToServer(cachedToken);
      }
    } catch {
      // ignore
    }
  }, [session?.user?.id, syncTokenToServer]);

  if (!activeBanner) return null;

  return (
    <div className="fixed top-3 sm:top-5 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-[100] animate-in slide-in-from-top-4 duration-300">
      <div
        onClick={() => {
          if (activeBanner.url) {
            router.push(activeBanner.url);
          }
          setActiveBanner(null);
        }}
        className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/60 flex items-start gap-3 cursor-pointer hover:bg-slate-900 transition-all active:scale-[0.99]"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/30">
          <Bell className="w-5 h-5 text-emerald-400 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="font-black text-sm text-white tracking-tight truncate">
              {activeBanner.title}
            </h4>
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Now</span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
            {activeBanner.body}
          </p>
          {activeBanner.url && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
              <span>View details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveBanner(null);
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
