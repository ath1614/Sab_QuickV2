import { registerPlugin, Capacitor } from "@capacitor/core";

export interface NativeUpiPlugin {
  launchUpi(options: { uri: string; packageName?: string }): Promise<void>;
}

export const NativeUpi = registerPlugin<NativeUpiPlugin>("NativeUpi");

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

export async function launchUpiPayment({
  uri,
  packageName,
}: {
  uri: string;
  packageName?: string;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 1. If running inside Capacitor native Android container
  if (Capacitor.isNativePlatform()) {
    try {
      await NativeUpi.launchUpi({ uri, packageName });
      return true;
    } catch (err) {
      console.warn("NativeUpi.launchUpi failed, trying window.location fallback:", err);
    }
  }

  // 2. Mobile web browser fallback (Chrome/Firefox/Safari on Android)
  try {
    window.location.href = uri;
    return true;
  } catch (err) {
    console.error("Failed to launch UPI via window.location:", err);
    return false;
  }
}
