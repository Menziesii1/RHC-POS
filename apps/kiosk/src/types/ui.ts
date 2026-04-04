import type { DraftOrder } from "@rhc-pos/shared";

export interface CartLineState {
  id: string;
  productId: string;
  quantity: number;
  modifierIds: string[];
}

export type OverlayState = "none" | "cash" | "card" | "success" | "admin-pin";
export type AppView = "register" | "admin" | "summary";

export interface PendingTransactionSnapshot {
  orderId: string;
  stage: "card" | "cash";
  savedAt: string;
}

export interface PersistedUiState {
  savedAt: string;
  cashierId: string;
  selectedCategoryId: string;
  cartLines: CartLineState[];
  pendingTransaction: PendingTransactionSnapshot | null;
  pendingOrder: DraftOrder | null;
}
