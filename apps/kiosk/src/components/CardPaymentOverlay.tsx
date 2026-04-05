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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#263362]/50 p-6 backdrop-blur-sm">
      <div className="touch-card grid w-full max-w-4xl overflow-hidden md:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-white p-8 md:p-10">
          <div className="brand-kicker">Card payment</div>
          <div className="mt-3 font-display text-6xl font-extrabold tracking-tight text-[#263362]">
            {formatCurrency(totalCents)}
          </div>
          <p className="mt-6 text-2xl font-semibold text-[#263362]">{statusLabel}</p>
          <p className="mt-2 text-lg text-[#263362]/70">Customer may tap, insert, or swipe on the WisePOS E.</p>
          {failureMessage ? (
            <p className="mt-5 border border-[#e6b6ae] bg-[#fdf6f4] p-4 text-lg text-[#ba4a2f]">{failureMessage}</p>
          ) : null}
        </div>

        <div className="border-t border-[#d7e2f1] bg-[#f7fbff] p-8 md:border-l md:border-t-0">
          <div className="brand-section bg-white p-5">
            <div className="brand-section-title">Status</div>
            <div className="mt-4 space-y-3 text-[#263362]">
              <div className="flex items-center justify-between border-b border-[#edf2f8] pb-2">
                <span>Reader</span>
                <span className="font-bold">Waiting</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#edf2f8] pb-2">
                <span>Amount</span>
                <span className="font-bold">{formatCurrency(totalCents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Next</span>
                <span className="font-bold text-[#1CE4DB]">Reader interaction</span>
              </div>
            </div>
          </div>

          <button type="button" className="touch-button mt-6 w-full bg-[#ba4a2f] text-white" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
