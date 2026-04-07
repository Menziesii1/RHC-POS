import { formatCurrency, type BootstrapResponse } from "@rhc-pos/shared";
import { Minus, Plus, ShoppingBag, Trash2, Droplets } from "lucide-react";
import type { ReactNode } from "react";

import type { CartLineState } from "../types/ui";

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
  onSelectLine: (lineId: string) => void;
  onAdjustLineQuantity: (lineId: string, delta: number) => void;
  onRemoveLine: (lineId: string) => void;
  onToggleModifier: (lineId: string, modifierId: string) => void;
  footer?: ReactNode;
}

export function CartPanel({
  bootstrap,
  lines,
  selectedLineId,
  totalCents,
  paymentError,
  onSelectLine,
  onAdjustLineQuantity,
  onRemoveLine,
  onToggleModifier,
  footer,
}: CartPanelProps) {
  const selectedLine = lines.find((line) => line.id === selectedLineId) ?? null;
  const allowedModifiers = selectedLine ? bootstrap.modifiers.filter((m) => m.enabled) : [];

  return (
    <section className="flex w-[340px] shrink-0 flex-col overflow-hidden bg-[#0c1520]">
      {/* Header */}
      <div className="shrink-0 px-4 pb-2 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-[#1be4db]" />
            <h2 className="font-display text-base font-bold text-white">Order</h2>
          </div>
          {lines.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1be4db] text-[10px] font-bold text-[#0f1923]">
              {lines.length}
            </span>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-white/20">
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
                    isSelected ? "bg-[#162231]" : "hover:bg-[#162231]/50"
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
                        <span className="truncate text-sm font-medium text-white">
                          {line.product.name}
                        </span>
                      </div>
                      {(line.sizeOption || line.modifiers.length > 0 || line.iced !== undefined) && (
                        <div className="mt-0.5 truncate text-[11px] text-white/35">
                          {[
                            line.iced ? "Iced" : "Hot",
                            line.sizeOption?.name,
                            ...line.modifiers.map((m) => m.name),
                          ].filter(Boolean).join(" \u00b7 ")}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-white">
                      {formatCurrency(line.lineTotalCents)}
                    </span>
                  </div>
                </button>

                {isSelected && (
                  <div className="mx-3 mb-1 mt-1 rounded-xl bg-[#162231] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10"
                        onClick={() => onAdjustLineQuantity(line.id, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-white/60">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10"
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
                      <div className="mt-2.5">
                        <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                          <Droplets size={10} />
                          Flavors
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {allowedModifiers.map((modifier) => {
                            const active = line.modifierIds.includes(modifier.id);
                            return (
                              <button
                                key={modifier.id}
                                type="button"
                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                                  active
                                    ? "bg-[#1be4db] text-[#0f1923]"
                                    : "bg-white/5 text-white/50 hover:text-white/70"
                                }`}
                                onClick={() => onToggleModifier(line.id, modifier.id)}
                              >
                                {modifier.name}
                                {modifier.priceCents !== 0 && (
                                  <span className="ml-1 opacity-70">
                                    {modifier.priceCents > 0 ? "+" : ""}
                                    {formatCurrency(modifier.priceCents)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
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
          <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">
            {paymentError}
          </div>
        </div>
      )}

      {/* Total */}
      <div className="shrink-0 px-4 py-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Total</div>
            <div className="font-display text-2xl font-bold text-white">
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
  );
}
