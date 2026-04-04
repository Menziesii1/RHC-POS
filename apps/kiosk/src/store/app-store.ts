import type { BootstrapResponse, DraftOrder } from "@rhc-pos/shared";
import { create } from "zustand";

import type { AppView, CartLineState, OverlayState, PendingTransactionSnapshot } from "../types/ui";

interface AppState {
  bootstrap: BootstrapResponse | null;
  cartLines: CartLineState[];
  selectedLineId: string | null;
  selectedCategoryId: string;
  cashierId: string;
  internetOnline: boolean;
  backendOnline: boolean;
  overlay: OverlayState;
  view: AppView;
  paymentError: string | null;
  pendingOrder: DraftOrder | null;
  pendingTransaction: PendingTransactionSnapshot | null;
  successOrder: DraftOrder | null;
  adminUnlocked: boolean;
  adminPin: string;
  setBootstrap: (bootstrap: BootstrapResponse) => void;
  setCashierId: (cashierId: string) => void;
  setSelectedCategoryId: (selectedCategoryId: string) => void;
  addProduct: (productId: string) => void;
  selectLine: (lineId: string | null) => void;
  adjustLineQuantity: (lineId: string, delta: number) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  toggleModifier: (lineId: string, modifierId: string) => void;
  setInternetOnline: (value: boolean) => void;
  setBackendOnline: (value: boolean) => void;
  setOverlay: (overlay: OverlayState) => void;
  setView: (view: AppView) => void;
  setPaymentError: (message: string | null) => void;
  setPendingOrder: (order: DraftOrder | null) => void;
  setPendingTransaction: (snapshot: PendingTransactionSnapshot | null) => void;
  markSuccess: (order: DraftOrder) => void;
  restorePersisted: (state: {
    cartLines: CartLineState[];
    cashierId: string;
    selectedCategoryId: string;
    pendingTransaction: PendingTransactionSnapshot | null;
    pendingOrder: DraftOrder | null;
  }) => void;
  unlockAdmin: (pin: string) => void;
  lockAdmin: () => void;
}

function createLine(productId: string): CartLineState {
  return {
    id: crypto.randomUUID(),
    productId,
    quantity: 1,
    modifierIds: [],
  };
}

export const useAppStore = create<AppState>((set) => ({
  bootstrap: null,
  cartLines: [],
  selectedLineId: null,
  selectedCategoryId: "all",
  cashierId: "",
  internetOnline: navigator.onLine,
  backendOnline: true,
  overlay: "none",
  view: "register",
  paymentError: null,
  pendingOrder: null,
  pendingTransaction: null,
  successOrder: null,
  adminUnlocked: false,
  adminPin: "",
  setBootstrap: (bootstrap) =>
    set((state) => ({
      bootstrap,
      cashierId: state.cashierId || bootstrap.cashiers[0]?.id || "",
    })),
  setCashierId: (cashierId) => set({ cashierId }),
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
  addProduct: (productId) =>
    set((state) => ({
      cartLines: [...state.cartLines, createLine(productId)],
    })),
  selectLine: (selectedLineId) => set({ selectedLineId }),
  adjustLineQuantity: (lineId, delta) =>
    set((state) => ({
      cartLines: state.cartLines
        .map((line) =>
          line.id === lineId ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line,
        )
        .filter(Boolean),
    })),
  removeLine: (lineId) =>
    set((state) => ({
      cartLines: state.cartLines.filter((line) => line.id !== lineId),
      selectedLineId: state.selectedLineId === lineId ? null : state.selectedLineId,
    })),
  clearCart: () =>
    set({
      cartLines: [],
      selectedLineId: null,
      pendingOrder: null,
      pendingTransaction: null,
      paymentError: null,
    }),
  toggleModifier: (lineId, modifierId) =>
    set((state) => ({
      cartLines: state.cartLines.map((line) => {
        if (line.id !== lineId) {
          return line;
        }
        const modifierIds = line.modifierIds.includes(modifierId)
          ? line.modifierIds.filter((id) => id !== modifierId)
          : [...line.modifierIds, modifierId];
        return { ...line, modifierIds };
      }),
    })),
  setInternetOnline: (internetOnline) => set({ internetOnline }),
  setBackendOnline: (backendOnline) => set({ backendOnline }),
  setOverlay: (overlay) => set({ overlay }),
  setView: (view) => set({ view }),
  setPaymentError: (paymentError) => set({ paymentError }),
  setPendingOrder: (pendingOrder) => set({ pendingOrder }),
  setPendingTransaction: (pendingTransaction) => set({ pendingTransaction }),
  markSuccess: (order) =>
    set({
      successOrder: order,
      overlay: "success",
      cartLines: [],
      selectedLineId: null,
      pendingOrder: null,
      pendingTransaction: null,
      paymentError: null,
    }),
  restorePersisted: ({ cartLines, cashierId, selectedCategoryId, pendingTransaction, pendingOrder }) =>
    set({
      cartLines,
      cashierId,
      selectedCategoryId,
      pendingTransaction,
      pendingOrder,
    }),
  unlockAdmin: (pin) => set({ adminUnlocked: true, adminPin: pin, overlay: "none", view: "admin" }),
  lockAdmin: () => set({ adminUnlocked: false, adminPin: "", view: "register", overlay: "none" }),
}));
