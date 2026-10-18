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
    console.warn("[Cashfree Create Order Warning/Error]:", data);

    // Auto-Recovery: If order already exists in Cashfree, fetch the active session
    if (
      typeof errorMsg === "string" &&
      (errorMsg.toLowerCase().includes("order with same id") ||
        errorMsg.toLowerCase().includes("order_already_exists") ||
        data.code === "order_already_exists")
    ) {
      console.log(`[Cashfree Recovery] Order ${params.orderId} already registered. Retrieving active payment session...`);
      try {
        const existingOrderRes = await fetch(
          `${CASHFREE_BASE_URL}/orders/${encodeURIComponent(params.orderId)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "x-api-version": CASHFREE_API_VERSION,
              "x-client-id": CASHFREE_APP_ID,
              "x-client-secret": CASHFREE_SECRET_KEY,
            },
          }
        );

        if (existingOrderRes.ok) {
          const existingData = await existingOrderRes.json();
          if (existingData.payment_session_id && existingData.order_status === "ACTIVE") {
            return {
              success: true,
              orderId: params.orderId,
              cfOrderId: String(existingData.cf_order_id),
              paymentSessionId: existingData.payment_session_id as string,
              orderStatus: existingData.order_status as string,
              mode: IS_SANDBOX ? "sandbox" : "production",
              isMock: false,
            };
          }
        }

        // If the existing order was expired, create a fresh payment session with a unique retry suffix
        const retrySuffix = `_R${Date.now().toString().slice(-4)}`;
        const retryPayload = {
          ...payload,
          order_id: `${params.orderId}${retrySuffix}`.slice(0, 45),
        };

        const retryRes = await fetch(`${CASHFREE_BASE_URL}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-version": CASHFREE_API_VERSION,
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
          },
          body: JSON.stringify(retryPayload),
        });

        const retryData = await retryRes.json();
        if (retryRes.ok && retryData.payment_session_id) {
          return {
            success: true,
            orderId: params.orderId,
            cfOrderId: String(retryData.cf_order_id),
            paymentSessionId: retryData.payment_session_id as string,
            orderStatus: retryData.order_status as string,
            mode: IS_SANDBOX ? "sandbox" : "production",
            isMock: false,
          };
        }
      } catch (recoveryErr) {
        console.error("[Cashfree Recovery Error]:", recoveryErr);
      }
    }

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

export interface CreateRefundParams {
  orderId: string;
  refundAmount: number;
  refundId?: string;
  refundNote?: string;
  refundSpeed?: "STANDARD" | "INSTANT";
}

export interface CashfreeRefundEntity {
  cf_refund_id: string | number;
  order_id: string;
  refund_id: string;
  refund_amount: number;
  refund_currency: string;
  refund_status: "SUCCESS" | "PENDING" | "CANCELLED" | "ONHOLD" | "FAILED";
  refund_note?: string;
  refund_arn?: string;
  status_description?: string;
}

/**
 * Server-side: Creates a refund for an order via Cashfree.
 */
