import { calculateLinePrice, formatCurrency, type BootstrapResponse } from "@rhc-pos/shared";

import type { DrinkLineDraft } from "../types/ui";

interface DrinkBuilderOverlayProps {
  bootstrap: BootstrapResponse;
  draftLine: DrinkLineDraft;
  onClose: () => void;
  onSelectSize: (sizeOptionId: string | null) => void;
  onToggleFlavor: (modifierId: string) => void;
  onConfirm: () => void;
}

export function DrinkBuilderOverlay({
  bootstrap,
  draftLine,
  onClose,
  onSelectSize,
  onToggleFlavor,
  onConfirm,
}: DrinkBuilderOverlayProps) {
  const product = bootstrap.products.find((entry) => entry.id === draftLine.productId);
  if (!product) {
    return null;
  }

  const allowedSizes = bootstrap.sizes.filter(
    (size) => size.enabled && product.sizeOptionIds.includes(size.id),
  );
  const allowedFlavors = bootstrap.modifiers.filter(
    (modifier) => modifier.enabled && product.modifierIds.includes(modifier.id),
  );

  const selectedSize =
    allowedSizes.find((size) => size.id === (draftLine.sizeOptionId ?? product.defaultSizeOptionId ?? null)) ?? null;
  const selectedFlavors = allowedFlavors.filter((modifier) => draftLine.modifierIds.includes(modifier.id));
  const sizeAdjustment =
    product.sizeOptionPrices.find((entry) => entry.sizeOptionId === selectedSize?.id)?.priceDeltaCents ??
    selectedSize?.priceDeltaCents ??
    0;
  const flavorAdjustment = selectedFlavors.reduce((sum, modifier) => sum + modifier.priceCents, 0);
  const previewPrice = calculateLinePrice({
    basePriceCents: product.priceCents,
    sizeAdjustmentCents: sizeAdjustment,
    flavorAdjustmentCents: flavorAdjustment,
    discountCents: product.discountCents,
  });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#263362]/45 p-6 backdrop-blur-sm">
      <div className="touch-card w-full max-w-4xl p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="brand-kicker">Build drink</div>
            <div className="mt-2 font-display text-4xl font-extrabold text-[#263362]">{product.name}</div>
            <div className="mt-2 text-base text-[#263362]/70">
              Select one size and any flavors or syrup combinations. The selections stay on one line item.
            </div>
          </div>
          <div className="brand-section px-4 py-3 text-right">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#263362]/55">Preview</div>
            <div className="text-3xl font-extrabold text-[#263362]">{formatCurrency(previewPrice)}</div>
          </div>
        </div>

        {allowedSizes.length > 0 ? (
          <div className="mb-6">
            <div className="brand-section-title">Size</div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {allowedSizes.map((size) => {
                const active = (draftLine.sizeOptionId ?? product.defaultSizeOptionId ?? null) === size.id;
                const priceDelta =
                  product.sizeOptionPrices.find((entry) => entry.sizeOptionId === size.id)?.priceDeltaCents ??
                  size.priceDeltaCents;
                return (
                  <button
                    key={size.id}
                    type="button"
                    className={`touch-button ${active ? "bg-[#263362] text-white" : "bg-white text-[#263362]"}`}
                    onClick={() => onSelectSize(size.id)}
                  >
                    <span className="block font-display text-2xl font-extrabold">{size.name}</span>
                    <span className="block text-sm opacity-80">
                      {priceDelta === 0 ? "No price change" : `${priceDelta > 0 ? "+" : ""}${formatCurrency(priceDelta)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div>
          <div className="brand-section-title">Flavors / Syrups</div>
          <div className="mt-3 max-h-[320px] overflow-auto pr-1">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {allowedFlavors.map((modifier) => {
                const active = draftLine.modifierIds.includes(modifier.id);
                return (
                  <button
                    key={modifier.id}
                    type="button"
                    className={`touch-button min-h-[92px] ${active ? "bg-[#5190E6] text-white" : "bg-white text-[#263362]"}`}
                    onClick={() => onToggleFlavor(modifier.id)}
                  >
                    <span className="block text-xl font-extrabold">{modifier.name}</span>
                    <span className="mt-2 block text-sm opacity-80">
                      {modifier.discountFlavor
                        ? `${formatCurrency(modifier.priceCents)} discount`
                        : modifier.priceCents === 0
                          ? "No price change"
                          : `${modifier.priceCents > 0 ? "+" : ""}${formatCurrency(modifier.priceCents)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-[#263362]/65">
            {selectedFlavors.length > 0
              ? `Selected: ${selectedFlavors.map((modifier) => modifier.name).join(", ")}`
              : "No flavors selected yet."}
          </div>
          <div className="flex gap-3">
            <button type="button" className="touch-button bg-[#f7fbff] text-[#263362]" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="touch-button bg-[#263362] text-white" onClick={onConfirm}>
              Add Drink
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
