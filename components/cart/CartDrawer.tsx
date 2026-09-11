/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Link from "next/link";
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
  Loader2,
  Trash2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

export function CartDrawer() {
  const { data: session } = useSession();

  const {
    items,
    tipAmount,
    paymentMethod,
    isOpen,
    setIsOpen,
    closeCart,
    addItem,
    removeItem,
    updateQuantity,
    setTip,
    setPaymentMethod,
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

  // Order Placement State
  const [isPlacingOrder, setIsPlacingOrder] = React.useState<boolean>(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = React.useState<{
    orderNumber: string;
    deliveryOtp: string;
    totalAmount: number;
  } | null>(null);

  // Calculate dynamic totals
  const totals = calculateCartTotals(items, tipAmount);

  // Free delivery progress percentage
  const freeDeliveryProgress = Math.min(
    100,
    Math.round((totals.itemTotal / FREE_DELIVERY_THRESHOLD) * 100)
  );

  // Load user saved address when session exists
  React.useEffect(() => {
    async function loadAddress() {
      if (!session?.user?.id) {
        // Fallback demo address within geofence for unauthenticated/demo view
        setActiveAddress((prev) =>
          prev || {
            id: "default-geofenced-addr",
            label: "Home",
            flatBuilding: "Suite 101, Connaught Court",
            streetArea: "Barakhamba Road, Connaught Place",
            latitude: 28.619,
            longitude: 77.214,
            distanceKm: 0.75,
            estimatedMinutes: 10,
          }
        );
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

    try {
      const payload = {
        addressId: activeAddress.id,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        tipAmount,
        paymentMethod,
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

      // Order created successfully
      setOrderSuccess({
        orderNumber: data.orderNumber,
        deliveryOtp: data.deliveryOtp,
        totalAmount: data.totalAmount,
      });

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
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col h-full bg-slate-50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 bg-white border-b border-border-subtle flex items-center justify-between sticky top-0 z-10 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-black text-surface-dark flex items-center gap-2">
                  My Cart
                  {items.length > 0 && (
                    <Badge variant="accent" className="text-xs px-2 py-0">
                      {totals.totalQuantity} items
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  ⚡ 10-15 Min Express Delivery
                </SheetDescription>
              </div>
            </div>

            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-red-600 h-8 px-2 gap-1"
                title="Clear Cart"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </Button>
            )}
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

                {/* 6. BILL SUMMARY BREAKDOWN */}
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
                    <span className="font-black text-primary font-mono text-base">
                      ₹{totals.grandTotal}
                    </span>
                  </div>
                </div>

                {/* 7. PAYMENT METHOD SELECTOR */}
                <div className="bg-white rounded-2xl p-3.5 border border-border-subtle shadow-2xs space-y-2.5">
                  <h4 className="font-bold text-surface-dark text-xs">
                    Select Payment Method
                  </h4>

                  <div className="space-y-2">
                    {/* Option 1: UPI at Doorstep */}
                    <div
                      onClick={() => setPaymentMethod("UPI_DOORSTEP")}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        paymentMethod === "UPI_DOORSTEP"
                          ? "border-primary bg-primary/5 shadow-2xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="mt-0.5">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === "UPI_DOORSTEP"}
                          onChange={() => setPaymentMethod("UPI_DOORSTEP")}
                          className="accent-primary w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-surface-dark">
                            UPI at Doorstep (Scan QR)
                          </span>
                          <Badge
                            variant="accent"
                            className="text-[9px] py-0 px-1 font-bold"
                          >
                            Most Popular • 0% Extra
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Pay via GPay, PhonePe, or Paytm when rider arrives.
                        </p>
                      </div>
                      <QrCode className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    </div>

                    {/* Option 2: Pay Online via UPI App */}
                    <div
                      onClick={() => setPaymentMethod("ONLINE_PREPAID")}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        paymentMethod === "ONLINE_PREPAID"
                          ? "border-primary bg-primary/5 shadow-2xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="mt-0.5">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === "ONLINE_PREPAID"}
                          onChange={() => setPaymentMethod("ONLINE_PREPAID")}
                          className="accent-primary w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-surface-dark">
                          Pay Online via UPI App
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Instant digital prepaid confirmation.
                        </p>
                      </div>
                      <CreditCard className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    </div>
                  </div>
                </div>

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
            <div className="p-4 bg-white border-t border-border-subtle sticky bottom-0 z-10 shadow-lg">
              <Button
                variant="accent"
                disabled={isPlacingOrder || items.length === 0}
                onClick={handlePlaceOrder}
                className="w-full h-12 text-base font-black flex items-center justify-between text-surface-dark rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 fill-surface-dark" />
                  <span>
                    {isPlacingOrder ? "Dispatching Order..." : "Place Order"}
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