export async function createCashfreeRefund(
  params: CreateRefundParams
): Promise<CashfreeRefundEntity> {
  const refundId =
    params.refundId ||
    `ref_${params.orderId.replace(/[^a-zA-Z0-9_-]/g, "")}_${Date.now()}`.slice(0, 40);

  if (!isCashfreeConfigured) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Mock Refund] Initiated refund of ₹${params.refundAmount} for order ${params.orderId}`);
      return {
        cf_refund_id: `mock_ref_${Date.now()}`,
        order_id: params.orderId,
        refund_id: refundId,
        refund_amount: params.refundAmount,
        refund_currency: "INR",
        refund_status: "SUCCESS",
        refund_note: params.refundNote || "Order cancelled by store",
        status_description: "Refund processed successfully (Mock)",
      };
    }
  }

  const payload = {
    refund_amount: Number(params.refundAmount.toFixed(2)),
    refund_id: refundId,
    refund_note: params.refundNote || `Refund for order ${params.orderId}`,
    refund_speed: params.refundSpeed || "STANDARD",
  };

  const response = await fetch(`${CASHFREE_BASE_URL}/orders/${params.orderId}/refunds`, {
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
    const errorMsg = data.message || data.error || "Failed to initiate Cashfree refund";
    console.error("[Cashfree Refund Error]:", data);
    throw new Error(errorMsg);
  }

  return data;
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
 * Client-side: Adjusts Cashfree iframe/modal to ensure safe area clearance from phone notch & bottom navigation buttons.
 */
export function setupCashfreeModalAdjuster(): () => void {
  if (typeof window === "undefined") return () => {};

  const adjustElement = (node: Element) => {
    if (
      node.tagName === "IFRAME" &&
      (node.id?.startsWith("frame-") ||
        node.getAttribute("name")?.startsWith("framemodal-") ||
        (node as HTMLIFrameElement).src?.includes("cashfree"))
    ) {
      const iframe = node as HTMLIFrameElement;
      iframe.setAttribute(
        "allow",
        "payment *; publickey-credentials-get *; clipboard-read; clipboard-write"
      );

      const isMobile = window.innerWidth <= 640;
      if (isMobile) {
        iframe.style.setProperty("position", "fixed", "important");
        iframe.style.setProperty(
          "top",
          "max(48px, calc(env(safe-area-inset-top, 0px) + 16px))",
          "important"
        );
        iframe.style.setProperty(
          "bottom",
          "max(68px, calc(env(safe-area-inset-bottom, 0px) + 20px))",
          "important"
        );
        iframe.style.setProperty("left", "8px", "important");
        iframe.style.setProperty("right", "8px", "important");
        iframe.style.setProperty("width", "calc(100vw - 16px)", "important");
        iframe.style.setProperty(
          "height",
          "calc(100dvh - max(48px, calc(env(safe-area-inset-top, 0px) + 16px)) - max(68px, calc(env(safe-area-inset-bottom, 0px) + 20px)))",
          "important"
        );
        iframe.style.setProperty(
          "max-height",
          "calc(100dvh - max(48px, calc(env(safe-area-inset-top, 0px) + 16px)) - max(68px, calc(env(safe-area-inset-bottom, 0px) + 20px)))",
          "important"
        );
        iframe.style.setProperty("border-radius", "20px", "important");
        iframe.style.setProperty(
          "box-shadow",
          "0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.65)",
          "important"
        );
        iframe.style.setProperty("z-index", "2147483647", "important");
        iframe.style.setProperty("box-sizing", "border-box", "important");
        iframe.style.setProperty("background-color", "#ffffff", "important");
      }
    }
  };

  try {
    document
      .querySelectorAll('iframe[id^="frame-"], iframe[name^="framemodal-"], iframe[src*="cashfree"]')
      .forEach(adjustElement);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            adjustElement(node as Element);
            (node as Element).querySelectorAll?.("iframe").forEach(adjustElement);
          }
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  } catch (err) {
    console.warn("Cashfree modal adjuster error:", err);
    return () => {};
  }
}

/**
 * Client-side: Dynamically loads the Cashfree v3 JS SDK.
 */
/**
 * Client-side: asks our server whether Cashfree has actually settled an order.
 *
 * The UPI app / native SDK callback only reports that the customer finished the
 * flow - it is never proof of payment. Cashfree recommends verifying server-side
 * and fulfilling only on a confirmed status, so every success path funnels
 * through here.
 *
 * Retries cover the short delay between the UPI app confirmation and Cashfree
 * reflecting the payment on the order.
 */
export async function verifyCashfreePaymentOnServer(
  orderId: string,
  attempts = 3,
  delayMs = 1500
): Promise<{ ok: boolean; error?: string }> {
  let lastError = "Payment could not be verified with the bank yet.";

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch("/api/payments/cashfree/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (res.ok) return { ok: true };

      const data = await res.json().catch(() => ({}));
      if (data?.error) lastError = data.error;
    } catch (err: any) {
      lastError = err?.message || lastError;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { ok: false, error: lastError };
}

export function loadCashfreeSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if ((window as any).Cashfree) {
      setupCashfreeModalAdjuster();
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => {
      setupCashfreeModalAdjuster();
      resolve(true);
    };
    script.onerror = () => {
      console.error("Failed to load Cashfree JS Checkout SDK.");
      resolve(false);
    };

    document.body.appendChild(script);
  });
}

