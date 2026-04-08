import { formatCurrency } from "@rhc-pos/shared";
import { CheckCircle2, Receipt } from "lucide-react";

import { BrandBadge } from "./BrandBadge";

interface SuccessScreenProps {
  orderNumber: string;
  totalCents: number;
}

export function SuccessScreen({ orderNumber, totalCents }: SuccessScreenProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm md:p-6">
      <div className="grid w-full max-w-3xl overflow-hidden rounded-2xl bg-[#262626] md:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col items-center justify-center gap-4 bg-[#303030] p-8 md:p-10">
          <div className="h-16 w-16"><BrandBadge /></div>
          <CheckCircle2 size={48} className="text-[#1be4db]" strokeWidth={1.5} />
        </div>
        <div className="p-7 md:p-9">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#1be4db]">
            <CheckCircle2 size={12} /> Payment complete
          </div>
          <div className="mt-3 font-display text-5xl font-extrabold text-white md:text-6xl">Approved</div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-white/65">
            <Receipt size={12} /> Order {orderNumber}
          </div>
          <div className="mt-5 font-display text-4xl font-extrabold text-[#1be4db] md:text-5xl">{formatCurrency(totalCents)}</div>
          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
            <div className="h-1.5 w-3/4 rounded-full bg-gradient-to-r from-[#1be4db] to-[#5191e5]" />
          </div>
          <div className="mt-4 text-sm text-white/52">Ready for the next sale.</div>
        </div>
      </div>
    </div>
  );
}
