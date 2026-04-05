import {
  adminPinSchema,
  bootstrapResponseSchema,
  cartInputSchema,
  upsertCategorySchema,
  upsertModifierSchema,
  summaryResponseSchema,
  upsertProductSchema,
  upsertSizeOptionSchema,
  patchSettingsSchema,
  type BootstrapResponse,
  type DraftOrder,
  type Category,
  type Modifier,
  type SizeOption,
  type SummaryResponse,
} from "@rhc-pos/shared";

import { HttpError } from "../lib/http-error.js";
import type { PosRepository } from "../repositories/types.js";
import type { AdminAuthService } from "./admin-auth-service.js";
import type { TerminalService } from "./terminal-service.js";

export class PosService {
  constructor(
    private readonly repository: PosRepository,
    private readonly terminalService: TerminalService,
    private readonly adminAuthService: AdminAuthService,
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

  async startCardPayment(orderId: string): Promise<DraftOrder> {
    const order = await this.getOrder(orderId);
    if (order.status === "paid") {
      return order;
    }

    const result = await this.terminalService.startPayment(order);
    return this.repository.updateCardPayment(orderId, {
      status: result.status,
      stripePaymentIntentId: result.stripePaymentIntentId,
      stripeReaderActionId: result.stripeReaderActionId,
      stripeReaderId: result.stripeReaderId,
      failureMessage: result.failureMessage,
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

  async listCategories(): Promise<Category[]> {
    return this.repository.listCategories();
  }

  async upsertCategory(input: unknown, actorLabel: string) {
    return this.repository.upsertCategory(upsertCategorySchema.parse(input), actorLabel);
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
    return this.repository.upsertProduct(upsertProductSchema.parse(input), actorLabel);
  }

  async patchSettings(input: unknown, actorLabel: string) {
    return this.repository.patchSettings(patchSettingsSchema.parse(input), actorLabel);
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
