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
  onSelectLine,
  onAdjustLineQuantity,
  onRemoveLine,
  onToggleModifier,
  footer,
}: CartPanelProps) {
  const selectedLine = lines.find((line) => line.id === selectedLineId) ?? null;
  const allowedModifiers = selectedLine
    ? bootstrap.modifiers.filter((modifier) => selectedLine.product.modifierIds.includes(modifier.id))
    : [];

  return (
    <section className="touch-card flex min-h-[560px] flex-col gap-4 p-5">
      <div>
        <h2 className="font-display text-3xl font-extrabold text-[#263362]">Cart</h2>
        <p className="brand-kicker mt-1">Cart stays intact unless payment succeeds.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-auto pr-1">
        {lines.length === 0 ? (
          <div className="brand-section border-dashed p-8 text-center text-[#263362]/60">
            Tap items on the left to build the order.
          </div>
        ) : null}

        {lines.map((line) => (
          <button
            key={line.id}
            type="button"
            className={`w-full border p-4 text-left transition ${
              selectedLineId === line.id ? "brand-rail-active" : "brand-rail"
            }`}
            onClick={() => onSelectLine(line.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-extrabold text-[#263362]">
                  {line.quantity}x {line.product.name}
                </div>
                {line.sizeOption || line.modifiers.length > 0 ? (
                  <div className="mt-1 text-sm text-[#263362]/70">
                    {[
                      line.sizeOption?.name,
                      ...line.modifiers.map((modifier) => modifier.name),
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                ) : null}
              </div>
              <div className="border border-[#d7e2f1] bg-white px-3 py-2 text-xl font-extrabold text-[#263362]">
                {formatCurrency(line.lineTotalCents)}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="touch-button px-4 py-2 text-base"
                onClick={(event) => {
                  event.stopPropagation();
                  onAdjustLineQuantity(line.id, -1);
                }}
              >
                -
              </button>
              <button
                type="button"
                className="touch-button px-4 py-2 text-base"
                onClick={(event) => {
                  event.stopPropagation();
                  onAdjustLineQuantity(line.id, 1);
                }}
              >
                +
              </button>
              <button
                type="button"
                className="touch-button border-[#e6b6ae] bg-[#fdf6f4] px-4 py-2 text-base text-[#ba4a2f]"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveLine(line.id);
                }}
              >
                Remove
              </button>
            </div>
          </button>
        ))}
      </div>

      {selectedLine ? (
        <div className="rounded-[22px] bg-oat p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-bark/60">Modifiers</div>
          <div className="flex flex-wrap gap-2">
            {allowedModifiers.map((modifier) => {
              const active = selectedLine.modifierIds.includes(modifier.id);
              return (
                <button
                  key={modifier.id}
                  type="button"
                  className={`rounded-full px-4 py-3 text-base font-semibold ${
                    active ? "bg-roast text-white" : "bg-white text-bark"
                  }`}
                  onClick={() => onToggleModifier(selectedLine.id, modifier.id)}
                >
                  {modifier.name} ({formatCurrency(modifier.priceCents)})
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="brand-section space-y-3 p-5 text-[#263362]">
        <div className="flex justify-between text-lg">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-lg">
          <span>Tax</span>
          <span>{formatCurrency(taxCents)}</span>
        </div>
        <div className="brand-divider" />
        <div className="flex justify-between text-3xl font-extrabold">
          <span>Total</span>
          <span>{formatCurrency(totalCents)}</span>
        </div>
      </div>

      {footer ? <div className="space-y-3">{footer}</div> : null}
    </section>
  );
}
