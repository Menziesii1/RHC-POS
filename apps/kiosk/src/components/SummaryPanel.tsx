import { formatCurrency, type SummaryResponse } from "@rhc-pos/shared";

interface SummaryPanelProps {
  summary: SummaryResponse | null;
  onClose: () => void;
}

export function SummaryPanel({ summary, onClose }: SummaryPanelProps) {
  const peakItem = summary?.topItems[0] ?? null;
  const maxQuantity = Math.max(1, ...(summary?.topItems.map((item) => item.quantity) ?? [1]));

  return (
    <div className="touch-card min-h-[720px] p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="brand-kicker">Sales dashboard</div>
          <div className="mt-2 font-display text-4xl font-extrabold text-[#263362]">Daily Summary</div>
          <div className="text-sm text-[#263362]/70">Today&apos;s totals and item counts.</div>
        </div>
        <button type="button" className="touch-button bg-[#f7fbff] text-[#263362]" onClick={onClose}>
          Back
        </button>
      </div>

      {summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="brand-stat">
              <div className="brand-stat-label">Total Sales</div>
              <div className="brand-stat-value">{formatCurrency(summary.totalSalesCents)}</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-label">Cash</div>
              <div className="brand-stat-value">{formatCurrency(summary.cashSalesCents)}</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-label">Card</div>
              <div className="brand-stat-value">{formatCurrency(summary.cardSalesCents)}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div className="brand-section p-5">
              <div className="brand-section-title">Top Items</div>
              <div className="mt-4 space-y-3">
                {summary.topItems.map((item) => {
                  const width = `${Math.max(14, Math.round((item.quantity / maxQuantity) * 100))}%`;
                  return (
                    <div key={item.productId} className="space-y-2">
                      <div className="flex justify-between text-lg text-[#263362]">
                        <span>{item.productName}</span>
                        <span className="font-bold">{item.quantity}</span>
                      </div>
                      <div className="h-3 bg-[#eef4fb]">
                        <div className="h-3 bg-[#5190E6]" style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="brand-section p-5">
              <div className="brand-section-title">Insights</div>
              <div className="mt-4 space-y-4">
                <div className="brand-chip brand-chip-accent">Orders: {summary.orderCount}</div>
                <div className="brand-chip brand-chip-soft">
                  Best seller: {peakItem ? peakItem.productName : "None yet"}
                </div>
                <div className="text-sm leading-6 text-[#263362]/70">
                  Sales are grouped by tender type, category, size, and flavor so volunteers can answer the daily
                  traffic questions without needing a back-office report.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="brand-section p-5">
              <div className="brand-section-title">By Category</div>
              <div className="mt-4 space-y-3">
                {summary.salesByCategory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[#263362]">
                    <span>{item.name}</span>
                    <span className="font-bold">
                      {item.quantity} / {formatCurrency(item.totalCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="brand-section p-5">
              <div className="brand-section-title">By Size</div>
              <div className="mt-4 space-y-3">
                {summary.sizeBreakdown.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[#263362]">
                    <span>{item.name}</span>
                    <span className="font-bold">
                      {item.quantity} / {formatCurrency(item.totalCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="brand-section p-5">
              <div className="brand-section-title">Flavor Insights</div>
              <div className="mt-4 space-y-3">
                {summary.flavorBreakdown.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-[#263362]">
                    <span>
                      {item.name}
                      {item.discountFlavor ? " (discount)" : ""}
                    </span>
                    <span className="font-bold">{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="brand-section p-5 text-lg text-[#263362]/70">Loading summary...</div>
      )}
    </div>
  );
}
