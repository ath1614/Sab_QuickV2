import { registerPlugin, Capacitor } from "@capacitor/core";

export interface InstalledUpiApp {
  packageName: string;
  name: string;
}

export interface CashfreeNativeOptions {
  paymentSessionId: string;
  orderId: string;
  environment?: "PRODUCTION" | "SANDBOX";
}

export interface CashfreeNativeResult {
  status: "SUCCESS" | "FAILED";
  orderId: string;
  error?: string;
  /** Cashfree error code, e.g. installer_package_not_approved. */
  code?: string;
  /** True when the requested UPI app was missing and Cashfree's app list was shown instead. */
  fallback?: boolean;
  missingPackage?: string;
}

/**
 * Result of a native attempt, widened with UNAVAILABLE.
 *
 * UNAVAILABLE means the installed APK predates this plugin method, so the
 * caller must fall back to Cashfree's hosted web page. That keeps the phone's
 * live-site JS working against an older APK instead of dead-ending checkout.
 */
export interface NativeUpiLaunchResult {
  status: "SUCCESS" | "FAILED" | "UNAVAILABLE";
  orderId?: string;
  error?: string;
  /** Cashfree error code, e.g. installer_package_not_approved. */
  code?: string;
  /** True when the requested UPI app was missing and Cashfree's app list was shown instead. */
  fallback?: boolean;
  missingPackage?: string;
}

export interface CashfreeUpiIntentOptions extends CashfreeNativeOptions {
  /** UPI app package name to open directly, e.g. com.phonepe.app. */
  packageName?: string;
}

export interface NativeUpiPlugin {
  launchUpi(options: { uri: string; packageName?: string }): Promise<void>;
  launchCashfreeUpiIntent?(options: CashfreeUpiIntentOptions): Promise<CashfreeNativeResult>;
  launchCashfreeNativeUpi?(options: CashfreeNativeOptions): Promise<CashfreeNativeResult>;
  launchCashfreeNativeDrop?(options: CashfreeNativeOptions): Promise<CashfreeNativeResult>;
  getAvailableUpiApps?(): Promise<{ apps: InstalledUpiApp[]; count: number }>;
}

/**
 * Package names of the UPI apps we offer as one-tap buttons.
 * These are handed to Cashfree's native SDK (CFUPI.Mode.INTENT + setUPIID) so
 * the chosen app opens directly - no Cashfree web page in between.
 */
export const UPI_APP_PACKAGES: Record<string, string> = {
  gpay: "com.google.android.apps.nbu.paisa.user",
  phonepe: "com.phonepe.app",
  paytm: "net.one97.paytm",
  bhim: "in.org.npci.upiapp",
  cred: "com.dreamplug.androidapp",
};

export function getUpiAppPackage(appId?: string): string | undefined {
  if (!appId) return undefined;
  return UPI_APP_PACKAGES[appId.trim().toLowerCase()];
}

export const NativeUpi = registerPlugin<NativeUpiPlugin>("NativeUpi");

/**
 * Opens ONE specific UPI app straight from the native Cashfree SDK.
 *
 * Cashfree's Element flow (CFUPI.Mode.INTENT + setUPIID(packageName)) is the
 * documented way to launch a chosen UPI app; the SDK still settles the payment
 * against the Cashfree order, so nothing is trusted from the client.
 *
 * Returns status UNAVAILABLE when the installed APK does not expose this method
 * (older build) so the caller can fall back to the hosted checkout page.
 */
export async function launchNativeCashfreeUpiIntent(
  options: CashfreeUpiIntentOptions
): Promise<NativeUpiLaunchResult> {
  if (!Capacitor.isNativePlatform()) {
    return { status: "UNAVAILABLE", orderId: options.orderId, error: "Not a native platform" };
  }

  const launch = NativeUpi.launchCashfreeUpiIntent;
  if (typeof launch !== "function") {
    return { status: "UNAVAILABLE", orderId: options.orderId, error: "Native UPI intent not supported" };
  }

  try {
    const result = await launch.call(NativeUpi, options);
    if (result && result.status) return result;
    // Native side resolved without a status: treat as success and let the
    // server-side verification decide.
    return { status: "SUCCESS", orderId: options.orderId };
  } catch (e: any) {
    const message = String(e?.message || e || "Native UPI launch failed");
    if (/not implemented|method_not_implemented|not available|no such method/i.test(message)) {
      return { status: "UNAVAILABLE", orderId: options.orderId, error: message };
    }
    return { status: "FAILED", orderId: options.orderId, error: message };
  }
}

