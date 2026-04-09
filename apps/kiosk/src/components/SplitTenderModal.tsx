import { formatCurrency } from "@rhc-pos/shared";
import { Banknote, CreditCard, ArrowLeft, Split, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

type TenderType = "cash" | "card";

interface TenderRow {
  type: TenderType;
  dollars: string;
}

interface SplitTenderModalProps {
  totalCents: number;
  cardEnabled: boolean;
  onClose: () => void;
  onConfirm: (tender1: { type: TenderType; cents: number }, tender2: { type: TenderType; cents: number }) => void;
}

function parseCents(dollars: string): number {
  return Math.max(0, Math.round(Number(dollars || "0") * 100));
}

function formatDollars(cents: number): string {
  return Math.max(0, cents / 100).toFixed(2);
}

function TenderTypeToggle({
  value,
  cardEnabled,
  onChange,
}: {
  value: TenderType;
  cardEnabled: boolean;
  onChange: (t: TenderType) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-[var(--overlay-soft)] p-1">
      <button
        type="button"
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
          value === "cash"
            ? "bg-emerald-500 text-white"
            : "text-[var(--text-dimmer)] hover:text-[var(--text-muted)]"
        }`}
        onClick={() => onChange("cash")}
      >
        <Banknote size={13} /> Cash
      </button>
      {cardEnabled ? (
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            value === "card"
              ? "bg-[#5191e5] text-white"
              : "text-[var(--text-dimmer)] hover:text-[var(--text-muted)]"
          }`}
          onClick={() => onChange("card")}
        >
          <CreditCard size={13} /> Card
        </button>
      ) : null}
    </div>
  );
}

