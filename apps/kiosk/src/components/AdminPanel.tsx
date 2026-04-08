import {
  formatCurrency,
  type BootstrapResponse,
  type UpsertCategoryInput,
  type UpsertModifierInput,
  type UpsertProductInput,
  type UpsertSizeOptionInput,
} from "@rhc-pos/shared";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { useConfirm } from "../lib/confirm";

interface AdminPanelProps {
  bootstrap: BootstrapResponse;
  adminPin: string;
  onClose: () => void;
  onProductSave: (productId: string, input: UpsertProductInput) => Promise<void>;
  onProductsReorder: (orderedIds: string[]) => Promise<void>;
  onProductDelete: (productId: string) => Promise<void>;
  onSizeSave: (sizeId: string, input: UpsertSizeOptionInput) => Promise<void>;
  onFlavorSave: (modifierId: string, input: UpsertModifierInput) => Promise<void>;
  onFlavorDelete: (modifierId: string) => Promise<void>;
  onCreateCategory: (input: UpsertCategoryInput) => Promise<void>;
  onCreateFlavor: (input: UpsertModifierInput) => Promise<void>;
  onCreateSize: (input: UpsertSizeOptionInput) => Promise<void>;
  onCreateProduct: (input: UpsertProductInput) => Promise<void>;
  onTaxSave: (taxRateBasisPoints: number) => Promise<void>;
}

// ── Drag handle icon ────────────────────────────────────────────────────────
function isMoneyInput(value: string) {
  return /^-?\d*\.?\d{0,2}$/.test(value) || value === "-" || value === "";
}

function normalizeMoneyInput(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}

