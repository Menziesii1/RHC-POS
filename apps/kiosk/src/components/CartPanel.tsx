import { formatCurrency, type BootstrapResponse } from "@rhc-pos/shared";
import { ChevronRight, Minus, Plus, ShoppingBag, Trash2, Pencil } from "lucide-react";
import type { ReactNode } from "react";

import coloredLogoUrl from "../../assets/River Hills Logo without text Colored.svg?url";
import blackLogoUrl from "../../assets/River Hills Logo without text Black.svg?url";

import type { CartLineState } from "../types/ui";
import { useAppStore } from "../store/app-store";

interface EnrichedLine extends CartLineState {
  product: BootstrapResponse["products"][number];
  sizeOption?: BootstrapResponse["sizes"][number] | null;
  modifiers: BootstrapResponse["modifiers"];
  unitPriceCents: number;
  sizeAdjustmentCents?: number;
  flavorAdjustmentCents?: number;
  discountCents?: number;
  lineTotalCents: number;
}

interface CartPanelProps {
  bootstrap: BootstrapResponse;
  lines: EnrichedLine[];
  selectedLineId: string | null;
  totalCents: number;
  paymentError?: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectLine: (lineId: string) => void;
  onAdjustLineQuantity: (lineId: string, delta: number) => void;
  onRemoveLine: (lineId: string) => void;
  onEditLine: (lineId: string) => void;
  footer?: ReactNode;
}

export function CartPanel({
  bootstrap,
  lines,
  selectedLineId,
  totalCents,
  paymentError,
  mobileOpen,
  onCloseMobile,
  onSelectLine,
  onAdjustLineQuantity,
  onRemoveLine,
  onEditLine,
  footer,
}: CartPanelProps) {
  const { theme } = useAppStore();
  const selectedLine = lines.find((line) => line.id === selectedLineId) ?? null;
  const allowedModifiers = selectedLine ? bootstrap.modifiers.filter((m) => m.enabled) : [];
  const logoUrl = theme === "light" ? blackLogoUrl : coloredLogoUrl;

  return (
    <div className={`fixed right-0 top-14 z-40 h-[calc(100dvh-3.5rem)] w-[min(88vw,360px)] lg:static lg:h-full lg:w-[340px] lg:shrink-0 ${mobileOpen ? "" : "pointer-events-none"}`}>

      {/* Left-side collapse tab — fades in after drawer slide completes */}
      <button
        type="button"
        aria-label="Collapse order panel"
        onClick={onCloseMobile}
        className={`pointer-events-auto absolute left-0 top-1/2 z-50 -translate-x-full -translate-y-1/2 flex items-center justify-center rounded-l-xl border border-white/10 border-r-0 bg-[var(--bg-elevated)] px-2 py-5 shadow-lg transition-opacity duration-[25ms] active:scale-[0.97] lg:hidden ${
          mobileOpen ? "delay-300 opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight size={18} className="text-[#1be4db]" />
      </button>

      <section
        className={`pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-[var(--bg-surface)] shadow-[0_24px_64px_rgba(0,0,0,0.42)] transition-transform duration-300 ease-out lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="shrink-0 px-4 pb-2 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#1be4db]" />
              <h2 className="font-display text-base font-bold text-[var(--text-primary)]">Order</h2>
            </div>
            {lines.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1be4db] text-[10px] font-bold text-[#262626]">
                {lines.length}
              </span>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="relative flex-1 overflow-y-auto px-3 py-2">
          <img
            src={logoUrl}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 m-auto h-[80%] w-[80%] object-contain opacity-[0.09]"
            draggable={false}
          />
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--text-dimmest)]">
              <ShoppingBag size={32} strokeWidth={1.5} />
              <span className="text-sm">Tap items to start</span>
            </div>
          ) : null}

          <div className="space-y-1">
            {lines.map((line) => {
              const isSelected = selectedLineId === line.id;
              return (
                <div key={line.id}>
                  <button
                    type="button"
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                      isSelected ? "bg-[var(--bg-elevated)]" : "hover:bg-[var(--overlay-soft)]"
                    }`}
                    onClick={() => onSelectLine(line.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {line.quantity > 1 && (
                            <span className="shrink-0 text-xs font-bold text-[#1be4db]">
                              {line.quantity}x
                            </span>
                          )}
                          <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {line.product.name}
                          </span>
                        </div>
                        {(line.sizeOption || line.modifiers.length > 0 || line.iced !== undefined) && (
                          <div className="mt-0.5 truncate text-[11px] text-[var(--text-dimmer)]">
                            {[
                              line.iced ? "Iced" : "Hot",
                              line.sizeOption?.name,
                              ...line.modifiers.map((m) => m.name),
                            ]
                              .filter(Boolean)
                              .join(" \u00b7 ")}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                        {formatCurrency(line.lineTotalCents)}
                      </span>
                    </div>
                  </button>

                  {isSelected && (
                    <div className="mx-3 mb-1 mt-1 rounded-xl bg-[var(--bg-elevated)] px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--overlay-soft)] text-[var(--text-muted)] hover:bg-[var(--overlay-hover)]"
                          onClick={() => onAdjustLineQuantity(line.id, -1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[var(--text-muted)]">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--overlay-soft)] text-[var(--text-muted)] hover:bg-[var(--overlay-hover)]"
                          onClick={() => onAdjustLineQuantity(line.id, 1)}
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          className="ml-auto flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/15"
                          onClick={() => onRemoveLine(line.id)}
                        >
                          <Trash2 size={11} />
                          Remove
                        </button>
                      </div>

                      {allowedModifiers.length > 0 && (
                        <button
                          type="button"
                          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--overlay-soft)] py-2 text-[11px] font-semibold text-[var(--text-muted)] transition hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)]"
                          onClick={() => onEditLine(line.id)}
                        >
                          <Pencil size={11} />
                          Edit Drink
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {paymentError && (
          <div className="px-4 py-2">
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
              {paymentError}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="shrink-0 px-4 py-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-dimmer)]">Total</div>
              <div className="font-display text-2xl font-bold text-[var(--text-primary)]">
                {formatCurrency(totalCents)}
              </div>
            </div>
            {lines.length > 0 && (
              <div className="text-xs text-[#1be4db]">
                {lines.reduce((sum, l) => sum + l.quantity, 0)} items
              </div>
            )}
          </div>
        </div>

        {footer}
      </section>
    </div>
  );
}
