import { calculateFlavorAdjustment, calculateLinePrice, formatCurrency, type BootstrapResponse } from "@rhc-pos/shared";
import { Flame, Snowflake, Ruler, Droplets, Plus, X } from "lucide-react";

import { getSizeAdjustmentCents } from "../lib/cart";
import { getProductImage } from "../lib/product-images";
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

  const productPhoto = getProductImage(product.name);

  const allowedSizes = bootstrap.sizes.filter((size) => size.enabled);
  const allowedFlavors = bootstrap.modifiers.filter((modifier) => modifier.enabled);

  const selectedSize = allowedSizes.find((size) => size.id === (draftLine.sizeOptionId ?? null)) ?? null;
  const selectedFlavors = allowedFlavors.filter((modifier) => draftLine.modifierIds.includes(modifier.id));
  const sizeAdjustment = getSizeAdjustmentCents(bootstrap, product.id, draftLine.sizeOptionId);
  const flavorAdjustment = calculateFlavorAdjustment(selectedFlavors);
  const previewPrice = calculateLinePrice({
    basePriceCents: product.priceCents,
    sizeAdjustmentCents: sizeAdjustment,
    flavorAdjustmentCents: flavorAdjustment,
    discountCents: product.discountCents,
  });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm md:p-6">
      <div
        className="flex w-full flex-col overflow-hidden rounded-2xl bg-[#2a2a2a] md:grid md:grid-cols-[0.75fr_1.25fr]"
        style={{ width: "min(92vw, 1080px)", height: "calc(100dvh - 2.5rem)", maxHeight: "760px" }}
      >
        {/* Left — dark panel with photo */}
        <div className="hidden overflow-y-auto bg-[#222222] p-6 md:block">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#1be4db]">Customize</div>
          <div className="mt-3 font-display text-2xl font-extrabold text-white">{product.name}</div>

          {/* Price card — light */}
          <div className="mt-5 rounded-xl bg-[#f0f0f0] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">Price</div>
            <div className="mt-1 font-display text-4xl font-extrabold text-[#0a8f89]">{formatCurrency(previewPrice)}</div>
          </div>

          {productPhoto ? (
            <div className="mt-3 flex items-center justify-center">
              <img
                src={productPhoto.src}
                alt={product.name}
                className="h-60 w-60 object-contain drop-shadow-2xl"
                style={productPhoto.scale !== 1 ? { transform: `scale(${productPhoto.scale})` } : undefined}
                draggable={false}
              />
            </div>
          ) : null}

          {/* Selection summary — light chips */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-[#f0f0f0] px-3 py-2.5">
              {draftLine.iced ? <Snowflake size={14} className="text-sky-500" /> : <Flame size={14} className="text-orange-500" />}
              <span className="text-sm font-semibold text-[#1a1a1a]">{draftLine.iced ? "Iced" : "Hot"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[#f0f0f0] px-3 py-2.5">
              <Ruler size={14} className="text-[#888]" />
              <span className="text-sm font-semibold text-[#1a1a1a]">{selectedSize?.name ?? "Standard"}</span>
            </div>
            {selectedFlavors.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-[#f0f0f0] px-3 py-2.5">
                <Droplets size={14} className="text-[#0a8f89]" />
                <span className="truncate text-sm font-semibold text-[#1a1a1a]">{selectedFlavors.map((m) => m.name).join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right — controls */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Header — light */}
          <div className="shrink-0 bg-[#f0f0f0] px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#888]">Build order</div>
                <div className="mt-1 font-display text-xl font-bold text-[#1a1a1a]">{product.name}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">Total</div>
                <div className="mt-0.5 font-display text-2xl font-extrabold text-[#0a8f89]">{formatCurrency(previewPrice)}</div>
              </div>
            </div>
          </div>

          {/* Scrollable options */}
          <div className="flex-1 overflow-y-auto bg-[#2a2a2a] p-4 md:p-5">
            <div className="space-y-5">
              <div>
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">
                  <Flame size={13} /> Temperature
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left transition ${
                      !draftLine.iced ? "bg-[#f0f0f0] text-[#1a1a1a]" : "bg-white/[0.06] text-white/80 hover:bg-white/[0.09]"
                    }`}
                    onClick={() => onSetIced(false)}
                  >
                    <Flame size={16} className={!draftLine.iced ? "text-orange-500" : "text-white/60"} />
                    <span className="font-semibold">Hot</span>
                  </button>
                  <button
                    type="button"
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left transition ${
                      draftLine.iced ? "bg-[#f0f0f0] text-[#1a1a1a]" : "bg-white/[0.06] text-white/80 hover:bg-white/[0.09]"
                    }`}
                    onClick={() => onSetIced(true)}
                  >
                    <Snowflake size={16} className={draftLine.iced ? "text-sky-500" : "text-white/60"} />
                    <span className="font-semibold">Iced</span>
                  </button>
                </div>
              </div>

              {allowedSizes.length > 0 && (
                <div>
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">
                    <Ruler size={13} /> Size
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {allowedSizes.map((size) => {
                      const active = (draftLine.sizeOptionId ?? null) === size.id;
                      const priceDelta = getSizeAdjustmentCents(bootstrap, product.id, size.id);
                      return (
                        <button
                          key={size.id}
                          type="button"
                          className={`rounded-xl px-4 py-3 text-left transition ${
                            active ? "bg-[#f0f0f0] text-[#1a1a1a]" : "bg-white/[0.06] text-white/80 hover:bg-white/[0.09]"
                          }`}
                          onClick={() => onSelectSize(size.id)}
                        >
                          <span className="block text-sm font-semibold">{size.name}</span>
                          <span className={`mt-0.5 block text-xs ${active ? "text-[#0a8f89]" : "text-white/65"}`}>
                            {priceDelta === 0 ? "Base price" : `${priceDelta > 0 ? "+" : ""}${formatCurrency(priceDelta)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {allowedFlavors.length > 0 && (
                <div>
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">
                    <Droplets size={13} /> Flavors
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {allowedFlavors.map((modifier) => {
                      const active = draftLine.modifierIds.includes(modifier.id);
                      return (
                        <button
                          key={modifier.id}
                          type="button"
                          className={`rounded-xl px-4 py-3 text-left transition ${
                            active ? "bg-[#f0f0f0] text-[#1a1a1a]" : "bg-white/[0.06] text-white/80 hover:bg-white/[0.09]"
                          }`}
                          onClick={() => onToggleFlavor(modifier.id)}
                        >
                          <span className="block text-sm font-semibold leading-snug">{modifier.name}</span>
                          <span className={`mt-0.5 block text-xs ${active ? "text-[#0a8f89]" : "text-white/65"}`}>
                            {modifier.discountFlavor
                              ? `${formatCurrency(modifier.priceCents)} off`
                              : modifier.priceCents === 0 ? "Included" : `+${formatCurrency(modifier.priceCents)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer — light */}
          <div className="shrink-0 bg-[#f0f0f0] px-4 py-3 md:px-5">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-black/[0.07] px-5 py-2.5 text-sm font-medium text-[#444] hover:bg-black/[0.12]"
                onClick={onClose}
              >
                <X size={15} /> Cancel
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-[#1be4db] px-5 py-2.5 text-sm font-bold text-[#1a1a1a]"
                onClick={onConfirm}
              >
                <Plus size={15} /> Add to Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
