import { formatCurrency, type DraftOrder } from "@rhc-pos/shared";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Banknote,
  CreditCard,
  Split,
  Mail,
  RotateCcw,
  Lock,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

import { api, type TransactionListResponse, type TransactionRow } from "../services/api";
import { AdminWorkspaceHeader } from "./AdminWorkspaceHeader";

interface TransactionsPageProps {
  adminPin: string;
  onClose: () => void;
  onNavigateInventory: () => void;
  onNavigateAnalytics: () => void;
}

const PAGE_SIZE = 25;

function tenderIcon(tenderType: TransactionRow["tenderType"]) {
  if (tenderType === "cash") return <Banknote size={13} className="text-emerald-500" />;
  if (tenderType === "card") return <CreditCard size={13} className="text-[#5191e5]" />;
  if (tenderType === "split") return <Split size={13} className="text-amber-500" />;
  return null;
}

function statusBadge(status: TransactionRow["status"], refunded: boolean) {
  if (refunded) {
    return <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-bold text-red-400">Refunded</span>;
  }
  if (status === "paid") {
    return <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500">Paid</span>;
  }
  if (status === "canceled") {
    return <span className="rounded-full bg-[var(--overlay-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--text-dimmer)]">Canceled</span>;
  }
  return <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-500">{status}</span>;
}

// ── Receipt modal ─────────────────────────────────────────────────────────────

function SendReceiptModal({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSend(email.trim());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send receipt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-elevated)] p-6" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <div className="flex justify-center"><CheckCircle2 size={32} className="text-emerald-500" /></div>
            <div className="mt-3 text-center font-display text-lg font-extrabold text-[var(--text-primary)]">Receipt Sent</div>
            <p className="mt-1 text-center text-sm text-[var(--text-dimmer)]">Check {email} for the Stripe receipt.</p>
            <button type="button" className="mt-6 w-full rounded-xl bg-[var(--overlay-soft)] py-2.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--overlay-hover)]" onClick={onClose}>
              Close
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#5191e5]">
              <Mail size={12} /> Send Receipt
            </div>
            <div className="mt-2 font-display text-xl font-extrabold text-[var(--text-primary)]">Email Receipt</div>
            <p className="mt-1 text-sm text-[var(--text-dimmer)]">Stripe will email the customer a receipt for this transaction.</p>
            <input
              type="email"
              autoFocus
              className="brand-input mt-5 w-full"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSend(); }}
            />
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertTriangle size={13} className="shrink-0" /> {error}
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button type="button" className="flex-1 rounded-xl bg-[var(--overlay-soft)] py-2.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--overlay-hover)]" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#5191e5] py-2.5 text-sm font-bold text-white disabled:opacity-40"
                disabled={!email.trim() || loading}
                onClick={() => void handleSend()}
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />}
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Refund modal ──────────────────────────────────────────────────────────────

