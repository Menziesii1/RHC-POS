import { formatCurrency } from "@rhc-pos/shared";
import { useState } from "react";

interface CashPaymentOverlayProps {
  totalCents: number;
  onClose: () => void;
  onConfirm: (tenderedCents: number) => void;
}

export function CashPaymentOverlay({ totalCents, onClose, onConfirm }: CashPaymentOverlayProps) {
  const [customDollars, setCustomDollars] = useState("");
  const quickAmounts = [totalCents, 500, 1000, 2000].filter((amount, index, values) => values.indexOf(amount) === index);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-bark/45 p-6 backdrop-blur-sm">
      <div className="touch-card w-full max-w-2xl p-10">
        <div className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-bark/60">Cash Payment</div>
        <div className="font-display text-6xl font-bold text-bark">{formatCurrency(totalCents)}</div>
        <p className="mt-3 text-lg text-bark/70">Choose a tendered amount or enter a custom one.</p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              className="touch-button bg-oat text-bark"
              onClick={() => onConfirm(amount)}
            >
              {amount === totalCents ? "Exact" : formatCurrency(amount)}
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <input
            type="number"
            min="0"
            step="0.01"
            className="flex-1 rounded-[20px] border border-bark/15 bg-cream px-4 py-4 text-xl outline-none"
            placeholder="Custom amount"
            value={customDollars}
            onChange={(event) => setCustomDollars(event.target.value)}
          />
          <button
            type="button"
            className="rounded-full bg-pine px-6 py-4 text-xl font-bold text-white"
            onClick={() => onConfirm(Math.round(Number(customDollars || "0") * 100))}
          >
            Confirm
          </button>
        </div>

        <button type="button" className="mt-4 text-lg font-semibold text-bark/70" onClick={onClose}>
          Back to cart
        </button>
      </div>
    </div>
  );
}
