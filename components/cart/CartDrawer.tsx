/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useCartStore,
  calculateCartTotals,
  FREE_DELIVERY_THRESHOLD,
  PaymentMethod,
} from "@/store/useCartStore";
import { ProductData } from "@/components/catalog/ProductCard";
import {
  LocationPickerModal,
  SavedAddressData,
} from "@/components/location/LocationPickerModal";
import { PhoneVerificationDrawer } from "@/components/auth/PhoneVerificationDrawer";
import { AuthModal } from "@/components/auth/AuthModal";
import { loadCashfreeSdk, setupCashfreeModalAdjuster } from "@/lib/cashfree";
import {
  OrderCelebrationModal,
  OrderCelebrationData,
} from "@/components/orders/OrderCelebrationModal";
import {
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  Zap,
  MapPin,
  Clock,
  ShieldCheck,
  QrCode,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  X,
  Tag,
  Banknote,
  Ticket,
} from "lucide-react";

export interface AvailableCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  validTill: string;
}

export function CartDrawer() {
  const { data: session } = useSession();
  const router = useRouter();

  const {
    items,
    tipAmount,
    paymentMethod,
    appliedCoupon,
    isOpen,
    setIsOpen,
    closeCart,
    addItem,
    removeItem,
    updateQuantity,
    setTip,
    setPaymentMethod,
    applyCoupon,
    removeCoupon,
    clearCart,
  } = useCartStore();

  // Recommendations state
  const [recommendations, setRecommendations] = React.useState<ProductData[]>(
    []
  );
  const [isLoadingRecs, setIsLoadingRecs] = React.useState<boolean>(false);

  // Modals & Drawers state
  const [authModalOpen, setAuthModalOpen] = React.useState<boolean>(false);
  const [phoneDrawerOpen, setPhoneDrawerOpen] = React.useState<boolean>(false);
  const [locationPickerOpen, setLocationPickerOpen] =
    React.useState<boolean>(false);

  // Address state
  const [activeAddress, setActiveAddress] = React.useState<SavedAddressData | null>(
    null
  );
  const [isLoadingAddress, setIsLoadingAddress] =
    React.useState<boolean>(false);

  // Order Placement & Celebration State
  const [isPlacingOrder, setIsPlacingOrder] = React.useState<boolean>(false);
  const [isCashfreeActive, setIsCashfreeActive] = React.useState<boolean>(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);
  const [paymentFailureBanner, setPaymentFailureBanner] = React.useState<{
    title: string;
    message: string;
    orderNumber?: string;
  } | null>(null);
  const [orderSuccess, setOrderSuccess] = React.useState<{
    orderNumber: string;
    deliveryOtp: string;
    totalAmount: number;
  } | null>(null);
  const [celebrationOrder, setCelebrationOrder] = React.useState<OrderCelebrationData | null>(null);
  const [showCelebration, setShowCelebration] = React.useState<boolean>(false);

  // Available Promotional Coupons State
  const [availableCoupons, setAvailableCoupons] = React.useState<AvailableCoupon[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = React.useState<boolean>(false);

  // Coupon Input State
  const [couponCodeInput, setCouponCodeInput] = React.useState<string>("");
  const [isValidatingCoupon, setIsValidatingCoupon] = React.useState<boolean>(false);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [couponSuccessMsg, setCouponSuccessMsg] = React.useState<string | null>(null);

  // Calculate dynamic totals with applied coupon discount
  const totals = calculateCartTotals(
    items,
    tipAmount,
    appliedCoupon?.discountAmount || 0
  );

  // Free delivery progress percentage
  const freeDeliveryProgress = Math.min(
    100,
    Math.round((totals.subtotalAfterDiscount / FREE_DELIVERY_THRESHOLD) * 100)
  );

  // Load user saved address when session exists
  React.useEffect(() => {
    async function loadAddress() {
      if (!session?.user?.id) {
        setIsLoadingAddress(false);
        return;
      }

      setIsLoadingAddress(true);
      try {
        const res = await fetch("/api/addresses");
        if (res.ok) {
          const data = await res.json();
          if (data.addresses && data.addresses.length > 0) {
            const first = data.addresses[0];
            setActiveAddress({
              id: first.id,
              label: first.label,
              flatBuilding: first.flatBuilding,
              streetArea: first.streetArea,
              landmark: first.landmark,
              latitude: first.latitude,
              longitude: first.longitude,
              distanceKm: 0.75,
              estimatedMinutes: 10,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to fetch user addresses:", err);
      } finally {
        setIsLoadingAddress(false);
      }
    }

    if (isOpen) {
      loadAddress();
    }
  }, [session, isOpen]);

  // Fetch Cross-Sell Recommendations whenever cart items change
  React.useEffect(() => {
    async function loadRecommendations() {
      if (!isOpen) return;

      setIsLoadingRecs(true);
      try {
        const cartProductIds = items.map((i) => i.product.id);
        const res = await fetch("/api/products/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartProductIds }),
        });

        if (res.ok) {
          const data = await res.json();
          setRecommendations(data.products || []);
        }
      } catch (err) {
        console.warn("Failed to fetch cross-sell recommendations:", err);
      } finally {
        setIsLoadingRecs(false);
      }
    }

    loadRecommendations();
  }, [items, isOpen]);

  // Load active promotional coupons from store owner when cart opens
  React.useEffect(() => {
    async function loadCoupons() {
      if (!isOpen) return;
      setIsLoadingCoupons(true);
      try {
        const res = await fetch("/api/coupons");
        if (res.ok) {
          const data = await res.json();
          setAvailableCoupons(data.coupons || []);
        }
      } catch (err) {
        console.warn("Failed to fetch available coupons:", err);
      } finally {
        setIsLoadingCoupons(false);
      }
    }

    loadCoupons();
  }, [isOpen]);

  // Coupon Validation Handler (supports 1-click apply from list or manual code input)
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCodeInput).trim().toUpperCase();
    if (!code) return;
    setCouponError(null);
    setCouponSuccessMsg(null);
    setIsValidatingCoupon(true);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          cartTotal: totals.itemTotal,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setCouponError(data.error || "Failed to apply coupon.");
        return;
      }

      applyCoupon({
        code: data.code,
        discountAmount: data.discountAmount,
        description: data.description,
      });
      setCouponSuccessMsg(`Saved ₹${data.discountAmount} with ${data.code}! 🎉`);
      setCouponCodeInput("");
    } catch (err: any) {
      setCouponError(err.message || "Failed to validate coupon.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Handle Checkout / Place Order
  const handlePlaceOrder = async () => {
    setOrderError(null);

    // 1. Session check
    if (!session?.user?.id) {
      setAuthModalOpen(true);
      return;
    }

    // 2. Phone verification check
    if (!session.user.phoneVerified || !session.user.phone) {
      setPhoneDrawerOpen(true);
      return;
    }

    // 3. Address check
    if (!activeAddress || !activeAddress.id) {
      setLocationPickerOpen(true);
      return;
    }

    setIsPlacingOrder(true);

    // Compute total savings for celebration pop-up
    const mrpSavings = items.reduce(
      (sum, item) =>
        sum + Math.max(0, ((item.product.mrp || item.product.salePrice) - item.product.salePrice) * item.quantity),
      0
    );
    const couponSavings = appliedCoupon?.discountAmount || 0;
    const deliverySavings = totals.subtotalAfterDiscount >= 199 ? 15 : 0;
    const totalSavings = mrpSavings + couponSavings + deliverySavings;

    try {
      const payload = {
        addressId: activeAddress.id,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        tipAmount,
        paymentMethod,
        couponCode: appliedCoupon?.code,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "PHONE_NOT_VERIFIED") {
          setPhoneDrawerOpen(true);
        } else {
          setOrderError(data.error || "Failed to place order.");
        }
        return;
      }

      // If Online payment method (Cashfree), launch payment checkout modal
      if (paymentMethod === "CASHFREE" || (paymentMethod as any) === "RAZORPAY") {
        const isScriptLoaded = await loadCashfreeSdk();
        if (!isScriptLoaded) {
          setOrderError("Unable to load payment SDK. Please try again.");
          return;
        }

        const cfRes = await fetch("/api/payments/cashfree/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderId }),
        });

        const cfData = await cfRes.json();
        if (!cfRes.ok) {
          setOrderError(cfData.error || "Failed to initiate online payment.");
          return;
        }

        const Cashfree = (window as any).Cashfree;
        if (!Cashfree) {
          setOrderError("Payment SDK not ready. Please try again.");
          setIsPlacingOrder(false);
          return;
        }

        setIsCashfreeActive(true);
        setupCashfreeModalAdjuster();

        const isMobileDevice =
          typeof window !== "undefined" &&
          (window.innerWidth < 768 ||
            /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
              navigator.userAgent
            ));

        const cashfreeInstance = new Cashfree({
          mode: cfData.mode || "production",
        });

        // Helper to cancel unconfirmed pending order and restore stock immediately
        const cancelUnconfirmedOrder = async (orderId: string, reason: string) => {
          try {
            await fetch("/api/orders/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId, reason }),
            });
          } catch (cErr) {
            console.warn("Could not cancel unconfirmed order:", cErr);
          }
        };

        // On mobile devices: Use redirectTarget: "_self" so Cashfree renders its native mobile payment page
        // with 1-tap UPI Intent buttons (PhonePe, Google Pay, Paytm) opening apps directly without desktop QR code.
        // On desktop: Use redirectTarget: "_modal" for a centered popup with QR code scanning.
        if (isMobileDevice) {
          // Do not clear the cart before payment is verified!
          // We save the pending order in sessionStorage so if user returns or cancels, their items are preserved.
          if (typeof window !== "undefined") {
            sessionStorage.setItem("sq_pending_checkout_order", data.orderNumber);
          }
          cashfreeInstance.checkout({
            paymentSessionId: cfData.paymentSessionId,
            redirectTarget: "_self",
          });
          return;
        }

        cashfreeInstance
          .checkout({
            paymentSessionId: cfData.paymentSessionId,
            redirectTarget: "_modal",
          })
          .then(async (result: any) => {
            if (result?.error) {
              console.warn("[Payment modal closed/warning]:", result.error);
              setIsPlacingOrder(false);
              setIsCashfreeActive(false);
              await cancelUnconfirmedOrder(data.orderId, "Payment modal closed by user before completion");
              setPaymentFailureBanner({
                title: "Payment Not Completed • Order Not Placed",
                message: "The online payment popup was closed before completing the transaction. Your order was NOT placed, no money was charged, and your cart items remain preserved.",
                orderNumber: data.orderNumber,
              });
              return;
            }

            try {
              const verifyRes = await fetch("/api/payments/cashfree/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderId }),
              });

              if (verifyRes.ok) {
                setIsCashfreeActive(false);
                closeCart();
                clearCart();
                setCelebrationOrder({
                  orderNumber: data.orderNumber,
                  totalAmount: data.totalAmount,
                  deliveryOtp: data.deliveryOtp,
                  totalSavings,
                  savingsBreakdown: {
                    mrpSavings,
                    couponSavings,
                    couponCode: appliedCoupon?.code,
                    deliverySavings,
                  },
                  paymentMethod: "CASHFREE",
                });
                setShowCelebration(true);
              } else {
                setIsCashfreeActive(false);
                setIsPlacingOrder(false);
                await cancelUnconfirmedOrder(data.orderId, "Payment verification unconfirmed or failed");
                const errData = await verifyRes.json().catch(() => ({}));
                setPaymentFailureBanner({
                  title: "Payment Unsuccessful • Order Not Placed",
                  message: errData.error || "Payment could not be verified with your bank or UPI provider. Your order was NOT placed and no charge was made. Your items are still in your cart.",
                  orderNumber: data.orderNumber,
                });
              }
            } catch (vErr: any) {
              setIsCashfreeActive(false);
              setIsPlacingOrder(false);
              await cancelUnconfirmedOrder(data.orderId, "Payment verification network error");
              setPaymentFailureBanner({
                title: "Payment Unconfirmed • Order Not Placed",
                message: "A network issue occurred while verifying payment. Your order was not confirmed. You can retry or switch to Cash/UPI on Delivery.",
                orderNumber: data.orderNumber,
              });
            }
          })
          .catch(async (err: any) => {
            console.error("[Checkout Error]:", err);
            setIsPlacingOrder(false);
            setIsCashfreeActive(false);
            await cancelUnconfirmedOrder(data.orderId, err.message || "Checkout exception");
            setPaymentFailureBanner({
              title: "Payment Issue • Order Not Placed",
              message: err.message || "An issue occurred during checkout. Your order was not placed and your cart items are preserved.",
              orderNumber: data.orderNumber,
            });
          });

        return;
      }

      // Order placed for UPI_DOORSTEP or CASH_ON_DELIVERY
      closeCart();
      setCelebrationOrder({
        orderNumber: data.orderNumber,
        deliveryOtp: data.deliveryOtp,
        totalAmount: data.totalAmount,
        totalSavings,
        savingsBreakdown: {
          mrpSavings,
          couponSavings,
          couponCode: appliedCoupon?.code,
          deliverySavings,
        },
        paymentMethod,
      });
      setShowCelebration(true);
      clearCart();
    } catch (err: any) {
      setOrderError(err.message || "An unexpected error occurred.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const resetSuccessState = () => {
    setOrderSuccess(null);
    closeCart();
  };

  return (
    <>
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          // Never dismiss drawer while payment processing or Cashfree is active
          if (!open && (isPlacingOrder || isCashfreeActive)) {
            return;
          }
          setIsOpen(open);
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:max-w-md p-0 flex flex-col h-full bg-slate-50 overflow-hidden"
          onPointerDownOutside={(e) => {
            if (isPlacingOrder || isCashfreeActive) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (isPlacingOrder || isCashfreeActive) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isPlacingOrder || isCashfreeActive) {
              e.preventDefault();
            }
          }}
        >
          {/* Header with Notch Safe Area & Back Button */}
          <div className="pt-[max(1rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-3.5 px-4 bg-white border-b border-border-subtle flex items-center justify-between sticky top-0 z-20 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              {/* Prominent Back Button */}
              <button
                type="button"
                onClick={closeCart}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-surface-dark flex items-center justify-center transition-all shrink-0 border border-slate-200/80 shadow-2xs"
                aria-label="Back to store"
                title="Back to store"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <SheetTitle className="text-base font-black text-surface-dark flex items-center gap-2 truncate">
                  <span>My Cart</span>
                  {items.length > 0 && (
                    <Badge variant="accent" className="text-xs px-2 py-0 shrink-0 font-bold">
                      {totals.totalQuantity} item{totals.totalQuantity === 1 ? "" : "s"}
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground truncate font-medium">
                  ⚡ 10-15 Min Express Delivery
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-xs text-muted-foreground hover:text-red-600 h-8 px-2 gap-1"
                  title="Clear Cart"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              )}

              <button
                type="button"
                onClick={closeCart}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                aria-label="Close cart"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* SUCCESS VIEW */}
            {orderSuccess ? (
              <div className="py-8 px-4 flex flex-col items-center text-center space-y-5 bg-white rounded-3xl border border-primary/20 shadow-sm animate-in fade-in-50 zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <Badge variant="accent" className="font-bold text-xs">
                    Order Confirmed
                  </Badge>
                  <h2 className="text-2xl font-black text-surface-dark tracking-tight">
                    Dispatched to Dark Store!
                  </h2>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Your grocery bag is being packed right now. Our delivery
                    partner will arrive in 10-15 minutes.
                  </p>
                </div>

                {/* Highlighted Order & OTP Box */}
                <div className="w-full bg-slate-50 border-2 border-dashed border-primary/40 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">
                      Order Number
                    </span>
                    <span className="font-mono font-bold text-surface-dark bg-white px-2 py-0.5 rounded border border-border-subtle">
                      {orderSuccess.orderNumber}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex flex-col items-center">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-primary">
                      Delivery Verification OTP
                    </span>
                    <div className="mt-1 font-mono text-3xl font-black tracking-widest text-surface-dark bg-primary-accent/20 px-4 py-1.5 rounded-xl border border-primary-accent/50">
                      {orderSuccess.deliveryOtp}
                    </div>
                    <span className="mt-1 text-[10px] text-muted-foreground">
                      Share this 4-digit code with rider upon arrival
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-600">Total Bill</span>
                    <span className="text-primary font-black text-sm">
                      ₹{orderSuccess.totalAmount}
                    </span>
                  </div>
                </div>

                <div className="w-full space-y-2">
                  <Link
                    href={`/orders/${orderSuccess.orderNumber}`}
                    onClick={resetSuccessState}
                    className="w-full h-11 font-bold rounded-xl shadow-md bg-primary text-white flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors text-xs"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Track Live Order &bull; #{orderSuccess.orderNumber}</span>
                  </Link>

                  <Button
                    variant="outline"
                    onClick={resetSuccessState}
                    className="w-full h-10 font-semibold rounded-xl text-xs"
                  >
                    Continue Shopping
                  </Button>
                </div>
              </div>
            ) : items.length === 0 ? (
              /* EMPTY CART VIEW */
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-surface-dark">
                  Your cart is empty
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Fill your basket with fresh dairy, snacks, and daily grocery
                  essentials delivered in 10-15 minutes.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeCart}
                  className="mt-2 rounded-xl"
                >
                  Start Shopping
                </Button>
              </div>
            ) : (
              <>
                {/* Custom Payment Failure / Order Not Placed Banner */}
                {paymentFailureBanner && (
                  <div className="bg-amber-50/95 border-2 border-amber-400/80 rounded-2xl p-3.5 shadow-sm space-y-2.5 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-black text-amber-950">
                          {paymentFailureBanner.title}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5 leading-relaxed">
                          {paymentFailureBanner.message}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaymentFailureBanner(null)}
                        className="p-1 rounded-lg text-amber-500 hover:text-amber-900 hover:bg-amber-100 transition-colors shrink-0"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
                      <Button
                        size="sm"
                        onClick={() => {
                          setPaymentFailureBanner(null);
                          handlePlaceOrder();
                        }}
                        className="flex-1 h-8 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs"
                      >
                        Retry Online Payment
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPaymentFailureBanner(null);
                          setPaymentMethod("CASH_ON_DELIVERY");
                        }}
                        className="flex-1 h-8 rounded-xl border-amber-300 text-amber-900 bg-white hover:bg-amber-100 font-bold text-xs shadow-xs"
                      >
                        Pay on Delivery
                      </Button>
                    </div>
                  </div>
                )}

                {/* 1. TOP BANNER: Free Delivery Kinetic Progress Bar */}
                <div className="bg-white rounded-2xl p-3.5 border border-border-subtle shadow-2xs space-y-2">
                  {totals.itemTotal >= FREE_DELIVERY_THRESHOLD ? (
                    <div className="flex items-center gap-2 text-primary font-bold text-xs bg-primary/10 p-2 rounded-xl">
                      <Sparkles className="w-4 h-4 text-primary-accent fill-primary-accent" />
                      <span>🎉 You&apos;ve unlocked FREE Delivery!</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                        <span className="text-surface-dark">
                          Add ₹{totals.amountNeededForFreeDelivery} more for{" "}
                          <span className="text-primary font-black">
                            FREE Delivery
                          </span>
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          ₹{totals.itemTotal}/₹{FREE_DELIVERY_THRESHOLD}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500 rounded-full"
                          style={{ width: `${freeDeliveryProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. ITEMIZED CART LIST */}
                <div className="bg-white rounded-2xl border border-border-subtle shadow-2xs divide-y divide-slate-100 overflow-hidden">
                  {items.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Thumbnail Image */}
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-surface-dark truncate">
                          {product.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            {product.unitQuantity}
                          </span>
                          <span className="text-xs font-bold text-surface-dark">
                            ₹{product.salePrice}
                          </span>
                        </div>
                      </div>

                      {/* Stepper & Line Total */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 bg-primary text-white px-1.5 py-1 rounded-lg font-bold text-xs shadow-2xs select-none">
                          <button
                            type="button"
                            onClick={() => removeItem(product.id)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-4 text-center font-mono text-xs">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => addItem(product)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-bold text-xs text-surface-dark min-w-[45px] text-right font-mono">
                          ₹{product.salePrice * quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. FREQUENTLY BOUGHT TOGETHER CROSS-SELL RAIL */}
                {recommendations.length > 0 && (
                  <div className="bg-white rounded-2xl p-3.5 border border-border-subtle shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-surface-dark">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span>Frequently Bought Together</span>
                      </div>
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                        Quick Add
                      </span>
                    </div>

                    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                      {recommendations.map((rec) => (
                        <div
                          key={rec.id}
                          className="w-36 shrink-0 bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between hover:border-slate-300 transition-colors"
                        >
                          <div>
                            <div className="w-full h-16 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden mb-1.5 border border-slate-100">
                              <img
                                src={rec.imageUrl}
                                alt={rec.title}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <h5
                              className="text-[11px] font-bold text-surface-dark line-clamp-1 leading-tight"
                              title={rec.title}
                            >
                              {rec.title}
                            </h5>
                            <span className="text-[10px] text-muted-foreground block">
                              {rec.unitQuantity}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-surface-dark font-mono">
                              ₹{rec.salePrice}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addItem(rec)}
                              className="h-6 px-2 text-[10px] font-bold border-primary text-primary hover:bg-primary hover:text-white rounded-md transition-colors"
                            >
                              + ADD
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. DELIVERY ADDRESS VERIFICATION PILL */}
                <div
                  onClick={() => setLocationPickerOpen(true)}
                  className="bg-white rounded-2xl p-3 border border-border-subtle shadow-2xs flex items-center justify-between gap-3 cursor-pointer hover:border-slate-300 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-surface-dark">
                          Delivering to: {activeAddress?.label || "Home"}
                        </span>
                        <Badge
                          variant="accent"
                          className="text-[9px] py-0 px-1 font-bold"
                        >
                          10 Mins
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {activeAddress
                          ? `${activeAddress.flatBuilding}, ${activeAddress.streetArea}`
                          : "Select your delivery location inside geofence"}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-primary group-hover:underline shrink-0 flex items-center">
                    Change <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* 5. TIP THE DELIVERY PARTNER */}
                <div className="bg-white rounded-2xl p-3.5 border border-border-subtle shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-surface-dark">
                        Tip your delivery partner
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        100% of your tip goes directly to your rider.
                      </p>
                    </div>
                    {tipAmount > 0 && (
                      <span className="text-xs font-bold text-primary font-mono">
                        +₹{tipAmount}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "No Tip", value: 0 },
                      { label: "₹10", value: 10 },
                      { label: "₹20", value: 20 },
                      { label: "₹30", value: 30 },
                    ].map((tip) => {
                      const isSelected = tipAmount === tip.value;
                      return (
                        <button
                          key={tip.value}
                          type="button"
                          onClick={() => setTip(tip.value)}
                          className={`h-8 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? "bg-primary text-white border-primary shadow-xs"
                              : "bg-slate-50 text-surface-dark border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {tip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. COUPON / PROMO CODE SECTION */}
                <div className="bg-white rounded-2xl p-3.5 border border-border-subtle shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-surface-dark text-xs flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-primary" />
                      Coupons & Offers
                    </h4>
                    {appliedCoupon ? (
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        {appliedCoupon.code} ACTIVE
                      </span>
                    ) : availableCoupons.length > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {availableCoupons.length} offer{availableCoupons.length > 1 ? "s" : ""} available
                      </span>
                    ) : null}
                  </div>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                      <div>
                        <div className="font-bold text-emerald-800 flex items-center gap-1">
                          <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{appliedCoupon.code}</span>
                          <span className="text-[11px] text-emerald-600 font-black">
                            (-₹{totals.discountAmount})
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-700">
                          {appliedCoupon.description || "Promo discount applied to your order"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeCoupon}
                        className="h-7 px-2 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        REMOVE
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Manual Code Input Bar */}
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="Enter coupon code"
                          value={couponCodeInput}
                          onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                          className="h-9 text-xs uppercase font-mono tracking-wider font-bold"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyCoupon();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={!couponCodeInput.trim() || isValidatingCoupon}
                          onClick={() => handleApplyCoupon()}
                          className="h-9 px-3.5 text-xs font-black bg-primary hover:bg-primary/90 text-white rounded-lg shadow-xs"
                        >
                          {isValidatingCoupon ? "..." : "APPLY"}
                        </Button>
                      </div>

                      {couponError && (
                        <p className="text-[11px] text-red-600 font-medium">
                          {couponError}
                        </p>
                      )}
                      {couponSuccessMsg && (
                        <p className="text-[11px] text-emerald-600 font-medium">
                          {couponSuccessMsg}
                        </p>
                      )}
                    </div>
                  )}

                  {/* DYNAMIC LIST OF AVAILABLE COUPONS CREATED BY OWNER */}
                  {availableCoupons.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Available Store Coupons
                      </span>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {availableCoupons.map((coupon) => {
                          const isApplied = appliedCoupon?.code === coupon.code;
                          const isEligible = totals.itemTotal >= coupon.minOrderAmount;
                          const shortfall = Math.ceil(coupon.minOrderAmount - totals.itemTotal);

                          return (
                            <div
                              key={coupon.id}
                              className={`p-2.5 rounded-xl border transition-all ${
                                isApplied
                                  ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400"
                                  : isEligible
                                  ? "bg-slate-50 border-slate-200 hover:border-primary/40 hover:bg-white"
                                  : "bg-slate-50/50 border-slate-200 opacity-75"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-black text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                      {coupon.code}
                                    </span>
                                    <span className="text-[11px] font-bold text-surface-dark">
                                      {coupon.discountType === "FLAT"
                                        ? `Flat ₹${coupon.discountValue} OFF`
                                        : `${coupon.discountValue}% OFF${
                                            coupon.maxDiscount ? ` (Up to ₹${coupon.maxDiscount})` : ""
                                          }`}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                                    {coupon.description ||
                                      (coupon.minOrderAmount > 0
                                        ? `Valid on orders above ₹${coupon.minOrderAmount}`
                                        : "Valid on all orders")}
                                  </p>
                                  {!isEligible && (
                                    <p className="text-[10px] text-amber-600 font-semibold">
                                      Add ₹{shortfall} more to unlock
                                    </p>
                                  )}
                                </div>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isApplied ? "outline" : "default"}
                                  disabled={isApplied || !isEligible || isValidatingCoupon}
                                  onClick={() => handleApplyCoupon(coupon.code)}
                                  className={`h-7 px-3 text-[11px] font-black rounded-lg shrink-0 ${
                                    isApplied
                                      ? "border-emerald-500 text-emerald-700 bg-emerald-100"
                                      : isEligible
                                      ? "bg-primary hover:bg-primary/90 text-white"
                                      : "bg-slate-200 text-slate-400 border-none"
                                  }`}
                                >
                                  {isApplied ? "APPLIED ✓" : isEligible ? "APPLY" : "LOCKED"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. BILL SUMMARY BREAKDOWN */}
                <div className="bg-white rounded-2xl p-3.5 border border-border-subtle shadow-2xs space-y-2 text-xs">
                  <h4 className="font-bold text-surface-dark text-xs pb-1 border-b border-slate-100">
                    Bill Summary
                  </h4>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Item Total</span>
                    <span className="font-mono text-surface-dark font-medium">
                      ₹{totals.itemTotal}
                    </span>
                  </div>

                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        Coupon Discount {appliedCoupon?.code ? `(${appliedCoupon.code})` : ""}
                      </span>
                      <span className="font-mono font-bold">
                        -₹{totals.discountAmount}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Delivery Partner Fee</span>
                    <div>
                      {totals.deliveryFee === 0 ? (
                        <>
                          <span className="line-through text-slate-400 mr-1.5 font-mono text-[11px]">
                            ₹15
                          </span>
                          <span className="font-bold text-primary">FREE</span>
                        </>
                      ) : (
                        <span className="font-mono text-surface-dark font-medium">
                          ₹{totals.deliveryFee}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Handling Charge</span>
                    <span className="font-mono text-surface-dark font-medium">
                      ₹{totals.handlingFee}
                    </span>
                  </div>

                  {tipAmount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery Tip</span>
                      <span className="font-mono text-surface-dark font-medium">
                        ₹{tipAmount}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-2 flex justify-between items-center font-bold text-sm text-surface-dark">
                    <span>Grand Total</span>
                    <span className="font-display font-bold text-primary text-base">
                      ₹{totals.grandTotal}
                    </span>
                  </div>
                </div>

                {/* 8. PAYMENT METHOD SELECTOR */}
                <div className="bg-white rounded-2xl p-3.5 border border-border-subtle shadow-2xs space-y-2.5">
                  <h4 className="font-bold text-surface-dark text-xs">
                    Select Payment Method
                  </h4>

                  <div className="space-y-2">
                    {/* Option 1: Pay Online */}
                    <div
                      onClick={() => setPaymentMethod("CASHFREE")}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        paymentMethod === "CASHFREE"
                          ? "border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === "CASHFREE"}
                          onChange={() => setPaymentMethod("CASHFREE")}
                          className="accent-primary w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-surface-dark">
                              Pay Online
                            </span>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Instant
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            UPI (Google Pay, PhonePe, Paytm), Cards & NetBanking
                          </p>
                        </div>
                      </div>
                      <CreditCard className="w-4 h-4 text-primary shrink-0" />
                    </div>

                    {/* Option 2: UPI at Doorstep */}
                    <div
                      onClick={() => setPaymentMethod("UPI_DOORSTEP")}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        paymentMethod === "UPI_DOORSTEP"
                          ? "border-primary bg-primary/5 shadow-2xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === "UPI_DOORSTEP"}
                          onChange={() => setPaymentMethod("UPI_DOORSTEP")}
                          className="accent-primary w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-surface-dark">
                            UPI at Delivery
                          </span>
                          <p className="text-[11px] text-muted-foreground">
                            Scan QR with any UPI app
                          </p>
                        </div>
                      </div>
                      <QrCode className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {/* Option 3: Cash on Delivery */}
                    <div
                      onClick={() => setPaymentMethod("CASH_ON_DELIVERY")}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        paymentMethod === "CASH_ON_DELIVERY"
                          ? "border-primary bg-primary/5 shadow-2xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === "CASH_ON_DELIVERY"}
                          onChange={() => setPaymentMethod("CASH_ON_DELIVERY")}
                          className="accent-primary w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-surface-dark">
                            Cash on Delivery
                          </span>
                          <p className="text-[11px] text-muted-foreground">
                            Pay cash at doorstep
                          </p>
                        </div>
                      </div>
                      <Banknote className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Cashfree Active Banner */}
                {isCashfreeActive && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                    <span>Cashfree payment window is open. Complete payment in the popup or close it to choose another option.</span>
                  </div>
                )}

                {/* Error Banner */}
                {orderError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{orderError}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 8. STICKY CHECKOUT CTA BUTTON */}
          {!orderSuccess && items.length > 0 && (
            <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-white border-t border-border-subtle sticky bottom-0 z-10 shadow-lg">
              <Button
                variant="accent"
                disabled={isPlacingOrder || items.length === 0}
                onClick={handlePlaceOrder}
                className="w-full h-12 text-base font-black flex items-center justify-between text-surface-dark rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 fill-surface-dark" />
                  <span>
                    {isPlacingOrder
                      ? "Placing Order..."
                      : paymentMethod === "CASHFREE"
                      ? "Pay Online"
                      : paymentMethod === "UPI_DOORSTEP"
                      ? "Pay via UPI on Delivery"
                      : "Place Order · Pay on Delivery"}
                  </span>
                </div>

                {isPlacingOrder ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-1.5 font-mono">
                    <span>₹{totals.grandTotal}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Celebration Popup Modal with Confetti & Total Savings */}
      <OrderCelebrationModal
        isOpen={showCelebration}
        order={celebrationOrder}
        onClose={() => {
          setShowCelebration(false);
          setCelebrationOrder(null);
        }}
        onTrackOrder={() => {
          const num = celebrationOrder?.orderNumber;
          setShowCelebration(false);
          setCelebrationOrder(null);
          if (num) {
            router.push(`/orders/${num}`);
          }
        }}
      />

      {/* Auth & Verification Modals */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <PhoneVerificationDrawer
        open={phoneDrawerOpen}
        onOpenChange={setPhoneDrawerOpen}
        initialPhone={session?.user?.phone}
      />
      <LocationPickerModal
        open={locationPickerOpen}
        onOpenChange={setLocationPickerOpen}
        onAddressSaved={(addr) => {
          setActiveAddress(addr);
          setLocationPickerOpen(false);
        }}
        currentAddress={activeAddress}
      />
    </>
  );
}