export function SplitTenderModal({ totalCents, cardEnabled, onClose, onConfirm }: SplitTenderModalProps) {
  const [row1, setRow1] = useState<TenderRow>({ type: "cash", dollars: "" });
  const [row2, setRow2] = useState<TenderRow>({ type: "card", dollars: "" });

  const cents1 = parseCents(row1.dollars);
  const cents2 = parseCents(row2.dollars);
  const combinedCents = cents1 + cents2;
  const remainingCents = totalCents - combinedCents;
  const isPartial = combinedCents > 0 && combinedCents < totalCents;
  const isOver = combinedCents > totalCents;

  const bothCard = row1.type === "card" && row2.type === "card";

  const canTender =
    cents1 > 0 &&
    cents2 > 0 &&
    !bothCard &&
    combinedCents > 0;

  const fillRow2 = () => {
    const remaining = totalCents - parseCents(row1.dollars);
    if (remaining > 0) {
      setRow2((prev) => ({ ...prev, dollars: formatDollars(remaining) }));
    }
  };

  const fillRow1 = () => {
    const remaining = totalCents - parseCents(row2.dollars);
    if (remaining > 0) {
      setRow1((prev) => ({ ...prev, dollars: formatDollars(remaining) }));
    }
  };

  useEffect(() => {
    const row1IsCash = row1.type === "cash";
    const row2IsCash = row2.type === "cash";

    if (row1IsCash === row2IsCash) return;

    if (row1IsCash) {
      const next = row1.dollars.trim() ? formatDollars(totalCents - parseCents(row1.dollars)) : "";
      setRow2((prev) => (prev.dollars === next ? prev : { ...prev, dollars: next }));
      return;
    }

    const next = row2.dollars.trim() ? formatDollars(totalCents - parseCents(row2.dollars)) : "";
    setRow1((prev) => (prev.dollars === next ? prev : { ...prev, dollars: next }));
  }, [row1.dollars, row1.type, row2.dollars, row2.type, totalCents]);

  const handleTender = () => {
    if (!canTender) return;
    onConfirm({ type: row1.type, cents: cents1 }, { type: row2.type, cents: cents2 });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm md:p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-[var(--bg-base)]">
        {/* Header */}
        <div className="bg-[var(--bg-surface)] px-7 py-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-amber-500">
            <Split size={13} /> Split Tender
          </div>
          <div className="mt-1 font-display text-4xl font-extrabold text-[var(--text-primary)]">
            {formatCurrency(totalCents)}
          </div>
          <p className="mt-1 text-sm text-[var(--text-dimmer)]">Divide the total across two payment methods.</p>
        </div>

        {/* Tender rows */}
        <div className="space-y-3 p-5">
          {/* Row 1 */}
          <div className="rounded-xl bg-[var(--overlay-soft)] p-4">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dimmer)]">Tender 1</div>
            <div className="flex items-center gap-3">
              <TenderTypeToggle value={row1.type} cardEnabled={cardEnabled} onChange={(t) => setRow1((prev) => ({ ...prev, type: t }))} />
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-dimmer)]">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  readOnly={row1.type === "card" && row2.type === "cash"}
                  className="w-full rounded-xl bg-[var(--overlay-hover)] py-3 pl-7 pr-3 text-lg font-bold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-dimmest)] focus:ring-2 focus:ring-amber-400/30 read-only:cursor-default read-only:bg-[var(--overlay-soft)] read-only:text-[var(--text-muted)]"
                  placeholder="0.00"
                  value={row1.dollars}
                  onChange={(e) => setRow1((prev) => ({ ...prev, dollars: e.target.value }))}
                />
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl bg-[var(--overlay-soft)] px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dimmer)] hover:bg-[var(--overlay-hover)] hover:text-[var(--text-muted)]"
                onClick={fillRow1}
                title="Fill remaining"
              >
                Fill
              </button>
            </div>
          </div>

          {/* Row 2 */}
          <div className="rounded-xl bg-[var(--overlay-soft)] p-4">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dimmer)]">Tender 2</div>
            <div className="flex items-center gap-3">
              <TenderTypeToggle value={row2.type} cardEnabled={cardEnabled} onChange={(t) => setRow2((prev) => ({ ...prev, type: t }))} />
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-dimmer)]">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  readOnly={row2.type === "card" && row1.type === "cash"}
                  className="w-full rounded-xl bg-[var(--overlay-hover)] py-3 pl-7 pr-3 text-lg font-bold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-dimmest)] focus:ring-2 focus:ring-amber-400/30 read-only:cursor-default read-only:bg-[var(--overlay-soft)] read-only:text-[var(--text-muted)]"
                  placeholder="0.00"
                  value={row2.dollars}
                  onChange={(e) => setRow2((prev) => ({ ...prev, dollars: e.target.value }))}
                />
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl bg-[var(--overlay-soft)] px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dimmer)] hover:bg-[var(--overlay-hover)] hover:text-[var(--text-muted)]"
                onClick={fillRow2}
                title="Fill remaining"
              >
                Fill
              </button>
            </div>
          </div>

          {/* Balance summary */}
          <div className="flex items-center justify-between rounded-xl bg-[var(--overlay-soft)] px-4 py-3">
            <span className="text-sm text-[var(--text-dimmer)]">Balance remaining</span>
            <span
              className={`font-display text-xl font-extrabold ${
                remainingCents === 0
                  ? "text-emerald-500"
                  : isOver
                  ? "text-amber-500"
                  : "text-[var(--text-primary)]"
              }`}
            >
              {isOver ? `+${formatCurrency(combinedCents - totalCents)} over` : formatCurrency(Math.max(0, remainingCents))}
            </span>
          </div>

          {/* Warnings */}
          {bothCard && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertTriangle size={14} className="shrink-0" />
              Both tenders cannot be card — at least one must be cash.
            </div>
          )}
          {isPartial && !bothCard && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
              <AlertTriangle size={14} className="shrink-0" />
              Total is {formatCurrency(remainingCents)} short. Order will stay open until fully paid.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-[var(--text-dimmest)] hover:text-[var(--text-muted)]"
              onClick={onClose}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="button"
              className="ml-auto flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-bold text-[#1a1a1a] transition active:scale-[0.97] disabled:opacity-30"
              disabled={!canTender}
              onClick={handleTender}
            >
              <Split size={16} />
              Tender
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
