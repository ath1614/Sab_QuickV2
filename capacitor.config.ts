import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sabquick.app",
  appName: "SABQuick",
  webDir: "public",
  server: {
    /**
     * The shell loads the LIVE site (single source of truth — no bundled
     * copy to maintain). For local device testing against a dev machine,
     * temporarily point url at http://<LAN-IP>:3210 and set cleartext true.
     */
    url: "https://srv1985371.hstgr.cloud",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "srv1985371.hstgr.cloud",
      "*.cashfree.com",
      "api.cashfree.com",
      "payments.cashfree.com",
      "sandbox.cashfree.com"
    ],
  },
  android: {
    // The shell only loads the production HTTPS site; mixed content and remote
    // WebView debugging are development conveniences, not release settings.
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      // The web splash releases this as soon as its first frame has painted.
      // Auto-hide is a fail-safe for a failed/offline page load; without it a
      // broken WebView would leave the native splash on screen forever.
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: "#F7F6F2",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert", "banner", "list"],
    },
  },
};

export default config;
