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
  const customTenderCents = Math.max(0, Math.round(Number(customDollars || "0") * 100));
  const customChangeCents = customTenderCents >= totalCents ? customTenderCents - totalCents : 0;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#263362]/50 p-6 backdrop-blur-sm">
      <div className="touch-card grid w-full max-w-4xl overflow-hidden md:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-white p-8 md:p-10">
          <div className="brand-kicker">Cash payment</div>
          <div className="mt-3 font-display text-6xl font-extrabold tracking-tight text-[#263362]">
            {formatCurrency(totalCents)}
          </div>
          <p className="mt-3 text-lg text-[#263362]/70">Amount due is shown first. Tender goes directly beneath it.</p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="brand-stat">
              <div className="brand-stat-label">Due</div>
              <div className="brand-stat-value">{formatCurrency(totalCents)}</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-label">Change</div>
              <div className="brand-stat-value">{formatCurrency(customChangeCents)}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#d7e2f1] bg-[#f7fbff] p-8 md:border-l md:border-t-0">
          <div className="brand-section-title">Tender</div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                className={`touch-button text-center ${
                  amount === totalCents ? "bg-[#5190E6] text-white" : "bg-white text-[#263362]"
                }`}
                onClick={() => onConfirm(amount)}
              >
                {amount === totalCents ? "Exact" : formatCurrency(amount)}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <input
              type="number"
              min="0"
              step="0.01"
              className="brand-input w-full text-xl"
              placeholder="Custom amount tendered"
              value={customDollars}
              onChange={(event) => setCustomDollars(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="brand-stat">
                <div className="brand-stat-label">Tendered</div>
                <div className="brand-stat-value">{formatCurrency(customTenderCents)}</div>
              </div>
              <button
                type="button"
                className="touch-button bg-[#263362] text-white disabled:opacity-40"
                disabled={customTenderCents < totalCents}
                onClick={() => onConfirm(customTenderCents)}
              >
                Confirm
              </button>
            </div>
          </div>

          <button type="button" className="mt-6 text-lg font-semibold text-[#263362]/70" onClick={onClose}>
            Back to cart
          </button>
        </div>
      </div>
    </div>
  );
}
