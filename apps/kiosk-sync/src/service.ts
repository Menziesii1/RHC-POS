import {
  calculateLinePrice,
  calculateTax,
  cartInputSchema,
  draftOrderSchema,
  type BootstrapResponse,
  type CartInput,
  type DraftOrder,
  type SummaryResponse,
} from "@rhc-pos/shared";
import { randomUUID } from "node:crypto";

import { HttpError } from "./lib/http-error.js";
import { SqliteStore } from "./store.js";
import type { LocalSyncService, RemoteApiClient, SyncHealth } from "./types.js";

function buildLocalOrderNumber(date = new Date()) {
  const dateLabel = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `LOCAL-${dateLabel}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function normalizeBootstrapForLocal(bootstrap: BootstrapResponse, remoteOnline: boolean): BootstrapResponse {
  return {
    ...bootstrap,
    status: {
      ...bootstrap.status,
      backend: remoteOnline ? "online" : "offline",
      reader: "offline",
      stripe: "offline",
    },
  };
}

export class KioskSyncService implements LocalSyncService {
  private remoteOnline = false;
  private lastBootstrapSyncAt: string | null = null;
  private syncInFlight = false;

  constructor(
    private readonly store: SqliteStore,
    private readonly remoteClient: RemoteApiClient,
  ) {}

  async getBootstrap(): Promise<BootstrapResponse> {
    try {
      const remote = await this.remoteClient.fetchBootstrap();
      const normalized = normalizeBootstrapForLocal(remote, true);
      this.lastBootstrapSyncAt = new Date().toISOString();
      this.remoteOnline = true;
      this.store.saveBootstrapCache(normalized, this.lastBootstrapSyncAt);
      void this.syncPendingOrders();
      return normalized;
    } catch {
      this.remoteOnline = false;
      const cached = this.store.getBootstrapCache();
      if (!cached) {
        throw new HttpError(503, "The kiosk has no cached catalog yet and cannot reach Railway.");
      }
      return normalizeBootstrapForLocal(cached.payload, false);
    }
  }

  async createDraftOrder(input: unknown): Promise<DraftOrder> {
    const cart = cartInputSchema.parse(input);
    const bootstrap = await this.getBootstrap();
    const products = new Map(bootstrap.products.map((entry) => [entry.id, entry] as const));
    const sizes = new Map(bootstrap.sizes.map((entry) => [entry.id, entry] as const));
    const modifiers = new Map(bootstrap.modifiers.map((entry) => [entry.id, entry] as const));

    const lines = cart.items.map((item, index) => {
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
    const now = new Date().toISOString();

    const order = draftOrderSchema.parse({
      id: randomUUID(),
      orderNumber: buildLocalOrderNumber(),
      status: "draft",
      cashierId: "staff",
      cashierName: "Staff",
      lines,
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
      payment: {
        status: "idle",
      },
      createdAt: now,
      updatedAt: now,
    });

    this.store.saveOrder(order, cart);
    return order;
  }

  async getOrder(orderId: string): Promise<DraftOrder | null> {
    return this.store.getOrder(orderId)?.order ?? null;
  }

  async finalizeCashPayment(orderId: string, tenderedCents: number): Promise<DraftOrder> {
    const record = this.store.getOrder(orderId);
    if (!record) {
      throw new HttpError(404, "Order not found.");
    }
    if (tenderedCents < record.order.totalCents) {
      throw new HttpError(400, "Cash received is less than the amount due.");
    }

    const updatedAt = new Date().toISOString();
    const order = draftOrderSchema.parse({
      ...record.order,
      status: "paid",
      updatedAt,
      payment: {
        status: "succeeded",
        tenderType: "cash",
        tenderedCents,
        changeDueCents: tenderedCents - record.order.totalCents,
      },
    });

    this.store.saveOrder(order, record.cartInput, "pending");
    void this.syncPendingOrders();
    return order;
  }

  getSummary(date = new Date()): SummaryResponse {
    return this.store.getSummary(date);
  }

  getHealth(): SyncHealth {
    const counts = this.store.getHealthCounts();
    return {
      remoteOnline: this.remoteOnline,
      lastBootstrapSyncAt: this.lastBootstrapSyncAt,
      pendingOrderCount: counts.pendingOrderCount,
      failedOrderCount: counts.failedOrderCount,
    };
  }

  async syncPendingOrders(): Promise<void> {
    if (this.syncInFlight) {
      return;
    }

    this.syncInFlight = true;
    try {
      const pending = this.store.listPendingOrders().filter((entry) => entry.order.status === "paid");
      for (const entry of pending) {
        try {
          const remoteOrder = await this.remoteClient.createOrder(entry.cartInput);
          const paidOrder = await this.remoteClient.payCash(
            remoteOrder.id,
            entry.order.payment.tenderedCents ?? entry.order.totalCents,
          );
          this.store.markOrderSynced(entry.order.id, paidOrder.id, new Date().toISOString());
          this.remoteOnline = true;
        } catch (error) {
          this.remoteOnline = false;
          this.store.markOrderSyncFailed(
            entry.order.id,
            error instanceof Error ? error.message : "Unable to sync local cash order.",
          );
          break;
        }
      }
    } finally {
      this.syncInFlight = false;
    }
  }
}
