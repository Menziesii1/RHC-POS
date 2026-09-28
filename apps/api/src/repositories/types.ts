import type {
  AnalyticsRangeResponse,
  BootstrapResponse,
  CartInput,
  DraftOrder,
  FlavorCategory,
  Modifier,
  Category,
  PatchSettingsInput,
  Product,
  ProductImage,
  SizeOption,
  SummaryResponse,
  UpsertCategoryInput,
  UpsertFlavorCategoryInput,
  UpsertModifierInput,
  UpsertProductInput,
  UpsertSizeOptionInput,
} from "@rhc-pos/shared";

export interface AuditEventInput {
  action: string;
  entityType: string;
  entityId: string;
  actorLabel: string;
  payload: Record<string, unknown>;
}

export interface CardPaymentUpdateInput {
  stripePaymentIntentId?: string;
  stripeReaderActionId?: string;
  stripeReaderId?: string;
  status: "pending" | "succeeded" | "failed" | "canceled";
  failureMessage?: string;
  /** For split tender: card portion charged. When set and status=succeeded, cash is auto-finalized. */
  splitCardCents?: number;
  /** For split tender: cash portion to auto-apply after card succeeds. */
  splitCashCents?: number;
}

export interface TransactionRow {
  id: string;
  orderNumber: string;
  status: "draft" | "awaiting_payment" | "paid" | "canceled";
  totalCents: number;
  tenderType: "cash" | "card" | "split" | undefined;
  cashierName: string;
  stripePaymentIntentId: string | undefined;
  refunded: boolean;
  createdAt: string;
  paidAt: string | null;
}

export interface TransactionListResponse {
  data: TransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PosRepository {
  listProductImages(): Promise<ProductImage[]>;
  getProductImage(id: string): Promise<StoredProductImage | null>;
  saveProductImage(input: NewProductImage): Promise<ProductImage>;
  getBootstrapBase(): Promise<Omit<BootstrapResponse, "status">>;
  createDraftOrder(input: CartInput): Promise<DraftOrder>;
  getOrder(orderId: string): Promise<DraftOrder | null>;
  finalizeCashPayment(orderId: string, tenderedCents: number): Promise<DraftOrder>;
  updateCardPayment(orderId: string, input: CardPaymentUpdateInput): Promise<DraftOrder>;
  getSummary(date: Date): Promise<SummaryResponse>;
  getAnalyticsRange(date: Date, days: number): Promise<AnalyticsRangeResponse>;
  listCategories(): Promise<Category[]>;
  upsertCategory(input: UpsertCategoryInput, actorLabel: string): Promise<Category>;
  deleteCategory(categoryId: string): Promise<void>;
  listModifiers(): Promise<Modifier[]>;
  upsertModifier(input: UpsertModifierInput, actorLabel: string): Promise<Modifier>;
  deleteModifier(modifierId: string): Promise<void>;
  listFlavorCategories(): Promise<FlavorCategory[]>;
  upsertFlavorCategory(input: UpsertFlavorCategoryInput, actorLabel: string): Promise<FlavorCategory>;
  deleteFlavorCategory(categoryId: string): Promise<void>;
  listSizes(): Promise<SizeOption[]>;
  upsertSize(input: UpsertSizeOptionInput, actorLabel: string): Promise<SizeOption>;
  deleteSize(sizeId: string): Promise<void>;
  listProducts(): Promise<Product[]>;
  upsertProduct(input: UpsertProductInput, actorLabel: string): Promise<Product>;
  deleteProduct(productId: string): Promise<void>;
  patchSettings(input: PatchSettingsInput, actorLabel: string): Promise<Omit<BootstrapResponse, "status">["settings"]>;
  verifyLockScreenPin(pin: string): Promise<boolean>;
  appendAuditEvent(input: AuditEventInput): Promise<void>;
  recordWebhookEvent(stripeEventId: string, eventType: string, payload: Record<string, unknown>): Promise<boolean>;
  getOrderByStripePaymentIntentId(paymentIntentId: string): Promise<DraftOrder | null>;
  getLastWebhookAt(): Promise<string | null>;
  listTransactions(page: number, pageSize: number): Promise<TransactionListResponse>;
  markOrderRefunded(orderId: string): Promise<void>;
  getRecentOrders(): Promise<DraftOrder[]>;
}

export type NewProductImage = Omit<ProductImage, "id" | "createdAt"> & {
  data: Uint8Array;
  contentHash: string;
};
export type StoredProductImage = NewProductImage & ProductImage;
