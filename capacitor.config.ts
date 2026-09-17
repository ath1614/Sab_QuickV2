import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sabquick.app",
  appName: "SabQuick",
  webDir: "public",
  server: {
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
