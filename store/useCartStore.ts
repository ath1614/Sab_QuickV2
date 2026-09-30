import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ProductData } from "@/components/catalog/ProductCard";

export interface CartItem {
  product: ProductData;
  quantity: number;
}

export type PaymentMethodType = "ONLINE_UPI" | "CASHFREE" | "UPI_DOORSTEP" | "CASH_ON_DELIVERY";
export type PaymentMethod = PaymentMethodType;

export const FREE_DELIVERY_THRESHOLD = 199;
export const STANDARD_DELIVERY_FEE = 15;
export const HANDLING_FEE = 2;

export interface AppliedCoupon {
  code: string;
  discountAmount: number;
  description?: string;
}

export interface CartTotals {
  itemTotal: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  freeDeliveryThreshold: number;
  deliveryFee: number;
  handlingFee: number;
  grandTotal: number;
  amountNeededForFreeDelivery: number;
  totalQuantity: number;
}

export function formatCurrency(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "0";
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
}

export function calculateCartTotals(
  items: CartItem[],
  tipAmount: number = 0,
  discountAmount: number = 0
): CartTotals {
  const rawItemTotal = items.reduce(
    (sum, item) => sum + item.product.salePrice * item.quantity,
    0
  );
  const itemTotal = Math.round((rawItemTotal + Number.EPSILON) * 100) / 100;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const freeDeliveryThreshold = FREE_DELIVERY_THRESHOLD;

  if (items.length === 0) {
    return {
      itemTotal: 0,
      discountAmount: 0,
      subtotalAfterDiscount: 0,
      freeDeliveryThreshold,
      deliveryFee: 0,
      handlingFee: 0,
      grandTotal: 0,
      amountNeededForFreeDelivery: freeDeliveryThreshold,
      totalQuantity: 0,
    };
  }

  // Deduct discountAmount before computing delivery fee and grand total
  const validDiscount = Math.round(Math.min(Math.max(0, discountAmount), itemTotal) * 100) / 100;
  const subtotalAfterDiscount = Math.round(Math.max(0, itemTotal - validDiscount) * 100) / 100;

  const deliveryFee =
    subtotalAfterDiscount >= freeDeliveryThreshold ? 0 : STANDARD_DELIVERY_FEE;
  const handlingFee = HANDLING_FEE;
  const grandTotal =
    Math.round((subtotalAfterDiscount + deliveryFee + handlingFee + tipAmount + Number.EPSILON) * 100) / 100;
  const amountNeededForFreeDelivery = Math.round(
    Math.max(0, freeDeliveryThreshold - subtotalAfterDiscount) * 100
  ) / 100;

  return {
    itemTotal,
    discountAmount: validDiscount,
    subtotalAfterDiscount,
    freeDeliveryThreshold,
    deliveryFee,
    handlingFee,
    grandTotal,
    amountNeededForFreeDelivery,
    totalQuantity,
  };
}

export const MAX_PER_ITEM_LIMIT = 6;

export function getProductMaxAllowed(product: ProductData): {
  maxAllowed: number;
  availableStock: number;
  isBulkLimited: boolean;
} {
  const availableStock = typeof product.stockCount === "number" ? Math.max(0, product.stockCount) : 999;
  const isBulkLimited = MAX_PER_ITEM_LIMIT < availableStock;
  const maxAllowed = Math.min(availableStock, MAX_PER_ITEM_LIMIT);
  return { maxAllowed, availableStock, isBulkLimited };
}

export interface CartStoreState {
  items: CartItem[];
  tipAmount: number;
  paymentMethod: PaymentMethod;
  appliedCoupon: AppliedCoupon | null;
  isOpen: boolean;
  /** Cart pill minimized to a dot (persisted so it survives reloads). */
  isPillMinimized: boolean;
  /** Real-time stock / bulk limit warning message (auto-dismissed) */
  warningToast: string | null;

  // Actions
  addItem: (product: ProductData) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => boolean;
  setWarningToast: (msg: string | null) => void;
  setTip: (amount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  clearCart: () => void;
  setIsOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  /** Cart pill minimized to a dot (makes room for the active-order bar). */
  setPillMinimized: (minimized: boolean) => void;

  // Getters for derived computations
  getItemTotal: () => number;
  getDiscountAmount: () => number;
  getDeliveryFee: () => number;
  getGrandTotal: () => number;
  getAmountNeededForFreeDelivery: () => number;
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      items: [],
      tipAmount: 0,
      paymentMethod: "ONLINE_UPI",
      appliedCoupon: null,
      isOpen: false,
      isPillMinimized: false,
      warningToast: null,

      setWarningToast: (msg: string | null) => {
        set({ warningToast: msg });
      },

      addItem: (product: ProductData): boolean => {
        const state = get();
        const existingIndex = state.items.findIndex(
          (item) => item.product.id === product.id
        );
        const currentQty = existingIndex > -1 ? state.items[existingIndex].quantity : 0;
        const { maxAllowed, availableStock } = getProductMaxAllowed(product);

        if (currentQty >= maxAllowed) {
          const warning =
            currentQty >= availableStock
              ? `Only ${availableStock} unit${availableStock === 1 ? "" : "s"} available in stock for ${product.title}.`
              : `Bulk ordering is not allowed. Max ${MAX_PER_ITEM_LIMIT} units per item for ${product.title}.`;
          set({ warningToast: warning });
          return false;
        }

        if (existingIndex > -1) {
          const updatedItems = [...state.items];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: currentQty + 1,
          };
          set({ items: updatedItems, warningToast: null });
        } else {
          set({
            items: [...state.items, { product, quantity: 1 }],
            warningToast: null,
          });
        }
        return true;
      },

