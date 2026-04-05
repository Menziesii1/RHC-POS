import { formatCurrency } from "@rhc-pos/shared";

import { BrandBadge } from "./BrandBadge";

interface SuccessScreenProps {
  orderNumber: string;
  totalCents: number;
}

export function SuccessScreen({ orderNumber, totalCents }: SuccessScreenProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#263362]/92 p-6">
      <div className="touch-card grid w-full max-w-3xl gap-6 overflow-hidden md:grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center bg-[#f7fbff] p-8">
          <BrandBadge />
        </div>
        <div className="p-8">
          <div className="brand-kicker">Payment complete</div>
          <div className="mt-2 font-display text-7xl font-extrabold tracking-tight text-[#263362]">Approved</div>
          <div className="mt-4 text-4xl font-extrabold text-[#5190E6]">{formatCurrency(totalCents)}</div>
          <div className="mt-3 text-2xl text-[#263362]">Order {orderNumber}</div>
          <div className="mt-6 h-2 w-full bg-[#eef4fb]">
            <div className="h-2 w-3/4 bg-[#1CE4DB]" />
          </div>
          <div className="mt-5 text-lg text-[#263362]/70">
            The cart is cleared and the register is ready for the next sale.
          </div>
        </div>
      </div>
    </div>
  );
}
