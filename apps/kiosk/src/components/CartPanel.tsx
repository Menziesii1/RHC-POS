import { formatCurrency, type BootstrapResponse } from "@rhc-pos/shared";
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
  subtotalCents: number;
  taxCents: number;
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
  subtotalCents,
  taxCents,
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
    <section className="flex w-[360px] shrink-0 flex-col overflow-hidden border-l border-[#dde2ea] bg-white">
      {/* ── Header ── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#dde2ea] px-5">
        <h2 className="font-display text-lg font-extrabold text-[#263362]">Current Sale</h2>
        <span className="text-xs font-bold uppercase tracking-widest text-[#263362]/30">
          {lines.length === 0 ? "Empty" : `${lines.length} line${lines.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Line items ── */}
      <div className="flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#263362]/30">
            Tap items on the left to start a sale.
          </div>
        ) : null}

        {lines.map((line) => {
          const isSelected = selectedLineId === line.id;
          return (
            <div key={line.id}>
              <button
                type="button"
                className={`w-full border-b border-[#edf0f4] px-5 py-3 text-left transition duration-100 ${
                  isSelected ? "bg-[#f0f6ff]" : "hover:bg-[#f9fafb]"
                }`}
                onClick={() => onSelectLine(line.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[#263362]">
                      {line.quantity > 1 && (
                        <span className="mr-1 font-extrabold text-[#5190E6]">{line.quantity}×</span>
                      )}
                      {line.product.name}
                    </div>
                    {(line.sizeOption || line.modifiers.length > 0 || line.iced !== undefined) && (
                      <div className="mt-0.5 truncate text-xs text-[#263362]/50">
                        {[
                          line.iced ? "Iced" : "Hot",
                          line.sizeOption?.name,
                          ...line.modifiers.map((m) => m.name),
                        ].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-sm font-bold text-[#263362]">
                    {formatCurrency(line.lineTotalCents)}
                  </div>
                </div>
              </button>

              {/* Inline controls when selected */}
              {isSelected && (
                <div className="border-b border-[#dde2ea] bg-[#f0f6ff] px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center border border-[#dde2ea] bg-white text-base font-bold text-[#263362] hover:border-[#5190E6] hover:text-[#5190E6]"
                      style={{ borderRadius: 3 }}
                      onClick={() => onAdjustLineQuantity(line.id, -1)}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-[#263362]">{line.quantity}</span>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center border border-[#dde2ea] bg-white text-base font-bold text-[#263362] hover:border-[#5190E6] hover:text-[#5190E6]"
                      style={{ borderRadius: 3 }}
                      onClick={() => onAdjustLineQuantity(line.id, 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ml-auto text-xs font-semibold text-ember hover:underline"
                      onClick={() => onRemoveLine(line.id)}
                    >
                      Remove
                    </button>
                  </div>

                  {allowedModifiers.length > 0 && (
                    <div className="mt-3">
                      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#263362]/40">
                        Flavors
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {allowedModifiers.map((modifier) => {
                          const active = line.modifierIds.includes(modifier.id);
                          return (
                            <button
                              key={modifier.id}
                              type="button"
                              className={`border px-3 py-1.5 text-xs font-semibold transition ${
                                active
                                  ? "border-[#5190E6] bg-[#5190E6] text-white"
                                  : "border-[#dde2ea] bg-white text-[#263362] hover:border-[#5190E6]"
                              }`}
                              style={{ borderRadius: 3 }}
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

      {/* ── Payment error banner ── */}
      {paymentError && (
        <div className="border-t border-ember/20 bg-ember/8 px-5 py-3 text-sm font-semibold text-ember">
          {paymentError}
        </div>
      )}

      {/* ── Totals ── */}
      <div className="shrink-0 border-t border-[#dde2ea] px-5 py-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-[#263362]/60">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#263362]/60">
            <span>Tax</span>
            <span>{formatCurrency(taxCents)}</span>
          </div>
        </div>
        <div className="brand-divider my-3" />
        <div className="flex justify-between text-xl font-extrabold text-[#263362]">
          <span>Total</span>
          <span>{formatCurrency(totalCents)}</span>
        </div>
      </div>

      {/* ── Footer (ActionBar) ── */}
      {footer}
    </section>
  );
}