      removeItem: (productId: string) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.product.id === productId
          );
          if (existingIndex === -1) return state;

          const currentQty = state.items[existingIndex].quantity;
          if (currentQty <= 1) {
            return {
              items: state.items.filter(
                (item) => item.product.id !== productId
              ),
              warningToast: null,
            };
          } else {
            const updatedItems = [...state.items];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: currentQty - 1,
            };
            return { items: updatedItems, warningToast: null };
          }
        });
      },

      updateQuantity: (productId: string, quantity: number): boolean => {
        const state = get();
        if (quantity <= 0) {
          set({
            items: state.items.filter((item) => item.product.id !== productId),
            warningToast: null,
          });
          return true;
        }

        const existingIndex = state.items.findIndex(
          (item) => item.product.id === productId
        );
        if (existingIndex === -1) return false;

        const product = state.items[existingIndex].product;
        const { maxAllowed, availableStock } = getProductMaxAllowed(product);

        if (quantity > maxAllowed) {
          const warning =
            quantity > availableStock
              ? `Only ${availableStock} unit${availableStock === 1 ? "" : "s"} available in stock for ${product.title}.`
              : `Bulk ordering is not allowed. Max ${MAX_PER_ITEM_LIMIT} units per item for ${product.title}.`;
          
          const updatedItems = [...state.items];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: maxAllowed,
          };
          set({ items: updatedItems, warningToast: warning });
          return false;
        }

        const updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity,
        };
        set({ items: updatedItems, warningToast: null });
        return true;
      },

      setTip: (amount: number) => {
        set({ tipAmount: amount });
      },

      setPaymentMethod: (method: PaymentMethod) => {
        set({ paymentMethod: method });
      },

      applyCoupon: (coupon: AppliedCoupon) => {
        set({ appliedCoupon: coupon });
      },

      removeCoupon: () => {
        set({ appliedCoupon: null });
      },

      clearCart: () => {
        set({ items: [], tipAmount: 0, appliedCoupon: null });
      },

      setIsOpen: (open: boolean) => {
        set({ isOpen: open });
      },

      openCart: () => {
        set({ isOpen: true });
      },

      closeCart: () => {
        set({ isOpen: false });
      },

      setPillMinimized: (minimized: boolean) => {
        set({ isPillMinimized: minimized });
      },

      getItemTotal: () => {
        const discount = get().appliedCoupon?.discountAmount || 0;
        return calculateCartTotals(get().items, get().tipAmount, discount).itemTotal;
      },

      getDiscountAmount: () => {
        return get().appliedCoupon?.discountAmount || 0;
      },

      getDeliveryFee: () => {
        const discount = get().appliedCoupon?.discountAmount || 0;
        return calculateCartTotals(get().items, get().tipAmount, discount).deliveryFee;
      },

      getGrandTotal: () => {
        const discount = get().appliedCoupon?.discountAmount || 0;
        return calculateCartTotals(get().items, get().tipAmount, discount).grandTotal;
      },

      getAmountNeededForFreeDelivery: () => {
        const discount = get().appliedCoupon?.discountAmount || 0;
        return calculateCartTotals(get().items, get().tipAmount, discount)
          .amountNeededForFreeDelivery;
      },
    }),
    {
      name: "sabquick_cart_storage",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        tipAmount: state.tipAmount,
        paymentMethod: state.paymentMethod,
        appliedCoupon: state.appliedCoupon,
        isPillMinimized: state.isPillMinimized,
      }),
      migrate: (persistedState: any, version: number) => {
        const state = persistedState || {};
        if (
          version < 3 ||
          state.paymentMethod === "CASHFREE" ||
          state.paymentMethod === "RAZORPAY" ||
          state.paymentMethod === "ONLINE_PREPAID" ||
          !state.paymentMethod
        ) {
          state.paymentMethod = "ONLINE_UPI";
        }
        return state;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (
            (state.paymentMethod as any) === "RAZORPAY" ||
            (state.paymentMethod as any) === "CASHFREE" ||
            (state.paymentMethod as any) === "ONLINE_PREPAID" ||
            !state.paymentMethod
          ) {
            state.paymentMethod = "ONLINE_UPI";
            setTimeout(() => {
              useCartStore.setState({ paymentMethod: "ONLINE_UPI" });
            }, 0);
          }
        }
      },
    }
  )
);
