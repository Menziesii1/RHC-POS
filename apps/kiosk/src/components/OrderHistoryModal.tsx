import { useEffect, useState } from "react";
import { X, Clock, RefreshCw, ShoppingBag, Flame, Snowflake } from "lucide-react";
import type { DraftOrder } from "@rhc-pos/shared";
import { api } from "../services/api";

interface OrderHistoryModalProps {
  onClose: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function OrderCard({ order }: { order: DraftOrder }) {
  const paidAt = order.payment.status === "succeeded" ? order.updatedAt : order.createdAt;

  return (
    <div className="rounded-xl border border-[var(--divider)] bg-[var(--bg-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">#{order.orderNumber}</span>
          <span className="text-xs text-[var(--text-muted)] font-medium">{formatMoney(order.totalCents)}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-dimmer)]">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatTime(paidAt)}
          </span>
        </div>
      </div>

      <ul className="space-y-1.5">
        {order.lines.map((line) => {
          const flavors = line.modifierSummary
            .filter((m) => !m.discountFlavor)
            .map((m) => m.name)
            .join(", ");
          const discounts = line.modifierSummary.filter((m) => m.discountFlavor).map((m) => m.name).join(", ");
          const parts = [line.sizeOptionName, flavors, discounts].filter(Boolean).join(" · ");

          const showTemp = line.isIced != null;

          return (
            <li key={line.id} className="flex gap-2 text-sm">
              <span className="shrink-0 font-semibold text-[var(--text-primary)]">{line.quantity}×</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {showTemp && (
                    line.isIced
                      ? <Snowflake size={11} className="shrink-0 text-sky-400" />
                      : <Flame size={11} className="shrink-0 text-orange-400" />
                  )}
                  <span className="font-medium text-[var(--text-primary)]">{line.productName}</span>
                </div>
                {parts && (
                  <span className="text-xs text-[var(--text-muted)]">{parts}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function OrderHistoryModal({ onClose }: OrderHistoryModalProps) {
  const [orders, setOrders] = useState<DraftOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRecentOrders();
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-4 top-16 z-50 flex w-80 flex-col rounded-2xl border border-[var(--divider)] bg-[var(--bg-base)] shadow-2xl max-h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider)] px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-[var(--text-muted)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Today's Orders</span>
            {orders && (
              <span className="rounded-full bg-[var(--overlay-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                {orders.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-dimmer)] transition hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
              aria-label="Refresh"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-dimmer)] transition hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)]"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading && !orders && (
            <div className="flex items-center justify-center py-10 text-sm text-[var(--text-dimmer)]">
              Loading…
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {orders && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-[var(--text-dimmer)]">
              <ShoppingBag size={28} className="opacity-30" />
              <span className="text-sm">No orders yet today</span>
            </div>
          )}

          {orders && orders.length > 0 && (
            <div className="space-y-2">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
