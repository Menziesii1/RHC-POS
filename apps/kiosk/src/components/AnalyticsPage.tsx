import { formatCurrency, type AnalyticsRangeResponse, type SummaryResponse } from "@rhc-pos/shared";
import { TrendingUp, DollarSign, ShoppingCart, Calendar, BarChart3, Banknote, CreditCard, Package, ArrowDownRight } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminWorkspaceHeader } from "./AdminWorkspaceHeader";

interface AnalyticsPageProps {
  summary: SummaryResponse | null;
  analytics: AnalyticsRangeResponse | null;
  onClose: () => void;
  onNavigateInventory: () => void;
  onNavigateTransactions: () => void;
  canOpenInventory: boolean;
  selectedRangeDays: number;
  onSelectRangeDays: (days: number) => void;
}

export const ANALYTICS_RANGE_OPTIONS = [
  { label: "1 Service", days: 7, description: "Last weekly service" },
  { label: "4 Services", days: 28, description: "About one month" },
  { label: "8 Services", days: 56, description: "About two months" },
  { label: "12 Services", days: 84, description: "About a quarter" },
] as const;

function barWidth(value: number, max: number) {
  if (max <= 0) {
    return "8%";
  }
  return `${Math.max(8, Math.round((value / max) * 100))}%`;
}

