import { calculateFlavorAdjustment, calculateLinePrice, formatCurrency, type BootstrapResponse } from "@rhc-pos/shared";
import { Flame, Snowflake, Ruler, Droplets, Plus, X } from "lucide-react";
import { useState } from "react";

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

function FlavorPicker({
  bootstrap,
  selectedIds,
  onToggle,
}: {
  bootstrap: BootstrapResponse;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const flavorCategories = bootstrap.flavorCategories ?? [];
  const allFlavors = bootstrap.modifiers.filter((m) => m.enabled);

  // Build tab list: flavor categories that have at least one enabled modifier, plus uncategorized if any exist
  const tabs: Array<{ id: string; label: string }> = flavorCategories
    .filter((fc) => allFlavors.some((m) => m.flavorCategoryId === fc.id))
    .map((fc) => ({ id: fc.id, label: fc.name }));
  const uncategorized = allFlavors.filter((m) => !m.flavorCategoryId);
  if (uncategorized.length > 0) tabs.push({ id: "__uncategorized__", label: "Other" });

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? "__uncategorized__");

  const visibleFlavors = activeTab === "__uncategorized__"
    ? uncategorized
    : allFlavors.filter((m) => m.flavorCategoryId === activeTab);

  if (tabs.length === 0) {
    // Fallback: no categories at all, show flat grid
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {allFlavors.map((modifier) => {
          const active = selectedIds.includes(modifier.id);
          return (
            <button key={modifier.id} type="button"
              className={`rounded-xl px-4 py-3 text-left transition ${active ? "bg-[var(--selector-active-bg)] text-[var(--selector-active-text)]" : "bg-[var(--selector-inactive-bg)] text-[var(--selector-inactive-text)] hover:bg-[var(--overlay-hover)]"}`}
              onClick={() => onToggle(modifier.id)}
            >
              <span className="block text-sm font-semibold leading-snug">{modifier.name}</span>
              <span className={`mt-0.5 block text-xs ${active ? "text-[var(--selector-active-sub)]" : "text-[var(--selector-inactive-sub)]"}`}>
                {modifier.discountFlavor ? `${formatCurrency(modifier.priceCents)} off` : modifier.priceCents === 0 ? "Included" : `+${formatCurrency(modifier.priceCents)}`}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {/* Tab strip */}
      <div className="mb-3 flex gap-1 overflow-x-auto pb-0.5">
        {tabs.map((tab) => {
          const count = (tab.id === "__uncategorized__" ? uncategorized : allFlavors.filter(m => m.flavorCategoryId === tab.id))
            .filter(m => selectedIds.includes(m.id)).length;
          return (
            <button key={tab.id} type="button"
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${activeTab === tab.id ? "bg-[var(--selector-active-bg)] text-[var(--selector-active-text)]" : "bg-[var(--selector-inactive-bg)] text-[var(--selector-inactive-text)] hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)]"}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {count > 0 && (
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${activeTab === tab.id ? "bg-[#0a8f89] text-white" : "bg-[#1be4db]/20 text-[#1be4db]"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Flavor grid for active tab */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibleFlavors.map((modifier) => {
          const active = selectedIds.includes(modifier.id);
          return (
            <button key={modifier.id} type="button"
              className={`rounded-xl px-4 py-3 text-left transition ${active ? "bg-[var(--selector-active-bg)] text-[var(--selector-active-text)]" : "bg-[var(--selector-inactive-bg)] text-[var(--selector-inactive-text)] hover:bg-[var(--overlay-hover)]"}`}
              onClick={() => onToggle(modifier.id)}
            >
              <span className="block text-sm font-semibold leading-snug">{modifier.name}</span>
              <span className={`mt-0.5 block text-xs ${active ? "text-[var(--selector-active-sub)]" : "text-[var(--selector-inactive-sub)]"}`}>
                {modifier.discountFlavor ? `${formatCurrency(modifier.priceCents)} off` : modifier.priceCents === 0 ? "Included" : `+${formatCurrency(modifier.priceCents)}`}
              </span>
            </button>
          );
        })}
        {visibleFlavors.length === 0 && (
          <div className="col-span-3 py-4 text-center text-sm text-[var(--text-dimmest)]">No flavors in this group.</div>
        )}
      </div>
      {/* Selected summary across all tabs */}
      {selectedIds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {allFlavors.filter(m => selectedIds.includes(m.id)).map((m) => (
            <button key={m.id} type="button"
              className="flex items-center gap-1 rounded-full bg-[#1be4db]/15 px-2.5 py-1 text-[11px] font-semibold text-[#1be4db]"
              onClick={() => onToggle(m.id)}
            >
              {m.name} <X size={10} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
        className="flex w-full flex-col overflow-hidden rounded-2xl bg-[var(--bg-grid)] md:grid md:grid-cols-[0.75fr_1.25fr]"
        style={{ width: "min(92vw, 1080px)", height: "calc(100dvh - 2.5rem)", maxHeight: "760px" }}
      >
        {/* Left — dark panel with photo */}
        <div className="hidden overflow-y-auto bg-[var(--bg-base)] p-6 md:block">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#1be4db]">Customize</div>
          <div className="mt-3 font-display text-2xl font-extrabold text-[var(--text-primary)]">{product.name}</div>

          {/* Price card — inset */}
          <div className="mt-5 rounded-xl bg-[var(--inset-surface)] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--inset-muted)]">Price</div>
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

          {/* Selection summary — inset chips */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--inset-surface)] px-3 py-2.5">
              {draftLine.iced ? <Snowflake size={14} className="text-sky-500" /> : <Flame size={14} className="text-orange-500" />}
              <span className="text-sm font-semibold text-[var(--inset-text)]">{draftLine.iced ? "Iced" : "Hot"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[var(--inset-surface)] px-3 py-2.5">
              <Ruler size={14} className="text-[var(--inset-muted)]" />
              <span className="text-sm font-semibold text-[var(--inset-text)]">{selectedSize?.name ?? "Standard"}</span>
            </div>
            {selectedFlavors.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--inset-surface)] px-3 py-2.5">
                <Droplets size={14} className="text-[#0a8f89]" />
                <span className="truncate text-sm font-semibold text-[var(--inset-text)]">{selectedFlavors.map((m) => m.name).join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right — controls */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Header — inset */}
          <div className="shrink-0 bg-[var(--inset-surface)] px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--inset-muted)]">Build order</div>
                <div className="mt-1 font-display text-xl font-bold text-[var(--inset-text)]">{product.name}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--inset-muted)]">Total</div>
                <div className="mt-0.5 font-display text-2xl font-extrabold text-[#0a8f89]">{formatCurrency(previewPrice)}</div>
              </div>
            </div>
          </div>

          {/* Scrollable options */}
          <div className="flex-1 overflow-y-auto bg-[var(--bg-grid)] p-4 md:p-5">
            <div className="space-y-5">
              <div>
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-dimmer)]">
                  <Flame size={13} /> Temperature
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left transition ${
                      !draftLine.iced ? "bg-[var(--selector-active-bg)] text-[var(--selector-active-text)]" : "bg-[var(--selector-inactive-bg)] text-[var(--selector-inactive-text)] hover:bg-[var(--overlay-hover)]"
                    }`}
                    onClick={() => onSetIced(false)}
                  >
                    <Flame size={16} className={!draftLine.iced ? "text-orange-500" : "text-[var(--text-dimmer)]"} />
                    <span className="font-semibold">Hot</span>
                  </button>
                  <button
                    type="button"
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left transition ${
                      draftLine.iced ? "bg-[var(--selector-active-bg)] text-[var(--selector-active-text)]" : "bg-[var(--selector-inactive-bg)] text-[var(--selector-inactive-text)] hover:bg-[var(--overlay-hover)]"
                    }`}
                    onClick={() => onSetIced(true)}
                  >
                    <Snowflake size={16} className={draftLine.iced ? "text-sky-500" : "text-[var(--text-dimmer)]"} />
                    <span className="font-semibold">Iced</span>
                  </button>
                </div>
              </div>

              {allowedSizes.length > 0 && (
                <div>
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-dimmer)]">
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
                            active ? "bg-[var(--selector-active-bg)] text-[var(--selector-active-text)]" : "bg-[var(--selector-inactive-bg)] text-[var(--selector-inactive-text)] hover:bg-[var(--overlay-hover)]"
                          }`}
                          onClick={() => onSelectSize(size.id)}
                        >
                          <span className="block text-sm font-semibold">{size.name}</span>
                          <span className={`mt-0.5 block text-xs ${active ? "text-[var(--selector-active-sub)]" : "text-[var(--selector-inactive-sub)]"}`}>
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
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-dimmer)]">
                    <Droplets size={13} /> Flavors
                  </div>
                  <FlavorPicker
                    bootstrap={bootstrap}
                    selectedIds={draftLine.modifierIds}
                    onToggle={onToggleFlavor}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer — inset */}
          <div className="shrink-0 bg-[var(--inset-surface)] px-4 py-3 md:px-5">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-black/[0.07] px-5 py-2.5 text-sm font-medium text-[var(--inset-muted)] hover:bg-black/[0.12]"
                onClick={onClose}
              >
                <X size={15} /> Cancel
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-[#1be4db] px-5 py-2.5 text-sm font-bold text-[#1a1a1a]"
                onClick={onConfirm}
              >
                <Plus size={15} /> {draftLine.editingLineId ? "Save Changes" : "Add to Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
