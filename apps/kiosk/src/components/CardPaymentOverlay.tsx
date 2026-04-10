import { formatCurrency } from "@rhc-pos/shared";
import { CreditCard, Smartphone, Loader2, X, AlertTriangle } from "lucide-react";

interface CardPaymentOverlayProps {
  totalCents: number;
  statusLabel: string;
  failureMessage: string | null;
  onCancel: () => void;
}

export function CardPaymentOverlay({ totalCents, statusLabel, failureMessage, onCancel }: CardPaymentOverlayProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="grid w-full max-w-2xl overflow-hidden rounded-2xl bg-[var(--bg-base)] md:grid-cols-[1.15fr_0.85fr]">
        <div className="bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#5191e5]">
            <CreditCard size={13} /> Card Payment
          </div>
          <div className="mt-2 font-display text-4xl font-extrabold text-[var(--text-primary)]">{formatCurrency(totalCents)}</div>
          <div className="mt-3 flex items-center gap-2.5">
            <Loader2 size={17} className="animate-spin text-[#5191e5]" />
            <p className="text-base font-semibold text-[var(--text-muted)]">{statusLabel}</p>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--text-dimmer)]">
            <Smartphone size={13} /> Tap, insert, or swipe on the reader
          </p>
          {failureMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-500/10 p-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{failureMessage}</span>
            </div>
          )}
        </div>
        <div className="bg-[var(--bg-elevated)] p-5">
          <div className="rounded-xl bg-[var(--overlay-soft)] p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#5191e5]">Status</div>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between pb-2">
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-dimmer)]"><Smartphone size={12} /> Reader</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">Waiting</span>
              </div>
              <div className="flex items-center justify-between pb-2">
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-dimmer)]"><CreditCard size={12} /> Amount</span>
                <span className="font-display text-base font-extrabold text-[var(--text-primary)]">{formatCurrency(totalCents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-dimmer)]">Next</span>
                <span className="text-xs font-semibold text-[#5191e5]">Reader interaction</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20"
            onClick={onCancel}
          >
            <X size={15} /> Cancel Payment
          </button>
        </div>
      </div>
    </div>
  );
}
