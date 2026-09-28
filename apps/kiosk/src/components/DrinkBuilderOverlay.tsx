import { calculateFlavorAdjustment, calculateLinePrice, formatCurrency, type BootstrapResponse } from "@rhc-pos/shared";
import { Flame, Snowflake, Ruler, Droplets, Plus, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

import { getSizeAdjustmentCents } from "../lib/cart";
import { ProductPhoto } from "./ProductPhoto";
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

  const tabs: Array<{ id: string; label: string }> = flavorCategories
    .filter((fc) => allFlavors.some((m) => m.flavorCategoryId === fc.id))
    .map((fc) => ({ id: fc.id, label: fc.name }));
  const uncategorized = allFlavors.filter((m) => !m.flavorCategoryId);
  if (uncategorized.length > 0) tabs.push({ id: "__uncategorized__", label: "Other" });

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? "__uncategorized__");

  const visibleFlavors =
    activeTab === "__uncategorized__"
      ? uncategorized
      : allFlavors.filter((m) => m.flavorCategoryId === activeTab);

  const flavorGrid = (flavors: typeof allFlavors) => (
    <div className="grid grid-cols-4 gap-1.5">
      {flavors.map((modifier) => {
        const active = selectedIds.includes(modifier.id);
        const priceLabel = modifier.discountFlavor
          ? `${formatCurrency(Math.abs(modifier.priceCents))} off`
          : modifier.priceCents === 0
            ? "Included"
            : `+${formatCurrency(modifier.priceCents)}`;
        return (
          <button
            key={modifier.id}
            type="button"
            onClick={() => onToggle(modifier.id)}
            className={`aspect-square flex flex-col items-center justify-center gap-0.5 rounded-xl text-center shadow-md transition active:scale-[0.97] ${
              active
                ? "bg-[var(--selector-active-bg)] text-[var(--selector-active-text)] shadow-lg ring-2 ring-[#1be4db]/40"
                : "bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            <span className="px-0.5 text-sm font-bold leading-tight">{modifier.name}</span>
            <span className={`text-[11px] font-semibold ${active ? "text-[var(--selector-active-sub)]" : "text-[var(--text-dimmer)]"}`}>
              {priceLabel}
            </span>
          </button>
        );
      })}
      {flavors.length === 0 && (
        <div className="col-span-3 py-4 text-center text-sm text-[var(--text-dimmest)]">
          No flavors in this group.
        </div>
      )}
    </div>
  );

  if (tabs.length === 0) {
    return flavorGrid(allFlavors);
  }

  return (
    <div>
      <div className="mb-2 flex gap-2 sm:gap-1.5 overflow-x-auto px-0.5 py-0.5">
        {tabs.map((tab) => {
          const count = (
            tab.id === "__uncategorized__"
              ? uncategorized
              : allFlavors.filter((m) => m.flavorCategoryId === tab.id)
          ).filter((m) => selectedIds.includes(m.id)).length;

          return (
            <button
              key={tab.id}
              type="button"
              className={`shrink-0 flex items-center gap-2 sm:gap-1.5 rounded-full px-5 py-3 sm:px-3.5 sm:py-1.5 text-base sm:text-sm font-bold sm:font-semibold transition ${
                activeTab === tab.id
                  ? "bg-[var(--selector-active-bg)] text-[var(--selector-active-text)] shadow-md ring-2 ring-[#1be4db]/50"
                  : "bg-[var(--selector-inactive-bg)] text-[var(--selector-inactive-text)] border border-black/10 sm:border-0 shadow-sm sm:shadow-none hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`flex h-6 w-6 sm:h-5 sm:w-5 items-center justify-center leading-none rounded-full text-sm sm:text-xs font-bold ${
                    activeTab === tab.id
                      ? "bg-[#0a8f89] text-white"
                      : "bg-[#1be4db]/20 text-[#1be4db]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {flavorGrid(visibleFlavors)}

      {selectedIds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {allFlavors
            .filter((m) => selectedIds.includes(m.id))
            .map((m) => (
              <button
                key={m.id}
                type="button"
                className="flex items-center gap-1 rounded-full bg-[var(--selected-flavor-chip-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--selected-flavor-chip-text)]"
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

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const allowedSizes = bootstrap.sizes.filter((s) => s.enabled);
  const allowedFlavors = bootstrap.modifiers.filter((m) => m.enabled);
  const selectedSize = allowedSizes.find((s) => s.id === draftLine.sizeOptionId) ?? null;
  const selectedFlavors = allowedFlavors.filter((m) => draftLine.modifierIds.includes(m.id));
  const sizeAdjustment = getSizeAdjustmentCents(bootstrap, product.id, draftLine.sizeOptionId);
  const flavorAdjustment = calculateFlavorAdjustment(selectedFlavors);
  const previewPrice = calculateLinePrice({
    basePriceCents: product.priceCents,
    sizeAdjustmentCents: sizeAdjustment,
    flavorAdjustmentCents: flavorAdjustment,
    discountCents: product.discountCents,
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000]">
      {/* Darkened backdrop — click outside to close */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Drawer — slides in from the left */}
      <div
        className={`absolute left-0 top-0 flex h-dvh w-[min(100vw,820px)] flex-col overflow-hidden rounded-r-lg bg-[var(--bg-grid)] shadow-2xl transition-transform duration-150 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between bg-[var(--inset-surface)] px-4 py-3">
          <div>
            <div className="text-[18px] sm:text-[9px] font-semibold uppercase tracking-widest text-[var(--inset-muted)]">
              Customize
            </div>
            <div className="mt-0.5 font-display text-[2rem] sm:text-base font-bold text-[var(--inset-text)]">
              {product.name}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--inset-muted)]">
                Total
              </div>
              <div className="font-display text-xl font-extrabold text-[#0a8f89]">
                {formatCurrency(previewPrice)}
              </div>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/[0.07] text-[var(--inset-muted)] hover:bg-black/[0.12]"
              onClick={onClose}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left sidebar — product photo + summary (hidden on mobile) */}
          <div className="hidden sm:flex w-48 shrink-0 flex-col gap-3 overflow-y-auto bg-[var(--bg-base)] p-4">
            <div className="hidden sm:flex items-center justify-center">
              <ProductPhoto name={product.name} imageId={product.imageId} className="h-52 w-52 object-contain drop-shadow-xl" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-[var(--inset-surface)] px-3 py-2.5">
                {draftLine.iced
                  ? <Snowflake size={15} className="text-sky-500" />
                  : <Flame size={15} className="text-orange-500" />}
                <span className="text-sm font-semibold text-[var(--inset-text)]">
                  {draftLine.iced ? "Iced" : "Hot"}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[var(--inset-surface)] px-3 py-2.5">
                <Ruler size={15} className="text-[var(--inset-muted)]" />
                <span className="text-sm font-semibold text-[var(--inset-text)]">
                  {selectedSize?.name ?? "Standard"}
                </span>
              </div>
              {selectedFlavors.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-[var(--inset-surface)] px-3 py-2.5">
                  <Droplets size={15} className="mt-0.5 shrink-0 text-[#0a8f89]" />
                  <span className="text-sm font-semibold text-[var(--inset-text)]">
                    {selectedFlavors.map((m) => m.name).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right — options */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-3">
              {/* Temperature + Size on one row */}
              <div className="flex gap-4">
                {/* Temperature */}
                <div className="shrink-0">
                  <div className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[var(--text-primary)]">
                    <Flame size={18} /> Temperature
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`flex h-20 w-28 flex-col items-center justify-center gap-1.5 rounded-xl transition ${
                        !draftLine.iced
                          ? "bg-[var(--selector-active-bg)] text-[var(--selector-active-text)] shadow-md ring-2 ring-[#1be4db]/50"
                          : "bg-[var(--selector-inactive-bg)] text-[var(--selector-inactive-text)] hover:bg-[var(--overlay-hover)]"
                      }`}
                      onClick={() => onSetIced(false)}
                    >
                      <Flame size={20} className="text-orange-500" />
                      <span className="text-base font-bold">Hot</span>
                    </button>
                    <button
                      type="button"
                      className={`flex h-20 w-28 flex-col items-center justify-center gap-1.5 rounded-xl transition ${
                        draftLine.iced
                          ? "bg-[var(--selector-active-bg)] text-[var(--selector-active-text)] shadow-md ring-2 ring-[#1be4db]/50"
                          : "bg-[var(--selector-inactive-bg)] text-[var(--selector-inactive-text)] hover:bg-[var(--overlay-hover)]"
                      }`}
                      onClick={() => onSetIced(true)}
                    >
                      <Snowflake size={20} className={draftLine.iced ? "text-sky-500" : "text-[var(--text-dimmer)]"} />
                      <span className="text-base font-bold">Iced</span>
                    </button>
                  </div>
                </div>

                {/* Size */}
                {allowedSizes.length > 0 && (
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[var(--text-primary)]">
                      <Ruler size={18} /> Size
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allowedSizes.map((size) => {
                        const active = draftLine.sizeOptionId === size.id;
                        const priceDelta = getSizeAdjustmentCents(bootstrap, product.id, size.id);
                        return (
                          <button
                            key={size.id}
                            type="button"
                            className={`flex h-20 w-28 flex-col items-center justify-center rounded-xl transition ${
                              active
                                ? "bg-[var(--selector-active-bg)] text-[var(--selector-active-text)] shadow-md ring-2 ring-[#1be4db]/50"
                                : "bg-[var(--selector-inactive-bg)] text-[var(--selector-inactive-text)] hover:bg-[var(--overlay-hover)]"
                            }`}
                            onClick={() => onSelectSize(size.id)}
                          >
                            <span className="text-base font-bold leading-tight">{size.name}</span>
                            <span className={`text-sm ${active ? "text-[var(--selector-active-sub)]" : "text-[var(--selector-inactive-sub)]"}`}>
                              {priceDelta === 0 ? "Base price" : `${priceDelta > 0 ? "+" : ""}${formatCurrency(priceDelta)}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Flavors */}
              {allowedFlavors.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[var(--text-primary)]">
                    <Droplets size={18} /> Flavors
                  </div>
                  <FlavorPicker bootstrap={bootstrap} selectedIds={draftLine.modifierIds} onToggle={onToggleFlavor} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 flex justify-end gap-3 sm:gap-2 border-t border-black/10 bg-[var(--inset-surface)] px-4 py-4 sm:py-3">
          <button
            type="button"
            className="flex items-center gap-2 sm:gap-1.5 rounded-xl bg-black/[0.07] px-6 py-4 sm:px-5 sm:py-2.5 text-lg sm:text-base font-medium text-[var(--inset-muted)] hover:bg-black/[0.12]"
            onClick={onClose}
          >
            <X size={18} className="sm:hidden" /><X size={15} className="hidden sm:block" /> Cancel
          </button>
          <button
            type="button"
            className="flex items-center gap-2 sm:gap-1.5 rounded-xl bg-[#1be4db] px-6 py-4 sm:px-5 sm:py-2.5 text-lg sm:text-base font-bold text-[#1a1a1a]"
            onClick={onConfirm}
          >
            <Plus size={18} className="sm:hidden" /><Plus size={15} className="hidden sm:block" /> {draftLine.editingLineId ? "Save Changes" : "Add to Order"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