export async function launchNativeCashfree(
  options: CashfreeNativeOptions
): Promise<CashfreeNativeResult | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      if (NativeUpi.launchCashfreeNativeUpi) {
        return await NativeUpi.launchCashfreeNativeUpi(options);
      }
    } catch (e: any) {
      console.warn("Native Cashfree UPI error, trying Drop checkout:", e);
      try {
        if (NativeUpi.launchCashfreeNativeDrop) {
          return await NativeUpi.launchCashfreeNativeDrop(options);
        }
      } catch (dropErr: any) {
        return { status: "FAILED", orderId: options.orderId, error: dropErr?.message || "Payment launch failed" };
      }
    }
  }
  return null;
}

export async function getInstalledUpiApps(): Promise<InstalledUpiApp[]> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeUpi.getAvailableUpiApps?.();
      return res?.apps || [];
    } catch (e) {
      console.warn("Could not query installed UPI apps:", e);
    }
  }
  return [];
}

export interface UpiAppConfig {
  id: string;
  name: string;
  packageName?: string;
  color: string;
  badge?: string;
  textColor?: string;
}

export const POPULAR_UPI_APPS: UpiAppConfig[] = [
  {
    id: "gpay",
    name: "Google Pay",
    packageName: "com.google.android.apps.nbu.paisa.user",
    color: "#1a73e8",
    badge: "Fastest",
    textColor: "#ffffff",
  },
  {
    id: "phonepe",
    name: "PhonePe",
    packageName: "com.phonepe.app",
    color: "#5f259f",
    badge: "Popular",
    textColor: "#ffffff",
  },
  {
    id: "paytm",
    name: "Paytm",
    packageName: "net.one97.paytm",
    color: "#00b9f5",
    textColor: "#ffffff",
  },
  {
    id: "any",
    name: "Any UPI App",
    color: "#0B6E4F",
    badge: "All Apps",
    textColor: "#ffffff",
  },
];

export function buildUpiUri({
  orderNumber,
  amount,
  payeeVpa,
  payeeName,
}: {
  orderNumber: string;
  amount: number;
  payeeVpa?: string;
  payeeName?: string;
}): string {
  const vpa = payeeVpa || process.env.NEXT_PUBLIC_STORE_UPI_ID || "sabquick@upi";
  const name = payeeName || process.env.NEXT_PUBLIC_STORE_UPI_NAME || "SabQuick Store";
  const formattedAmount = amount.toFixed(2);
  const note = `Order_${orderNumber}`;

  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(note)}&tr=${encodeURIComponent(orderNumber)}`;
}

export function getIosUpiUri(uri: string, appId?: string): string {
  if (!appId || appId === "any") return uri;
  const queryString = uri.replace(/^upi:\/\/pay\?/, "");
  if (appId === "phonepe") {
    return `phonepe://pay?${queryString}`;
  }
  if (appId === "gpay") {
    return `tez://upi/pay?${queryString}`;
  }
  if (appId === "paytm") {
    return `paytmmp://pay?${queryString}`;
  }
  return uri;
}

export async function launchUpiPayment({
  uri,
  packageName,
  appId,
}: {
  uri: string;
  packageName?: string;
  appId?: string;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const isIos =
    Capacitor.getPlatform() === "ios" ||
    /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // 1. If running on iOS (Capacitor or Safari), trigger targeted iOS scheme or generic upi://
  if (isIos) {
    const iosUri = getIosUpiUri(uri, appId);
    try {
      window.location.href = iosUri;
      return true;
    } catch (err) {
      console.warn("iOS UPI targeted launch failed, trying generic upi URI:", err);
      window.location.href = uri;
      return true;
    }
  }

  // 2. If running inside Capacitor native Android container
  if (Capacitor.isNativePlatform()) {
    try {
      await NativeUpi.launchUpi({ uri, packageName });
      return true;
    } catch (err) {
      console.warn("NativeUpi.launchUpi failed, trying window.location fallback:", err);
    }
  }

  // 3. Mobile web browser fallback (Chrome/Firefox/Safari on Android)
  try {
    if (!isIos && packageName && !Capacitor.isNativePlatform()) {
      // Android Chrome intent scheme for targeted app launch
      const rawParams = uri.replace(/^upi:\/\/pay\?/, "");
      const intentUri = `intent://pay?${rawParams}#Intent;scheme=upi;package=${packageName};end;`;
      window.location.href = intentUri;
      return true;
    }

    window.location.href = uri;
    return true;
  } catch (err) {
    console.error("Failed to launch UPI via intent, falling back to uri:", err);
    try {
      window.location.href = uri;
      return true;
    } catch {
      return false;
    }
  }
}
