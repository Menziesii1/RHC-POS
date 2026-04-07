import {
  formatCurrency,
  type AnalyticsRangeResponse,
  type BootstrapResponse,
  type UpsertCategoryInput,
  type UpsertModifierInput,
  type UpsertProductInput,
  type UpsertSizeOptionInput,
} from "@rhc-pos/shared";
import { useEffect, useMemo, useState } from "react";

import { useConfirm } from "../lib/confirm";
import { AdminWorkspaceHeader } from "./AdminWorkspaceHeader";

interface InventoryControlPageProps {
  bootstrap: BootstrapResponse;
  analytics: AnalyticsRangeResponse | null;
  onClose: () => void;
  onNavigateAnalytics: () => void;
  onCategorySave: (categoryId: string, input: Partial<UpsertCategoryInput>) => Promise<void>;
  onCategoryDelete: (categoryId: string) => Promise<void>;
  onProductSave: (productId: string, input: UpsertProductInput) => Promise<void>;
  onProductDelete: (productId: string) => Promise<void>;
  onCreateProduct: (input: UpsertProductInput) => Promise<void>;
  onSizeSave: (sizeId: string, input: UpsertSizeOptionInput) => Promise<void>;
  onSizeDelete: (sizeId: string) => Promise<void>;
  onFlavorSave: (modifierId: string, input: UpsertModifierInput) => Promise<void>;
  onCreateCategory: (input: UpsertCategoryInput) => Promise<void>;
  onCreateFlavor: (input: UpsertModifierInput) => Promise<void>;
  onCreateSize: (input: UpsertSizeOptionInput) => Promise<void>;
  onTaxSave: (taxRateBasisPoints: number) => Promise<void>;
}

type CategoryDraft = { name: string; sortOrder: string; enabled: boolean };
type SizeDraft = { name: string; sortOrder: string; price: string; enabled: boolean };

function toSizeDraft(size: BootstrapResponse["sizes"][number]): SizeDraft {
  return {
    name: size.name,
    sortOrder: String(size.sortOrder),
    price: (size.priceDeltaCents / 100).toFixed(2),
    enabled: size.enabled,
  };
}

function isMoneyInput(value: string) {
  return /^-?\d*\.?\d{0,2}$/.test(value) || value === "-";
}

function normalizeMoneyInput(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}

function defaultProductDraft(bootstrap: BootstrapResponse): UpsertProductInput {
  return {
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
  };
}

function toProductDraft(product: BootstrapResponse["products"][number]): UpsertProductInput {
  return {
    name: product.name,
    categoryId: product.categoryId,
    priceCents: product.priceCents,
    discountCents: product.discountCents,
    enabled: product.enabled,
    sortOrder: product.sortOrder,
    productType: product.productType,
    modifierIds: [],
    sizeOptionIds: [],
    sizeOptionPrices: [],
    defaultSizeOptionId: null,
  };
}

