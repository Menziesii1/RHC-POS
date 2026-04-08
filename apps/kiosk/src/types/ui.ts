import type { DraftOrder } from "@rhc-pos/shared";

export interface CartLineState {
  id: string;
  productId: string;
  quantity: number;
  sizeOptionId?: string | null;
  modifierIds: string[];
  iced: boolean;
}

export type OverlayState = "none" | "cash" | "card" | "success" | "admin-pin" | "drink-builder";
export type AppView = "register" | "inventory" | "analytics";

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

export interface DrinkLineDraft {
  productId: string | null;
  sizeOptionId: string | null;
  modifierIds: string[];
  quantity: number;
  iced: boolean;
  editingLineId: string | null;
}
