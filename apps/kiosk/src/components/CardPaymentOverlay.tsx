import { formatCurrency } from "@rhc-pos/shared";

interface CardPaymentOverlayProps {
  totalCents: number;
  statusLabel: string;
  failureMessage: string | null;
  onCancel: () => void;
}

export function CardPaymentOverlay({
  totalCents,
  statusLabel,
  failureMessage,
  onCancel,
}: CardPaymentOverlayProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-bark/45 p-6 backdrop-blur-sm">
      <div className="touch-card w-full max-w-2xl p-10 text-center">
        <div className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-bark/60">Card Payment</div>
        <div className="font-display text-6xl font-bold text-bark">{formatCurrency(totalCents)}</div>
        <p className="mt-6 text-2xl font-semibold text-bark">{statusLabel}</p>
        <p className="mt-2 text-lg text-bark/70">Customer may tap, insert, or swipe on the WisePOS E.</p>
        {failureMessage ? <p className="mt-5 rounded-[18px] bg-ember/12 p-4 text-lg text-ember">{failureMessage}</p> : null}
        <button type="button" className="mt-8 rounded-full bg-ember px-6 py-4 text-xl font-bold text-white" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
