import type { BootstrapResponse, DraftOrder } from "@rhc-pos/shared";
import { create } from "zustand";

import type { AppView, CartLineState, DrinkLineDraft, OverlayState, PendingTransactionSnapshot } from "../types/ui";

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
  draftLine: DrinkLineDraft | null;
  setBootstrap: (bootstrap: BootstrapResponse) => void;
  setCashierId: (cashierId: string) => void;
  setSelectedCategoryId: (selectedCategoryId: string) => void;
  addProduct: (productId: string) => void;
  beginDraftLine: (productId: string, sizeOptionId?: string | null) => void;
  setDraftLineSize: (sizeOptionId: string | null) => void;
  setDraftLineIced: (iced: boolean) => void;
  toggleDraftLineFlavor: (modifierId: string) => void;
  commitDraftLine: () => void;
  clearDraftLine: () => void;
  purgeProductFromCart: (productId: string) => void;
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
  dismissSuccess: () => void;
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
    id: self.crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36),
    productId,
    quantity: 1,
    modifierIds: [],
    iced: false,
  };
}

function reconcileCatalogState(
  state: Pick<
    AppState,
    | "cartLines"
    | "selectedLineId"
    | "draftLine"
    | "overlay"
    | "pendingOrder"
    | "pendingTransaction"
    | "paymentError"
  >,
  bootstrap: BootstrapResponse,
) {
  const productIds = new Set(bootstrap.products.map((product) => product.id));
  const modifierIds = new Set(bootstrap.modifiers.map((modifier) => modifier.id));
  const sizeOptionIds = new Set(bootstrap.sizes.map((size) => size.id));

  const cartLines = state.cartLines
    .filter((line) => productIds.has(line.productId))
    .map((line) => ({
      ...line,
      modifierIds: line.modifierIds.filter((modifierId) => modifierIds.has(modifierId)),
      sizeOptionId: line.sizeOptionId && sizeOptionIds.has(line.sizeOptionId) ? line.sizeOptionId : null,
    }));

  const draftLine =
    state.draftLine?.productId && productIds.has(state.draftLine.productId)
      ? {
          ...state.draftLine,
          modifierIds: state.draftLine.modifierIds.filter((modifierId) => modifierIds.has(modifierId)),
          sizeOptionId:
            state.draftLine.sizeOptionId && sizeOptionIds.has(state.draftLine.sizeOptionId)
              ? state.draftLine.sizeOptionId
              : null,
        }
      : null;

  const cartChanged =
    cartLines.length !== state.cartLines.length ||
    cartLines.some((line, index) => {
      const original = state.cartLines[index];
      return (
        !original ||
        line.sizeOptionId !== (original.sizeOptionId ?? null) ||
        line.modifierIds.join("|") !== original.modifierIds.join("|")
      );
    });
  const draftChanged =
    Boolean(state.draftLine) !== Boolean(draftLine) ||
    (state.draftLine !== null &&
      draftLine !== null &&
      ((state.draftLine.sizeOptionId ?? null) !== draftLine.sizeOptionId ||
        state.draftLine.modifierIds.join("|") !== draftLine.modifierIds.join("|")));
  const shouldCloseOverlay =
    (state.overlay === "drink-builder" && !draftLine) ||
    ((state.overlay === "cash" || state.overlay === "card") && (cartChanged || draftChanged));

  return {
    cartLines,
    selectedLineId: cartLines.some((line) => line.id === state.selectedLineId) ? state.selectedLineId : null,
    draftLine,
    overlay: shouldCloseOverlay ? "none" : state.overlay,
    pendingOrder: cartChanged || draftChanged ? null : state.pendingOrder,
    pendingTransaction: cartChanged || draftChanged ? null : state.pendingTransaction,
    paymentError: cartChanged || draftChanged ? null : state.paymentError,
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
  draftLine: null,
  setBootstrap: (bootstrap) =>
    set((state) => ({
      ...reconcileCatalogState(state, bootstrap),
      bootstrap,
      cashierId: state.cashierId || bootstrap.cashiers[0]?.id || "",
    })),
  setCashierId: (cashierId) => set({ cashierId }),
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
  addProduct: (productId) =>
    set((state) => ({
      cartLines: [...state.cartLines, createLine(productId)],
    })),
  beginDraftLine: (productId, sizeOptionId = null) =>
    set({
      draftLine: {
        productId,
        sizeOptionId,
        modifierIds: [],
        quantity: 1,
        iced: false,
      },
    }),
  setDraftLineSize: (sizeOptionId) =>
    set((state) => ({
      draftLine: state.draftLine ? { ...state.draftLine, sizeOptionId } : state.draftLine,
    })),
  setDraftLineIced: (iced) =>
    set((state) => ({
      draftLine: state.draftLine ? { ...state.draftLine, iced } : state.draftLine,
    })),
  toggleDraftLineFlavor: (modifierId) =>
    set((state) => ({
      draftLine: state.draftLine
        ? {
            ...state.draftLine,
            modifierIds: state.draftLine.modifierIds.includes(modifierId)
              ? state.draftLine.modifierIds.filter((id) => id !== modifierId)
              : [...state.draftLine.modifierIds, modifierId],
          }
        : state.draftLine,
    })),
  commitDraftLine: () =>
    set((state) => {
      if (!state.draftLine?.productId) {
        return {};
      }
      return {
        cartLines: [
          ...state.cartLines,
          {
            id: self.crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36),
            productId: state.draftLine.productId,
            quantity: state.draftLine.quantity,
            sizeOptionId: state.draftLine.sizeOptionId,
            modifierIds: state.draftLine.modifierIds,
            iced: state.draftLine.iced,
          },
        ],
        draftLine: null,
        selectedLineId: null,
      };
    }),
  clearDraftLine: () => set({ draftLine: null }),
  purgeProductFromCart: (productId) =>
    set((state) => {
      const cartLines = state.cartLines.filter((line) => line.productId !== productId);
      const draftCleared = state.draftLine?.productId === productId;
      const selectedLineId = cartLines.some((line) => line.id === state.selectedLineId) ? state.selectedLineId : null;
      const cartChanged = cartLines.length !== state.cartLines.length || draftCleared;
      const shouldCloseOverlay =
        (draftCleared && state.overlay === "drink-builder") ||
        (cartChanged && (state.overlay === "cash" || state.overlay === "card"));

      return {
        cartLines,
        selectedLineId,
        draftLine: draftCleared ? null : state.draftLine,
        overlay: shouldCloseOverlay ? "none" : state.overlay,
        pendingOrder: cartChanged ? null : state.pendingOrder,
        pendingTransaction: cartChanged ? null : state.pendingTransaction,
        paymentError: cartChanged ? null : state.paymentError,
      };
    }),
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
      draftLine: null,
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
      draftLine: null,
    }),
  dismissSuccess: () =>
    set({
      overlay: "none",
      successOrder: null,
    }),
  restorePersisted: ({ cartLines, cashierId, selectedCategoryId, pendingTransaction, pendingOrder }) =>
    set((state) => {
      const restoredCartLines = cartLines.map((line) => ({
        ...line,
        iced: line.iced ?? false,
      }));
      const nextState = {
        ...state,
        cartLines: restoredCartLines,
        cashierId,
        selectedCategoryId,
        pendingTransaction,
        pendingOrder,
      };

      return state.bootstrap
        ? {
            ...reconcileCatalogState(nextState, state.bootstrap),
            cashierId,
            selectedCategoryId,
          }
        : nextState;
    }),
  unlockAdmin: (pin) => set({ adminUnlocked: true, adminPin: pin, overlay: "none", view: "inventory" }),
  lockAdmin: () => set({ adminUnlocked: false, adminPin: "", view: "register", overlay: "none" }),
}));
