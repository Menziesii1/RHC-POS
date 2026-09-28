import {
  adminPinSchema,
  analyticsRangeResponseSchema,
  bootstrapResponseSchema,
  cartInputSchema,
  upsertCategorySchema,
  upsertFlavorCategorySchema,
  upsertModifierSchema,
  summaryResponseSchema,
  upsertProductSchema,
  upsertSizeOptionSchema,
  patchSettingsSchema,
  type BootstrapResponse,
  type AnalyticsRangeResponse,
  type DraftOrder,
  type Category,
  type FlavorCategory,
  type Modifier,
  type SizeOption,
  type SummaryResponse,
} from "@rhc-pos/shared";

import { HttpError } from "../lib/http-error.js";
import type { PosRepository, TransactionListResponse } from "../repositories/types.js";
import type { AdminAuthService } from "./admin-auth-service.js";
import type { TerminalService } from "./terminal-service.js";

export class PosService {
  constructor(
    private readonly repository: PosRepository,
    private readonly terminalService: TerminalService,
    private readonly adminAuthService: AdminAuthService,
    private readonly refundPin: string,
  ) {}

  async getBootstrap(): Promise<BootstrapResponse> {
    const [base, lastWebhookAt] = await Promise.all([
      this.repository.getBootstrapBase(),
      this.repository.getLastWebhookAt(),
    ]);
    const status = await this.terminalService.getStatus(lastWebhookAt);
    return bootstrapResponseSchema.parse({ ...base, status });
  }

  async createDraftOrder(input: unknown): Promise<DraftOrder> {
    return this.repository.createDraftOrder(cartInputSchema.parse(input));
  }

