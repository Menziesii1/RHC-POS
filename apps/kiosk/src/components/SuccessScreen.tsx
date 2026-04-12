import { formatCurrency } from "@rhc-pos/shared";
import { CheckCircle2, Receipt, Banknote } from "lucide-react";

import { BrandBadge } from "./BrandBadge";

interface SuccessScreenProps {
  orderNumber: string;
  totalCents: number;
  cashTenderedCents?: number;
}

export function SuccessScreen({ orderNumber, totalCents, cashTenderedCents }: SuccessScreenProps) {
  const changeCents = cashTenderedCents != null ? cashTenderedCents - totalCents : null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm md:p-6">
      <div className="grid w-full max-w-3xl overflow-hidden rounded-2xl bg-[var(--bg-base)] md:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col items-center justify-center gap-4 bg-[var(--bg-surface)] p-8 md:p-10">
          <div className="h-16 w-16"><BrandBadge /></div>
          <CheckCircle2 size={48} className="text-[#1be4db]" strokeWidth={1.5} />
        </div>
        <div className="p-7 md:p-9">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#1be4db]">
            <CheckCircle2 size={12} /> Payment complete
          </div>
          <div className="mt-3 font-display text-5xl font-extrabold text-[var(--text-primary)] md:text-6xl">Approved</div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--overlay-soft)] px-3 py-1 text-[11px] font-medium text-[var(--text-muted)]">
            <Receipt size={12} /> Order {orderNumber}
          </div>
          <div className="mt-5 font-display text-4xl font-extrabold text-[#1be4db] md:text-5xl">{formatCurrency(totalCents)}</div>

          {changeCents != null && changeCents > 0 && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-500/10 px-5 py-4">
              <Banknote size={28} className="shrink-0 text-emerald-500" />
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-600">Change Due</div>
                <div className="font-display text-4xl font-extrabold text-emerald-500">{formatCurrency(changeCents)}</div>
              </div>
            </div>
          )}

          {changeCents != null && changeCents === 0 && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--overlay-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-dimmer)]">
              <Banknote size={13} /> Exact — no change
            </div>
          )}

          {changeCents == null && (
            <>
              <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-[var(--overlay-soft)]">
                <div className="h-1.5 w-3/4 rounded-full bg-gradient-to-r from-[#1be4db] to-[#5191e5]" />
              </div>
              <div className="mt-4 text-sm text-[var(--text-dimmer)]">Ready for the next sale.</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
