import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import {
  summaryResponseSchema,
  type BootstrapResponse,
  type CartInput,
  type DraftOrder,
  type SummaryResponse,
} from "@rhc-pos/shared";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

import type { LocalOrderRecord } from "./types.js";

interface BootstrapCacheRecord {
  payload: BootstrapResponse;
  updatedAt: string;
}

type OrderRow = {
  id: string;
  order_json: string;
  cart_input_json: string;
  sync_status: LocalOrderRecord["syncStatus"];
  sync_error: string | null;
  synced_at: string | null;
  remote_order_id: string | null;
};

export class SqliteStore {
  private constructor(
    private readonly db: Database,
    private readonly filename: string,
  ) {}

  static async create(filename: string) {
    const require = createRequire(import.meta.url);
    const SQL = await initSqlJs({
      locateFile: (file: string) => require.resolve(`sql.js/dist/${file}`),
    });
    const db = SqliteStore.openDatabase(SQL, filename);
    const store = new SqliteStore(db, filename);
    store.db.exec(`
      CREATE TABLE IF NOT EXISTS bootstrap_cache (
        cache_key TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_orders (
        id TEXT PRIMARY KEY,
        order_json TEXT NOT NULL,
        cart_input_json TEXT NOT NULL,
        sync_status TEXT NOT NULL,
        sync_error TEXT,
        synced_at TEXT,
        remote_order_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    store.persist();
    return store;
  }

  close() {
    this.persist();
    this.db.close();
  }

  getBootstrapCache(): BootstrapCacheRecord | null {
    const row = this.getOne<{ payload_json: string; updated_at: string }>(
      "SELECT payload_json, updated_at FROM bootstrap_cache WHERE cache_key = 'bootstrap'",
    );

    if (!row) {
      return null;
    }

    return {
      payload: JSON.parse(row.payload_json) as BootstrapResponse,
      updatedAt: row.updated_at,
    };
  }

  saveBootstrapCache(payload: BootstrapResponse, updatedAt: string) {
    this.exec(
      `
        INSERT INTO bootstrap_cache (cache_key, payload_json, updated_at)
        VALUES ('bootstrap', ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at
      `,
      [JSON.stringify(payload), updatedAt],
    );
  }

  saveOrder(order: DraftOrder, cartInput: CartInput, syncStatus: LocalOrderRecord["syncStatus"] = "pending") {
    this.exec(
      `
        INSERT INTO local_orders (
          id, order_json, cart_input_json, sync_status, sync_error, synced_at, remote_order_id, created_at, updated_at
        )
        VALUES (
          ?, ?, ?, ?, NULL, NULL, NULL, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          order_json = excluded.order_json,
          cart_input_json = excluded.cart_input_json,
          sync_status = excluded.sync_status,
          updated_at = excluded.updated_at
      `,
      [
        order.id,
        JSON.stringify(order),
        JSON.stringify(cartInput),
        syncStatus,
        order.createdAt,
        order.updatedAt,
      ],
    );
  }

  getOrder(orderId: string): LocalOrderRecord | null {
    const row = this.getOne<OrderRow>(
      `
        SELECT id, order_json, cart_input_json, sync_status, sync_error, synced_at, remote_order_id
        FROM local_orders
        WHERE id = ?
      `,
      [orderId],
    );

    return row ? this.mapOrderRow(row) : null;
  }

  listPendingOrders(): LocalOrderRecord[] {
    const rows = this.getAll<OrderRow>(
      `
        SELECT id, order_json, cart_input_json, sync_status, sync_error, synced_at, remote_order_id
        FROM local_orders
        WHERE sync_status IN ('pending', 'failed')
        ORDER BY created_at ASC
      `,
    );

    return rows.map((row) => this.mapOrderRow(row));
  }

  markOrderSynced(orderId: string, remoteOrderId: string, syncedAt: string) {
    this.exec(
      `
        UPDATE local_orders
        SET sync_status = 'synced',
            sync_error = NULL,
            synced_at = @synced_at,
            remote_order_id = @remote_order_id
        WHERE id = @id
      `.replaceAll("@synced_at", "?").replaceAll("@remote_order_id", "?").replaceAll("@id", "?"),
      [syncedAt, remoteOrderId, orderId],
    );
  }

  markOrderSyncFailed(orderId: string, errorMessage: string) {
    this.exec(
      `
        UPDATE local_orders
        SET sync_status = 'failed',
            sync_error = @sync_error
        WHERE id = @id
      `.replaceAll("@sync_error", "?").replaceAll("@id", "?"),
      [errorMessage, orderId],
    );
  }

  getSummary(date = new Date()): SummaryResponse {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const rows = this.getAll<{ order_json: string }>(
      `
        SELECT order_json
        FROM local_orders
        WHERE json_extract(order_json, '$.status') = 'paid'
      `,
    );

    const orders = rows
      .map((row) => JSON.parse(row.order_json) as DraftOrder)
      .filter((order) => {
        const createdAt = new Date(order.createdAt).getTime();
        return createdAt >= start.getTime() && createdAt < end.getTime();
      });

    const itemCounts = new Map<string, { productId: string; productName: string; quantity: number }>();
    const topItems = new Map<string, { productId: string; productName: string; quantity: number; totalCents: number }>();

    for (const order of orders) {
      for (const line of order.lines) {
        const item = itemCounts.get(line.productId) ?? {
          productId: line.productId,
          productName: line.productName,
          quantity: 0,
        };
        item.quantity += line.quantity;
        itemCounts.set(line.productId, item);

        const topItem = topItems.get(line.productId) ?? {
          productId: line.productId,
          productName: line.productName,
          quantity: 0,
          totalCents: 0,
        };
        topItem.quantity += line.quantity;
        topItem.totalCents += line.lineTotalCents;
        topItems.set(line.productId, topItem);
      }
    }

    return summaryResponseSchema.parse({
      salesDate: start.toISOString().slice(0, 10),
      totalSalesCents: orders.reduce((sum, order) => sum + order.totalCents, 0),
      cashSalesCents: orders.reduce((sum, order) => sum + order.totalCents, 0),
      cardSalesCents: 0,
      orderCount: orders.length,
      itemCounts: [...itemCounts.values()],
      salesByCategory: [],
      sizeBreakdown: [],
      flavorBreakdown: [],
      topItems: [...topItems.values()].sort((a, b) => b.totalCents - a.totalCents).slice(0, 5),
    });
  }

  getHealthCounts() {
    const pending = this.getOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM local_orders WHERE sync_status = 'pending'",
    ) ?? { count: 0 };
    const failed = this.getOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM local_orders WHERE sync_status = 'failed'",
    ) ?? { count: 0 };

    return {
      pendingOrderCount: pending.count,
      failedOrderCount: failed.count,
    };
  }

  private mapOrderRow(row: OrderRow): LocalOrderRecord {
    return {
      order: JSON.parse(row.order_json) as DraftOrder,
      cartInput: JSON.parse(row.cart_input_json) as CartInput,
      syncStatus: row.sync_status,
      syncError: row.sync_error,
      syncedAt: row.synced_at,
      remoteOrderId: row.remote_order_id,
    };
  }

  private exec(sql: string, params: Array<string | number | null> = []) {
    this.db.run(sql, params);
    this.persist();
  }

  private getOne<T>(sql: string, params: Array<string | number | null> = []): T | null {
    const rows = this.getAll<T>(sql, params);
    return rows[0] ?? null;
  }

  private getAll<T>(sql: string, params: Array<string | number | null> = []): T[] {
    const statement = this.db.prepare(sql, params);
    const rows: T[] = [];
    while (statement.step()) {
      rows.push(statement.getAsObject() as T);
    }
    statement.free();
    return rows;
  }

  private persist() {
    if (this.filename === ":memory:") {
      return;
    }

    mkdirSync(dirname(this.filename), { recursive: true });
    writeFileSync(this.filename, Buffer.from(this.db.export()));
  }

  private static openDatabase(SQL: SqlJsStatic, filename: string) {
    if (filename === ":memory:") {
      return new SQL.Database();
    }

    if (!existsSync(filename)) {
      mkdirSync(dirname(filename), { recursive: true });
      return new SQL.Database();
    }

    return new SQL.Database(readFileSync(filename));
  }
}
