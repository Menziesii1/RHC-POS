import { PrismaClient } from "@prisma/client";
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

import type { AppConfig } from "../config.js";
import { HttpError } from "../lib/http-error.js";
import { createOrderNumber } from "../lib/order-number.js";
import type { AuditEventInput, CardPaymentUpdateInput, PosRepository } from "./types.js";

type ProductRecord = Awaited<ReturnType<PrismaPosRepository["getProductRecords"]>>[number];
type OrderRecord = Awaited<ReturnType<PrismaPosRepository["getOrderRecord"]>>;

function serializeModifierSummary(value: DraftOrder["lines"][number]["modifierSummary"]) {
  return value as unknown as object;
}

export class PrismaPosRepository implements PosRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
  ) {}

  async getBootstrapBase(): Promise<Omit<BootstrapResponse, "status">> {
    const [location, register, categories, modifiers, products, cashiers, recoverySetting] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: this.config.LOCATION_ID } }),
      this.prisma.register.findUnique({ where: { id: this.config.REGISTER_ID } }),
      this.prisma.category.findMany({ where: { locationId: this.config.LOCATION_ID }, orderBy: { sortOrder: "asc" } }),
      this.prisma.modifier.findMany({ where: { locationId: this.config.LOCATION_ID }, orderBy: { sortOrder: "asc" } }),
      this.getProductRecords(),
      this.prisma.staffProfile.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      this.prisma.appSetting.findUnique({ where: { key: "recovery_ttl_seconds" } }),
    ]);

    if (!location || !register) {
      throw new HttpError(500, "Store bootstrap data is missing. Run the Prisma seed first.");
    }

    return {
      settings: {
        locationId: location.id,
        locationName: location.name,
        registerId: register.id,
        registerName: register.name,
        taxRateBasisPoints: location.taxRateBasisPoints,
        recoveryTtlSeconds: Number(recoverySetting?.value ?? this.config.RECOVERY_TTL_SECONDS),
        adminPinConfigured: Boolean(this.config.ADMIN_PIN_HASH || this.config.ADMIN_PIN),
      },
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
      })),
      modifiers: modifiers.map((modifier) => ({
        id: modifier.id,
        name: modifier.name,
        priceCents: modifier.priceCents,
        enabled: modifier.enabled,
        sortOrder: modifier.sortOrder,
      })),
      products: products.map((product) => this.mapProduct(product)),
      cashiers: cashiers.map((cashier) => ({
        id: cashier.id,
        name: cashier.name,
        active: cashier.active,
      })),
    };
  }

  async createDraftOrder(input: CartInput): Promise<DraftOrder> {
    const bootstrap = await this.getBootstrapBase();
    const cashier = bootstrap.cashiers.find((entry) => entry.id === input.cashierId);
    if (!cashier) {
      throw new HttpError(400, "Cashier is not available.");
    }

    const lines = input.items.map((item, index) => {
      const product = bootstrap.products.find((entry) => entry.id === item.productId && entry.enabled);
      if (!product) {
        throw new HttpError(400, `Product ${item.productId} is not available.`);
      }

      const modifierSummary = item.modifierIds.map((modifierId) => {
        if (!product.modifierIds.includes(modifierId)) {
          throw new HttpError(400, `Modifier ${modifierId} is not allowed for ${product.name}.`);
        }

        const modifier = bootstrap.modifiers.find((entry) => entry.id === modifierId && entry.enabled);
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
    const taxCents = calculateTax(subtotalCents, bootstrap.settings.taxRateBasisPoints);
    const today = new Date(new Date().toISOString().slice(0, 10));
    const orderCountToday = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });

    const order = await this.prisma.order.create({
      data: {
        orderNumber: createOrderNumber(new Date(), orderCountToday + 1),
        status: "draft",
        locationId: bootstrap.settings.locationId,
        registerId: bootstrap.settings.registerId,
        cashierId: cashier.id,
        cashierName: cashier.name,
        subtotalCents,
        taxCents,
        totalCents: subtotalCents + taxCents,
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            modifierIdsJson: line.modifierIds as unknown as object,
            modifierSummary: serializeModifierSummary(line.modifierSummary),
            lineTotalCents: line.lineTotalCents,
          })),
        },
        payment: {
          create: {
            status: "idle",
          },
        },
      },
      include: {
        items: true,
        payment: true,
      },
    });

    return this.mapOrder(order);
  }

  async getOrder(orderId: string): Promise<DraftOrder | null> {
    const order = await this.getOrderRecord(orderId);
    return order ? this.mapOrder(order) : null;
  }

  async finalizeCashPayment(orderId: string, tenderedCents: number): Promise<DraftOrder> {
    const order = await this.requireOrder(orderId);
    if (tenderedCents < order.totalCents) {
      throw new HttpError(400, "Cash received is less than the amount due.");
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: "paid",
        paidAt: new Date(),
        payment: {
          update: {
            tenderType: "cash",
            status: "succeeded",
            tenderedCents,
            changeDueCents: tenderedCents - order.totalCents,
            failureMessage: null,
          },
        },
      },
      include: {
        items: true,
        payment: true,
      },
    });

    return this.mapOrder(updated);
  }

  async updateCardPayment(orderId: string, input: CardPaymentUpdateInput): Promise<DraftOrder> {
    await this.requireOrder(orderId);

    const statusMap = {
      pending: { orderStatus: "awaiting_payment", paymentStatus: "pending" },
      succeeded: { orderStatus: "paid", paymentStatus: "succeeded" },
      failed: { orderStatus: "awaiting_payment", paymentStatus: "failed" },
      canceled: { orderStatus: "draft", paymentStatus: "canceled" },
    } as const;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: statusMap[input.status].orderStatus,
        paidAt: input.status === "succeeded" ? new Date() : null,
        payment: {
          upsert: {
            update: {
              tenderType: "card",
              status: statusMap[input.status].paymentStatus,
              stripePaymentIntentId: input.stripePaymentIntentId,
              stripeReaderActionId: input.stripeReaderActionId,
              stripeReaderId: input.stripeReaderId,
              failureMessage: input.failureMessage ?? null,
            },
            create: {
              tenderType: "card",
              status: statusMap[input.status].paymentStatus,
              stripePaymentIntentId: input.stripePaymentIntentId,
              stripeReaderActionId: input.stripeReaderActionId,
              stripeReaderId: input.stripeReaderId,
              failureMessage: input.failureMessage ?? null,
            },
          },
        },
      },
      include: {
        items: true,
        payment: true,
      },
    });

    return this.mapOrder(updated);
  }

  async getSummary(date: Date): Promise<SummaryResponse> {
    const start = new Date(date.toISOString().slice(0, 10));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        status: "paid",
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      include: {
        items: true,
        payment: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const itemMap = new Map<string, { productId: string; productName: string; quantity: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const existing = itemMap.get(item.productId);
        itemMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          quantity: (existing?.quantity ?? 0) + item.quantity,
        });
      }
    }

    return {
      salesDate: start.toISOString().slice(0, 10),
      totalSalesCents: orders.reduce((sum, order) => sum + order.totalCents, 0),
      cashSalesCents: orders
        .filter((order) => order.payment?.tenderType === "cash")
        .reduce((sum, order) => sum + order.totalCents, 0),
      cardSalesCents: orders
        .filter((order) => order.payment?.tenderType === "card")
        .reduce((sum, order) => sum + order.totalCents, 0),
      orderCount: orders.length,
      itemCounts: [...itemMap.values()],
    };
  }

  async listProducts(): Promise<Product[]> {
    const products = await this.getProductRecords();
    return products.map((product) => this.mapProduct(product));
  }

  async upsertProduct(input: UpsertProductInput, actorLabel: string): Promise<Product> {
    const productId = input.id ?? input.name.toLowerCase().replaceAll(/\s+/g, "-");
    const product = await this.prisma.product.upsert({
      where: { id: productId },
      update: {
        name: input.name,
        categoryId: input.categoryId,
        priceCents: input.priceCents,
        enabled: input.enabled,
        sortOrder: input.sortOrder,
        modifiers: {
          deleteMany: {},
          create: input.modifierIds.map((modifierId) => ({ modifierId })),
        },
      },
      create: {
        id: productId,
        locationId: this.config.LOCATION_ID,
        name: input.name,
        categoryId: input.categoryId,
        priceCents: input.priceCents,
        enabled: input.enabled,
        sortOrder: input.sortOrder,
        modifiers: {
          create: input.modifierIds.map((modifierId) => ({ modifierId })),
        },
      },
      include: {
        modifiers: true,
      },
    });

    await this.appendAuditEvent({
      action: input.id ? "product.updated" : "product.created",
      entityType: "product",
      entityId: product.id,
      actorLabel,
      payload: input as Record<string, unknown>,
    });

    return {
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      priceCents: product.priceCents,
      enabled: product.enabled,
      sortOrder: product.sortOrder,
      modifierIds: product.modifiers.map((modifier) => modifier.modifierId),
    };
  }

  async patchSettings(
    input: PatchSettingsInput,
    actorLabel: string,
  ): Promise<Omit<BootstrapResponse, "status">["settings"]> {
    const [location, register] = await Promise.all([
      this.prisma.location.update({
        where: { id: this.config.LOCATION_ID },
        data: {
          ...(input.locationName ? { name: input.locationName } : {}),
          ...(input.taxRateBasisPoints !== undefined ? { taxRateBasisPoints: input.taxRateBasisPoints } : {}),
        },
      }),
      this.prisma.register.update({
        where: { id: this.config.REGISTER_ID },
        data: input.registerName ? { name: input.registerName } : {},
      }),
    ]);

    await this.appendAuditEvent({
      action: "settings.updated",
      entityType: "settings",
      entityId: register.id,
      actorLabel,
      payload: input as Record<string, unknown>,
    });

    const recoverySetting = await this.prisma.appSetting.findUnique({
      where: { key: "recovery_ttl_seconds" },
    });

    return {
      locationId: location.id,
      locationName: location.name,
      registerId: register.id,
      registerName: register.name,
      taxRateBasisPoints: location.taxRateBasisPoints,
      recoveryTtlSeconds: Number(recoverySetting?.value ?? this.config.RECOVERY_TTL_SECONDS),
      adminPinConfigured: Boolean(this.config.ADMIN_PIN_HASH || this.config.ADMIN_PIN),
    };
  }

  async appendAuditEvent(input: AuditEventInput): Promise<void> {
    await this.prisma.adminAuditEvent.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorLabel: input.actorLabel,
        payload: input.payload as unknown as object,
      },
    });
  }

  async recordWebhookEvent(
    stripeEventId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      await this.prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId,
          eventType,
          payload: payload as unknown as object,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getOrderByStripePaymentIntentId(paymentIntentId: string): Promise<DraftOrder | null> {
    const order = await this.prisma.order.findFirst({
      where: {
        payment: {
          stripePaymentIntentId: paymentIntentId,
        },
      },
      include: {
        items: true,
        payment: true,
      },
    });

    return order ? this.mapOrder(order) : null;
  }

  async getLastWebhookAt(): Promise<string | null> {
    const event = await this.prisma.stripeWebhookEvent.findFirst({
      orderBy: { processedAt: "desc" },
    });
    return event?.processedAt.toISOString() ?? null;
  }

  private async getProductRecords() {
    return this.prisma.product.findMany({
      where: { locationId: this.config.LOCATION_ID },
      include: { modifiers: true },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
    });
  }

  private mapProduct(product: ProductRecord): Product {
    return {
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      priceCents: product.priceCents,
      enabled: product.enabled,
      sortOrder: product.sortOrder,
      modifierIds: product.modifiers.map((modifier) => modifier.modifierId),
    };
  }

  private async getOrderRecord(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
      },
    });
  }

  private async requireOrder(orderId: string) {
    const order = await this.getOrderRecord(orderId);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }
    return order;
  }

  private mapOrder(order: NonNullable<OrderRecord>): DraftOrder {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      cashierId: order.cashierId,
      cashierName: order.cashierName,
      lines: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        modifierIds: item.modifierIdsJson as string[],
        modifierSummary: item.modifierSummary as DraftOrder["lines"][number]["modifierSummary"],
        lineTotalCents: item.lineTotalCents,
      })),
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      payment: {
        status: (order.payment?.status ?? "idle") as DraftOrder["payment"]["status"],
        tenderType: (order.payment?.tenderType ?? undefined) as DraftOrder["payment"]["tenderType"],
        stripePaymentIntentId: order.payment?.stripePaymentIntentId ?? undefined,
        stripeReaderActionId: order.payment?.stripeReaderActionId ?? undefined,
        stripeReaderId: order.payment?.stripeReaderId ?? undefined,
        failureMessage: order.payment?.failureMessage ?? undefined,
        tenderedCents: order.payment?.tenderedCents ?? undefined,
        changeDueCents: order.payment?.changeDueCents ?? undefined,
      },
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
