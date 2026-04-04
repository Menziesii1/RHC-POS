import { formatCurrency, type BootstrapResponse } from "@rhc-pos/shared";

import type { CartLineState } from "../types/ui";

interface EnrichedLine extends CartLineState {
  product: BootstrapResponse["products"][number];
  modifiers: BootstrapResponse["modifiers"];
  unitPriceCents: number;
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
}: CartPanelProps) {
  const selectedLine = lines.find((line) => line.id === selectedLineId) ?? null;
  const allowedModifiers = selectedLine
    ? bootstrap.modifiers.filter((modifier) => selectedLine.product.modifierIds.includes(modifier.id))
    : [];

  return (
    <section className="touch-card flex min-h-[560px] flex-col gap-4 p-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-bark">Cart</h2>
        <p className="text-sm text-bark/70">Cart stays intact unless payment succeeds.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {lines.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-bark/20 bg-oat/80 p-8 text-center text-bark/60">
            Tap items on the left to build the order.
          </div>
        ) : null}

        {lines.map((line) => (
          <button
            key={line.id}
            type="button"
            className={`w-full rounded-[22px] border p-4 text-left ${
              selectedLineId === line.id ? "border-bark bg-oat" : "border-transparent bg-cream"
            }`}
            onClick={() => onSelectLine(line.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-bold text-bark">
                  {line.quantity}x {line.product.name}
                </div>
                {line.modifiers.length > 0 ? (
                  <div className="text-sm text-bark/70">
                    {line.modifiers.map((modifier) => modifier.name).join(", ")}
                  </div>
                ) : null}
              </div>
              <div className="text-xl font-bold text-bark">{formatCurrency(line.lineTotalCents)}</div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-full bg-white px-4 py-2 font-bold text-bark"
                onClick={(event) => {
                  event.stopPropagation();
                  onAdjustLineQuantity(line.id, -1);
                }}
              >
                -
              </button>
              <button
                type="button"
                className="rounded-full bg-white px-4 py-2 font-bold text-bark"
                onClick={(event) => {
                  event.stopPropagation();
                  onAdjustLineQuantity(line.id, 1);
                }}
              >
                +
              </button>
              <button
                type="button"
                className="rounded-full bg-ember px-4 py-2 font-bold text-white"
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

      <div className="space-y-2 rounded-[22px] bg-bark p-5 text-cream">
        <div className="flex justify-between text-lg">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-lg">
          <span>Tax</span>
          <span>{formatCurrency(taxCents)}</span>
        </div>
        <div className="flex justify-between text-3xl font-bold">
          <span>Total</span>
          <span>{formatCurrency(totalCents)}</span>
        </div>
      </div>
    </section>
  );
}
