import {
  type AnalyticsRangeResponse,
  calculateLinePrice,
  calculateTax,
  type BootstrapResponse,
  type CartInput,
  type Category,
  type DraftOrder,
  type FlavorCategory,
  type Modifier,
  type PatchSettingsInput,
  type Product,
  type SizeOption,
  type SummaryResponse,
  type UpsertCategoryInput,
  type UpsertFlavorCategoryInput,
  type UpsertModifierInput,
  type UpsertProductInput,
  type UpsertSizeOptionInput,
} from "@rhc-pos/shared";
import bcrypt from "bcryptjs";

import { HttpError } from "../lib/http-error.js";
import { createOrderNumber } from "../lib/order-number.js";
import type { AuditEventInput, CardPaymentUpdateInput, PosRepository, TransactionListResponse } from "./types.js";

type LineSummary = DraftOrder["lines"][number]["modifierSummary"];

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-+|-+$/g, "");
}

function toMap<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item] as const));
}

export class MemoryPosRepository implements PosRepository {
  private lockScreenPinHash = bcrypt.hashSync("1357", 10);

  private bootstrap: Omit<BootstrapResponse, "status"> = {
    settings: {
      locationId: "main-location",
      locationName: "Church Coffee Shop",
      registerId: "kiosk-register-1",
      registerName: "Front Counter",
      taxRateBasisPoints: 0,
      recoveryTtlSeconds: 300,
      adminPinConfigured: true,
      lockScreenPinConfigured: true,
    },
    categories: [
      { id: "drink", name: "Drink", sortOrder: 1, enabled: true },
      { id: "food", name: "Food", sortOrder: 2, enabled: true },
      { id: "discount", name: "Discount", sortOrder: 3, enabled: true },
      { id: "kids", name: "Kids", sortOrder: 4, enabled: true },
    ],
    sizes: [
      { id: "regular", name: "Regular", priceDeltaCents: 0, enabled: true, sortOrder: 1 },
      { id: "kids", name: "Kids", priceDeltaCents: -100, enabled: true, sortOrder: 2 },
    ],
    flavorCategories: [
      { id: "classic-syrups", name: "Classic Syrups", sortOrder: 1 },
      { id: "sugar-free", name: "Sugar Free", sortOrder: 2 },
      { id: "extras", name: "Extras", sortOrder: 3 },
    ],
    modifiers: [
      { id: "vanilla", name: "Vanilla", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 1, flavorCategoryId: "classic-syrups" },
      { id: "caramel", name: "Caramel", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 2, flavorCategoryId: "classic-syrups" },
      { id: "hazelnut", name: "Hazelnut", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 3, flavorCategoryId: "classic-syrups" },
      { id: "raspberry", name: "Raspberry", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 4, flavorCategoryId: "classic-syrups" },
      { id: "extra-shot", name: "Extra Shot", priceCents: 100, discountFlavor: false, enabled: true, sortOrder: 5, flavorCategoryId: "extras" },
      { id: "sugar-free-vanilla", name: "Sugar Free Vanilla", priceCents: -100, discountFlavor: true, enabled: true, sortOrder: 6, flavorCategoryId: "sugar-free" },
      { id: "sugar-free-caramel", name: "Sugar Free Caramel", priceCents: -100, discountFlavor: true, enabled: true, sortOrder: 7, flavorCategoryId: "sugar-free" },
    ],
    products: [
      {
        id: "mocha",
        name: "Mocha",
        categoryId: "drink",
        priceCents: 450,
        discountCents: 0,
        enabled: true,
        sortOrder: 1,
        productType: "drink",
        modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel", "extra-shot"],
        sizeOptionIds: ["regular"],
        sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 0 }],
        defaultSizeOptionId: "regular",
      },
      {
        id: "latte",
        name: "Latte",
        categoryId: "drink",
        priceCents: 400,
        discountCents: 0,
        enabled: true,
        sortOrder: 2,
        productType: "drink",
        modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel", "extra-shot"],
        sizeOptionIds: ["regular"],
        sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 0 }],
        defaultSizeOptionId: "regular",
      },
      {
        id: "iced-latte",
        name: "Iced Latte",
        categoryId: "drink",
        priceCents: 450,
        discountCents: 0,
        enabled: true,
        sortOrder: 3,
        productType: "drink",
        modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel", "extra-shot"],
        sizeOptionIds: ["regular"],
        sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 0 }],
        defaultSizeOptionId: "regular",
      },
      {
        id: "frappuccino",
        name: "Frappuccino",
        categoryId: "drink",
        priceCents: 450,
        discountCents: 0,
        enabled: true,
        sortOrder: 4,
        productType: "drink",
        modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel"],
        sizeOptionIds: ["regular"],
        sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 0 }],
        defaultSizeOptionId: "regular",
      },
      {
        id: "dirty-chai",
        name: "Dirty Chai",
        categoryId: "drink",
        priceCents: 450,
        discountCents: 0,
        enabled: true,
        sortOrder: 5,
        productType: "drink",
        modifierIds: ["vanilla", "caramel", "hazelnut", "extra-shot", "sugar-free-vanilla", "sugar-free-caramel"],
        sizeOptionIds: ["regular"],
        sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 0 }],
        defaultSizeOptionId: "regular",
      },
      {
        id: "red-bull",
        name: "Red Bull",
        categoryId: "drink",
        priceCents: 450,
        discountCents: 0,
        enabled: true,
        sortOrder: 6,
        productType: "drink",
        modifierIds: ["vanilla", "caramel", "raspberry", "sugar-free-vanilla", "sugar-free-caramel"],
        sizeOptionIds: ["regular"],
        sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 0 }],
        defaultSizeOptionId: "regular",
      },
      {
        id: "americano",
        name: "Americano",
        categoryId: "drink",
        priceCents: 350,
        discountCents: 0,
        enabled: true,
        sortOrder: 7,
        productType: "drink",
        modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel", "extra-shot"],
        sizeOptionIds: ["regular"],
        sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 0 }],
        defaultSizeOptionId: "regular",
      },
      {
        id: "hot-chocolate",
        name: "Hot Chocolate",
        categoryId: "drink",
        priceCents: 350,
        discountCents: 0,
        enabled: true,
        sortOrder: 8,
        productType: "drink",
        modifierIds: ["vanilla", "caramel", "hazelnut", "raspberry", "sugar-free-vanilla", "sugar-free-caramel"],
        sizeOptionIds: ["regular", "kids"],
        sizeOptionPrices: [
          { sizeOptionId: "regular", priceDeltaCents: 0 },
          { sizeOptionId: "kids", priceDeltaCents: -100 },
        ],
        defaultSizeOptionId: "regular",
      },
      {
        id: "chai",
        name: "Chai",
        categoryId: "drink",
        priceCents: 300,
        discountCents: 0,
        enabled: true,
        sortOrder: 9,
        productType: "drink",
        modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel"],
        sizeOptionIds: ["regular", "kids"],
        sizeOptionPrices: [
          { sizeOptionId: "regular", priceDeltaCents: 0 },
          { sizeOptionId: "kids", priceDeltaCents: -50 },
        ],
        defaultSizeOptionId: "regular",
      },
      {
        id: "italian-soda",
        name: "Italian Soda",
        categoryId: "drink",
        priceCents: 300,
        discountCents: 0,
        enabled: true,
        sortOrder: 10,
        productType: "drink",
        modifierIds: ["raspberry", "vanilla", "caramel", "sugar-free-vanilla", "sugar-free-caramel"],
        sizeOptionIds: ["regular"],
        sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 0 }],
        defaultSizeOptionId: "regular",
      },
      {
        id: "muffin",
        name: "Muffin",
        categoryId: "food",
        priceCents: 300,
        discountCents: 0,
        enabled: true,
        sortOrder: 1,
        productType: "food",
        modifierIds: [],
        sizeOptionIds: [],
        sizeOptionPrices: [],
        defaultSizeOptionId: null,
      },
      {
        id: "bagel",
        name: "Bagel",
        categoryId: "food",
        priceCents: 325,
        discountCents: 0,
        enabled: true,
        sortOrder: 2,
        productType: "food",
        modifierIds: [],
        sizeOptionIds: [],
        sizeOptionPrices: [],
        defaultSizeOptionId: null,
      },
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
    const products = toMap(this.bootstrap.products);
    const sizes = toMap(this.bootstrap.sizes);
    const modifiers = toMap(this.bootstrap.modifiers);

    const lines = input.items.map((item, index) => {
      const product = products.get(item.productId);
      if (!product || !product.enabled) {
        throw new HttpError(400, `Product ${item.productId} is not available.`);
      }

      const selectedSizeId = item.sizeOptionId ?? product.defaultSizeOptionId ?? null;
      const size = selectedSizeId ? sizes.get(selectedSizeId) ?? null : null;
      if (selectedSizeId && (!size || !size.enabled)) {
        throw new HttpError(400, `Size ${selectedSizeId} is not allowed for ${product.name}.`);
      }

      const modifierSummary: LineSummary = item.modifierIds.map((modifierId) => {
        const modifier = modifiers.get(modifierId);
        if (!modifier || !modifier.enabled) {
          throw new HttpError(400, `Flavor ${modifierId} is not available.`);
        }

        return {
          id: modifier.id,
          name: modifier.name,
          priceCents: modifier.priceCents,
          discountFlavor: modifier.discountFlavor,
        };
      });

      const flavorAdjustmentCents = modifierSummary.reduce((sum, modifier) => sum + modifier.priceCents, 0);
      const sizeAdjustmentCents =
        product.sizeOptionPrices.find((entry) => entry.sizeOptionId === selectedSizeId)?.priceDeltaCents ??
        size?.priceDeltaCents ??
        0;
      const unitPriceCents = calculateLinePrice({
        basePriceCents: product.priceCents,
        sizeAdjustmentCents,
        flavorAdjustmentCents,
        discountCents: product.discountCents,
      });
      const lineTotalCents = unitPriceCents * item.quantity;

      return {
        id: `line-${index + 1}`,
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPriceCents,
        sizeOptionId: size?.id ?? null,
        sizeOptionName: size?.name ?? null,
        sizeAdjustmentCents,
        modifierIds: item.modifierIds,
        modifierSummary,
        flavorAdjustmentCents,
        discountCents: product.discountCents,
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
      cashierId: "staff",
      cashierName: "Staff",
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
    const categoryTotals = new Map<string, { id: string; name: string; quantity: number; totalCents: number }>();
    const sizeTotals = new Map<string, { id: string; name: string; quantity: number; totalCents: number }>();
    const flavorTotals = new Map<string, { id: string; name: string; quantity: number; totalCents: number; adjustmentCents: number; discountFlavor: boolean }>();
    const topItemTotals = new Map<string, { productId: string; productName: string; quantity: number; totalCents: number }>();
    const products = toMap(this.bootstrap.products);
    const categories = toMap(this.bootstrap.categories);
    const sizes = toMap(this.bootstrap.sizes);
    const flavors = toMap(this.bootstrap.modifiers);

    for (const order of paidOrders) {
      for (const line of order.lines) {
        const product = products.get(line.productId);
        if (!product) {
          continue;
        }
        const category = categories.get(product.categoryId);
        const size = line.sizeOptionId ? sizes.get(line.sizeOptionId) : null;

        const existing = itemCounts.get(line.productId);
        itemCounts.set(line.productId, {
          productId: line.productId,
          productName: line.productName,
          quantity: (existing?.quantity ?? 0) + line.quantity,
        });

        if (category) {
          const currentCategory = categoryTotals.get(category.id) ?? {
            id: category.id,
            name: category.name,
            quantity: 0,
            totalCents: 0,
          };
          currentCategory.quantity += line.quantity;
          currentCategory.totalCents += line.lineTotalCents;
          categoryTotals.set(category.id, currentCategory);
        }

        if (size) {
          const currentSize = sizeTotals.get(size.id) ?? {
            id: size.id,
            name: size.name,
            quantity: 0,
            totalCents: 0,
          };
          currentSize.quantity += line.quantity;
          currentSize.totalCents += line.lineTotalCents;
          sizeTotals.set(size.id, currentSize);
        }

        const currentTopItem = topItemTotals.get(line.productId) ?? {
          productId: line.productId,
          productName: line.productName,
          quantity: 0,
          totalCents: 0,
        };
        currentTopItem.quantity += line.quantity;
        currentTopItem.totalCents += line.lineTotalCents;
        topItemTotals.set(line.productId, currentTopItem);

        for (const flavorId of line.modifierIds) {
          const flavor = flavors.get(flavorId);
          if (!flavor) {
            continue;
          }
          const currentFlavor = flavorTotals.get(flavor.id) ?? {
            id: flavor.id,
            name: flavor.name,
            quantity: 0,
            totalCents: 0,
            adjustmentCents: 0,
            discountFlavor: flavor.discountFlavor,
          };
          currentFlavor.quantity += line.quantity;
          currentFlavor.totalCents += line.lineTotalCents;
          currentFlavor.adjustmentCents += flavor.priceCents * line.quantity;
          flavorTotals.set(flavor.id, currentFlavor);
        }
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
      salesByCategory: [...categoryTotals.values()],
      sizeBreakdown: [...sizeTotals.values()],
      flavorBreakdown: [...flavorTotals.values()],
      topItems: [...topItemTotals.values()].sort((a, b) => b.totalCents - a.totalCents).slice(0, 5),
    };
  }

  async getAnalyticsRange(date: Date, days: number): Promise<AnalyticsRangeResponse> {
    const end = new Date(date);
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const paidOrders = [...this.orders.values()].filter((order) => {
      if (order.status !== "paid") {
        return false;
      }
      const createdAt = new Date(order.createdAt).getTime();
      return createdAt >= start.getTime() && createdAt < end.getTime() + 24 * 60 * 60 * 1000;
    });

    const dateKeys = Array.from({ length: days }, (_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      return current.toISOString().slice(0, 10);
    });

    const salesSeries = dateKeys.map((dateKey) => {
      const dayOrders = paidOrders.filter((order) => order.createdAt.startsWith(dateKey));
      return {
        date: dateKey,
        totalSalesCents: dayOrders.reduce((sum, order) => sum + order.totalCents, 0),
        cashSalesCents: dayOrders
          .filter((order) => order.payment.tenderType === "cash")
          .reduce((sum, order) => sum + order.totalCents, 0),
        cardSalesCents: dayOrders
          .filter((order) => order.payment.tenderType === "card")
          .reduce((sum, order) => sum + order.totalCents, 0),
        orderCount: dayOrders.length,
      };
    });

    const productSeriesMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        totalQuantity: number;
        totalSalesCents: number;
        daily: Map<string, { date: string; quantity: number; totalCents: number }>;
      }
    >();

    for (const order of paidOrders) {
      const orderDate = order.createdAt.slice(0, 10);
      for (const line of order.lines) {
        const current = productSeriesMap.get(line.productId) ?? {
          productId: line.productId,
          productName: line.productName,
          totalQuantity: 0,
          totalSalesCents: 0,
          daily: new Map(),
        };
        current.totalQuantity += line.quantity;
        current.totalSalesCents += line.lineTotalCents;
        const daily = current.daily.get(orderDate) ?? {
          date: orderDate,
          quantity: 0,
          totalCents: 0,
        };
        daily.quantity += line.quantity;
        daily.totalCents += line.lineTotalCents;
        current.daily.set(orderDate, daily);
        productSeriesMap.set(line.productId, current);
      }
    }

    return {
      startDate: dateKeys[0],
      endDate: dateKeys[dateKeys.length - 1],
      days,
      salesSeries,
      productSeries: [...productSeriesMap.values()]
        .map((entry) => ({
          productId: entry.productId,
          productName: entry.productName,
          totalQuantity: entry.totalQuantity,
          totalSalesCents: entry.totalSalesCents,
          daily: dateKeys.map((dateKey) => entry.daily.get(dateKey) ?? { date: dateKey, quantity: 0, totalCents: 0 }),
        }))
        .sort((a, b) => b.totalSalesCents - a.totalSalesCents),
    };
  }

  async listCategories(): Promise<Category[]> {
    return structuredClone(this.bootstrap.categories);
  }

  async upsertCategory(input: UpsertCategoryInput, actorLabel: string): Promise<Category> {
    const category: Category = {
      id: input.id ?? slugify(input.name),
      name: input.name,
      sortOrder: input.sortOrder,
      enabled: input.enabled,
    };

    const index = this.bootstrap.categories.findIndex((entry) => entry.id === category.id);
    if (index >= 0) {
      this.bootstrap.categories[index] = category;
    } else {
      this.bootstrap.categories.push(category);
    }

    await this.appendAuditEvent({
      action: index >= 0 ? "category.updated" : "category.created",
      entityType: "category",
      entityId: category.id,
      actorLabel,
      payload: category as unknown as Record<string, unknown>,
    });

    return structuredClone(category);
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const category = this.bootstrap.categories.find((entry) => entry.id === categoryId);
    if (!category) {
      throw new HttpError(404, "Category not found.");
    }

    if (this.bootstrap.products.some((product) => product.categoryId === categoryId)) {
      throw new HttpError(400, "Move products out of this category before deleting it.");
    }

    this.bootstrap.categories = this.bootstrap.categories.filter((entry) => entry.id !== categoryId);

    await this.appendAuditEvent({
      action: "category.deleted",
      entityType: "category",
      entityId: categoryId,
      actorLabel: "system",
      payload: { categoryId },
    });
  }

  async listModifiers(): Promise<Modifier[]> {
    return structuredClone(this.bootstrap.modifiers);
  }

  async upsertModifier(input: UpsertModifierInput, actorLabel: string): Promise<Modifier> {
    const modifier: Modifier = {
      id: input.id ?? slugify(input.name),
      name: input.name,
      priceCents: input.priceCents,
      discountFlavor: input.discountFlavor,
      enabled: input.enabled,
      sortOrder: input.sortOrder,
      flavorCategoryId: input.flavorCategoryId ?? null,
    };

    const index = this.bootstrap.modifiers.findIndex((entry) => entry.id === modifier.id);
    if (index >= 0) {
      this.bootstrap.modifiers[index] = modifier;
    } else {
      this.bootstrap.modifiers.push(modifier);
    }

    await this.appendAuditEvent({
      action: index >= 0 ? "modifier.updated" : "modifier.created",
      entityType: "modifier",
      entityId: modifier.id,
      actorLabel,
      payload: modifier as unknown as Record<string, unknown>,
    });

    return structuredClone(modifier);
  }

  async deleteModifier(modifierId: string): Promise<void> {
    const modifier = this.bootstrap.modifiers.find((entry) => entry.id === modifierId);
    if (!modifier) {
      throw new HttpError(404, "Flavor not found.");
    }

    this.bootstrap.modifiers = this.bootstrap.modifiers.filter((entry) => entry.id !== modifierId);
    this.bootstrap.products = this.bootstrap.products.map((product) => ({
      ...product,
      modifierIds: product.modifierIds.filter((id) => id !== modifierId),
    }));

    await this.appendAuditEvent({
      action: "modifier.deleted",
      entityType: "modifier",
      entityId: modifierId,
      actorLabel: "system",
      payload: { modifierId },
    });
  }

  async listFlavorCategories(): Promise<FlavorCategory[]> {
    return structuredClone(this.bootstrap.flavorCategories);
  }

  async upsertFlavorCategory(input: UpsertFlavorCategoryInput, actorLabel: string): Promise<FlavorCategory> {
    const fc: FlavorCategory = {
      id: input.id ?? slugify(input.name),
      name: input.name,
      sortOrder: input.sortOrder,
    };
    const index = this.bootstrap.flavorCategories.findIndex((c) => c.id === fc.id);
    if (index >= 0) {
      this.bootstrap.flavorCategories[index] = fc;
    } else {
      this.bootstrap.flavorCategories.push(fc);
    }
    await this.appendAuditEvent({ action: index >= 0 ? "flavorCategory.updated" : "flavorCategory.created", entityType: "flavorCategory", entityId: fc.id, actorLabel, payload: fc as unknown as Record<string, unknown> });
    return structuredClone(fc);
  }

  async deleteFlavorCategory(categoryId: string): Promise<void> {
    const fc = this.bootstrap.flavorCategories.find((c) => c.id === categoryId);
    if (!fc) throw new HttpError(404, "Flavor category not found.");
    this.bootstrap.flavorCategories = this.bootstrap.flavorCategories.filter((c) => c.id !== categoryId);
    this.bootstrap.modifiers = this.bootstrap.modifiers.map((m) =>
      m.flavorCategoryId === categoryId ? { ...m, flavorCategoryId: null } : m,
    );
    await this.appendAuditEvent({ action: "flavorCategory.deleted", entityType: "flavorCategory", entityId: categoryId, actorLabel: "system", payload: { categoryId } });
  }

  async listSizes(): Promise<SizeOption[]> {
    return structuredClone(this.bootstrap.sizes);
  }

  async upsertSize(input: UpsertSizeOptionInput, actorLabel: string): Promise<SizeOption> {
    const size: SizeOption = {
      id: input.id ?? slugify(input.name),
      name: input.name,
      priceDeltaCents: input.priceDeltaCents,
      enabled: input.enabled,
      sortOrder: input.sortOrder,
    };

    const index = this.bootstrap.sizes.findIndex((entry) => entry.id === size.id);
    if (index >= 0) {
      this.bootstrap.sizes[index] = size;
    } else {
      this.bootstrap.sizes.push(size);
    }

    await this.appendAuditEvent({
      action: index >= 0 ? "size.updated" : "size.created",
      entityType: "size",
      entityId: size.id,
      actorLabel,
      payload: size as unknown as Record<string, unknown>,
    });

    return structuredClone(size);
  }

  async deleteSize(sizeId: string): Promise<void> {
    const size = this.bootstrap.sizes.find((entry) => entry.id === sizeId);
    if (!size) {
      throw new HttpError(404, "Size not found.");
    }

    this.bootstrap.sizes = this.bootstrap.sizes.filter((entry) => entry.id !== sizeId);
    this.bootstrap.products = this.bootstrap.products.map((product) => ({
      ...product,
      sizeOptionIds: product.sizeOptionIds.filter((id) => id !== sizeId),
      sizeOptionPrices: product.sizeOptionPrices.filter((entry) => entry.sizeOptionId !== sizeId),
      defaultSizeOptionId: product.defaultSizeOptionId === sizeId ? null : product.defaultSizeOptionId,
    }));

    await this.appendAuditEvent({
      action: "size.deleted",
      entityType: "size",
      entityId: sizeId,
      actorLabel: "system",
      payload: { sizeId },
    });
  }

  async listProducts(): Promise<Product[]> {
    return structuredClone(this.bootstrap.products);
  }

  async upsertProduct(input: UpsertProductInput, actorLabel: string): Promise<Product> {
    const product: Product = {
      id: input.id ?? slugify(input.name),
      name: input.name,
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      discountCents: input.discountCents,
      enabled: input.enabled,
      sortOrder: input.sortOrder,
      productType: input.productType,
      modifierIds: input.modifierIds,
      sizeOptionIds: input.sizeOptionIds,
      sizeOptionPrices: input.sizeOptionPrices,
      defaultSizeOptionId: input.defaultSizeOptionId,
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

  async deleteProduct(productId: string): Promise<void> {
    const product = this.bootstrap.products.find((entry) => entry.id === productId);
    if (!product) {
      throw new HttpError(404, "Product not found.");
    }

    this.bootstrap.products = this.bootstrap.products.filter((entry) => entry.id !== productId);

    await this.appendAuditEvent({
      action: "product.deleted",
      entityType: "product",
      entityId: productId,
      actorLabel: "system",
      payload: { productId },
    });
  }

  async patchSettings(
    input: PatchSettingsInput,
    actorLabel: string,
  ): Promise<Omit<BootstrapResponse, "status">["settings"]> {
    if (input.lockScreenPin !== undefined) {
      if (input.lockScreenPin === null) {
        this.lockScreenPinHash = "";
        this.bootstrap.settings.lockScreenPinConfigured = false;
      } else {
        this.lockScreenPinHash = bcrypt.hashSync(input.lockScreenPin, 10);
        this.bootstrap.settings.lockScreenPinConfigured = true;
      }
    }

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

  async verifyLockScreenPin(pin: string): Promise<boolean> {
    if (!this.lockScreenPinHash) {
      return false;
    }
    return bcrypt.compare(pin, this.lockScreenPinHash);
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
    return structuredClone(
      [...this.orders.values()].find((order) => order.payment.stripePaymentIntentId === paymentIntentId) ?? null,
    );
  }

  async getLastWebhookAt(): Promise<string | null> {
    return this.lastWebhookAt;
  }

  async listTransactions(page: number, pageSize: number): Promise<TransactionListResponse> {
    const all = [...this.orders.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const total = all.length;
    const data = all.slice((page - 1) * pageSize, page * pageSize).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status as TransactionListResponse["data"][number]["status"],
      totalCents: order.totalCents,
      tenderType: order.payment.tenderType,
      cashierName: order.cashierName,
      stripePaymentIntentId: order.payment.stripePaymentIntentId,
      refunded: false,
      createdAt: order.createdAt,
      paidAt: null,
    }));
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async markOrderRefunded(_orderId: string): Promise<void> {}

  async getRecentOrders(): Promise<DraftOrder[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return [...this.orders.values()]
      .filter((o) => o.status === "paid" && new Date(o.createdAt) >= startOfDay)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20);
  }

  private requireOrder(orderId: string): DraftOrder {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }
    return order;
  }
}
