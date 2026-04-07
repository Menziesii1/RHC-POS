import { PrismaClient } from "@prisma/client";
import {
  type AnalyticsRangeResponse,
  calculateFlavorAdjustment,
  calculateLinePrice,
  calculateTax,
  type BootstrapResponse,
  type CartInput,
  type Category,
  type DraftOrder,
  type Modifier,
  type PatchSettingsInput,
  type Product,
  type SizeOption,
  type SummaryResponse,
  type UpsertCategoryInput,
  type UpsertModifierInput,
  type UpsertProductInput,
  type UpsertSizeOptionInput,
} from "@rhc-pos/shared";

import type { AppConfig } from "../config.js";
import { HttpError } from "../lib/http-error.js";
import { createOrderNumber } from "../lib/order-number.js";
import type { AuditEventInput, CardPaymentUpdateInput, PosRepository } from "./types.js";

type ProductRecord = Awaited<ReturnType<PrismaPosRepository["getProductRecords"]>>[number];
type OrderRecord = Awaited<ReturnType<PrismaPosRepository["getOrderRecord"]>>;

function serializeJson(value: unknown) {
  return value as object;
}

function normalizeCategory(category: Category): Category {
  return {
    ...category,
    enabled: category.enabled ?? true,
  };
}

export class PrismaPosRepository implements PosRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
  ) {}

  async getBootstrapBase(): Promise<Omit<BootstrapResponse, "status">> {
    const [location, register, categories, sizes, modifiers, products, cashiers, recoverySetting] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: this.config.LOCATION_ID } }),
      this.prisma.register.findUnique({ where: { id: this.config.REGISTER_ID } }),
      this.prisma.category.findMany({
        where: { locationId: this.config.LOCATION_ID },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.sizeOption.findMany({
        where: { locationId: this.config.LOCATION_ID },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.modifier.findMany({
        where: { locationId: this.config.LOCATION_ID },
        orderBy: { sortOrder: "asc" },
      }),
      this.getProductRecords(),
      this.prisma.staffProfile.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.appSetting.findUnique({ where: { key: "recovery_ttl_seconds" } }),
    ]);

    if (!location || !register) {
      throw new HttpError(500, "Store bootstrap data is missing. Apply the backup seed restore after the schema is created.");
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
      categories: categories.map((category) => normalizeCategory({
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
        enabled: category.enabled,
      })),
      sizes: sizes.map((size) => ({
        id: size.id,
        name: size.name,
        priceDeltaCents: size.priceDeltaCents,
        enabled: size.enabled,
        sortOrder: size.sortOrder,
      })),
      modifiers: modifiers.map((modifier) => ({
        id: modifier.id,
        name: modifier.name,
        priceCents: modifier.priceCents,
        discountFlavor: modifier.discountFlavor,
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

    const products = new Map(bootstrap.products.map((entry) => [entry.id, entry] as const));
    const sizes = new Map(bootstrap.sizes.map((entry) => [entry.id, entry] as const));
    const modifiers = new Map(bootstrap.modifiers.map((entry) => [entry.id, entry] as const));

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

      const modifierSummary = item.modifierIds.map((modifierId) => {
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

      const flavorAdjustmentCents = calculateFlavorAdjustment(modifierSummary);
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
        lineTotalCents: unitPriceCents * item.quantity,
      };
    });

    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const taxCents = calculateTax(subtotalCents, bootstrap.settings.taxRateBasisPoints);

    const order = await this.prisma.order.create({
      data: {
        orderNumber: createOrderNumber(new Date(), (await this.prisma.order.count()) + 1),
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
            sizeOptionId: line.sizeOptionId,
            sizeOptionName: line.sizeOptionName,
            sizeAdjustmentCents: line.sizeAdjustmentCents,
            modifierIdsJson: line.modifierIds as unknown as object,
            modifierSummaryJson: serializeJson(line.modifierSummary),
            flavorAdjustmentCents: line.flavorAdjustmentCents,
            discountCents: line.discountCents,
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
    const categoryMap = new Map<string, { id: string; name: string; quantity: number; totalCents: number }>();
    const sizeMap = new Map<string, { id: string; name: string; quantity: number; totalCents: number }>();
    const flavorMap = new Map<string, { id: string; name: string; quantity: number; totalCents: number; adjustmentCents: number; discountFlavor: boolean }>();
    const topItemMap = new Map<string, { productId: string; productName: string; quantity: number; totalCents: number }>();

    const products = new Map((await this.getProductRecords()).map((product) => [product.id, product] as const));
    const categories = new Map(
      (await this.prisma.category.findMany({ where: { locationId: this.config.LOCATION_ID } })).map((category) => [
        category.id,
        category,
      ] as const),
    );
    const sizes = new Map(
      (await this.prisma.sizeOption.findMany({ where: { locationId: this.config.LOCATION_ID } })).map((size) => [
        size.id,
        size,
      ] as const),
    );
    const flavors = new Map(
      (await this.prisma.modifier.findMany({ where: { locationId: this.config.LOCATION_ID } })).map((modifier) => [
        modifier.id,
        modifier,
      ] as const),
    );

    for (const order of orders) {
      for (const item of order.items) {
        const product = products.get(item.productId);
        if (!product) {
          continue;
        }

        const category = categories.get(product.categoryId);
        const size = item.sizeOptionId ? sizes.get(item.sizeOptionId) : null;
        const flavorIds = item.modifierIdsJson as string[];

        const itemCount = itemMap.get(item.productId) ?? {
          productId: item.productId,
          productName: item.productName,
          quantity: 0,
        };
        itemCount.quantity += item.quantity;
        itemMap.set(item.productId, itemCount);

        if (category) {
          const categoryCount = categoryMap.get(category.id) ?? {
            id: category.id,
            name: category.name,
            quantity: 0,
            totalCents: 0,
          };
          categoryCount.quantity += item.quantity;
          categoryCount.totalCents += item.lineTotalCents;
          categoryMap.set(category.id, categoryCount);
        }

        if (size) {
          const sizeCount = sizeMap.get(size.id) ?? {
            id: size.id,
            name: size.name,
            quantity: 0,
            totalCents: 0,
          };
          sizeCount.quantity += item.quantity;
          sizeCount.totalCents += item.lineTotalCents;
          sizeMap.set(size.id, sizeCount);
        }

        const topItem = topItemMap.get(item.productId) ?? {
          productId: item.productId,
          productName: item.productName,
          quantity: 0,
          totalCents: 0,
        };
        topItem.quantity += item.quantity;
        topItem.totalCents += item.lineTotalCents;
        topItemMap.set(item.productId, topItem);

        for (const flavorId of flavorIds) {
          const flavor = flavors.get(flavorId);
          if (!flavor) {
            continue;
          }
          const flavorCount = flavorMap.get(flavor.id) ?? {
            id: flavor.id,
            name: flavor.name,
            quantity: 0,
            totalCents: 0,
            adjustmentCents: 0,
            discountFlavor: flavor.discountFlavor,
          };
          flavorCount.quantity += item.quantity;
          flavorCount.totalCents += item.lineTotalCents;
          flavorCount.adjustmentCents += flavor.priceCents * item.quantity;
          flavorMap.set(flavor.id, flavorCount);
        }
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
      salesByCategory: [...categoryMap.values()],
      sizeBreakdown: [...sizeMap.values()],
      flavorBreakdown: [...flavorMap.values()],
      topItems: [...topItemMap.values()].sort((a, b) => b.totalCents - a.totalCents).slice(0, 5),
    };
  }

  async getAnalyticsRange(date: Date, days: number): Promise<AnalyticsRangeResponse> {
    const end = new Date(date);
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const endExclusive = new Date(end);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        status: "paid",
        locationId: this.config.LOCATION_ID,
        createdAt: {
          gte: start,
          lt: endExclusive,
        },
      },
      include: {
        items: true,
        payment: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const dateKeys = Array.from({ length: days }, (_, index) => {
      const current = new Date(start);
      current.setUTCDate(start.getUTCDate() + index);
      return current.toISOString().slice(0, 10);
    });

    const salesSeries = dateKeys.map((dateKey) => {
      const dayOrders = orders.filter((order) => order.createdAt.toISOString().slice(0, 10) === dateKey);
      return {
        date: dateKey,
        totalSalesCents: dayOrders.reduce((sum, order) => sum + order.totalCents, 0),
        cashSalesCents: dayOrders
          .filter((order) => order.payment?.tenderType === "cash")
          .reduce((sum, order) => sum + order.totalCents, 0),
        cardSalesCents: dayOrders
          .filter((order) => order.payment?.tenderType === "card")
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

    for (const order of orders) {
      const orderDate = order.createdAt.toISOString().slice(0, 10);
      for (const item of order.items) {
        const current = productSeriesMap.get(item.productId) ?? {
          productId: item.productId,
          productName: item.productName,
          totalQuantity: 0,
          totalSalesCents: 0,
          daily: new Map(),
        };
        current.totalQuantity += item.quantity;
        current.totalSalesCents += item.lineTotalCents;
        const daily = current.daily.get(orderDate) ?? {
          date: orderDate,
          quantity: 0,
          totalCents: 0,
        };
        daily.quantity += item.quantity;
        daily.totalCents += item.lineTotalCents;
        current.daily.set(orderDate, daily);
        productSeriesMap.set(item.productId, current);
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
    const categories = await this.prisma.category.findMany({
      where: { locationId: this.config.LOCATION_ID },
      orderBy: { sortOrder: "asc" },
    });
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      enabled: category.enabled,
    }));
  }

  async upsertCategory(input: UpsertCategoryInput, actorLabel: string): Promise<Category> {
    const category = await this.prisma.category.upsert({
      where: {
        id: input.id ?? input.name.toLowerCase().replaceAll(/\s+/g, "-"),
      },
      update: {
        name: input.name,
        sortOrder: input.sortOrder,
        enabled: input.enabled,
      },
      create: {
        id: input.id ?? input.name.toLowerCase().replaceAll(/\s+/g, "-"),
        locationId: this.config.LOCATION_ID,
        name: input.name,
        sortOrder: input.sortOrder,
        enabled: input.enabled,
      },
    });

    await this.appendAuditEvent({
      action: "category.updated",
      entityType: "category",
      entityId: category.id,
      actorLabel,
      payload: input as Record<string, unknown>,
    });

    return {
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      enabled: category.enabled,
    };
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const productCount = await this.prisma.product.count({
      where: {
        locationId: this.config.LOCATION_ID,
        categoryId,
      },
    });

    if (productCount > 0) {
      throw new HttpError(400, "Move products out of this category before deleting it.");
    }

    await this.prisma.category.delete({ where: { id: categoryId } });
  }

  async deleteModifier(modifierId: string): Promise<void> {
    await this.prisma.productModifier.deleteMany({ where: { modifierId } });
    await this.prisma.modifier.delete({ where: { id: modifierId } });
  }

  async listModifiers(): Promise<Modifier[]> {
    const modifiers = await this.prisma.modifier.findMany({
      where: { locationId: this.config.LOCATION_ID },
      orderBy: { sortOrder: "asc" },
    });

    return modifiers.map((modifier) => ({
      id: modifier.id,
      name: modifier.name,
      priceCents: modifier.priceCents,
      discountFlavor: modifier.discountFlavor,
      enabled: modifier.enabled,
      sortOrder: modifier.sortOrder,
    }));
  }

  async upsertModifier(input: UpsertModifierInput, actorLabel: string): Promise<Modifier> {
    const modifierId = input.id ?? input.name.toLowerCase().replaceAll(/\s+/g, "-");
    const modifier = await this.prisma.modifier.upsert({
      where: { id: modifierId },
      update: {
        name: input.name,
        priceCents: input.priceCents,
        discountFlavor: input.discountFlavor,
        enabled: input.enabled,
        sortOrder: input.sortOrder,
      },
      create: {
        id: modifierId,
        locationId: this.config.LOCATION_ID,
        name: input.name,
        priceCents: input.priceCents,
        discountFlavor: input.discountFlavor,
        enabled: input.enabled,
        sortOrder: input.sortOrder,
      },
    });

    await this.appendAuditEvent({
      action: "modifier.updated",
      entityType: "modifier",
      entityId: modifier.id,
      actorLabel,
      payload: input as Record<string, unknown>,
    });

    return {
      id: modifier.id,
      name: modifier.name,
      priceCents: modifier.priceCents,
      discountFlavor: modifier.discountFlavor,
      enabled: modifier.enabled,
      sortOrder: modifier.sortOrder,
    };
  }

  async listSizes(): Promise<SizeOption[]> {
    const sizes = await this.prisma.sizeOption.findMany({
      where: { locationId: this.config.LOCATION_ID },
      orderBy: { sortOrder: "asc" },
    });

    return sizes.map((size) => ({
      id: size.id,
      name: size.name,
      priceDeltaCents: size.priceDeltaCents,
      enabled: size.enabled,
      sortOrder: size.sortOrder,
    }));
  }

  async upsertSize(input: UpsertSizeOptionInput, actorLabel: string): Promise<SizeOption> {
    const sizeId = input.id ?? input.name.toLowerCase().replaceAll(/\s+/g, "-");
    const size = await this.prisma.sizeOption.upsert({
      where: { id: sizeId },
      update: {
        name: input.name,
        priceDeltaCents: input.priceDeltaCents,
        enabled: input.enabled,
        sortOrder: input.sortOrder,
      },
      create: {
        id: sizeId,
        locationId: this.config.LOCATION_ID,
        name: input.name,
        priceDeltaCents: input.priceDeltaCents,
        enabled: input.enabled,
        sortOrder: input.sortOrder,
      },
    });

    await this.appendAuditEvent({
      action: "size.updated",
      entityType: "size",
      entityId: size.id,
      actorLabel,
      payload: input as Record<string, unknown>,
    });

    return {
      id: size.id,
      name: size.name,
      priceDeltaCents: size.priceDeltaCents,
      enabled: size.enabled,
      sortOrder: size.sortOrder,
    };
  }

  async deleteSize(sizeId: string): Promise<void> {
    await this.prisma.product.updateMany({
      where: {
        locationId: this.config.LOCATION_ID,
        defaultSizeOptionId: sizeId,
      },
      data: {
        defaultSizeOptionId: null,
      },
    });
    await this.prisma.productSizeOption.deleteMany({ where: { sizeOptionId: sizeId } });
    await this.prisma.sizeOption.delete({ where: { id: sizeId } });
  }

  async listProducts(): Promise<Product[]> {
    const products = await this.getProductRecords();
    return products.map((product) => this.mapProduct(product));
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.prisma.productSizeOption.deleteMany({ where: { productId } });
    await this.prisma.productModifier.deleteMany({ where: { productId } });
    await this.prisma.orderItem.deleteMany({ where: { productId } });
    await this.prisma.product.delete({ where: { id: productId } });
  }

  async upsertProduct(input: UpsertProductInput, actorLabel: string): Promise<Product> {
    const productId = input.id ?? input.name.toLowerCase().replaceAll(/\s+/g, "-");
    const sizePriceMap = new Map(input.sizeOptionPrices.map((entry) => [entry.sizeOptionId, entry.priceDeltaCents] as const));
    const product = await this.prisma.product.upsert({
      where: { id: productId },
      update: {
        name: input.name,
        categoryId: input.categoryId,
        priceCents: input.priceCents,
        discountCents: input.discountCents,
        enabled: input.enabled,
        sortOrder: input.sortOrder,
        productType: input.productType,
        defaultSizeOptionId: input.defaultSizeOptionId,
        sizeOptions: {
          deleteMany: {},
          create: input.sizeOptionIds.map((sizeOptionId) => ({
            sizeOptionId,
            priceDeltaCents: sizePriceMap.get(sizeOptionId) ?? 0,
          })),
        },
        modifiers: {
          deleteMany: {},
          create: input.modifierIds.map((modifierId) => ({
            modifierId,
          })),
        },
      },
      create: {
        id: productId,
        locationId: this.config.LOCATION_ID,
        name: input.name,
        categoryId: input.categoryId,
        priceCents: input.priceCents,
        discountCents: input.discountCents,
        enabled: input.enabled,
        sortOrder: input.sortOrder,
        productType: input.productType,
        defaultSizeOptionId: input.defaultSizeOptionId,
        sizeOptions: {
          create: input.sizeOptionIds.map((sizeOptionId) => ({
            sizeOptionId,
            priceDeltaCents: sizePriceMap.get(sizeOptionId) ?? 0,
          })),
        },
        modifiers: {
          create: input.modifierIds.map((modifierId) => ({
            modifierId,
          })),
        },
      },
      include: {
        sizeOptions: {
          include: { sizeOption: true },
        },
        modifiers: {
          include: { modifier: true },
        },
      },
    });

    await this.appendAuditEvent({
      action: input.id ? "product.updated" : "product.created",
      entityType: "product",
      entityId: product.id,
      actorLabel,
      payload: input as Record<string, unknown>,
    });

    return this.mapProduct(product);
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
      include: {
        sizeOptions: {
          include: { sizeOption: true },
        },
        modifiers: {
          include: { modifier: true },
        },
      },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
    });
  }

  private mapProduct(product: ProductRecord): Product {
    return {
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      priceCents: product.priceCents,
      discountCents: product.discountCents,
      enabled: product.enabled,
      sortOrder: product.sortOrder,
      productType: product.productType as Product["productType"],
      modifierIds: product.modifiers.map((entry) => entry.modifierId),
      sizeOptionIds: product.sizeOptions.map((entry) => entry.sizeOptionId),
      sizeOptionPrices: product.sizeOptions.map((entry) => ({
        sizeOptionId: entry.sizeOptionId,
        priceDeltaCents: entry.priceDeltaCents,
      })),
      defaultSizeOptionId: product.defaultSizeOptionId,
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
        sizeOptionId: item.sizeOptionId ?? null,
        sizeOptionName: item.sizeOptionName ?? null,
        sizeAdjustmentCents: item.sizeAdjustmentCents,
        modifierIds: item.modifierIdsJson as string[],
        modifierSummary: item.modifierSummaryJson as DraftOrder["lines"][number]["modifierSummary"],
        flavorAdjustmentCents: item.flavorAdjustmentCents,
        discountCents: item.discountCents,
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
