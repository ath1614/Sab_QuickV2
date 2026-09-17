import { create } from "zustand";

interface AuthModalStore {
  isOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  setIsOpen: (open: boolean) => void;
}

export const useAuthModalStore = create<AuthModalStore>((set) => ({
  isOpen: false,
  openAuthModal: () => set({ isOpen: true }),
  closeAuthModal: () => set({ isOpen: false }),
  setIsOpen: (open) => set({ isOpen: open }),
}));
