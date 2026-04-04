import {
  calculateTax,
  type BootstrapResponse,
  type CartInput,
  type DraftOrder,
  type PatchSettingsInput,
  type Product,
  type SummaryResponse,
  type UpsertProductInput,
} from "@rhc-pos/shared";

import { HttpError } from "../lib/http-error.js";
import { createOrderNumber } from "../lib/order-number.js";
import type { AuditEventInput, CardPaymentUpdateInput, PosRepository } from "./types.js";

type ModifierSummary = DraftOrder["lines"][number]["modifierSummary"];

function nowIso(): string {
  return new Date().toISOString();
}

export class MemoryPosRepository implements PosRepository {
  private bootstrap: Omit<BootstrapResponse, "status"> = {
    settings: {
      locationId: "main-location",
      locationName: "Church Coffee Shop",
      registerId: "kiosk-register-1",
      registerName: "Front Counter",
      taxRateBasisPoints: 0,
      recoveryTtlSeconds: 300,
      adminPinConfigured: true,
    },
    categories: [
      { id: "drinks", name: "Drinks", sortOrder: 1 },
      { id: "food", name: "Food", sortOrder: 2 },
      { id: "specials", name: "Specials", sortOrder: 3 },
    ],
    modifiers: [
      { id: "extra-shot", name: "Extra Shot", priceCents: 100, enabled: true, sortOrder: 1 },
      { id: "oat-milk", name: "Oat Milk", priceCents: 75, enabled: true, sortOrder: 2 },
      { id: "syrup", name: "Syrup", priceCents: 50, enabled: true, sortOrder: 3 },
    ],
    products: [
      { id: "drip-coffee", name: "Drip Coffee", categoryId: "drinks", priceCents: 250, enabled: true, sortOrder: 1, modifierIds: ["extra-shot", "syrup"] },
      { id: "latte", name: "Latte", categoryId: "drinks", priceCents: 450, enabled: true, sortOrder: 2, modifierIds: ["extra-shot", "oat-milk", "syrup"] },
      { id: "tea", name: "Tea", categoryId: "drinks", priceCents: 300, enabled: true, sortOrder: 3, modifierIds: ["syrup"] },
      { id: "pastry", name: "Pastry", categoryId: "food", priceCents: 350, enabled: true, sortOrder: 1, modifierIds: [] },
      { id: "muffin", name: "Muffin", categoryId: "food", priceCents: 300, enabled: true, sortOrder: 2, modifierIds: [] },
      { id: "bagel", name: "Bagel", categoryId: "food", priceCents: 325, enabled: true, sortOrder: 3, modifierIds: [] },
    ],
    cashiers: [
      { id: "sarah", name: "Sarah", active: true },
      { id: "alex", name: "Alex", active: true },
    ],
  };

  private orders = new Map<string, DraftOrder>();
  private auditEvents: AuditEventInput[] = [];
  private webhookIds = new Set<string>();
  private lastWebhookAt: string | null = null;
  private sequence = 0;

  async getBootstrapBase(): Promise<Omit<BootstrapResponse, "status">> {
    return structuredClone(this.bootstrap);
  }