function RefundModal({
  order,
  onClose,
  onRefund,
}: {
  order: DraftOrder;
  onClose: () => void;
  onRefund: (refundPin: string, amountCents?: number) => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [amountStr, setAmountStr] = useState((order.totalCents / 100).toFixed(2));
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fullRefund = Math.round(Number(amountStr || "0") * 100) === order.totalCents;

  const handleRefund = async () => {
    if (!pin) return;
    setLoading(true);
    setError(null);
    try {
      const cents = Math.round(Number(amountStr || "0") * 100);
      await onRefund(pin, fullRefund ? undefined : cents > 0 ? cents : undefined);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-elevated)] p-6" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <div className="flex justify-center"><CheckCircle2 size={32} className="text-emerald-500" /></div>
            <div className="mt-3 text-center font-display text-lg font-extrabold text-[var(--text-primary)]">Refund Issued</div>
            <p className="mt-1 text-center text-sm text-[var(--text-dimmer)]">Stripe has initiated the refund. It may take 5–10 business days.</p>
            <button type="button" className="mt-6 w-full rounded-xl bg-[var(--overlay-soft)] py-2.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--overlay-hover)]" onClick={onClose}>
              Close
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-red-400">
              <RotateCcw size={12} /> Refund Order
            </div>
            <div className="mt-2 font-display text-xl font-extrabold text-[var(--text-primary)]">{order.orderNumber}</div>
            <p className="mt-1 text-sm text-[var(--text-dimmer)]">This will issue a Stripe refund. Requires the manager refund PIN.</p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dimmer)]">Refund Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-dimmer)]">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="brand-input w-full pl-7"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    onBlur={() => {
                      const n = Number(amountStr);
                      if (isNaN(n) || n <= 0) setAmountStr((order.totalCents / 100).toFixed(2));
                      else setAmountStr(Math.min(n, order.totalCents / 100).toFixed(2));
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-[var(--text-dimmest)]">Max: {formatCurrency(order.totalCents)}</p>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dimmer)]">Refund PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  className="brand-input w-full tracking-[0.3em]"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleRefund(); }}
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertTriangle size={13} className="shrink-0" /> {error}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button type="button" className="flex-1 rounded-xl bg-[var(--overlay-soft)] py-2.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--overlay-hover)]" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                disabled={!pin || loading}
                onClick={() => void handleRefund()}
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Refund
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function TransactionDetail({
  row,
  adminPin,
  onClose,
  onRefundComplete,
}: {
  row: TransactionRow;
  adminPin: string;
  onClose: () => void;
  onRefundComplete: () => void;
}) {
  const [order, setOrder] = useState<DraftOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<"receipt" | "refund" | null>(null);

  // Load full order on mount
  useState(() => {
    api.getTransaction(adminPin, row.id)
      .then(setOrder)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load order."));
  });

  const canSendReceipt = !!row.stripePaymentIntentId && !row.refunded;
  const canRefund = row.status === "paid" && !!row.stripePaymentIntentId && !row.refunded;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[var(--bg-elevated)]">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--divider)] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Transaction Detail</div>
            <div className="mt-1 font-display text-xl font-extrabold text-[var(--text-primary)]">{row.orderNumber}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-dimmer)] hover:bg-[var(--overlay-soft)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {statusBadge(row.status, row.refunded)}
          <span className="flex items-center gap-1 text-[11px] text-[var(--text-dimmer)]">
            {tenderIcon(row.tenderType)}
            {row.tenderType ?? "—"}
          </span>
          <span className="text-[11px] text-[var(--text-dimmer)]">{new Date(row.createdAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {loadError ? (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertTriangle size={14} className="shrink-0" /> {loadError}
          </div>
        ) : !order ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-dimmer)]">
            <RefreshCw size={14} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Line items */}
            <div className="overflow-hidden rounded-xl bg-[var(--overlay-soft)]">
              <div className="border-b border-[var(--divider)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-dimmer)]">Items</div>
              {order.lines.map((line) => (
                <div key={line.id} className="flex items-start justify-between border-b border-[var(--divider)] px-4 py-3 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {line.quantity > 1 ? `${line.quantity}× ` : ""}{line.productName}
                    </div>
                    {line.sizeOptionName && (
                      <div className="text-[11px] text-[var(--text-dimmer)]">{line.sizeOptionName}</div>
                    )}
                    {line.modifierSummary.length > 0 && (
                      <div className="text-[11px] text-[var(--text-dimmer)]">
                        {line.modifierSummary.map((m) => m.name).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(line.lineTotalCents)}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 rounded-xl bg-[var(--overlay-soft)] px-4 py-3">
              <div className="flex justify-between text-sm text-[var(--text-dimmer)]">
                <span>Subtotal</span><span>{formatCurrency(order.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--text-dimmer)]">
                <span>Tax</span><span>{formatCurrency(order.taxCents)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--divider)] pt-1.5 font-display text-lg font-extrabold text-[var(--text-primary)]">
                <span>Total</span><span>{formatCurrency(order.totalCents)}</span>
              </div>
            </div>

            {/* Payment details */}
            <div className="space-y-1.5 rounded-xl bg-[var(--overlay-soft)] px-4 py-3 text-sm">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-dimmer)]">Payment</div>
              {order.payment.tenderType && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-dimmer)]">Tender</span>
                  <span className="flex items-center gap-1.5 font-semibold capitalize text-[var(--text-primary)]">
                    {tenderIcon(order.payment.tenderType)} {order.payment.tenderType}
                  </span>
                </div>
              )}
              {order.payment.stripePaymentIntentId && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-dimmer)]">Stripe PI</span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">{order.payment.stripePaymentIntentId}</span>
                </div>
              )}
              {order.payment.tenderedCents != null && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-dimmer)]">Tendered</span>
                  <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(order.payment.tenderedCents)}</span>
                </div>
              )}
              {order.payment.changeDueCents != null && order.payment.changeDueCents > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-dimmer)]">Change</span>
                  <span className="font-semibold text-emerald-500">{formatCurrency(order.payment.changeDueCents)}</span>
                </div>
              )}
            </div>

            {/* Cashier */}
            <div className="text-[11px] text-[var(--text-dimmest)]">
              Served by <span className="font-semibold text-[var(--text-dimmer)]">{order.cashierName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 border-t border-[var(--divider)] px-5 py-4">
        <div className="flex gap-2">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--overlay-soft)] py-2.5 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--overlay-hover)] disabled:opacity-30"
            disabled={!canSendReceipt}
            title={!row.stripePaymentIntentId ? "Cash-only orders have no Stripe receipt" : row.refunded ? "Order was refunded" : ""}
            onClick={() => setModal("receipt")}
          >
            <Mail size={15} /> Email Receipt
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500/10 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/15 disabled:opacity-30"
            disabled={!canRefund}
            title={
              !row.stripePaymentIntentId ? "Cash-only orders cannot be refunded via Stripe"
              : row.refunded ? "Already refunded"
              : row.status !== "paid" ? "Order is not paid"
              : ""
            }
            onClick={() => setModal("refund")}
          >
            <Lock size={14} /><RotateCcw size={14} /> Refund
          </button>
        </div>
      </div>

      {modal === "receipt" && (
        <SendReceiptModal
          onClose={() => setModal(null)}
          onSend={(email) => api.sendReceipt(adminPin, row.id, email).then(() => {})}
        />
      )}
      {modal === "refund" && order && (
        <RefundModal
          order={order}
          onClose={() => setModal(null)}
          onRefund={async (refundPin, amountCents) => {
            await api.refundTransaction(adminPin, row.id, refundPin, amountCents);
            onRefundComplete();
          }}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TransactionsPage({ adminPin, onClose, onNavigateInventory, onNavigateAnalytics }: TransactionsPageProps) {
  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TransactionRow | null>(null);

  const load = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listTransactions(adminPin, p, PAGE_SIZE);
      setData(result);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useState(() => { void load(1); });

  const handleTabSelect = (tab: "inventory" | "analytics" | "transactions") => {
    if (tab === "inventory") onNavigateInventory();
    else if (tab === "analytics") onNavigateAnalytics();
  };

  const rows = data?.data ?? [];

  return (
    <>
      <AdminWorkspaceHeader
        eyebrow="Admin"
        title="Transactions"
        description="All orders processed at this register, newest first."
        activeTab="transactions"
        onSelectTab={handleTabSelect}
        onClose={onClose}
        actions={
          <button type="button" className="touch-button flex items-center gap-1.5" onClick={() => void load(page)}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      <div className={`flex min-h-0 flex-1 gap-4 ${selected ? "md:grid md:grid-cols-[1fr_420px]" : ""}`}>
        {/* Table */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl bg-[var(--bg-elevated)]">
          {error ? (
            <div className="flex items-center gap-2 p-6 text-sm text-red-400">
              <AlertTriangle size={14} className="shrink-0" /> {error}
              <button type="button" className="ml-2 underline" onClick={() => void load(page)}>Retry</button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-[var(--bg-surface)] text-[10px] uppercase tracking-wider text-[var(--text-dimmer)]">
                    <tr>
                      <th className="px-4 py-3 text-left">Order</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Cashier</th>
                      <th className="px-4 py-3 text-center">Tender</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--divider)]">
                    {!data && loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-dimmer)]">
                          <RefreshCw size={16} className="mx-auto animate-spin" />
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-dimmer)]">No transactions found.</td>
                      </tr>
                    ) : rows.map((row) => (
                      <tr
                        key={row.id}
                        className={`cursor-pointer transition-colors ${
                          selected?.id === row.id
                            ? "bg-[var(--overlay-active)]"
                            : "hover:bg-[var(--overlay-soft)]"
                        }`}
                        onClick={() => setSelected(selected?.id === row.id ? null : row)}
                      >
                        <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{row.orderNumber}</td>
                        <td className="px-4 py-3 text-[var(--text-dimmer)]">
                          {new Date(row.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                          <span className="text-[var(--text-dimmest)]">{new Date(row.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{row.cashierName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="flex items-center justify-center gap-1 capitalize text-[var(--text-dimmer)]">
                            {tenderIcon(row.tenderType)} {row.tenderType ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-display font-extrabold text-[var(--text-primary)]">
                          {formatCurrency(row.totalCents)}
                        </td>
                        <td className="px-4 py-3 text-center">{statusBadge(row.status, row.refunded)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--divider)] px-4 py-3">
                  <span className="text-[11px] text-[var(--text-dimmer)]">
                    {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded-lg bg-[var(--overlay-soft)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--overlay-hover)] disabled:opacity-30"
                      disabled={page <= 1 || loading}
                      onClick={() => void load(page - 1)}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-[var(--overlay-soft)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--overlay-hover)] disabled:opacity-30"
                      disabled={page >= data.totalPages || loading}
                      onClick={() => void load(page + 1)}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <TransactionDetail
            key={selected.id}
            row={selected}
            adminPin={adminPin}
            onClose={() => setSelected(null)}
            onRefundComplete={() => {
              setSelected(null);
              void load(page);
            }}
          />
        )}
      </div>
    </>
  );
}