  async getOrder(orderId: string): Promise<DraftOrder> {
    const order = await this.repository.getOrder(orderId);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }
    return order;
  }

  async finalizeCashPayment(orderId: string, tenderedCents: number): Promise<DraftOrder> {
    return this.repository.finalizeCashPayment(orderId, tenderedCents);
  }

  async startCardPayment(orderId: string, amountCents?: number): Promise<DraftOrder> {
    const order = await this.getOrder(orderId);
    if (order.status === "paid") {
      return order;
    }

    const cardCents = amountCents ?? order.totalCents;
    const splitCashCents = amountCents != null && amountCents < order.totalCents
      ? order.totalCents - amountCents
      : undefined;

    const result = await this.terminalService.startPayment(order, cardCents);
    return this.repository.updateCardPayment(orderId, {
      status: result.status,
      stripePaymentIntentId: result.stripePaymentIntentId,
      stripeReaderActionId: result.stripeReaderActionId,
      stripeReaderId: result.stripeReaderId,
      failureMessage: result.failureMessage,
      splitCardCents: amountCents != null ? cardCents : undefined,
      splitCashCents,
    });
  }

  async cancelCardPayment(orderId: string): Promise<DraftOrder> {
    const order = await this.getOrder(orderId);
    await this.terminalService.cancelPayment(order);
    return this.repository.updateCardPayment(orderId, {
      status: "canceled",
      stripePaymentIntentId: order.payment.stripePaymentIntentId,
      stripeReaderActionId: order.payment.stripeReaderActionId,
      stripeReaderId: order.payment.stripeReaderId,
    });
  }

  async getSummary(date = new Date()): Promise<SummaryResponse> {
    return summaryResponseSchema.parse(await this.repository.getSummary(date));
  }

  async getAnalyticsRange(date = new Date(), days = 14): Promise<AnalyticsRangeResponse> {
    return analyticsRangeResponseSchema.parse(await this.repository.getAnalyticsRange(date, days));
  }

  async listCategories(): Promise<Category[]> {
    return this.repository.listCategories();
  }

  async upsertCategory(input: unknown, actorLabel: string) {
    return this.repository.upsertCategory(upsertCategorySchema.parse(input), actorLabel);
  }

  async deleteCategory(categoryId: string): Promise<{ ok: true }> {
    await this.repository.deleteCategory(categoryId);
    return { ok: true };
  }

  async listModifiers(): Promise<Modifier[]> {
    return this.repository.listModifiers();
  }

  async upsertModifier(input: unknown, actorLabel: string) {
    return this.repository.upsertModifier(upsertModifierSchema.parse(input), actorLabel);
  }

  async listSizes(): Promise<SizeOption[]> {
    return this.repository.listSizes();
  }

  async upsertSize(input: unknown, actorLabel: string) {
    return this.repository.upsertSize(upsertSizeOptionSchema.parse(input), actorLabel);
  }

  async deleteSize(sizeId: string): Promise<{ ok: true }> {
    await this.repository.deleteSize(sizeId);
    return { ok: true };
  }

  async listProducts() {
    return this.repository.listProducts();
  }

  async verifyAdminPin(pinPayload: unknown): Promise<{ ok: true }> {
    const { pin } = adminPinSchema.parse(pinPayload);
    const valid = await this.adminAuthService.verifyPin(pin);
    if (!valid) {
      throw new HttpError(401, "Admin PIN is invalid.");
    }
    return { ok: true };
  }

  async upsertProduct(input: unknown, actorLabel: string) {
    const parsed = upsertProductSchema.parse(input);
    if (parsed.imageId && !(await this.repository.getProductImage(parsed.imageId))) {
      throw new HttpError(400, "Choose an image from this store's image library.");
    }
    return this.repository.upsertProduct(parsed, actorLabel);
  }

  async deleteProduct(productId: string): Promise<{ ok: true }> {
    await this.repository.deleteProduct(productId);
    return { ok: true };
  }

  async deleteFlavor(modifierId: string): Promise<{ ok: true }> {
    await this.repository.deleteModifier(modifierId);
    return { ok: true };
  }

  async listFlavorCategories(): Promise<FlavorCategory[]> {
    return this.repository.listFlavorCategories();
  }

  async upsertFlavorCategory(input: unknown, actorLabel: string) {
    return this.repository.upsertFlavorCategory(upsertFlavorCategorySchema.parse(input), actorLabel);
  }

  async deleteFlavorCategory(categoryId: string): Promise<{ ok: true }> {
    await this.repository.deleteFlavorCategory(categoryId);
    return { ok: true };
  }

  async patchSettings(input: unknown, actorLabel: string) {
    const parsed = patchSettingsSchema.parse(input);
    if (parsed.lockScreenPin != null && (await this.adminAuthService.verifyPin(parsed.lockScreenPin))) {
      throw new HttpError(400, "Lock screen PIN must be different from the admin PIN.");
    }
    return this.repository.patchSettings(parsed, actorLabel);
  }

  async verifyLockScreenPin(pinPayload: unknown): Promise<{ ok: true }> {
    const { pin } = adminPinSchema.parse(pinPayload);
    const valid = await this.repository.verifyLockScreenPin(pin);
    if (!valid) {
      throw new HttpError(401, "Lock screen PIN is invalid.");
    }
    return { ok: true };
  }

  async listTransactions(page: number, pageSize: number): Promise<TransactionListResponse> {
    return this.repository.listTransactions(page, pageSize);
  }

  async getRecentOrders(): Promise<DraftOrder[]> {
    return this.repository.getRecentOrders();
  }

  async sendReceipt(orderId: string, email: string): Promise<{ ok: true }> {
    const order = await this.getOrder(orderId);
    const piId = order.payment.stripePaymentIntentId;
    if (!piId) {
      throw new HttpError(400, "No card payment on this order — Stripe receipt not available.");
    }
    await this.terminalService.sendReceipt(piId, email);
    return { ok: true };
  }

  async refundOrder(orderId: string, refundPin: string, amountCents?: number): Promise<{ ok: true; refundId: string }> {
    if (!this.refundPin || refundPin !== this.refundPin) {
      throw new HttpError(401, "Refund PIN is invalid.");
    }
    const order = await this.getOrder(orderId);
    if (order.status !== "paid") {
      throw new HttpError(400, "Only paid orders can be refunded.");
    }
    const piId = order.payment.stripePaymentIntentId;
    if (!piId) {
      throw new HttpError(400, "Cash-only orders cannot be refunded via Stripe.");
    }
    const refundId = await this.terminalService.refundPaymentIntent(piId, amountCents);
    await this.repository.markOrderRefunded(orderId);
    return { ok: true, refundId };
  }

  async handleStripeWebhook(signature: string | undefined, rawBody: string): Promise<{ received: true }> {
    const event = this.terminalService.parseWebhook(signature, rawBody);
    if (!event) {
      return { received: true };
    }

    const isNew = await this.repository.recordWebhookEvent(event.id, event.type, event.payload);
    if (!isNew) {
      return { received: true };
    }

    if (event.paymentIntentId && event.status) {
      const order = await this.repository.getOrderByStripePaymentIntentId(event.paymentIntentId);
      if (order) {
        await this.repository.updateCardPayment(order.id, {
          status: event.status,
          stripePaymentIntentId: event.paymentIntentId,
          stripeReaderActionId: order.payment.stripeReaderActionId,
          stripeReaderId: order.payment.stripeReaderId,
          failureMessage: event.failureMessage,
        });
      }
    }

    return { received: true };
  }
}
