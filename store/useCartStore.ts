import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ProductData } from "@/components/catalog/ProductCard";

export interface CartItem {
  product: ProductData;
  quantity: number;
}

export type PaymentMethod = "UPI_DOORSTEP" | "ONLINE_PREPAID";

export const FREE_DELIVERY_THRESHOLD = 199;
export const STANDARD_DELIVERY_FEE = 15;
export const HANDLING_FEE = 2;

export interface CartTotals {
  itemTotal: number;
  freeDeliveryThreshold: number;
  deliveryFee: number;
  handlingFee: number;
  grandTotal: number;
  amountNeededForFreeDelivery: number;
  totalQuantity: number;
}

export function calculateCartTotals(
  items: CartItem[],
  tipAmount: number = 0
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
      freeDeliveryThreshold,
      deliveryFee: 0,
      handlingFee: 0,
      grandTotal: 0,
      amountNeededForFreeDelivery: freeDeliveryThreshold,
      totalQuantity: 0,
    };
  }

  const deliveryFee =
    itemTotal >= freeDeliveryThreshold ? 0 : STANDARD_DELIVERY_FEE;
  const handlingFee = HANDLING_FEE;
  const grandTotal = itemTotal + deliveryFee + handlingFee + tipAmount;
  const amountNeededForFreeDelivery = Math.max(
    0,
    freeDeliveryThreshold - itemTotal
  );

  return {
    itemTotal,
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
  isOpen: boolean;

  // Actions
  addItem: (product: ProductData) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setTip: (amount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  clearCart: () => void;
  setIsOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;

  // Getters for derived computations
  getItemTotal: () => number;
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

      clearCart: () => {
        set({ items: [], tipAmount: 0 });
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
        return calculateCartTotals(get().items, get().tipAmount).itemTotal;
      },

      getDeliveryFee: () => {
        return calculateCartTotals(get().items, get().tipAmount).deliveryFee;
      },

      getGrandTotal: () => {
        return calculateCartTotals(get().items, get().tipAmount).grandTotal;
      },

      getAmountNeededForFreeDelivery: () => {
        return calculateCartTotals(get().items, get().tipAmount)
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
      }),
    }
  )
);
