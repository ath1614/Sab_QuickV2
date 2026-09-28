import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sabquick.app",
  appName: "SabQuick",
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
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
