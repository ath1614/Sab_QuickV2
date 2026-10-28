/**
 * Centralized SMS Gateway Dispatcher for SabQuick
 * Primary: Renflair Codes (Fast, Non-DLT, High Delivery Rate)
 * Secondary Fallbacks: Fast2SMS Quick Route & 2Factor
 */

export interface SmsSendResult {
  success: boolean;
  provider: "renflair" | "fast2sms" | "2factor" | "mock" | "none";
  message?: string;
  error?: string;
}

/**
 * Dispatches a numeric authentication or verification OTP via SMS.
 */
export async function sendOtpSms(
  phone: string,
  otp: string | number
): Promise<SmsSendResult> {
  const normalizedPhone = String(phone).replace(/\D/g, "").slice(-10);
  const otpCode = String(otp).trim();

  const renflairKey = process.env.RENFLAIR_API_KEY;
  const fast2smsKey =
    process.env.FAST2SMS_API_KEY || process.env.SMS_GATEWAY_API_KEY;
  const twoFactorKey = process.env.TWOFACTOR_API_KEY;

  // 1. Primary Gateway: Renflair V1.php
  if (renflairKey) {
    try {
      console.log(`[SMS:Renflair] Dispatching OTP to +91 ${normalizedPhone}...`);
      const url = `https://sms.renflair.in/V1.php?API=${encodeURIComponent(
        renflairKey
      )}&PHONE=${encodeURIComponent(normalizedPhone)}&OTP=${encodeURIComponent(
        otpCode
      )}`;

      const res = await fetch(url, { method: "GET" });
      const data = await res.json().catch(() => ({}));

      if (data.status === "SUCCESS") {
        console.log(
          `[SMS:Renflair] ✓ OTP successfully delivered to +91 ${normalizedPhone}`
        );
        return {
          success: true,
          provider: "renflair",
          message: data.message || "SMS sent successfully.",
        };
      } else {
        console.warn(
          `[SMS:Renflair] Response rejected:`,
          data.message || data
        );
      }
    } catch (err: any) {
      console.error("[SMS:Renflair] Gateway request exception:", err.message);
    }
  }

  // 2. Secondary Fallback: Fast2SMS Quick Route
  if (fast2smsKey) {
    try {
      console.log(
        `[SMS:Fast2SMS] Falling back to Fast2SMS Quick Route for +91 ${normalizedPhone}...`
      );
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "q",
          message: `Your SabQuick login OTP is ${otpCode}. Valid for 5 minutes. Do not share this code with anyone.`,
          numbers: normalizedPhone,
        }),
      });

      const d = await res.json().catch(() => ({}));
      if (d.return) {
        console.log(
          `[SMS:Fast2SMS] ✓ OTP successfully dispatched to +91 ${normalizedPhone}`
        );
        return {
          success: true,
          provider: "fast2sms",
          message: d.message || "SMS sent successfully.",
        };
      } else {
        console.warn(`[SMS:Fast2SMS] Response error:`, d);
      }
    } catch (err: any) {
      console.error("[SMS:Fast2SMS] Gateway error:", err.message);
    }
  }

  // 3. Tertiary Fallback: 2Factor.in
  if (twoFactorKey) {
    try {
      console.log(
        `[SMS:2Factor] Dispatching via 2Factor to +91 ${normalizedPhone}...`
      );
      const res = await fetch(
        `https://2factor.in/API/V1/${encodeURIComponent(
          twoFactorKey
        )}/SMS/${encodeURIComponent(normalizedPhone)}/${encodeURIComponent(
          otpCode
        )}/`
      );
      if (res.ok) {
        return {
          success: true,
          provider: "2factor",
          message: "SMS sent successfully.",
        };
      }
    } catch (err: any) {
      console.error("[SMS:2Factor] Gateway error:", err.message);
    }
  }

  // Development/Local Fallback Log. Never print an OTP in production: a
  // misconfigured gateway would turn the server log into an OTP oracle.
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n======================================================`);
    console.log(
      `[SABQUICK OTP DEV CONSOLE] Phone: +91 ${normalizedPhone} | OTP: ${otpCode}`
    );
    console.log(`======================================================\n`);
  }

  return {
    success: false,
    provider: "none",
    error: "No active SMS gateway configured or dispatch failed.",
  };
}

/**
 * Sends Order Placement confirmation SMS to customer via Renflair V3.php
 */
export async function sendOrderConfirmedSms(
  phone: string,
  orderNumber: string,
  customerName: string
): Promise<SmsSendResult> {
  const renflairKey = process.env.RENFLAIR_API_KEY;
  if (!renflairKey) return { success: false, provider: "none" };

  const normalizedPhone = String(phone).replace(/\D/g, "").slice(-10);
  const cleanName = (customerName || "Customer")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .slice(0, 20);

  try {
    const url = `https://sms.renflair.in/V3.php?API=${encodeURIComponent(
      renflairKey
    )}&PHONE=${encodeURIComponent(normalizedPhone)}&OID=${encodeURIComponent(
      orderNumber
    )}&CNAME=${encodeURIComponent(cleanName)}`;

    const res = await fetch(url, { method: "GET" });
    const data = await res.json().catch(() => ({}));
    if (data.status === "SUCCESS") {
      return { success: true, provider: "renflair" };
    }
  } catch (err) {
    console.error("[SMS:OrderConfirmation] Error:", err);
  }

  return { success: false, provider: "renflair" };
}
