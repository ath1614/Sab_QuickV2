import Razorpay from "razorpay";

/**
 * Server-side Razorpay instance initialized with environment credentials.
 */
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_xxxxxx",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "your_razorpay_secret",
});

/**
 * Client-side helper to dynamically inject Razorpay Checkout SDK into the DOM.
 */
export function loadRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    // Already loaded in window
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay Checkout SDK.");
      resolve(false);
    };

    document.body.appendChild(script);
  });
}
