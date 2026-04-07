import type { BootstrapResponse, CartInput, DraftOrder, SummaryResponse } from "@rhc-pos/shared";

export interface RemoteApiClient {
  fetchBootstrap(): Promise<BootstrapResponse>;
  createOrder(payload: CartInput): Promise<DraftOrder>;
  payCash(orderId: string, tenderedCents: number): Promise<DraftOrder>;
}

export interface LocalOrderRecord {
  order: DraftOrder;
  cartInput: CartInput;
  syncStatus: "pending" | "synced" | "failed";
  syncError: string | null;
  syncedAt: string | null;
  remoteOrderId: string | null;
}

export interface SyncHealth {
  remoteOnline: boolean;
  lastBootstrapSyncAt: string | null;
  pendingOrderCount: number;
  failedOrderCount: number;
}

export interface LocalSyncService {
  getBootstrap(): Promise<BootstrapResponse>;
  createDraftOrder(input: unknown): Promise<DraftOrder>;
  getOrder(orderId: string): Promise<DraftOrder | null>;
  finalizeCashPayment(orderId: string, tenderedCents: number): Promise<DraftOrder>;
  getSummary(date?: Date): SummaryResponse;
  syncPendingOrders(): Promise<void>;
  getHealth(): SyncHealth;
}