  async createDraftOrder(input: CartInput): Promise<DraftOrder> {
    const cashier = this.bootstrap.cashiers.find((entry) => entry.id === input.cashierId && entry.active);
    if (!cashier) {
      throw new HttpError(400, "Cashier is not available.");
    }

    const lines = input.items.map((item, index) => {
      const product = this.bootstrap.products.find((entry) => entry.id === item.productId && entry.enabled);
      if (!product) {
        throw new HttpError(400, `Product ${item.productId} is not available.`);
      }

      const modifierSummary: ModifierSummary = item.modifierIds.map((modifierId) => {
        if (!product.modifierIds.includes(modifierId)) {
          throw new HttpError(400, `Modifier ${modifierId} is not allowed for ${product.name}.`);
        }

        const modifier = this.bootstrap.modifiers.find((entry) => entry.id === modifierId && entry.enabled);
        if (!modifier) {
          throw new HttpError(400, `Modifier ${modifierId} is not available.`);
        }

        return {
          id: modifier.id,
          name: modifier.name,
          priceCents: modifier.priceCents,
        };
      });

      const unitPriceCents =
        product.priceCents + modifierSummary.reduce((sum, modifier) => sum + modifier.priceCents, 0);
      const lineTotalCents = unitPriceCents * item.quantity;

      return {
        id: `line-${index + 1}`,
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPriceCents,
        modifierIds: item.modifierIds,
        modifierSummary,
        lineTotalCents,
      };
    });

    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const taxCents = calculateTax(subtotalCents, this.bootstrap.settings.taxRateBasisPoints);
    const timestamp = nowIso();
    const order: DraftOrder = {
      id: crypto.randomUUID(),
      orderNumber: createOrderNumber(new Date(), ++this.sequence),
      status: "draft",
      cashierId: cashier.id,
      cashierName: cashier.name,
      lines,
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
      payment: { status: "idle" },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.orders.set(order.id, order);
    return structuredClone(order);
  }

  async getOrder(orderId: string): Promise<DraftOrder | null> {
    return structuredClone(this.orders.get(orderId) ?? null);
  }

  async finalizeCashPayment(orderId: string, tenderedCents: number): Promise<DraftOrder> {
    const order = this.requireOrder(orderId);
    if (tenderedCents < order.totalCents) {
      throw new HttpError(400, "Cash received is less than the amount due.");
    }

    const updated: DraftOrder = {
      ...order,
      status: "paid",
      updatedAt: nowIso(),
      payment: {
        status: "succeeded",
        tenderType: "cash",
        tenderedCents,
        changeDueCents: tenderedCents - order.totalCents,
      },
    };
    this.orders.set(orderId, updated);
    return structuredClone(updated);
  }

  async updateCardPayment(orderId: string, input: CardPaymentUpdateInput): Promise<DraftOrder> {
    const order = this.requireOrder(orderId);
    const status =
      input.status === "pending"
        ? "awaiting_payment"
        : input.status === "succeeded"
          ? "paid"
          : input.status === "canceled"
            ? "draft"
            : order.status;
    const updated: DraftOrder = {
      ...order,
      status,
      updatedAt: nowIso(),
      payment: {
        ...order.payment,
        status: input.status === "pending" ? "pending" : input.status,
        tenderType: "card",
        stripePaymentIntentId: input.stripePaymentIntentId ?? order.payment.stripePaymentIntentId,
        stripeReaderActionId: input.stripeReaderActionId ?? order.payment.stripeReaderActionId,
        stripeReaderId: input.stripeReaderId ?? order.payment.stripeReaderId,
        failureMessage: input.failureMessage,
      },
    };
    this.orders.set(orderId, updated);
    return structuredClone(updated);
  }

  async getSummary(date: Date): Promise<SummaryResponse> {
    const salesDate = date.toISOString().slice(0, 10);
    const paidOrders = [...this.orders.values()].filter(
      (order) => order.status === "paid" && order.createdAt.startsWith(salesDate),
    );
    const itemCounts = new Map<string, { productId: string; productName: string; quantity: number }>();

    for (const order of paidOrders) {
      for (const line of order.lines) {
        const existing = itemCounts.get(line.productId);
        itemCounts.set(line.productId, {
          productId: line.productId,
          productName: line.productName,
          quantity: (existing?.quantity ?? 0) + line.quantity,
        });
      }
    }

    return {
      salesDate,
      totalSalesCents: paidOrders.reduce((sum, order) => sum + order.totalCents, 0),
      cashSalesCents: paidOrders
        .filter((order) => order.payment.tenderType === "cash")
        .reduce((sum, order) => sum + order.totalCents, 0),
      cardSalesCents: paidOrders
        .filter((order) => order.payment.tenderType === "card")
        .reduce((sum, order) => sum + order.totalCents, 0),
      orderCount: paidOrders.length,
      itemCounts: [...itemCounts.values()],
    };
  }

  async listProducts(): Promise<Product[]> {
    return structuredClone(this.bootstrap.products);
  }

  async upsertProduct(input: UpsertProductInput, actorLabel: string): Promise<Product> {
    const product: Product = {
      id: input.id ?? input.name.toLowerCase().replaceAll(/\s+/g, "-"),
      name: input.name,
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      enabled: input.enabled,
      sortOrder: input.sortOrder,
      modifierIds: input.modifierIds,
    };
    const index = this.bootstrap.products.findIndex((entry) => entry.id === product.id);
    if (index >= 0) {
      this.bootstrap.products[index] = product;
    } else {
      this.bootstrap.products.push(product);
    }
    await this.appendAuditEvent({
      action: index >= 0 ? "product.updated" : "product.created",
      entityType: "product",
      entityId: product.id,
      actorLabel,
      payload: product as unknown as Record<string, unknown>,
    });
    return structuredClone(product);
  }

  async patchSettings(
    input: PatchSettingsInput,
    actorLabel: string,
  ): Promise<Omit<BootstrapResponse, "status">["settings"]> {
    this.bootstrap.settings = {
      ...this.bootstrap.settings,
      taxRateBasisPoints: input.taxRateBasisPoints ?? this.bootstrap.settings.taxRateBasisPoints,
      locationName: input.locationName ?? this.bootstrap.settings.locationName,
      registerName: input.registerName ?? this.bootstrap.settings.registerName,
    };
    await this.appendAuditEvent({
      action: "settings.updated",
      entityType: "settings",
      entityId: this.bootstrap.settings.registerId,
      actorLabel,
      payload: input as Record<string, unknown>,
    });
    return structuredClone(this.bootstrap.settings);
  }

  async appendAuditEvent(input: AuditEventInput): Promise<void> {
    this.auditEvents.push(input);
  }

  async recordWebhookEvent(
    stripeEventId: string,
    _eventType: string,
    _payload: Record<string, unknown>,
  ): Promise<boolean> {
    if (this.webhookIds.has(stripeEventId)) {
      return false;
    }
    this.webhookIds.add(stripeEventId);
    this.lastWebhookAt = nowIso();
    return true;
  }

  async getOrderByStripePaymentIntentId(paymentIntentId: string): Promise<DraftOrder | null> {
    return (
      structuredClone(
        [...this.orders.values()].find((order) => order.payment.stripePaymentIntentId === paymentIntentId) ?? null,
      )
    );
  }

  async getLastWebhookAt(): Promise<string | null> {
    return this.lastWebhookAt;
  }

  private requireOrder(orderId: string): DraftOrder {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }
    return order;
  }
}
