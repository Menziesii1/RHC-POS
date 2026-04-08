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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm md:p-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-[#262626] md:grid-cols-[1.15fr_0.85fr]">
        <div className="bg-[#303030] p-7 text-white md:p-10">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#5191e5]">
            <CreditCard size={14} /> Card Payment
          </div>
          <div className="mt-4 font-display text-5xl font-extrabold text-white md:text-6xl">{formatCurrency(totalCents)}</div>
          <div className="mt-5 flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-[#5191e5]" />
            <p className="text-lg font-semibold text-white/70">{statusLabel}</p>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-white/52">
            <Smartphone size={14} /> Tap, insert, or swipe on the reader
          </p>
          {failureMessage && (
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-red-500/10 p-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span className="text-sm text-red-300">{failureMessage}</span>
            </div>
          )}
        </div>
        <div className="bg-[#323232] p-7 md:p-8">
          <div className="rounded-xl bg-white/[0.03] p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#5191e5]">Status</div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between pb-2.5">
                <span className="flex items-center gap-1.5 text-sm text-white/57"><Smartphone size={13} /> Reader</span>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">Waiting</span>
              </div>
              <div className="flex items-center justify-between pb-2.5">
                <span className="flex items-center gap-1.5 text-sm text-white/57"><CreditCard size={13} /> Amount</span>
                <span className="font-display text-lg font-extrabold text-white">{formatCurrency(totalCents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/57">Next</span>
                <span className="text-sm font-semibold text-[#5191e5]">Reader interaction</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-500/15 px-5 py-3.5 text-sm font-semibold text-red-300 hover:bg-red-500/20"
            onClick={onCancel}
          >
            <X size={16} /> Cancel Payment
          </button>
        </div>
      </div>
    </div>
  );
}
