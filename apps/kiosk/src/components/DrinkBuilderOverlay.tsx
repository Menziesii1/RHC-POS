import { calculateLinePrice, formatCurrency, type BootstrapResponse } from "@rhc-pos/shared";

import type { DrinkLineDraft } from "../types/ui";

interface DrinkBuilderOverlayProps {
  bootstrap: BootstrapResponse;
  draftLine: DrinkLineDraft;
  onClose: () => void;
  onSelectSize: (sizeOptionId: string | null) => void;
  onSetIced: (iced: boolean) => void;
  onToggleFlavor: (modifierId: string) => void;
  onConfirm: () => void;
}

export function DrinkBuilderOverlay({
  bootstrap,
  draftLine,
  onClose,
  onSelectSize,
  onSetIced,
  onToggleFlavor,
  onConfirm,
}: DrinkBuilderOverlayProps) {
  const product = bootstrap.products.find((entry) => entry.id === draftLine.productId);
  if (!product) return null;

  const allowedSizes = bootstrap.sizes.filter((size) => size.enabled && product.sizeOptionIds.includes(size.id));
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
  const selectedTemperatureLabel = draftLine.iced ? "Iced" : "Hot";
  const selectedSizeLabel = selectedSize?.name ?? "Standard";
  const selectedFlavorLabel =
    selectedFlavors.length > 0 ? selectedFlavors.map((modifier) => modifier.name).join(", ") : "No flavor add-ons";

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#18244b]/78 p-4 md:p-6 backdrop-blur-sm">
      <div
        className="flex w-full flex-col overflow-hidden border border-[#c9d6e6] bg-white shadow-[0_24px_60px_rgba(24,36,75,0.24)] md:grid md:grid-cols-[0.9fr_1.3fr]"
        style={{
          borderRadius: 4,
          width: "min(94vw, 1200px)",
          height: "min(78vh, calc(min(94vw, 1200px) / 1.45))",
        }}
      >
        <div className="border-b border-[#d9e2ee] bg-[#f3f7fc] p-5 md:border-b-0 md:border-r md:p-8">
          <div className="text-sm font-bold uppercase tracking-[0.24em] text-[#1d4f91]">Add item to cart</div>
          <div className="mt-3 font-display text-3xl font-extrabold leading-tight text-[#16213f]">{product.name}</div>
          <div className="mt-2 text-lg font-semibold text-[#324261]">Review the selections, then confirm the item.</div>

          <div className="mt-8 grid gap-3">
            <div className="brand-stat">
              <div className="brand-stat-label">Current price</div>
              <div className="brand-stat-value">{formatCurrency(previewPrice)}</div>
            </div>

            <div className="brand-stat">
              <div className="brand-stat-label">Temperature</div>
              <div className="mt-2 text-2xl font-extrabold text-[#16213f]">{selectedTemperatureLabel}</div>
            </div>

            <div className="brand-stat">
              <div className="brand-stat-label">Size</div>
              <div className="mt-2 text-2xl font-extrabold text-[#16213f]">{selectedSizeLabel}</div>
            </div>

            <div className="brand-stat">
              <div className="brand-stat-label">Flavor add-ons</div>
              <div className="mt-2 text-lg font-bold leading-snug text-[#16213f]">{selectedFlavorLabel}</div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="border-b border-[#d9e2ee] bg-white px-5 py-4 md:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-sm font-bold uppercase tracking-[0.24em] text-[#1d4f91]">Customize item</div>
                <div className="mt-2 text-2xl font-extrabold text-[#16213f]">Choose the options below</div>
              </div>
              <div className="rounded-[4px] bg-[#16213f] px-4 py-3 text-right text-white">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Price shown</div>
                <div className="mt-1 text-2xl font-extrabold">{formatCurrency(previewPrice)}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            <div className="space-y-6">
              <div>
                <div className="brand-section-title mb-2 text-[#1d4f91]">Temperature</div>
                <div className="mb-3 text-base font-semibold text-[#324261]">Choose how this drink should be served.</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`border px-4 py-4 text-left transition ${
                      !draftLine.iced
                        ? "border-[#16213f] bg-[#16213f] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "border-[#b9c9dd] bg-white text-[#16213f] hover:border-[#1d4f91] hover:bg-[#f5f9ff]"
                    }`}
                    style={{ borderRadius: 4 }}
                    onClick={() => onSetIced(false)}
                  >
                    <span className="block text-lg font-extrabold">Serve hot</span>
                    <span className={`mt-1 block text-sm ${!draftLine.iced ? "text-white/80" : "text-[#4c5f84]"}`}>
                      Standard hot preparation
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`border px-4 py-4 text-left transition ${
                      draftLine.iced
                        ? "border-[#1d4f91] bg-[#1d4f91] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "border-[#b9c9dd] bg-white text-[#16213f] hover:border-[#1d4f91] hover:bg-[#f5f9ff]"
                    }`}
                    style={{ borderRadius: 4 }}
                    onClick={() => onSetIced(true)}
                  >
                    <span className="block text-lg font-extrabold">Serve iced</span>
                    <span className={`mt-1 block text-sm ${draftLine.iced ? "text-white/80" : "text-[#4c5f84]"}`}>
                      Chilled over ice
                    </span>
                  </button>
                </div>
              </div>

              {allowedSizes.length > 0 ? (
                <div>
                  <div className="brand-section-title mb-2 text-[#1d4f91]">Size</div>
                  <div className="mb-3 text-base font-semibold text-[#324261]">Choose the cup size for this item.</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {allowedSizes.map((size) => {
                      const active = (draftLine.sizeOptionId ?? product.defaultSizeOptionId ?? null) === size.id;
                      const priceDelta =
                        product.sizeOptionPrices.find((entry) => entry.sizeOptionId === size.id)?.priceDeltaCents ??
                        size.priceDeltaCents;

                      return (
                        <button
                          key={size.id}
                          type="button"
                          className={`border px-4 py-4 text-left transition ${
                            active
                              ? "border-[#16213f] bg-[#16213f] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                              : "border-[#b9c9dd] bg-white text-[#16213f] hover:border-[#1d4f91] hover:bg-[#f5f9ff]"
                          }`}
                          style={{ borderRadius: 4 }}
                          onClick={() => onSelectSize(size.id)}
                        >
                          <span className="block text-lg font-extrabold">{size.name}</span>
                          <span className={`mt-1 block text-sm ${active ? "text-white/80" : "text-[#4c5f84]"}`}>
                            {priceDelta === 0
                              ? "Included in base price"
                              : `${priceDelta > 0 ? "+" : ""}${formatCurrency(priceDelta)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {allowedFlavors.length > 0 ? (
                <div>
                  <div className="brand-section-title mb-2 text-[#1d4f91]">Flavors and syrups</div>
                  <div className="mb-3 text-base font-semibold text-[#324261]">
                    Tap any add-ons you want to include.
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {allowedFlavors.map((modifier) => {
                      const active = draftLine.modifierIds.includes(modifier.id);

                      return (
                        <button
                          key={modifier.id}
                          type="button"
                          className={`border px-4 py-4 text-left transition ${
                            active
                              ? "border-[#1d4f91] bg-[#1d4f91] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                              : "border-[#b9c9dd] bg-white text-[#16213f] hover:border-[#1d4f91] hover:bg-[#f5f9ff]"
                          }`}
                          style={{ borderRadius: 4 }}
                          onClick={() => onToggleFlavor(modifier.id)}
                        >
                          <span className="block text-base font-extrabold leading-snug">{modifier.name}</span>
                          <span className={`mt-1 block text-sm ${active ? "text-white/80" : "text-[#4c5f84]"}`}>
                            {modifier.discountFlavor
                              ? `${formatCurrency(modifier.priceCents)} off`
                              : modifier.priceCents === 0
                                ? "Included in base price"
                                : `+${formatCurrency(modifier.priceCents)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-[#d9e2ee] bg-white px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="text-base font-semibold text-[#324261]">
              {selectedFlavorLabel} | {selectedTemperatureLabel} | {selectedSizeLabel}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="border border-[#b9c9dd] px-6 py-3 text-base font-bold text-[#16213f] hover:border-[#1d4f91] hover:bg-[#f5f9ff]"
                style={{ borderRadius: 4 }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-[#16213f] px-6 py-3 text-base font-bold text-white hover:bg-[#0f1730]"
                style={{ borderRadius: 4 }}
                onClick={onConfirm}
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
