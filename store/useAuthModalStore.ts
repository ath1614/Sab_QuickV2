import { create } from "zustand";

interface AuthModalStore {
  isOpen: boolean;
  isLoginScreenActive: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  setIsOpen: (open: boolean) => void;
  setIsLoginScreenActive: (active: boolean) => void;
}

export const useAuthModalStore = create<AuthModalStore>((set) => ({
  isOpen: false,
  isLoginScreenActive: false,
  openAuthModal: () => set({ isOpen: true }),
  closeAuthModal: () => set({ isOpen: false }),
  setIsOpen: (open) => set({ isOpen: open }),
  setIsLoginScreenActive: (active) => set({ isLoginScreenActive: active }),
}));
