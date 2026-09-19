"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { Capacitor } from "@capacitor/core";

export function MobileAuthBridge() {
  React.useEffect(() => {
    let isSubscribed = true;
    let cleanupAppListener: (() => void) | undefined;

    async function initMobileAuthListener() {
      // Only attach listener if running inside Capacitor native platform
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        const { App } = await import("@capacitor/app");

        const listenerHandle = await App.addListener("appUrlOpen", async (data) => {
          if (!isSubscribed || !data?.url) return;

          console.log("📱 [MobileAuthBridge] Received deep link URL:", data.url);

          try {
            // Handle sabquick://auth-callback?token=xxx
            const rawUrl = data.url;
            let token: string | null = null;

            if (rawUrl.includes("token=")) {
              const urlObj = new URL(rawUrl.replace("sabquick://", "https://sabquick.com/"));
              token = urlObj.searchParams.get("token");
            }

            if (token) {
              console.log("⚡ [MobileAuthBridge] Exchanging mobile token for active session...");
              const res = await signIn("credentials", {
                mobileExchangeToken: token,
                redirect: false,
              });

              if (res?.ok) {
                console.log("🎉 [MobileAuthBridge] Native session established successfully!");
                window.location.reload();
              } else {
                console.error("❌ [MobileAuthBridge] Token exchange failed:", res?.error);
              }
            }
          } catch (err) {
            console.error("❌ [MobileAuthBridge] Failed parsing deep link URL:", err);
          }
        });

        cleanupAppListener = () => {
          listenerHandle.remove();
        };
      } catch (err) {
        console.warn("⚠️ [MobileAuthBridge] @capacitor/app listener setup failed:", err);
      }
    }

    initMobileAuthListener();

    return () => {
      isSubscribed = false;
      if (cleanupAppListener) {
        cleanupAppListener();
      }
    };
  }, []);

  return null;
}
