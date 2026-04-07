import { formatCurrency, type AnalyticsRangeResponse, type SummaryResponse } from "@rhc-pos/shared";
import { useMemo, useState } from "react";

import { AdminWorkspaceHeader } from "./AdminWorkspaceHeader";

interface AnalyticsPageProps {
  summary: SummaryResponse | null;
  analytics: AnalyticsRangeResponse | null;
  onClose: () => void;
  onNavigateInventory: () => void;
  canOpenInventory: boolean;
}

function barWidth(value: number, max: number) {
  if (max <= 0) {
    return "8%";
  }
  return `${Math.max(8, Math.round((value / max) * 100))}%`;
}

export function AnalyticsPage({
  summary,
  analytics,
  onClose,
  onNavigateInventory,
  canOpenInventory,
}: AnalyticsPageProps) {
  const [mode, setMode] = useState<"financial" | "inventory">("financial");

  const salesSeries = analytics?.salesSeries ?? [];
  const productSeries = analytics?.productSeries ?? [];
  const revenueMax = Math.max(1, ...salesSeries.map((entry) => entry.totalSalesCents));
  const quantityMax = Math.max(1, ...productSeries.map((entry) => entry.totalQuantity));
  const totalOrdersOverRange = salesSeries.reduce((sum, entry) => sum + entry.orderCount, 0);
  const totalSalesOverRange = salesSeries.reduce((sum, entry) => sum + entry.totalSalesCents, 0);
  const avgTicket = totalOrdersOverRange > 0 ? Math.round(totalSalesOverRange / totalOrdersOverRange) : 0;
  const bestDay =
    salesSeries.reduce(
      (best, entry) => (entry.totalSalesCents > best.totalSalesCents ? entry : best),
      salesSeries[0] ?? {
        date: "N/A",
        totalSalesCents: 0,
        cashSalesCents: 0,
        cardSalesCents: 0,
        orderCount: 0,
      },
    ) ?? null;
  const slowMovers = useMemo(
    () =>
      [...productSeries]
        .filter((entry) => entry.totalQuantity > 0)
        .sort((a, b) => a.totalQuantity - b.totalQuantity)
        .slice(0, 5),
    [productSeries],
  );

  return (
    <div className="flex min-h-[760px] flex-col">
      <AdminWorkspaceHeader
        eyebrow="Sales Intelligence"
        title="Analytics"
        description="Review financial performance and product demand over time. This page is built to answer operational questions quickly, not just decorate the data."
        activeTab="analytics"
        onSelectTab={(tab) => {
          if (tab === "inventory" && canOpenInventory) {
            onNavigateInventory();
          }
        }}
        onClose={onClose}
        actions={
          <div className="flex border border-[#dbe6f4] bg-[#f7fbff]">
            <button
              type="button"
              className={`px-5 py-4 text-sm font-bold uppercase tracking-[0.22em] ${
                mode === "financial" ? "bg-[#263362] text-white" : "text-[#263362]/60"
              }`}
              onClick={() => setMode("financial")}
            >
              Financial
            </button>
            <button
              type="button"
              className={`border-l border-[#dbe6f4] px-5 py-4 text-sm font-bold uppercase tracking-[0.22em] ${
                mode === "inventory" ? "bg-[#263362] text-white" : "text-[#263362]/60"
              }`}
              onClick={() => setMode("inventory")}
            >
              Inventory Demand
            </button>
          </div>
        }
      />

      {mode === "financial" ? (
        <>
          <div className="mb-6 grid gap-4 xl:grid-cols-5">
            <div className="brand-stat">
              <div className="brand-stat-label">Range Sales</div>
              <div className="brand-stat-value">{formatCurrency(totalSalesOverRange)}</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-label">Today</div>
              <div className="brand-stat-value">{formatCurrency(summary?.totalSalesCents ?? 0)}</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-label">Average Ticket</div>
              <div className="brand-stat-value">{formatCurrency(avgTicket)}</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-label">Orders</div>
              <div className="brand-stat-value">{totalOrdersOverRange}</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-label">Best Day</div>
              <div className="brand-stat-value text-2xl">{bestDay?.date ?? "N/A"}</div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="brand-section p-5">
              <div className="brand-section-title">Revenue Over Time</div>
              <div className="mt-5 grid gap-3">
                {salesSeries.map((entry) => (
                  <div key={entry.date} className="grid grid-cols-[90px_1fr_120px] items-center gap-4">
                    <div className="text-sm font-semibold text-[#263362]/70">{entry.date.slice(5)}</div>
                    <div className="h-4 bg-[#e8eef7]">
                      <div className="h-4 bg-[#263362]" style={{ width: barWidth(entry.totalSalesCents, revenueMax) }} />
                    </div>
                    <div className="text-right font-semibold text-[#263362]">{formatCurrency(entry.totalSalesCents)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5">
              <div className="brand-section p-5">
                <div className="brand-section-title">Tender Mix</div>
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm font-semibold text-[#263362]">
                      <span>Cash</span>
                      <span>{formatCurrency(summary?.cashSalesCents ?? 0)}</span>
                    </div>
                    <div className="h-4 bg-[#e8eef7]">
                      <div className="h-4 bg-[#5190E6]" style={{ width: barWidth(summary?.cashSalesCents ?? 0, Math.max(summary?.totalSalesCents ?? 0, 1)) }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm font-semibold text-[#263362]">
                      <span>Card</span>
                      <span>{formatCurrency(summary?.cardSalesCents ?? 0)}</span>
                    </div>
                    <div className="h-4 bg-[#e8eef7]">
                      <div className="h-4 bg-[#1CE4DB]" style={{ width: barWidth(summary?.cardSalesCents ?? 0, Math.max(summary?.totalSalesCents ?? 0, 1)) }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="brand-section p-5">
                <div className="brand-section-title">Category Performance</div>
                <div className="mt-4 space-y-3">
                  {(summary?.salesByCategory ?? []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[#263362]">
                      <span>{item.name}</span>
                      <span className="font-bold">{formatCurrency(item.totalCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="mb-6 grid gap-4 xl:grid-cols-4">
            <div className="brand-stat">
              <div className="brand-stat-label">Units Sold</div>
              <div className="brand-stat-value">{productSeries.reduce((sum, item) => sum + item.totalQuantity, 0)}</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-label">Top Mover</div>
              <div className="brand-stat-value text-2xl">{productSeries[0]?.productName ?? "None"}</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-label">Slowest Mover</div>
              <div className="brand-stat-value text-2xl">{slowMovers[0]?.productName ?? "None"}</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-label">Tracked Range</div>
              <div className="brand-stat-value text-2xl">{analytics?.days ?? 0} days</div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="brand-section p-5">
              <div className="brand-section-title">Top Movers</div>
              <div className="mt-5 space-y-3">
                {productSeries.slice(0, 8).map((entry) => (
                  <div key={entry.productId} className="grid grid-cols-[minmax(0,1fr)_90px] items-center gap-4">
                    <div>
                      <div className="font-semibold text-[#263362]">{entry.productName}</div>
                      <div className="mt-2 h-3 bg-[#e8eef7]">
                        <div className="h-3 bg-[#263362]" style={{ width: barWidth(entry.totalQuantity, quantityMax) }} />
                      </div>
                    </div>
                    <div className="text-right font-bold text-[#263362]">{entry.totalQuantity}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5">
              <div className="brand-section p-5">
                <div className="brand-section-title">Slow Movers</div>
                <div className="mt-4 space-y-3">
                  {slowMovers.map((entry) => (
                    <div key={entry.productId} className="flex items-center justify-between text-[#263362]">
                      <span>{entry.productName}</span>
                      <span className="font-bold">{entry.totalQuantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="brand-section p-5">
                <div className="brand-section-title">Size & Flavor Signals</div>
                <div className="mt-4 grid gap-3">
                  {(summary?.sizeBreakdown ?? []).slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[#263362]">
                      <span>Size: {item.name}</span>
                      <span className="font-bold">{item.quantity}</span>
                    </div>
                  ))}
                  {(summary?.flavorBreakdown ?? []).slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[#263362]">
                      <span>Flavor: {item.name}</span>
                      <span className="font-bold">{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
