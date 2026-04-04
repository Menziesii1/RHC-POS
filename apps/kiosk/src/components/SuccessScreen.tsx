import { formatCurrency } from "@rhc-pos/shared";

interface SuccessScreenProps {
  orderNumber: string;
  totalCents: number;
}

export function SuccessScreen({ orderNumber, totalCents }: SuccessScreenProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-pine/90 p-6">
      <div className="text-center text-cream">
        <div className="font-display text-7xl font-bold">Payment Approved</div>
        <div className="mt-4 text-4xl font-bold">{formatCurrency(totalCents)}</div>
        <div className="mt-3 text-2xl">Order {orderNumber}</div>
      </div>
    </div>
  );
}