function formatDayLabel(date: string) {
  const value = new Date(date);
  return value.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupWeeklySeries(series: AnalyticsRangeResponse["salesSeries"]) {
  const grouped: Array<{
    key: string;
    label: string;
    totalSalesCents: number;
    cashSalesCents: number;
    cardSalesCents: number;
    orderCount: number;
  }> = [];

  for (let index = 0; index < series.length; index += 7) {
    const chunk = series.slice(index, index + 7);
    if (chunk.length === 0) {
      continue;
    }

    grouped.push({
      key: `${chunk[0]?.date ?? index}-${chunk[chunk.length - 1]?.date ?? index}`,
      label: `${formatDayLabel(chunk[0].date)} - ${formatDayLabel(chunk[chunk.length - 1].date)}`,
      totalSalesCents: chunk.reduce((sum, entry) => sum + entry.totalSalesCents, 0),
      cashSalesCents: chunk.reduce((sum, entry) => sum + entry.cashSalesCents, 0),
      cardSalesCents: chunk.reduce((sum, entry) => sum + entry.cardSalesCents, 0),
      orderCount: chunk.reduce((sum, entry) => sum + entry.orderCount, 0),
    });
  }

  return grouped;
}

export function AnalyticsPage({
  summary,
  analytics,
  onClose,
  onNavigateInventory,
  onNavigateTransactions,
  canOpenInventory,
  selectedRangeDays,
  onSelectRangeDays,
}: AnalyticsPageProps) {
  const [mode, setMode] = useState<"financial" | "inventory">("financial");

  const salesSeries = analytics?.salesSeries ?? [];
  const productSeries = analytics?.productSeries ?? [];
  const weeklySeries = useMemo(() => groupWeeklySeries(salesSeries), [salesSeries]);
  const revenueMax = Math.max(1, ...weeklySeries.map((entry) => entry.totalSalesCents));
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
  const selectedRange = ANALYTICS_RANGE_OPTIONS.find((option) => option.days === selectedRangeDays) ?? ANALYTICS_RANGE_OPTIONS[1];
  const serviceWindowCount = Math.max(1, Math.round(selectedRangeDays / 7));

  return (
    <div className="min-h-[760px] p-4 md:p-5">
      <div className="mx-auto flex min-h-[760px] max-w-[1600px] flex-col">
        <AdminWorkspaceHeader
          eyebrow="Sales Intelligence"
          title="Analytics"
          description="Review financial performance and product demand in church-friendly service windows. Each preset is measured in weekly services, not arbitrary days."
          activeTab="analytics"
          onSelectTab={(tab) => {
            if (tab === "inventory" && canOpenInventory) onNavigateInventory();
            else if (tab === "transactions") onNavigateTransactions();
          }}
          onClose={onClose}
          actions={
            <div className="grid gap-2">
              <div className="inline-flex overflow-hidden rounded-xl bg-[var(--overlay-soft)]">
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition ${
                    mode === "financial" ? "bg-[#1be4db] text-[#262626]" : "bg-[var(--overlay-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                  onClick={() => setMode("financial")}
                >
                  <DollarSign size={13} />
                  Financial
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition ${
                    mode === "inventory" ? "bg-[#1be4db] text-[#262626]" : "bg-[var(--overlay-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                  onClick={() => setMode("inventory")}
                >
                  <Package size={13} />
                  Demand
                </button>
              </div>
              <div className="inline-flex flex-wrap gap-2">
                {ANALYTICS_RANGE_OPTIONS.map((option) => {
                  const active = option.days === selectedRangeDays;
                  return (
                    <button
                      key={option.days}
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        active
                          ? "border-[#1be4db] bg-[#1be4db]/12 text-[#1be4db]"
                          : "border-[var(--divider)] bg-[var(--overlay-soft)] text-[var(--text-muted)] hover:border-[var(--overlay-hover)] hover:text-[var(--text-primary)]"
                      }`}
                      onClick={() => onSelectRangeDays(option.days)}
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wider">{option.label}</span>
                      <span className="mt-0.5 block text-[10px] font-medium opacity-70">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          }
        />

        {mode === "financial" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="brand-stat">
                <div className="flex items-center gap-1.5 brand-stat-label"><TrendingUp size={11} /> Range Sales</div>
                <div className="brand-stat-value">{formatCurrency(totalSalesOverRange)}</div>
              </div>
              <div className="brand-stat">
                <div className="flex items-center gap-1.5 brand-stat-label"><DollarSign size={11} /> Current Day</div>
                <div className="brand-stat-value">{formatCurrency(summary?.totalSalesCents ?? 0)}</div>
              </div>
              <div className="brand-stat">
                <div className="flex items-center gap-1.5 brand-stat-label"><ShoppingCart size={11} /> Avg Ticket</div>
                <div className="brand-stat-value">{formatCurrency(avgTicket)}</div>
              </div>
              <div className="brand-stat">
                <div className="flex items-center gap-1.5 brand-stat-label"><BarChart3 size={11} /> Orders</div>
                <div className="brand-stat-value">{totalOrdersOverRange}</div>
              </div>
              <div className="brand-stat">
                <div className="flex items-center gap-1.5 brand-stat-label"><Calendar size={11} /> Best Day</div>
                <div className="brand-stat-value text-2xl">{bestDay?.date ?? "N/A"}</div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
              <section className="overflow-hidden rounded-xl bg-[var(--overlay-soft)]">
                <div className="bg-[var(--overlay-soft)] px-5 py-3">
                  <div className="brand-section-title">Revenue Over Time</div>
                  <div className="mt-1 text-[11px] font-medium text-[var(--text-dimmer)]">
                    {selectedRange.label} across {serviceWindowCount} service window{serviceWindowCount === 1 ? "" : "s"}.
                  </div>
                </div>
                <div className="grid gap-2.5 p-5">
                  {weeklySeries.map((entry) => (
                    <div key={entry.key} className="grid grid-cols-[120px_1fr_110px] items-center gap-4">
                      <div className="text-sm font-semibold text-[var(--text-muted)]">{entry.label}</div>
                      <div className="h-3.5 overflow-hidden rounded-full bg-[var(--overlay-soft)]">
                        <div className="h-3.5 rounded-full bg-[#1be4db]" style={{ width: barWidth(entry.totalSalesCents, revenueMax) }} />
                      </div>
                      <div className="text-right font-semibold text-[var(--text-primary)]">{formatCurrency(entry.totalSalesCents)}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4">
                <div className="overflow-hidden rounded-xl bg-[var(--overlay-soft)]">
                  <div className="bg-[var(--overlay-soft)] px-4 py-3">
                    <div className="brand-section-title">Tender Mix</div>
                    <div className="mt-1 text-[11px] font-medium text-[var(--text-dimmer)]">Aggregated over the selected service range.</div>
                  </div>
                  <div className="grid gap-4 p-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5"><Banknote size={13} /> Cash</span>
                        <span>{formatCurrency(summary?.cashSalesCents ?? 0)}</span>
                      </div>
                      <div className="h-3.5 overflow-hidden rounded-full bg-[var(--overlay-soft)]">
                        <div
                          className="h-3.5 rounded-full bg-[#1be4db]"
                          style={{ width: barWidth(summary?.cashSalesCents ?? 0, Math.max(summary?.totalSalesCents ?? 0, 1)) }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5"><CreditCard size={13} /> Card</span>
                        <span>{formatCurrency(summary?.cardSalesCents ?? 0)}</span>
                      </div>
                      <div className="h-3.5 overflow-hidden rounded-full bg-[var(--overlay-soft)]">
                        <div
                          className="h-3.5 rounded-full bg-emerald-500"
                          style={{ width: barWidth(summary?.cardSalesCents ?? 0, Math.max(summary?.totalSalesCents ?? 0, 1)) }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl bg-[var(--overlay-soft)]">
                  <div className="bg-[var(--overlay-soft)] px-4 py-3">
                    <div className="brand-section-title">Category Performance</div>
                    <div className="mt-1 text-[11px] font-medium text-[var(--text-dimmer)]">Totals for the selected range.</div>
                  </div>
                  <div className="grid gap-2.5 p-4">
                    {(summary?.salesByCategory ?? []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">{item.name}</span>
                        <span className="font-bold text-[var(--text-primary)]">{formatCurrency(item.totalCents)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="brand-stat">
                <div className="flex items-center gap-1.5 brand-stat-label"><Package size={11} /> Units Sold</div>
                <div className="brand-stat-value">{productSeries.reduce((sum, item) => sum + item.totalQuantity, 0)}</div>
              </div>
              <div className="brand-stat">
                <div className="flex items-center gap-1.5 brand-stat-label"><TrendingUp size={11} /> Top Mover</div>
                <div className="brand-stat-value text-2xl">{productSeries[0]?.productName ?? "None"}</div>
              </div>
              <div className="brand-stat">
                <div className="flex items-center gap-1.5 brand-stat-label"><ArrowDownRight size={11} /> Slowest</div>
                <div className="brand-stat-value text-2xl">{slowMovers[0]?.productName ?? "None"}</div>
              </div>
              <div className="brand-stat">
                <div className="flex items-center gap-1.5 brand-stat-label"><Calendar size={11} /> Range</div>
                <div className="brand-stat-value text-2xl">
                  {selectedRange.label}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="overflow-hidden rounded-xl bg-[var(--overlay-soft)]">
                <div className="bg-[var(--overlay-soft)] px-5 py-3">
                  <div className="brand-section-title">Top Movers</div>
                  <div className="mt-1 text-[11px] font-medium text-[var(--text-dimmer)]">
                    Ranked over {serviceWindowCount} service window{serviceWindowCount === 1 ? "" : "s"}.
                  </div>
                </div>
                <div className="grid gap-3 p-5">
                  {productSeries.slice(0, 8).map((entry) => (
                    <div key={entry.productId} className="grid grid-cols-[minmax(0,1fr)_90px] items-center gap-4">
                      <div>
                        <div className="font-semibold text-[var(--text-muted)]">{entry.productName}</div>
                        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-[var(--overlay-soft)]">
                          <div className="h-3 rounded-full bg-[#1be4db]" style={{ width: barWidth(entry.totalQuantity, quantityMax) }} />
                        </div>
                      </div>
                      <div className="text-right font-bold text-[var(--text-primary)]">{entry.totalQuantity}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4">
                <div className="overflow-hidden rounded-xl bg-[var(--overlay-soft)]">
                  <div className="bg-[var(--overlay-soft)] px-4 py-3">
                    <div className="brand-section-title">Slow Movers</div>
                    <div className="mt-1 text-[11px] font-medium text-[var(--text-dimmer)]">Items with the lowest volume in the selected range.</div>
                  </div>
                  <div className="grid gap-2.5 p-4">
                    {slowMovers.map((entry) => (
                      <div key={entry.productId} className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">{entry.productName}</span>
                        <span className="font-bold text-[var(--text-primary)]">{entry.totalQuantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl bg-[var(--overlay-soft)]">
                  <div className="bg-[var(--overlay-soft)] px-4 py-3">
                    <div className="brand-section-title">Size & Flavor Signals</div>
                    <div className="mt-1 text-[11px] font-medium text-[var(--text-dimmer)]">What people chose inside the selected service window.</div>
                  </div>
                  <div className="grid gap-2.5 p-4">
                    {(summary?.sizeBreakdown ?? []).slice(0, 4).map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">Size: {item.name}</span>
                        <span className="font-bold text-[var(--text-primary)]">{item.quantity}</span>
                      </div>
                    ))}
                    {(summary?.flavorBreakdown ?? []).slice(0, 4).map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">Flavor: {item.name}</span>
                        <span className="font-bold text-[var(--text-primary)]">{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
