import crypto from "crypto";

export interface CashfreeCustomerDetails {
  customer_id: string;
  customer_phone: string;
  customer_name?: string;
  customer_email?: string;
}

export interface CreateOrderParams {
  orderId: string;
  orderAmount: number;
  customerId: string;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  returnUrl?: string;
}

export interface CashfreePaymentEntity {
  cf_payment_id: string | number;
  order_id: string;
  payment_status: "SUCCESS" | "FAILED" | "PENDING" | "USER_DROPPED" | "CANCELLED";
  payment_amount: number;
  payment_currency: string;
  payment_message?: string;
  payment_time?: string;
  payment_group?: string;
}

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID?.trim() || "";
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY?.trim() || "";
const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION?.trim() || "2023-08-01";
const CASHFREE_ENV = (process.env.CASHFREE_ENV || process.env.NEXT_PUBLIC_CASHFREE_ENV || "PRODUCTION")
  .trim()
  .toUpperCase();

const IS_SANDBOX = CASHFREE_ENV === "SANDBOX" || CASHFREE_ENV === "TEST";
const CASHFREE_BASE_URL = IS_SANDBOX
  ? "https://sandbox.cashfree.com/pg"
  : "https://api.cashfree.com/pg";

export const isCashfreeConfigured = Boolean(
  CASHFREE_APP_ID &&
  CASHFREE_SECRET_KEY &&
  !CASHFREE_APP_ID.includes("xxxxxx") &&
  !CASHFREE_SECRET_KEY.includes("xxxxxx")
);

/**
 * Server-side: Creates a Cashfree payment order and returns a paymentSessionId.
 */
export async function createCashfreeOrder(params: CreateOrderParams) {
  const cleanPhone = params.customerPhone.replace(/\D/g, "").slice(-10) || "9999999999";
  const cleanEmail =
    params.customerEmail && params.customerEmail.includes("@")
      ? params.customerEmail
      : `cust_${cleanPhone}@sabquick.com`;
  const cleanName = params.customerName?.trim() || "SabQuick Customer";

  const payload = {
    order_id: params.orderId,
    order_amount: Number(params.orderAmount.toFixed(2)),
    order_currency: "INR",
    customer_details: {
      customer_id: params.customerId || `cust_${cleanPhone}`,
      customer_phone: cleanPhone,
      customer_name: cleanName,
      customer_email: cleanEmail,
    },
    order_meta: params.returnUrl
      ? {
          return_url: params.returnUrl,
        }
      : undefined,
  };

  if (!isCashfreeConfigured) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "⚠️ Cashfree credentials not set or using placeholders. Using mock payment session for development."
      );
      return {
        success: true,
        orderId: params.orderId,
        paymentSessionId: `session_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        cfOrderId: `cf_order_mock_${Date.now()}`,
        isMock: true,
        mode: "sandbox",
      };
    }
  }

  const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": CASHFREE_API_VERSION,
      "x-client-id": CASHFREE_APP_ID,
      "x-client-secret": CASHFREE_SECRET_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.message || data.error || "Failed to create Cashfree order";
    console.error("[Cashfree Create Order Error]:", data);
    throw new Error(errorMsg);
  }

  return {
    success: true,
    orderId: params.orderId,
    cfOrderId: String(data.cf_order_id),
    paymentSessionId: data.payment_session_id as string,
    orderStatus: data.order_status as string,
    mode: IS_SANDBOX ? "sandbox" : "production",
    isMock: false,
  };
}

/**
 * Server-side: Queries Cashfree to verify payment status for an order.
 */
export async function getCashfreeOrderPayments(
  orderId: string
): Promise<CashfreePaymentEntity[]> {
  if (!isCashfreeConfigured) {
    if (process.env.NODE_ENV !== "production") {
      return [
        {
          cf_payment_id: `mock_pay_${Date.now()}`,
          order_id: orderId,
          payment_status: "SUCCESS",
          payment_amount: 100,
          payment_currency: "INR",
          payment_message: "Mock Transaction Successful",
        },
      ];
    }
  }

  const response = await fetch(`${CASHFREE_BASE_URL}/orders/${orderId}/payments`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": CASHFREE_API_VERSION,
      "x-client-id": CASHFREE_APP_ID,
      "x-client-secret": CASHFREE_SECRET_KEY,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.message || "Failed to fetch Cashfree payments";
    console.error("[Cashfree Fetch Payments Error]:", data);
    throw new Error(errorMsg);
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Server-side: Validates HMAC-SHA256 signature for incoming Cashfree Webhooks.
 */
export function verifyCashfreeWebhookSignature({
  signature,
  timestamp,
  rawBody,
  secretKey,
}: {
  signature: string;
  timestamp: string;
  rawBody: string;
  secretKey?: string;
}): boolean {
  const secret = secretKey || process.env.CASHFREE_SECRET_KEY?.trim() || CASHFREE_SECRET_KEY;

  if (!signature || !timestamp || !secret) {
    return false;
  }

  try {
    const signatureData = `${timestamp}${rawBody}`;
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(signatureData)
      .digest("base64");

    return computedSignature === signature;
  } catch (err) {
    console.error("[Cashfree Webhook Signature Verification Error]:", err);
    return false;
  }
}

/**
 * Client-side: Dynamically loads the Cashfree v3 JS SDK.
 */
export function loadCashfreeSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if ((window as any).Cashfree) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Cashfree JS Checkout SDK.");
      resolve(false);
    };

    document.body.appendChild(script);
  });
}
