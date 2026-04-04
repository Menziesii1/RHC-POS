import type {
  BootstrapResponse,
  CartInput,
  DraftOrder,
  PatchSettingsInput,
  Product,
  SummaryResponse,
  UpsertProductInput,
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
}

export interface PosRepository {
  getBootstrapBase(): Promise<Omit<BootstrapResponse, "status">>;
  createDraftOrder(input: CartInput): Promise<DraftOrder>;
  getOrder(orderId: string): Promise<DraftOrder | null>;
  finalizeCashPayment(orderId: string, tenderedCents: number): Promise<DraftOrder>;
  updateCardPayment(orderId: string, input: CardPaymentUpdateInput): Promise<DraftOrder>;
  getSummary(date: Date): Promise<SummaryResponse>;
  listProducts(): Promise<Product[]>;
  upsertProduct(input: UpsertProductInput, actorLabel: string): Promise<Product>;
  patchSettings(input: PatchSettingsInput, actorLabel: string): Promise<Omit<BootstrapResponse, "status">["settings"]>;
  appendAuditEvent(input: AuditEventInput): Promise<void>;
  recordWebhookEvent(stripeEventId: string, eventType: string, payload: Record<string, unknown>): Promise<boolean>;
  getOrderByStripePaymentIntentId(paymentIntentId: string): Promise<DraftOrder | null>;
  getLastWebhookAt(): Promise<string | null>;
}