function moneyInputToCents(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function isIntegerInput(value: string) {
  return /^-?\d*$/.test(value);
}

function normalizeIntegerInput(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : "0";
}

function DragHandle() {
  return (
    <div className="flex cursor-grab flex-col gap-[4px] px-1 py-0.5 active:cursor-grabbing">
      <div className="h-px w-4 bg-[#263362]/30" />
      <div className="h-px w-4 bg-[#263362]/30" />
      <div className="h-px w-4 bg-[#263362]/30" />
    </div>
  );
}

export function AdminPanel({
  bootstrap,
  adminPin,
  onClose,
  onProductSave,
  onProductsReorder,
  onProductDelete,
  onSizeSave,
  onFlavorSave,
  onFlavorDelete,
  onCreateCategory,
  onCreateFlavor,
  onCreateSize,
  onCreateProduct,
  onTaxSave,
}: AdminPanelProps) {
  // ── Form state ─────────────────────────────────────────────────────────────
  const confirm = useConfirm();
  const [taxRate, setTaxRate] = useState(
    (bootstrap.settings.taxRateBasisPoints / 100).toFixed(2),
  );
  const [newCategorySortOrderStr, setNewCategorySortOrderStr] = useState(String(bootstrap.categories.length + 1));
  const [newCategory, setNewCategory] = useState<UpsertCategoryInput>({
    name: "",
    sortOrder: bootstrap.categories.length + 1,
    enabled: true,
  });
  const [newFlavor, setNewFlavor] = useState<UpsertModifierInput>({
    name: "",
    priceCents: 0,
    discountFlavor: false,
    enabled: true,
    sortOrder: bootstrap.modifiers.length + 1,
  });
  const [newSize, setNewSize] = useState<UpsertSizeOptionInput>({
    name: "",
    priceDeltaCents: 0,
    enabled: true,
    sortOrder: bootstrap.sizes.length + 1,
  });
  const [newSizePriceStr, setNewSizePriceStr] = useState("0.00");
  // Raw string values for size edit price inputs (allows typing negative numbers)
  const [sizePriceInputs, setSizePriceInputs] = useState<Record<string, string>>({});
  const [sizeSortInputs, setSizeSortInputs] = useState<Record<string, string>>({});
  const [newFlavorPriceStr, setNewFlavorPriceStr] = useState("0.00");
  const [newProductPriceStr, setNewProductPriceStr] = useState("0.00");
  const [newProductSortOrderStr, setNewProductSortOrderStr] = useState(String(bootstrap.products.length + 1));
  const [productPriceInputs, setProductPriceInputs] = useState<Record<string, string>>({});
  const [productSortInputs, setProductSortInputs] = useState<Record<string, string>>({});
  const [flavorPriceInputs, setFlavorPriceInputs] = useState<Record<string, string>>({});
  const [flavorSortInputs, setFlavorSortInputs] = useState<Record<string, string>>({});
  const [newProduct, setNewProduct] = useState<UpsertProductInput>({
    name: "",
    categoryId: bootstrap.categories[0]?.id ?? "",
    priceCents: 0,
    discountCents: 0,
    enabled: true,
    sortOrder: bootstrap.products.length + 1,
    productType: "drink",
    modifierIds: [],
    sizeOptionIds: [],
    sizeOptionPrices: [],
    defaultSizeOptionId: null,
  });

  // ── Product edit drafts ────────────────────────────────────────────────────
  const [drafts, setDrafts] = useState<Record<string, UpsertProductInput>>({});
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  function getDraft(productId: string): UpsertProductInput {
    if (drafts[productId]) return drafts[productId];
    const p = bootstrap.products.find((x) => x.id === productId)!;
    return {
      name: p.name,
      categoryId: p.categoryId,
      priceCents: p.priceCents,
      discountCents: p.discountCents,
      enabled: p.enabled,
      sortOrder: p.sortOrder,
      productType: p.productType,
      modifierIds: [...p.modifierIds],
      sizeOptionIds: [...p.sizeOptionIds],
      sizeOptionPrices: p.sizeOptionPrices.map((s) => ({ ...s })),
      defaultSizeOptionId: p.defaultSizeOptionId,
    };
  }
  function patchDraft(id: string, patch: Partial<UpsertProductInput>) {
    setDrafts((cur) => ({ ...cur, [id]: { ...getDraft(id), ...patch } }));
  }
  function discardDraft(id: string) {
    setDrafts((cur) => { const n = { ...cur }; delete n[id]; return n; });
  }

  // ── Flavor edit drafts ─────────────────────────────────────────────────────
  const [sizeDrafts, setSizeDrafts] = useState<Record<string, UpsertSizeOptionInput>>({});
  const [expandedSize, setExpandedSize] = useState<string | null>(null);

  function getSizeDraft(id: string): UpsertSizeOptionInput {
    if (sizeDrafts[id]) return sizeDrafts[id];
    const s = bootstrap.sizes.find((x) => x.id === id)!;
    return { name: s.name, priceDeltaCents: s.priceDeltaCents, enabled: s.enabled, sortOrder: s.sortOrder };
  }
  function patchSizeDraft(id: string, patch: Partial<UpsertSizeOptionInput>) {
    setSizeDrafts((cur) => ({ ...cur, [id]: { ...getSizeDraft(id), ...patch } }));
  }
  function discardSizeDraft(id: string) {
    setSizeDrafts((cur) => { const n = { ...cur }; delete n[id]; return n; });
  }

  const [flavorDrafts, setFlavorDrafts] = useState<Record<string, UpsertModifierInput>>({});
  const [expandedFlavor, setExpandedFlavor] = useState<string | null>(null);

  function getFlavorDraft(id: string): UpsertModifierInput {
    if (flavorDrafts[id]) return flavorDrafts[id];
    const m = bootstrap.modifiers.find((x) => x.id === id)!;
    return {
      name: m.name,
      priceCents: m.priceCents,
      discountFlavor: m.discountFlavor,
      enabled: m.enabled,
      sortOrder: m.sortOrder,
    };
  }
  function patchFlavorDraft(id: string, patch: Partial<UpsertModifierInput>) {
    setFlavorDrafts((cur) => ({ ...cur, [id]: { ...getFlavorDraft(id), ...patch } }));
  }
  function discardFlavorDraft(id: string) {
    setFlavorDrafts((cur) => { const n = { ...cur }; delete n[id]; return n; });
  }

  // ── Sorted lists ───────────────────────────────────────────────────────────
  const visibleProducts = useMemo(
    () => bootstrap.products.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [bootstrap.products],
  );
  const visibleModifiers = useMemo(
    () => bootstrap.modifiers.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [bootstrap.modifiers],
  );
  const categories = useMemo(
    () => bootstrap.categories.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [bootstrap.categories],
  );

  // ── Drag-to-reorder ────────────────────────────────────────────────────────
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[]>(() =>
    visibleProducts.map((p) => p.id),
  );
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalOrder(visibleProducts.map((p) => p.id));
    }
  }, [visibleProducts]);

  const orderedProducts = localOrder
    .map((id) => bootstrap.products.find((p) => p.id === id))
    .filter(Boolean) as typeof visibleProducts;

  const handleDragStart = (e: React.DragEvent, id: string) => {
    isDraggingRef.current = true;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === overId) return;
    setLocalOrder((prev) => {
      const from = prev.indexOf(draggedId);
      const to = prev.indexOf(overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, draggedId);
      return next;
    });
  };

  const handleDrop = async () => {
    if (!draggedId) return;
    isDraggingRef.current = false;
    setDraggedId(null);
    await onProductsReorder(localOrder);
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    setDraggedId(null);
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    const confirmed = await confirm({
      message: `Delete "${productName}"? This cannot be undone.`,
    });
    if (!confirmed) {
      return;
    }

    await onProductDelete(productId);
    setExpandedProduct(null);
  };

  const handleDeleteFlavor = async (modifierId: string, modifierName: string) => {
    const confirmed = await confirm({
      message: `Delete "${modifierName}"? This cannot be undone.`,
    });
    if (!confirmed) {
      return;
    }

    await onFlavorDelete(modifierId);
    setExpandedFlavor(null);
  };

  return (
    <div className="touch-card min-h-[720px] p-6">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="brand-kicker">Inventory control</div>
          <div className="mt-2 font-display text-4xl font-extrabold text-[#263362]">Admin</div>
          <div className="text-sm text-[#263362]/70">PIN unlocked for this session only.</div>
        </div>
        <button type="button" className="touch-button bg-[#f7fbff] text-[#263362]" onClick={onClose}>
          Back
        </button>
      </div>

      {/* ── Store Settings + Category Roster ── */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="brand-section p-5">
          <div className="brand-section-title">Store Settings</div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              className="brand-input w-full max-w-[160px] text-lg"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
            <button
              type="button"
              className="touch-button bg-[#263362] text-white"
              onClick={() => void onTaxSave(Math.round(Number(taxRate || "0") * 100))}
            >
              Save Tax Rate
            </button>
            <span className="text-sm text-[#263362]/60">
              Admin PIN loaded: {adminPin.length > 0 ? "yes" : "no"}
            </span>
          </div>
        </div>

        <div className="brand-section p-5">
          <div className="brand-section-title">Category Roster</div>
          <div className="mt-4 grid gap-2">
            {categories.map((category) => {
              const count = bootstrap.products.filter((p) => p.categoryId === category.id).length;
              return (
                <div key={category.id} className="brand-rail flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-semibold text-[#263362]">{category.name}</div>
                    <div className="text-xs text-[#263362]/40">{category.id}</div>
                  </div>
                  <div className="brand-chip brand-chip-accent">{count} items</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Create forms ── */}
      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        {/* Create Category */}
        <div className="brand-section p-5">
          <div className="brand-section-title">Create Category</div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
            <input
              className="brand-input"
              placeholder="Category name"
              value={newCategory.name}
              onChange={(e) => setNewCategory((c) => ({ ...c, name: e.target.value }))}
            />
            <input
              type="text"
              inputMode="numeric"
              className="brand-input"
              value={newCategorySortOrderStr}
              onChange={(e) => {
                const raw = e.target.value;
                if (!isIntegerInput(raw)) return;
                setNewCategorySortOrderStr(raw);
              }}
              onBlur={() => setNewCategorySortOrderStr(normalizeIntegerInput(newCategorySortOrderStr))}
            />
            <button
              type="button"
              className="touch-button bg-[#263362] text-white"
              onClick={() =>
                void onCreateCategory({
                  ...newCategory,
                  sortOrder: Number(newCategorySortOrderStr || "0"),
                }).then(() => {
                  setNewCategory({ name: "", sortOrder: bootstrap.categories.length + 2, enabled: true });
                  setNewCategorySortOrderStr(String(bootstrap.categories.length + 2));
                })
              }
            >
              Add
            </button>
          </div>
        </div>

        {/* Create Size */}
        <div className="brand-section p-5">
          <div className="brand-section-title">Create Size</div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_0.9fr_auto]">
            <input
              className="brand-input"
              placeholder="Size name"
              value={newSize.name}
              onChange={(e) => setNewSize((s) => ({ ...s, name: e.target.value }))}
            />
            <input
              type="text"
              inputMode="decimal"
              className="brand-input"
              placeholder="Price delta ($)"
              value={newSizePriceStr}
              onChange={(e) => {
                const raw = e.target.value;
                if (/^-?\d*\.?\d{0,2}$/.test(raw) || raw === "-") {
                  setNewSizePriceStr(raw);
                  setNewSize((s) => ({ ...s, priceDeltaCents: Math.round(Number(raw) * 100) || 0 }));
                }
              }}
              onBlur={() => {
                const parsed = Number(newSizePriceStr);
                const normalized = isNaN(parsed) ? "0.00" : parsed.toFixed(2);
                setNewSizePriceStr(normalized);
                setNewSize((s) => ({ ...s, priceDeltaCents: Math.round(parsed * 100) || 0 }));
              }}
            />
            <button
              type="button"
              className="touch-button bg-[#5190E6] text-white"
              onClick={() =>
                void onCreateSize(newSize).then(() => {
                  setNewSize({ name: "", priceDeltaCents: 0, enabled: true, sortOrder: bootstrap.sizes.length + 2 });
                  setNewSizePriceStr("0.00");
                })
              }
            >
              Add
            </button>
          </div>
          {bootstrap.sizes.length > 0 && (
            <div className="mt-4 overflow-hidden border border-[#dde4f0]">
              <table className="w-full text-sm">
                <thead className="bg-[#f7fbff] text-xs uppercase tracking-wider text-[#263362]/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Size</th>
                    <th className="px-3 py-2 text-right">Price Adjustment</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde4f0]">
                  {bootstrap.sizes.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((size) => {
                    const isExpanded = expandedSize === size.id;
                    const draft = getSizeDraft(size.id);
                    return (
                      <Fragment key={size.id}>
                        <tr
                          className={`cursor-pointer transition-colors ${isExpanded ? "bg-[#f0f5ff]" : "hover:bg-[#f7fbff]"}`}
                          onClick={() => setExpandedSize(isExpanded ? null : size.id)}
                        >
                          <td className="px-3 py-2 font-semibold text-[#263362]">{size.name}</td>
                          <td className="px-3 py-2 text-right font-mono text-[#263362]">
                            {size.priceDeltaCents === 0
                              ? <span className="text-[#263362]/30">+$0.00</span>
                              : <span className="text-[#5190E6]">+{formatCurrency(size.priceDeltaCents)}</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`brand-chip text-xs ${size.enabled ? "brand-chip-accent" : "brand-chip-soft opacity-50"}`}>
                              {size.enabled ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-[#263362]/30">
                            {isExpanded ? "▲" : "▼"}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={4} className="bg-[#f7fbff] px-4 py-4">
                              <div className="grid gap-3">
                                <div className="grid gap-3 md:grid-cols-[1.5fr_0.8fr_0.6fr]">
                                  <label className="grid gap-1">
                                    <span className="brand-kicker">Name</span>
                                    <input
                                      className="brand-input"
                                      value={draft.name}
                                      onChange={(e) => patchSizeDraft(size.id, { name: e.target.value })}
                                    />
                                  </label>
                                  <label className="grid gap-1">
                                    <span className="brand-kicker">Price Adjustment</span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      className="brand-input"
                                      value={sizePriceInputs[size.id] ?? (draft.priceDeltaCents / 100).toFixed(2)}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        if (/^-?\d*\.?\d{0,2}$/.test(raw) || raw === "-") {
                                          setSizePriceInputs((cur) => ({ ...cur, [size.id]: raw }));
                                          patchSizeDraft(size.id, { priceDeltaCents: Math.round(Number(raw) * 100) || 0 });
                                        }
                                      }}
                                      onBlur={() => {
                                        const raw = sizePriceInputs[size.id] ?? "";
                                        const parsed = Number(raw);
                                        const normalized = isNaN(parsed) ? "0.00" : parsed.toFixed(2);
                                        setSizePriceInputs((cur) => ({ ...cur, [size.id]: normalized }));
                                        patchSizeDraft(size.id, { priceDeltaCents: Math.round(parsed * 100) || 0 });
                                      }}
                                    />
                                  </label>
                                  <label className="grid gap-1">
                                    <span className="brand-kicker">Sort #</span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      className="brand-input"
                                      value={sizeSortInputs[size.id] ?? String(draft.sortOrder)}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        if (!isIntegerInput(raw)) return;
                                        setSizeSortInputs((cur) => ({ ...cur, [size.id]: raw }));
                                      }}
                                      onBlur={() =>
                                        setSizeSortInputs((cur) => ({
                                          ...cur,
                                          [size.id]: normalizeIntegerInput(cur[size.id] ?? String(draft.sortOrder)),
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <label className="brand-chip brand-chip-soft">
                                    <input
                                      type="checkbox"
                                      checked={draft.enabled}
                                      onChange={(e) => patchSizeDraft(size.id, { enabled: e.target.checked })}
                                    />
                                    Enabled
                                  </label>
                                  <button
                                    type="button"
                                    className="touch-button bg-[#5190E6] text-white"
                                    onClick={() =>
                                      void onSizeSave(size.id, {
                                        ...draft,
                                        sortOrder: Number(sizeSortInputs[size.id] ?? String(draft.sortOrder)),
                                      }).then(() => {
                                        discardSizeDraft(size.id);
                                        setSizePriceInputs((cur) => { const n = { ...cur }; delete n[size.id]; return n; });
                                        setSizeSortInputs((cur) => { const n = { ...cur }; delete n[size.id]; return n; });
                                        setExpandedSize(null);
                                      })
                                    }
                                  >
                                    Save Changes
                                  </button>
                                  <button
                                    type="button"
                                    className="touch-button bg-[#f7fbff] text-[#263362]"
                                    onClick={() => {
                                      discardSizeDraft(size.id);
                                      setSizePriceInputs((cur) => { const n = { ...cur }; delete n[size.id]; return n; });
                                      setSizeSortInputs((cur) => { const n = { ...cur }; delete n[size.id]; return n; });
                                      setExpandedSize(null);
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Flavor */}
        <div className="brand-section p-5">
          <div className="brand-section-title">Create Flavor / Syrup</div>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
              <input
                className="brand-input"
                placeholder="Flavor name"
                value={newFlavor.name}
                onChange={(e) => setNewFlavor((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                type="text"
                inputMode="decimal"
                className="brand-input"
                value={newFlavorPriceStr}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!isMoneyInput(raw)) return;
                  setNewFlavorPriceStr(raw);
                }}
                onBlur={() => setNewFlavorPriceStr(normalizeMoneyInput(newFlavorPriceStr))}
              />
            </div>
            <label className="brand-chip brand-chip-soft w-fit">
              <input
                type="checkbox"
                checked={newFlavor.discountFlavor}
                onChange={(e) => setNewFlavor((f) => ({ ...f, discountFlavor: e.target.checked }))}
              />
              Discount flavor
            </label>
            <button
              type="button"
              className="touch-button bg-[#263362] text-white"
              onClick={() =>
                void onCreateFlavor({
                  ...newFlavor,
                  priceCents: moneyInputToCents(newFlavorPriceStr),
                }).then(() => {
                  setNewFlavor({
                    name: "",
                    priceCents: 0,
                    discountFlavor: false,
                    enabled: true,
                    sortOrder: bootstrap.modifiers.length + 2,
                  });
                  setNewFlavorPriceStr("0.00");
                })
              }
            >
              Add Flavor
            </button>
          </div>
        </div>

        {/* Create Product */}
        <div className="brand-section p-5">
          <div className="brand-section-title">Create Product</div>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="brand-input"
                placeholder="Product name"
                value={newProduct.name}
                onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
              />
              <select
                className="brand-select"
                value={newProduct.categoryId}
                onChange={(e) => setNewProduct((p) => ({ ...p, categoryId: e.target.value }))}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <input
                type="text"
                inputMode="decimal"
                className="brand-input"
                placeholder="Base price"
                value={newProductPriceStr}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!isMoneyInput(raw)) return;
                  setNewProductPriceStr(raw);
                }}
                onBlur={() => setNewProductPriceStr(normalizeMoneyInput(newProductPriceStr))}
              />
              <input
                type="text"
                inputMode="numeric"
                className="brand-input"
                placeholder="Sort order"
                value={newProductSortOrderStr}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!isIntegerInput(raw)) return;
                  setNewProductSortOrderStr(raw);
                }}
                onBlur={() => setNewProductSortOrderStr(normalizeIntegerInput(newProductSortOrderStr))}
              />
            </div>

            <div>
              <div className="brand-kicker">Available Sizes</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {bootstrap.sizes.map((size) => {
                  const active = newProduct.sizeOptionIds.includes(size.id);
                  return (
                    <button
                      key={size.id}
                      type="button"
                      className={`brand-chip ${active ? "brand-chip-accent" : "brand-chip-soft"}`}
                      onClick={() =>
                        setNewProduct((cur) => {
                          const sizeOptionIds = active
                            ? cur.sizeOptionIds.filter((id) => id !== size.id)
                            : [...cur.sizeOptionIds, size.id];
                          return {
                            ...cur,
                            sizeOptionIds,
                            defaultSizeOptionId:
                              cur.defaultSizeOptionId && sizeOptionIds.includes(cur.defaultSizeOptionId)
                                ? cur.defaultSizeOptionId
                                : sizeOptionIds[0] ?? null,
                            sizeOptionPrices: sizeOptionIds.map((id) => {
                              const s = bootstrap.sizes.find((sz) => sz.id === id)!;
                              return { sizeOptionId: id, priceDeltaCents: s.priceDeltaCents };
                            }),
                          };
                        })
                      }
                    >
                      <span>{size.name}</span>
                      {size.priceDeltaCents !== 0 && (
                        <span className="opacity-60"> +{formatCurrency(size.priceDeltaCents)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className="touch-button bg-[#5190E6] text-white"
              onClick={() =>
                void onCreateProduct({
                  ...newProduct,
                  priceCents: moneyInputToCents(newProductPriceStr),
                  sortOrder: Number(newProductSortOrderStr || "0"),
                }).then(() => {
                  setNewProduct({
                    name: "",
                    categoryId: bootstrap.categories[0]?.id ?? "",
                    priceCents: 0,
                    discountCents: 0,
                    enabled: true,
                    sortOrder: bootstrap.products.length + 2,
                    productType: "drink",
                    modifierIds: [],
                    sizeOptionIds: [],
                    sizeOptionPrices: [],
                    defaultSizeOptionId: null,
                  });
                  setNewProductPriceStr("0.00");
                  setNewProductSortOrderStr(String(bootstrap.products.length + 2));
                })
              }
            >
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* ── Product Inventory Table ── */}
      <div className="brand-section-title mb-4">Product Inventory</div>
      <div className="mb-8 overflow-x-auto rounded-none border border-[#dde4f0]">
        <table className="w-full text-sm">
          <thead className="bg-[#f7fbff] text-xs uppercase tracking-wider text-[#263362]/50">
            <tr>
              <th className="w-8 px-3 py-3" />
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dde4f0]">
            {orderedProducts.map((product) => {
              const isExpanded = expandedProduct === product.id;
              const isDragging = draggedId === product.id;
              const draft = getDraft(product.id);
              const categoryName =
                categories.find((c) => c.id === product.categoryId)?.name ?? product.categoryId;

              return (
                <Fragment key={product.id}>
                  <tr
                    draggable
                    onDragStart={(e) => handleDragStart(e, product.id)}
                    onDragOver={(e) => handleDragOver(e, product.id)}
                    onDrop={() => void handleDrop()}
                    onDragEnd={handleDragEnd}
                    className={`transition-colors ${isDragging ? "opacity-40" : ""} ${
                      isExpanded ? "bg-[#f0f5ff]" : "hover:bg-[#f7fbff]"
                    }`}
                  >
                    <td className="px-3 py-3">
                      <DragHandle />
                    </td>
                    <td className="px-4 py-3 text-[#263362]/40">{product.sortOrder}</td>
                    <td
                      className="cursor-pointer px-4 py-3 font-semibold text-[#263362]"
                      onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                    >
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-[#263362]/70">{categoryName}</td>
                    <td className="px-4 py-3 text-right font-mono text-[#263362]">
                      {formatCurrency(product.priceCents)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`brand-chip text-xs ${
                          product.enabled ? "brand-chip-accent" : "brand-chip-soft opacity-50"
                        }`}
                      >
                        {product.enabled ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td
                      className="cursor-pointer px-4 py-3 text-center text-xs text-[#263362]/30"
                      onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                    >
                      {isExpanded ? "▲" : "▼"}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="bg-[#f7fbff] px-5 py-5">
                        <div className="grid gap-5">
                          {/* Core fields */}
                          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_0.7fr]">
                            <label className="grid gap-1">
                              <span className="brand-kicker">Name</span>
                              <input
                                className="brand-input"
                                value={draft.name}
                                onChange={(e) => patchDraft(product.id, { name: e.target.value })}
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="brand-kicker">Category</span>
                              <select
                                className="brand-select"
                                value={draft.categoryId}
                                onChange={(e) => patchDraft(product.id, { categoryId: e.target.value })}
                              >
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-1">
                              <span className="brand-kicker">Price</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="brand-input"
                                value={productPriceInputs[product.id] ?? (draft.priceCents / 100).toFixed(2)}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (!isMoneyInput(raw)) return;
                                  setProductPriceInputs((cur) => ({ ...cur, [product.id]: raw }));
                                }}
                                onBlur={() =>
                                  setProductPriceInputs((cur) => ({
                                    ...cur,
                                    [product.id]: normalizeMoneyInput(
                                      cur[product.id] ?? (draft.priceCents / 100).toFixed(2),
                                    ),
                                  }))
                                }
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="brand-kicker">Sort #</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="brand-input"
                                value={productSortInputs[product.id] ?? String(draft.sortOrder)}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (!isIntegerInput(raw)) return;
                                  setProductSortInputs((cur) => ({ ...cur, [product.id]: raw }));
                                }}
                                onBlur={() =>
                                  setProductSortInputs((cur) => ({
                                    ...cur,
                                    [product.id]: normalizeIntegerInput(cur[product.id] ?? String(draft.sortOrder)),
                                  }))
                                }
                              />
                            </label>
                          </div>

                          {/* Sizes */}
                          <div>
                            <div className="brand-kicker">Sizes</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {bootstrap.sizes.map((size) => {
                                const active = draft.sizeOptionIds.includes(size.id);
                                return (
                                  <button
                                    key={size.id}
                                    type="button"
                                    className={`brand-chip ${active ? "brand-chip-accent" : "brand-chip-soft"}`}
                                    onClick={() => {
                                      const sizeOptionIds = active
                                        ? draft.sizeOptionIds.filter((id) => id !== size.id)
                                        : [...draft.sizeOptionIds, size.id];
                                      patchDraft(product.id, {
                                        sizeOptionIds,
                                        defaultSizeOptionId:
                                          draft.defaultSizeOptionId &&
                                          sizeOptionIds.includes(draft.defaultSizeOptionId)
                                            ? draft.defaultSizeOptionId
                                            : sizeOptionIds[0] ?? null,
                                        sizeOptionPrices: sizeOptionIds.map((id) => {
                                          const s = bootstrap.sizes.find((sz) => sz.id === id)!;
                                          return { sizeOptionId: id, priceDeltaCents: s.priceDeltaCents };
                                        }),
                                      });
                                    }}
                                  >
                                    <span>{size.name}</span>
                                    {size.priceDeltaCents !== 0 && (
                                      <span className="opacity-60"> +{formatCurrency(size.priceDeltaCents)}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            {draft.sizeOptionIds.length > 0 && (
                              <div className="mt-3">
                                <label className="grid gap-1">
                                  <span className="brand-kicker text-xs">Default Size</span>
                                  <select
                                    className="brand-select max-w-[220px]"
                                    value={draft.defaultSizeOptionId ?? ""}
                                    onChange={(e) =>
                                      patchDraft(product.id, {
                                        defaultSizeOptionId: e.target.value || null,
                                      })
                                    }
                                  >
                                    <option value="">None</option>
                                    {draft.sizeOptionIds.map((id) => {
                                      const s = bootstrap.sizes.find((sz) => sz.id === id);
                                      return (
                                        <option key={id} value={id}>{s?.name ?? id}</option>
                                      );
                                    })}
                                  </select>
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="brand-chip brand-chip-soft">
                              <input
                                type="checkbox"
                                checked={draft.enabled}
                                onChange={(e) => patchDraft(product.id, { enabled: e.target.checked })}
                              />
                              Enabled
                            </label>
                            <button
                              type="button"
                              className="touch-button bg-[#5190E6] text-white"
                              onClick={() =>
                                void onProductSave(product.id, {
                                  ...draft,
                                  priceCents: moneyInputToCents(
                                    productPriceInputs[product.id] ?? (draft.priceCents / 100).toFixed(2),
                                  ),
                                  sortOrder: Number(productSortInputs[product.id] ?? String(draft.sortOrder)),
                                }).then(() => {
                                  discardDraft(product.id);
                                  setProductPriceInputs((cur) => {
                                    const next = { ...cur };
                                    delete next[product.id];
                                    return next;
                                  });
                                  setProductSortInputs((cur) => {
                                    const next = { ...cur };
                                    delete next[product.id];
                                    return next;
                                  });
                                  setExpandedProduct(null);
                                })
                              }
                            >
                              Save Changes
                            </button>
                            <button
                              type="button"
                              className="touch-button bg-[#f7fbff] text-[#263362]"
                              onClick={() => {
                                discardDraft(product.id);
                                setProductPriceInputs((cur) => {
                                  const next = { ...cur };
                                  delete next[product.id];
                                  return next;
                                });
                                setProductSortInputs((cur) => {
                                  const next = { ...cur };
                                  delete next[product.id];
                                  return next;
                                });
                                setExpandedProduct(null);
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="touch-button ml-auto border-red-200 bg-red-50 text-red-600 hover:border-red-400 hover:bg-red-100"
                              onClick={() => void handleDeleteProduct(product.id, product.name)}
                            >
                              Delete Product
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Flavor Inventory Table ── */}
      <div className="brand-section-title mb-4">Flavor Inventory</div>
      <div className="overflow-x-auto border border-[#dde4f0]">
        <table className="w-full text-sm">
          <thead className="bg-[#f7fbff] text-xs uppercase tracking-wider text-[#263362]/50">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Discount</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dde4f0]">
            {visibleModifiers.map((modifier) => {
              const isExpanded = expandedFlavor === modifier.id;
              const draft = getFlavorDraft(modifier.id);

              return (
                <Fragment key={modifier.id}>
                  <tr
                    className={`cursor-pointer transition-colors ${
                      isExpanded ? "bg-[#f0f5ff]" : "hover:bg-[#f7fbff]"
                    }`}
                    onClick={() => setExpandedFlavor(isExpanded ? null : modifier.id)}
                  >
                    <td className="px-4 py-3 text-[#263362]/40">{modifier.sortOrder}</td>
                    <td className="px-4 py-3 font-semibold text-[#263362]">{modifier.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-[#263362]">
                      {modifier.priceCents === 0
                        ? <span className="text-[#263362]/40">free</span>
                        : formatCurrency(modifier.priceCents)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {modifier.discountFlavor ? (
                        <span className="brand-chip brand-chip-soft text-xs">Discount</span>
                      ) : (
                        <span className="text-[#263362]/20">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`brand-chip text-xs ${
                          modifier.enabled ? "brand-chip-accent" : "brand-chip-soft opacity-50"
                        }`}
                      >
                        {modifier.enabled ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-[#263362]/30">
                      {isExpanded ? "▲" : "▼"}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="bg-[#f7fbff] px-5 py-5">
                        <div className="grid gap-4">
                          <div className="grid gap-3 md:grid-cols-[1.5fr_0.8fr_0.6fr]">
                            <label className="grid gap-1">
                              <span className="brand-kicker">Name</span>
                              <input
                                className="brand-input"
                                value={draft.name}
                                onChange={(e) => patchFlavorDraft(modifier.id, { name: e.target.value })}
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="brand-kicker">Price</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="brand-input"
                                value={flavorPriceInputs[modifier.id] ?? (draft.priceCents / 100).toFixed(2)}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (!isMoneyInput(raw)) return;
                                  setFlavorPriceInputs((cur) => ({ ...cur, [modifier.id]: raw }));
                                }}
                                onBlur={() =>
                                  setFlavorPriceInputs((cur) => ({
                                    ...cur,
                                    [modifier.id]: normalizeMoneyInput(
                                      cur[modifier.id] ?? (draft.priceCents / 100).toFixed(2),
                                    ),
                                  }))
                                }
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="brand-kicker">Sort #</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="brand-input"
                                value={flavorSortInputs[modifier.id] ?? String(draft.sortOrder)}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (!isIntegerInput(raw)) return;
                                  setFlavorSortInputs((cur) => ({ ...cur, [modifier.id]: raw }));
                                }}
                                onBlur={() =>
                                  setFlavorSortInputs((cur) => ({
                                    ...cur,
                                    [modifier.id]: normalizeIntegerInput(cur[modifier.id] ?? String(draft.sortOrder)),
                                  }))
                                }
                              />
                            </label>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="brand-chip brand-chip-soft">
                              <input
                                type="checkbox"
                                checked={draft.discountFlavor}
                                onChange={(e) =>
                                  patchFlavorDraft(modifier.id, { discountFlavor: e.target.checked })
                                }
                              />
                              Discount flavor
                            </label>
                            <label className="brand-chip brand-chip-soft">
                              <input
                                type="checkbox"
                                checked={draft.enabled}
                                onChange={(e) =>
                                  patchFlavorDraft(modifier.id, { enabled: e.target.checked })
                                }
                              />
                              Enabled
                            </label>
                            <button
                              type="button"
                              className="touch-button bg-[#5190E6] text-white"
                              onClick={() =>
                                void onFlavorSave(modifier.id, {
                                  ...draft,
                                  priceCents: moneyInputToCents(
                                    flavorPriceInputs[modifier.id] ?? (draft.priceCents / 100).toFixed(2),
                                  ),
                                  sortOrder: Number(flavorSortInputs[modifier.id] ?? String(draft.sortOrder)),
                                }).then(() => {
                                  discardFlavorDraft(modifier.id);
                                  setFlavorPriceInputs((cur) => {
                                    const next = { ...cur };
                                    delete next[modifier.id];
                                    return next;
                                  });
                                  setFlavorSortInputs((cur) => {
                                    const next = { ...cur };
                                    delete next[modifier.id];
                                    return next;
                                  });
                                  setExpandedFlavor(null);
                                })
                              }
                            >
                              Save Changes
                            </button>
                            <button
                              type="button"
                              className="touch-button bg-[#f7fbff] text-[#263362]"
                              onClick={() => {
                                discardFlavorDraft(modifier.id);
                                setFlavorPriceInputs((cur) => {
                                  const next = { ...cur };
                                  delete next[modifier.id];
                                  return next;
                                });
                                setFlavorSortInputs((cur) => {
                                  const next = { ...cur };
                                  delete next[modifier.id];
                                  return next;
                                });
                                setExpandedFlavor(null);
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="touch-button ml-auto border-red-200 bg-red-50 text-red-600 hover:border-red-400 hover:bg-red-100"
                              onClick={() => void handleDeleteFlavor(modifier.id, modifier.name)}
                            >
                              Delete Flavor
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
