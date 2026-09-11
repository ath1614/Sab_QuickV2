import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ProductData } from "@/components/catalog/ProductCard";

export interface CartItem {
  product: ProductData;
  quantity: number;
}

export type PaymentMethod = "UPI_DOORSTEP" | "ONLINE_PREPAID" | "RAZORPAY";

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

export function calculateCartTotals(
  items: CartItem[],
  tipAmount: number = 0,
  discountAmount: number = 0
): CartTotals {
  const itemTotal = items.reduce(
    (sum, item) => sum + item.product.salePrice * item.quantity,
    0
  );
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
  const validDiscount = Math.min(Math.max(0, discountAmount), itemTotal);
  const subtotalAfterDiscount = Math.max(0, itemTotal - validDiscount);

  const deliveryFee =
    subtotalAfterDiscount >= freeDeliveryThreshold ? 0 : STANDARD_DELIVERY_FEE;
  const handlingFee = HANDLING_FEE;
  const grandTotal =
    Math.round((subtotalAfterDiscount + deliveryFee + handlingFee + tipAmount) * 100) / 100;
  const amountNeededForFreeDelivery = Math.max(
    0,
    freeDeliveryThreshold - subtotalAfterDiscount
  );

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

export interface CartStoreState {
  items: CartItem[];
  tipAmount: number;
  paymentMethod: PaymentMethod;
  appliedCoupon: AppliedCoupon | null;
  isOpen: boolean;

  // Actions
  addItem: (product: ProductData) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setTip: (amount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  clearCart: () => void;
  setIsOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;

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
      paymentMethod: "UPI_DOORSTEP",
      appliedCoupon: null,
      isOpen: false,

      addItem: (product: ProductData) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.product.id === product.id
          );

          if (existingIndex > -1) {
            const updatedItems = [...state.items];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + 1,
            };
            return { items: updatedItems };
          } else {
            return {
              items: [...state.items, { product, quantity: 1 }],
            };
          }
        });
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
            };
          } else {
            const updatedItems = [...state.items];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: currentQty - 1,
            };
            return { items: updatedItems };
          }
        });
      },

      updateQuantity: (productId: string, quantity: number) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (item) => item.product.id !== productId
              ),
            };
          }

          const existingIndex = state.items.findIndex(
            (item) => item.product.id === productId
          );
          if (existingIndex === -1) return state;

          const updatedItems = [...state.items];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity,
          };
          return { items: updatedItems };
        });
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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        tipAmount: state.tipAmount,
        paymentMethod: state.paymentMethod,
        appliedCoupon: state.appliedCoupon,
      }),
    }
  )
);
