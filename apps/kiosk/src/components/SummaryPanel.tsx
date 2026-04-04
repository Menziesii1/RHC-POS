import { formatCurrency, type SummaryResponse } from "@rhc-pos/shared";

interface SummaryPanelProps {
  summary: SummaryResponse | null;
  onClose: () => void;
}

export function SummaryPanel({ summary, onClose }: SummaryPanelProps) {
  return (
    <div className="touch-card min-h-[720px] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-display text-4xl font-bold text-bark">Daily Summary</div>
          <div className="text-sm text-bark/70">Today&apos;s totals and item counts.</div>
        </div>
        <button type="button" className="rounded-full bg-oat px-5 py-3 text-lg font-bold text-bark" onClick={onClose}>
          Back
        </button>
      </div>

      {summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] bg-oat p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-bark/60">Total Sales</div>
              <div className="mt-2 text-4xl font-bold text-bark">{formatCurrency(summary.totalSalesCents)}</div>
            </div>
            <div className="rounded-[22px] bg-oat p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-bark/60">Cash</div>
              <div className="mt-2 text-4xl font-bold text-bark">{formatCurrency(summary.cashSalesCents)}</div>
            </div>
            <div className="rounded-[22px] bg-oat p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-bark/60">Card</div>
              <div className="mt-2 text-4xl font-bold text-bark">{formatCurrency(summary.cardSalesCents)}</div>
            </div>
          </div>

          <div className="mt-6 rounded-[22px] bg-cream p-5">
            <div className="mb-4 text-sm uppercase tracking-[0.2em] text-bark/60">Items</div>
            <div className="space-y-3">
              {summary.itemCounts.map((item) => (
                <div key={item.productId} className="flex justify-between border-b border-bark/10 pb-3 text-lg">
                  <span>{item.productName}</span>
                  <span className="font-bold">{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-[22px] bg-oat p-5 text-lg text-bark/70">Loading summary…</div>
      )}
    </div>
  );
}
