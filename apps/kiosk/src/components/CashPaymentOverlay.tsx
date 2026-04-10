import { formatCurrency } from "@rhc-pos/shared";
import { Banknote, ArrowLeft, Check, Coins } from "lucide-react";
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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="grid w-full max-w-xl grid-cols-[1fr_1.2fr] overflow-hidden rounded-2xl bg-[var(--bg-base)]">
        {/* Left — summary */}
        <div className="bg-[var(--bg-surface)] p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#1be4db]">
            <Banknote size={12} /> Cash Payment
          </div>
          <div className="mt-1.5 font-display text-3xl font-extrabold text-[var(--text-primary)]">{formatCurrency(totalCents)}</div>
          <p className="mt-1 text-[11px] text-[var(--text-dimmer)]">Choose exact tender or enter a custom amount.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[var(--overlay-soft)] p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dimmer)]">Due</div>
              <div className="mt-0.5 font-display text-xl font-extrabold text-[var(--text-primary)]">{formatCurrency(totalCents)}</div>
            </div>
            <div className="rounded-xl bg-[var(--overlay-soft)] p-2.5">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dimmer)]"><Coins size={9} /> Change</div>
              <div className="mt-0.5 font-display text-xl font-extrabold text-emerald-500">{formatCurrency(customChangeCents)}</div>
            </div>
          </div>
          <button type="button" className="mt-4 flex items-center gap-1.5 text-[11px] text-[var(--text-dimmer)] hover:text-[var(--text-muted)]" onClick={onClose}>
            <ArrowLeft size={12} /> Back to cart
          </button>
        </div>

        {/* Right — tender options */}
        <div className="bg-[var(--bg-elevated)] p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Tender options</div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                className={`rounded-xl px-3 py-2 text-center transition ${
                  amount === totalCents ? "bg-[#1be4db] text-[#1a1a1a]" : "bg-[var(--overlay-soft)] text-[var(--text-primary)] hover:bg-[var(--overlay-hover)]"
                }`}
                onClick={() => onConfirm(amount)}
              >
                <span className="block text-[9px] font-semibold uppercase tracking-wider opacity-60">{amount === totalCents ? "Exact" : "Quick"}</span>
                <span className="mt-0.5 block text-sm font-bold">{amount === totalCents ? "Exact" : formatCurrency(amount)}</span>
              </button>
            ))}
          </div>
          <div className="mt-2.5 space-y-2">
            <input
              type="text"
              inputMode="decimal"
              className="w-full rounded-xl bg-[var(--overlay-soft)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-dimmest)] focus:ring-2 focus:ring-[#1be4db]/20"
              placeholder="Custom amount"
              value={customDollars}
              onChange={(event) => setCustomDollars(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[var(--overlay-soft)] p-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dimmer)]">Tendered</div>
                <div className="mt-0.5 font-display text-lg font-extrabold text-[var(--text-primary)]">{formatCurrency(customTenderCents)}</div>
              </div>
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1be4db] px-3 py-2 text-sm font-bold text-[#1a1a1a] disabled:opacity-30"
                disabled={customTenderCents < totalCents}
                onClick={() => onConfirm(customTenderCents)}
              >
                <Check size={14} /> Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