export function InventoryControlPage({
  bootstrap,
  analytics,
  onClose,
  onNavigateAnalytics,
  onCategorySave,
  onCategoryDelete,
  onProductSave,
  onProductDelete,
  onCreateProduct,
  onSizeSave,
  onSizeDelete,
  onFlavorSave,
  onCreateCategory,
  onCreateFlavor,
  onCreateSize,
  onTaxSave,
}: InventoryControlPageProps) {
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [taxRate, setTaxRate] = useState((bootstrap.settings.taxRateBasisPoints / 100).toFixed(2));
  const [productModal, setProductModal] = useState<{ mode: "create" | "edit"; productId: string | null } | null>(null);
  const [productDraft, setProductDraft] = useState<UpsertProductInput>(() => defaultProductDraft(bootstrap));
  const [productError, setProductError] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSize, setNewSize] = useState({ name: "", price: "0.00" });
  const [newFlavor, setNewFlavor] = useState({ name: "", price: "0.00", discount: false });
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, CategoryDraft>>({});
  const [sizeDrafts, setSizeDrafts] = useState<Record<string, SizeDraft>>({});
  const [successFlashToken, setSuccessFlashToken] = useState(0);

  const categories = useMemo(() => bootstrap.categories.slice().sort((a, b) => a.sortOrder - b.sortOrder), [bootstrap.categories]);
  const selectedProduct =
    productModal?.mode === "edit" && productModal.productId
      ? bootstrap.products.find((product) => product.id === productModal.productId) ?? null
      : null;

  const productMetrics = useMemo(() => {
    const map = new Map<string, { quantity: number; lastActiveDate: string | null }>();
    for (const series of analytics?.productSeries ?? []) {
      map.set(series.productId, {
        quantity: series.totalQuantity,
        lastActiveDate: [...series.daily].reverse().find((entry) => entry.quantity > 0)?.date ?? null,
      });
    }
    return map;
  }, [analytics]);

  const visibleProducts = useMemo(
    () =>
      bootstrap.products
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .filter((product) => {
          const matchesCategory = categoryFilter === "all" || product.categoryId === categoryFilter;
          const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
          return matchesCategory && matchesSearch;
        }),
    [bootstrap.products, categoryFilter, search],
  );

  useEffect(() => {
    if (productModal?.mode === "create") setProductDraft(defaultProductDraft(bootstrap));
    else if (selectedProduct) setProductDraft(toProductDraft(selectedProduct));
  }, [bootstrap, productModal, selectedProduct]);

  useEffect(() => {
    setCategoryDrafts((current) =>
      Object.fromEntries(
        categories.map((category) => [
          category.id,
          current[category.id] ?? { name: category.name, sortOrder: String(category.sortOrder), enabled: category.enabled },
        ]),
      ),
    );
  }, [categories]);

  useEffect(() => {
    setSizeDrafts((current) =>
      Object.fromEntries(bootstrap.sizes.map((size) => [size.id, current[size.id] ?? toSizeDraft(size)])),
    );
  }, [bootstrap.sizes]);

  useEffect(() => {
    if (!successFlashToken) return;
    const timeout = window.setTimeout(() => setSuccessFlashToken(0), 950);
    return () => window.clearTimeout(timeout);
  }, [successFlashToken]);

  const activeProducts = bootstrap.products.filter((product) => product.enabled).length;
  const canSubmitProduct = productDraft.name.trim().length > 0 && productDraft.categoryId.trim().length > 0 && !isSavingProduct;

  const openCreateModal = () => { setProductError(null); setProductModal({ mode: "create", productId: null }); };
  const openEditModal = (productId: string) => { setProductError(null); setProductModal({ mode: "edit", productId }); };
  const closeProductModal = () => { setProductError(null); setProductModal(null); };
  const triggerSuccessFlash = () => setSuccessFlashToken(Date.now());

  const handleSubmitProduct = async () => {
    if (!canSubmitProduct) return setProductError("Enter a product name before saving.");
    setIsSavingProduct(true);
    setProductError(null);
    try {
      if (productModal?.mode === "create") await onCreateProduct(productDraft);
      else if (selectedProduct) await onProductSave(selectedProduct.id, productDraft);
      triggerSuccessFlash();
      closeProductModal();
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "Unable to save the product.");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    const confirmed = await confirm({
      message: `Delete "${selectedProduct.name}"? This cannot be undone.`,
    });
    if (!confirmed) return;

    try {
      await onProductDelete(selectedProduct.id);
      triggerSuccessFlash();
      closeProductModal();
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "Unable to delete the product.");
    }
  };

  const handleLibraryAction = async (action: () => Promise<void>, fallback: string) => {
    try {
      setLibraryError(null);
      await action();
      triggerSuccessFlash();
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : fallback);
    }
  };

  return (
    <div className="min-h-[720px] p-4 md:p-5">
    <div className="mx-auto flex min-h-[720px] max-w-[1600px] flex-col">
      <AdminWorkspaceHeader
        eyebrow="Admin Workbench"
        title="Inventory Control"
        description="Products open in focused modals. Sizes and flavors stay global, so the catalog remains clean and the editor stays quick."
        activeTab="inventory"
        onSelectTab={(tab) => {
          if (tab === "analytics") {
            onNavigateAnalytics();
          }
        }}
        onClose={onClose}
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#1be4db] to-[#5191e5] px-4 py-2.5 text-sm font-bold text-[#262626] shadow-[0_4px_14px_rgba(27,228,219,0.3)]"
            onClick={openCreateModal}
          >
            New Product
          </button>
        }
      />

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="brand-stat ">
          <div className="brand-stat-label">Active Items</div>
          <div className="brand-stat-value">{activeProducts}</div>
        </div>
        <div className="brand-stat ">
          <div className="brand-stat-label">Hidden Items</div>
          <div className="brand-stat-value">{bootstrap.products.length - activeProducts}</div>
        </div>
        <div className="brand-stat ">
          <div className="brand-stat-label">Categories</div>
          <div className="brand-stat-value">{bootstrap.categories.length}</div>
        </div>
        <div className="brand-stat ">
          <div className="brand-stat-label">Flavor Library</div>
          <div className="brand-stat-value">{bootstrap.modifiers.length}</div>
        </div>
      </div>

      <section className="mb-5 overflow-hidden rounded-xl ">
        <div className="bg-[#323232] px-5 py-4 text-white">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Catalog</div>
              <div className="mt-1 font-display text-2xl font-extrabold tracking-tight">Products</div>
            </div>
            <div className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
              {visibleProducts.length} visible
            </div>
          </div>
          <div className="mt-4 grid gap-2.5 lg:grid-cols-[1.25fr_0.7fr_auto]">
            <input
              className="brand-input"
              placeholder="Search product name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="brand-select"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-start lg:justify-end">
              <button
                type="button"
                className="touch-button"
                onClick={openCreateModal}
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-[#383838] text-[10px] uppercase tracking-wider text-white/75">
              <tr>
                <th className="px-5 py-3 text-left">Product</th>
                <th className="px-5 py-3 text-left">Category</th>
                <th className="px-5 py-3 text-right">Price</th>
                <th className="px-5 py-3 text-right">14d Units</th>
                <th className="px-5 py-3 text-left">Last Sold</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {visibleProducts.map((product) => {
                const metric = productMetrics.get(product.id);
                return (
                  <tr
                    key={product.id}
                    className="cursor-pointer transition hover:bg-white/[0.03]"
                    onClick={() => openEditModal(product.id)}
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{product.name}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-wider text-white/42">{product.id}</div>
                    </td>
                    <td className="px-5 py-4 text-white/80">
                      {categories.find((category) => category.id === product.categoryId)?.name ?? product.categoryId}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-white">{formatCurrency(product.priceCents)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-white">{metric?.quantity ?? 0}</td>
                    <td className="px-5 py-4 text-white/85">{metric?.lastActiveDate ?? "No sales yet"}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`brand-chip text-[10px] ${product.enabled ? "brand-chip-accent" : "brand-chip-soft opacity-55"}`}>
                        {product.enabled ? "Live" : "Hidden"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {libraryError ? <div className="mb-5 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">{libraryError}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-xl ">
          <div className="bg-white/[0.02] px-4 py-3">
            <div className="brand-section-title">Store Controls</div>
          </div>
          <div className="grid gap-3 p-4">
            <input type="number" step="0.01" className="brand-input" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            <button
              type="button"
              className="touch-button bg-[#1be4db] text-[#262626]"
              onClick={() => void handleLibraryAction(() => onTaxSave(Math.round(Number(taxRate || "0") * 100)), "Unable to update tax rate.")}
            >
              Save Tax Rate
            </button>
            <div className="rounded-lg  bg-white/[0.03] px-3 py-2.5 text-xs font-medium leading-5 text-white/85">
              Enabled sizes and enabled flavors are now available to every product.
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl ">
          <div className="bg-white/[0.02] px-4 py-3">
            <div className="brand-section-title">Category Library</div>
          </div>
          <div className="grid gap-3 p-4">
            {categories.map((category) => {
              const draft = categoryDrafts[category.id];
              const productCount = bootstrap.products.filter((product) => product.categoryId === category.id).length;
              if (!draft) return null;
              return (
                <div key={category.id} className="rounded-lg bg-white/[0.02] p-3">
                  <div className="grid gap-3">
                    <input
                      className="brand-input"
                      value={draft.name}
                      onChange={(event) =>
                        setCategoryDrafts((state) => ({
                          ...state,
                          [category.id]: { ...state[category.id], name: event.target.value },
                        }))
                      }
                    />
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="number"
                        className="brand-input"
                        value={draft.sortOrder}
                        onChange={(event) =>
                          setCategoryDrafts((state) => ({
                            ...state,
                            [category.id]: { ...state[category.id], sortOrder: event.target.value },
                          }))
                        }
                      />
                      <label className="brand-chip brand-chip-soft">
                        <input
                          type="checkbox"
                          checked={draft.enabled}
                          onChange={(event) =>
                            setCategoryDrafts((state) => ({
                              ...state,
                              [category.id]: { ...state[category.id], enabled: event.target.checked },
                            }))
                          }
                        />
                        Enabled
                      </label>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
                      <span>{productCount} items</span>
                      <span>{category.id}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="touch-button flex-1"
                        onClick={() =>
                          void handleLibraryAction(
                            () =>
                              onCategorySave(category.id, {
                                name: draft.name,
                                sortOrder: Number(draft.sortOrder || "0"),
                                enabled: draft.enabled,
                              }),
                            "Unable to update category.",
                          )
                        }
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="touch-button bg-rose-500/10 text-rose-300"
                        disabled={productCount > 0}
                        onClick={() => void handleLibraryAction(() => onCategoryDelete(category.id), "Unable to delete category.")}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input className="brand-input" placeholder="New category" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              <button
                type="button"
                className="touch-button bg-[#1be4db] text-[#262626] hover:bg-[#5191e5]"
                onClick={() =>
                  void handleLibraryAction(
                    async () => {
                      await onCreateCategory({ name: newCategoryName, enabled: true, sortOrder: bootstrap.categories.length + 1 });
                      setNewCategoryName("");
                    },
                    "Unable to create category.",
                  )
                }
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl ">
          <div className="bg-white/[0.02] px-4 py-3">
            <div className="brand-section-title">Size Library</div>
          </div>
          <div className="grid gap-3 p-4">
            {bootstrap.sizes.map((size) => {
              const draft = sizeDrafts[size.id];
              if (!draft) return null;
              return (
                <div key={size.id} className="rounded-lg bg-white/[0.02] p-3">
                  <div className="grid gap-2">
                    <input
                      className="brand-input"
                      value={draft.name}
                      onChange={(event) => setSizeDrafts((state) => ({ ...state, [size.id]: { ...state[size.id], name: event.target.value } }))}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      className="brand-input"
                      value={draft.price}
                      onChange={(event) => {
                        const nextPrice = event.target.value;
                        if (!isMoneyInput(nextPrice)) return;
                        setSizeDrafts((state) => ({ ...state, [size.id]: { ...state[size.id], price: nextPrice } }));
                      }}
                      onBlur={() => setSizeDrafts((state) => ({ ...state, [size.id]: { ...state[size.id], price: normalizeMoneyInput(state[size.id]?.price ?? "0") } }))}
                    />
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="number"
                        className="brand-input"
                        value={draft.sortOrder}
                        onChange={(event) => setSizeDrafts((state) => ({ ...state, [size.id]: { ...state[size.id], sortOrder: event.target.value } }))}
                      />
                      <label className="brand-chip brand-chip-soft">
                        <input
                          type="checkbox"
                          checked={draft.enabled}
                          onChange={(event) => setSizeDrafts((state) => ({ ...state, [size.id]: { ...state[size.id], enabled: event.target.checked } }))}
                        />
                        Enabled
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="touch-button flex-1"
                        onClick={() =>
                          void handleLibraryAction(
                            () =>
                              onSizeSave(size.id, {
                                name: draft.name,
                                priceDeltaCents: Math.round(Number(draft.price || "0") * 100),
                                enabled: draft.enabled,
                                sortOrder: Number(draft.sortOrder || "0"),
                              }),
                            "Unable to update size.",
                          )
                        }
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="touch-button bg-rose-500/10 text-rose-300"
                        onClick={() => void handleLibraryAction(() => onSizeDelete(size.id), "Unable to delete size.")}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="grid gap-2 md:grid-cols-[1fr_0.8fr_auto]">
              <input className="brand-input" placeholder="New size name" value={newSize.name} onChange={(e) => setNewSize((state) => ({ ...state, name: e.target.value }))} />
              <input
                type="text"
                inputMode="decimal"
                className="brand-input"
                placeholder="Price delta"
                value={newSize.price}
                onChange={(e) => {
                  const nextPrice = e.target.value;
                  if (!isMoneyInput(nextPrice)) return;
                  setNewSize((state) => ({ ...state, price: nextPrice }));
                }}
                onBlur={() => setNewSize((state) => ({ ...state, price: normalizeMoneyInput(state.price) }))}
              />
              <button
                type="button"
                className="touch-button bg-[#1be4db] text-[#262626] hover:bg-[#5191e5]"
                onClick={() =>
                  void handleLibraryAction(
                    async () => {
                      await onCreateSize({
                        name: newSize.name,
                        priceDeltaCents: Math.round(Number(newSize.price || "0") * 100),
                        enabled: true,
                        sortOrder: bootstrap.sizes.length + 1,
                      });
                      setNewSize({ name: "", price: "0.00" });
                    },
                    "Unable to create size.",
                  )
                }
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl ">
          <div className="bg-white/[0.02] px-4 py-3">
            <div className="brand-section-title">Flavor Library</div>
          </div>
          <div className="grid gap-3 p-4">
            {bootstrap.modifiers.map((modifier) => (
              <div key={modifier.id} className="rounded-lg bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{modifier.name}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-white/47">
                      {modifier.discountFlavor ? "Discount flavor" : "Standard flavor"}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-[#1be4db]">{formatCurrency(modifier.priceCents)}</div>
                </div>
                <button
                  type="button"
                  className="mt-3 text-[10px] font-bold uppercase tracking-wider text-white/75 hover:text-white/70"
                  onClick={() =>
                    void handleLibraryAction(
                      () =>
                        onFlavorSave(modifier.id, {
                          name: modifier.name,
                          priceCents: modifier.priceCents,
                          discountFlavor: modifier.discountFlavor,
                          enabled: !modifier.enabled,
                          sortOrder: modifier.sortOrder,
                        }),
                      "Unable to update flavor.",
                    )
                  }
                >
                  {modifier.enabled ? "Hide Flavor" : "Re-enable Flavor"}
                </button>
              </div>
            ))}
            <div className="grid gap-2">
              <input className="brand-input" placeholder="New flavor name" value={newFlavor.name} onChange={(e) => setNewFlavor((state) => ({ ...state, name: e.target.value }))} />
              <input className="brand-input" placeholder="Price adjustment" value={newFlavor.price} onChange={(e) => setNewFlavor((state) => ({ ...state, price: e.target.value }))} />
              <label className="brand-chip brand-chip-soft">
                <input type="checkbox" checked={newFlavor.discount} onChange={(e) => setNewFlavor((state) => ({ ...state, discount: e.target.checked }))} />
                Discount flavor
              </label>
              <button
                type="button"
                className="touch-button bg-[#1be4db] text-[#262626] hover:bg-[#5191e5]"
                onClick={() =>
                  void handleLibraryAction(
                    async () => {
                      await onCreateFlavor({
                        name: newFlavor.name,
                        priceCents: Math.round(Number(newFlavor.price || "0") * 100),
                        discountFlavor: newFlavor.discount,
                        enabled: true,
                        sortOrder: bootstrap.modifiers.length + 1,
                      });
                      setNewFlavor({ name: "", price: "0.00", discount: false });
                    },
                    "Unable to create flavor.",
                  )
                }
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {productModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#262626] shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
            <div className="bg-[#323232] px-5 py-4 text-white">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#1be4db]">
                {productModal.mode === "create" ? "New Product" : "Product Inspector"}
              </div>
              <div className="mt-1 font-display text-[1.9rem] font-extrabold tracking-tight">
                {productModal.mode === "create" ? "Create a Catalog Item" : selectedProduct?.name ?? "Edit Product"}
              </div>
            </div>
            <div className="grid gap-4 overflow-auto p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="brand-kicker">Name</span>
                  <input
                    className="brand-input"
                    value={productDraft.name}
                    onChange={(e) => setProductDraft((draft) => ({ ...draft, name: e.target.value }))}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="brand-kicker">Category</span>
                  <select
                    className="brand-select"
                    value={productDraft.categoryId}
                    onChange={(e) => setProductDraft((draft) => ({ ...draft, categoryId: e.target.value }))}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="brand-kicker">Price</span>
                  <input
                    type="number"
                    step="0.01"
                    className="brand-input"
                    value={(productDraft.priceCents / 100).toFixed(2)}
                    onChange={(e) =>
                      setProductDraft((draft) => ({
                        ...draft,
                        priceCents: Math.round(Number(e.target.value || "0") * 100),
                      }))
                    }
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="brand-kicker">Sort Order</span>
                  <input
                    type="number"
                    className="brand-input"
                    value={productDraft.sortOrder}
                    onChange={(e) => setProductDraft((draft) => ({ ...draft, sortOrder: Number(e.target.value || "0") }))}
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                <label className="brand-chip brand-chip-soft">
                  <input type="checkbox" checked={productDraft.enabled} onChange={(e) => setProductDraft((draft) => ({ ...draft, enabled: e.target.checked }))} />
                  Enabled
                </label>
                <label className="grid gap-1.5">
                  <span className="brand-kicker">Item Discount</span>
                  <input
                    type="number"
                    step="0.01"
                    className="brand-input"
                    value={(productDraft.discountCents / 100).toFixed(2)}
                    onChange={(e) =>
                      setProductDraft((draft) => ({
                        ...draft,
                        discountCents: Math.round(Number(e.target.value || "0") * 100),
                      }))
                    }
                  />
                </label>
              </div>
              <div className="rounded-lg  bg-white/[0.03] px-3 py-2.5 text-xs font-medium leading-5 text-white/85">
                Size and flavor assignment is global now. Any enabled size or flavor applies everywhere.
              </div>
              <div className="flex flex-wrap items-center gap-2.5 pt-3">
                <button
                  type="button"
                  className="rounded-xl bg-gradient-to-b from-[#1be4db] to-[#5191e5] px-4 py-2.5 text-sm font-bold text-[#262626] shadow-[0_4px_14px_rgba(27,228,219,0.3)]"
                  disabled={!canSubmitProduct}
                  onClick={() => void handleSubmitProduct()}
                >
                  {isSavingProduct ? "Saving..." : productModal.mode === "create" ? "Create Product" : "Save Changes"}
                </button>
                <button type="button" className="touch-button" onClick={closeProductModal}>
                  Cancel
                </button>
                {productModal.mode === "edit" && selectedProduct ? (
                  <button
                    type="button"
                    className="ml-auto rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/15"
                    onClick={() => void handleDeleteProduct()}
                  >
                    Delete Product
                  </button>
                ) : null}
              </div>
              {productError ? <div className="text-sm font-semibold text-rose-300">{productError}</div> : null}
            </div>
          </div>
        </div>
      ) : null}

      {successFlashToken ? (
        <div className="admin-success-flash">
          <div className="admin-success-badge">
            <div className="admin-success-ring" />
            <svg viewBox="0 0 64 64" aria-hidden="true" className="admin-success-check">
              <path d="M18 33.5 27.5 43 46 22.5" />
            </svg>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
}
