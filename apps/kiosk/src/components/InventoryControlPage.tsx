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

import { AdminWorkspaceHeader } from "./AdminWorkspaceHeader";

interface InventoryControlPageProps {
  bootstrap: BootstrapResponse;
  analytics: AnalyticsRangeResponse | null;
  onClose: () => void;
  onNavigateAnalytics: () => void;
  onProductSave: (productId: string, input: UpsertProductInput) => Promise<void>;
  onProductDelete: (productId: string) => Promise<void>;
  onCreateProduct: (input: UpsertProductInput) => Promise<void>;
  onSizeSave: (sizeId: string, input: UpsertSizeOptionInput) => Promise<void>;
  onFlavorSave: (modifierId: string, input: UpsertModifierInput) => Promise<void>;
  onCreateCategory: (input: UpsertCategoryInput) => Promise<void>;
  onCreateFlavor: (input: UpsertModifierInput) => Promise<void>;
  onCreateSize: (input: UpsertSizeOptionInput) => Promise<void>;
  onTaxSave: (taxRateBasisPoints: number) => Promise<void>;
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

export function InventoryControlPage({
  bootstrap,
  analytics,
  onClose,
  onNavigateAnalytics,
  onProductSave,
  onProductDelete,
  onCreateProduct,
  onSizeSave,
  onFlavorSave,
  onCreateCategory,
  onCreateFlavor,
  onCreateSize,
  onTaxSave,
}: InventoryControlPageProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(bootstrap.products[0]?.id ?? null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productDraft, setProductDraft] = useState<UpsertProductInput>(() => defaultProductDraft(bootstrap));
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [taxRate, setTaxRate] = useState((bootstrap.settings.taxRateBasisPoints / 100).toFixed(2));
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newFlavor, setNewFlavor] = useState({ name: "", price: "0.00", discount: false });
  const [newSize, setNewSize] = useState({ name: "", price: "0.00" });

  const categories = useMemo(
    () => bootstrap.categories.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [bootstrap.categories],
  );

  const productMetrics = useMemo(() => {
    const map = new Map<string, { quantity: number; lastActiveDate: string | null }>();
    for (const series of analytics?.productSeries ?? []) {
      const lastActiveDate = [...series.daily].reverse().find((entry) => entry.quantity > 0)?.date ?? null;
      map.set(series.productId, {
        quantity: series.totalQuantity,
        lastActiveDate,
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

  const selectedProduct = isCreatingProduct
    ? null
    : bootstrap.products.find((product) => product.id === selectedProductId) ?? null;

  useEffect(() => {
    if (isCreatingProduct) {
      setProductDraft(defaultProductDraft(bootstrap));
      return;
    }

    if (selectedProduct) {
      setProductDraft({
        name: selectedProduct.name,
        categoryId: selectedProduct.categoryId,
        priceCents: selectedProduct.priceCents,
        discountCents: selectedProduct.discountCents,
        enabled: selectedProduct.enabled,
        sortOrder: selectedProduct.sortOrder,
        productType: selectedProduct.productType,
        modifierIds: [...selectedProduct.modifierIds],
        sizeOptionIds: [...selectedProduct.sizeOptionIds],
        sizeOptionPrices: selectedProduct.sizeOptionPrices.map((entry) => ({ ...entry })),
        defaultSizeOptionId: selectedProduct.defaultSizeOptionId,
      });
    }
  }, [bootstrap, isCreatingProduct, selectedProduct]);

  const activeProducts = bootstrap.products.filter((product) => product.enabled).length;

  return (
    <div className="flex min-h-[760px] flex-col">
      <AdminWorkspaceHeader
        eyebrow="Admin Workbench"
        title="Inventory Control"
        description="Browse the live catalog in a table, edit the selected product in a dedicated inspector, and manage the supporting catalog structure without leaving the page."
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
            className="touch-button border-[#263362] bg-[#263362] text-white hover:bg-[#314172]"
            onClick={() => {
              setIsCreatingProduct(true);
              setSelectedProductId(null);
            }}
          >
            New Product
          </button>
        }
      />

      <div className="mb-6 grid gap-4 xl:grid-cols-4">
        <div className="brand-stat">
          <div className="brand-stat-label">Active Items</div>
          <div className="brand-stat-value">{activeProducts}</div>
        </div>
        <div className="brand-stat">
          <div className="brand-stat-label">Hidden Items</div>
          <div className="brand-stat-value">{bootstrap.products.length - activeProducts}</div>
        </div>
        <div className="brand-stat">
          <div className="brand-stat-label">Categories</div>
          <div className="brand-stat-value">{bootstrap.categories.length}</div>
        </div>
        <div className="brand-stat">
          <div className="brand-stat-label">Flavor Library</div>
          <div className="brand-stat-value">{bootstrap.modifiers.length}</div>
        </div>
      </div>

      <div className="grid flex-1 gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="brand-section flex min-h-[620px] flex-col overflow-hidden">
          <div className="border-b border-[#dbe6f4] bg-[#263362] px-5 py-4 text-white">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55">Catalog Table</div>
            <div className="mt-2 grid gap-3 lg:grid-cols-[1.1fr_0.6fr_auto]">
              <input
                className="border border-white/15 bg-white px-4 py-3 text-[#263362] outline-none"
                placeholder="Search product name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="border border-white/15 bg-white px-4 py-3 text-[#263362] outline-none"
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
              <div className="flex items-center justify-end text-sm font-semibold text-white/70">
                {visibleProducts.length} visible
              </div>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f0f5fb] text-xs uppercase tracking-[0.2em] text-[#263362]/45">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">14d Units</th>
                  <th className="px-4 py-3 text-left">Last Sold</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4ebf4]">
                {visibleProducts.map((product) => {
                  const active = selectedProductId === product.id && !isCreatingProduct;
                  const metric = productMetrics.get(product.id);
                  return (
                    <tr
                      key={product.id}
                      className={`cursor-pointer ${active ? "bg-[#edf4ff]" : "hover:bg-[#f8fbff]"}`}
                      onClick={() => {
                        setIsCreatingProduct(false);
                        setSelectedProductId(product.id);
                      }}
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#263362]">{product.name}</div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[#263362]/38">{product.id}</div>
                      </td>
                      <td className="px-4 py-4 text-[#263362]/72">
                        {categories.find((category) => category.id === product.categoryId)?.name ?? product.categoryId}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-[#263362]">{formatCurrency(product.priceCents)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-[#263362]">{metric?.quantity ?? 0}</td>
                      <td className="px-4 py-4 text-[#263362]/68">{metric?.lastActiveDate ?? "No sales yet"}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`brand-chip text-xs ${product.enabled ? "brand-chip-accent" : "brand-chip-soft opacity-55"}`}>
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

        <section className="grid gap-5">
          <div className="brand-section overflow-hidden">
            <div className="border-b border-[#dbe6f4] bg-[#1f2b54] px-5 py-4 text-white">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55">
                {isCreatingProduct ? "New Product" : "Product Inspector"}
              </div>
              <div className="mt-2 font-display text-3xl font-extrabold">
                {isCreatingProduct ? "Create a Catalog Item" : selectedProduct?.name ?? "Select a product"}
              </div>
            </div>

            <div className="grid gap-4 p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className="brand-kicker">Name</span>
                  <input className="brand-input" value={productDraft.name} onChange={(e) => setProductDraft((draft) => ({ ...draft, name: e.target.value }))} />
                </label>
                <label className="grid gap-1">
                  <span className="brand-kicker">Category</span>
                  <select className="brand-select" value={productDraft.categoryId} onChange={(e) => setProductDraft((draft) => ({ ...draft, categoryId: e.target.value }))}>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="brand-kicker">Price</span>
                  <input type="number" step="0.01" className="brand-input" value={(productDraft.priceCents / 100).toFixed(2)} onChange={(e) => setProductDraft((draft) => ({ ...draft, priceCents: Math.round(Number(e.target.value || "0") * 100) }))} />
                </label>
                <label className="grid gap-1">
                  <span className="brand-kicker">Sort Order</span>
                  <input type="number" className="brand-input" value={productDraft.sortOrder} onChange={(e) => setProductDraft((draft) => ({ ...draft, sortOrder: Number(e.target.value || "0") }))} />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="brand-chip brand-chip-soft">
                  <input type="checkbox" checked={productDraft.enabled} onChange={(e) => setProductDraft((draft) => ({ ...draft, enabled: e.target.checked }))} />
                  Enabled
                </label>
                <label className="grid gap-1">
                  <span className="brand-kicker">Item Discount</span>
                  <input type="number" step="0.01" className="brand-input" value={(productDraft.discountCents / 100).toFixed(2)} onChange={(e) => setProductDraft((draft) => ({ ...draft, discountCents: Math.round(Number(e.target.value || "0") * 100) }))} />
                </label>
              </div>

              <div>
                <div className="brand-section-title">Size Assignment</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {bootstrap.sizes.map((size) => {
                    const active = productDraft.sizeOptionIds.includes(size.id);
                    return (
                      <button
                        key={size.id}
                        type="button"
                        className={`brand-chip ${active ? "brand-chip-accent" : "brand-chip-soft"}`}
                        onClick={() => {
                          const sizeOptionIds = active
                            ? productDraft.sizeOptionIds.filter((id) => id !== size.id)
                            : [...productDraft.sizeOptionIds, size.id];
                          setProductDraft((draft) => ({
                            ...draft,
                            sizeOptionIds,
                            defaultSizeOptionId:
                              draft.defaultSizeOptionId && sizeOptionIds.includes(draft.defaultSizeOptionId)
                                ? draft.defaultSizeOptionId
                                : sizeOptionIds[0] ?? null,
                            sizeOptionPrices: sizeOptionIds.map((sizeOptionId) => ({
                              sizeOptionId,
                              priceDeltaCents:
                                draft.sizeOptionPrices.find((entry) => entry.sizeOptionId === sizeOptionId)?.priceDeltaCents ??
                                bootstrap.sizes.find((entry) => entry.id === sizeOptionId)?.priceDeltaCents ??
                                0,
                            })),
                          }));
                        }}
                      >
                        {size.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="brand-section-title">Flavor Assignment</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {bootstrap.modifiers.map((modifier) => {
                    const active = productDraft.modifierIds.includes(modifier.id);
                    return (
                      <button
                        key={modifier.id}
                        type="button"
                        className={`brand-chip ${active ? "brand-chip-accent" : "brand-chip-soft"}`}
                        onClick={() =>
                          setProductDraft((draft) => ({
                            ...draft,
                            modifierIds: active
                              ? draft.modifierIds.filter((id) => id !== modifier.id)
                              : [...draft.modifierIds, modifier.id],
                          }))
                        }
                      >
                        {modifier.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="touch-button border-[#263362] bg-[#263362] text-white hover:bg-[#314172]"
                  onClick={() =>
                    void (isCreatingProduct
                      ? onCreateProduct(productDraft)
                      : onProductSave(selectedProduct!.id, productDraft)
                    ).then(() => {
                      setIsCreatingProduct(false);
                    })
                  }
                >
                  {isCreatingProduct ? "Create Product" : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="touch-button bg-[#f7fbff] text-[#263362]"
                  onClick={() => {
                    setIsCreatingProduct(false);
                    setSelectedProductId(bootstrap.products[0]?.id ?? null);
                  }}
                >
                  Reset
                </button>
                {!isCreatingProduct && selectedProduct ? (
                  <button
                    type="button"
                    className="touch-button ml-auto border-[#efc9c0] bg-[#fff5f2] text-[#ba4a2f]"
                    onClick={() => {
                      if (window.confirm(`Delete "${selectedProduct.name}"? This cannot be undone.`)) {
                        void onProductDelete(selectedProduct.id).then(() => {
                          setSelectedProductId(bootstrap.products.find((entry) => entry.id !== selectedProduct.id)?.id ?? null);
                        });
                      }
                    }}
                  >
                    Delete Product
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="brand-section p-5">
              <div className="brand-section-title">Store Controls</div>
              <div className="mt-4 grid gap-3">
                <input type="number" step="0.01" className="brand-input" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                <button type="button" className="touch-button bg-[#263362] text-white" onClick={() => void onTaxSave(Math.round(Number(taxRate || "0") * 100))}>
                  Save Tax Rate
                </button>
                <div className="brand-divider" />
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between border border-[#e1e9f2] px-3 py-2">
                      <span className="font-semibold text-[#263362]">{category.name}</span>
                      <span className="text-xs uppercase tracking-[0.16em] text-[#263362]/45">
                        {bootstrap.products.filter((product) => product.categoryId === category.id).length} items
                      </span>
                    </div>
                  ))}
                </div>
                <input className="brand-input" placeholder="New category" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                <button
                  type="button"
                  className="touch-button bg-[#f7fbff] text-[#263362]"
                  onClick={() =>
                    void onCreateCategory({
                      name: newCategoryName,
                      enabled: true,
                      sortOrder: bootstrap.categories.length + 1,
                    }).then(() => setNewCategoryName(""))
                  }
                >
                  Add Category
                </button>
              </div>
            </div>

            <div className="brand-section p-5">
              <div className="brand-section-title">Size Library</div>
              <div className="mt-4 space-y-3">
                {bootstrap.sizes.map((size) => (
                  <div key={size.id} className="border border-[#e1e9f2] p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-[#263362]">{size.name}</div>
                      <div className="text-sm text-[#5190E6]">{formatCurrency(size.priceDeltaCents)}</div>
                    </div>
                    <button
                      type="button"
                      className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#263362]/50 hover:text-[#263362]"
                      onClick={() => void onSizeSave(size.id, { name: size.name, priceDeltaCents: size.priceDeltaCents, enabled: !size.enabled, sortOrder: size.sortOrder })}
                    >
                      {size.enabled ? "Hide Size" : "Re-enable Size"}
                    </button>
                  </div>
                ))}
                <input className="brand-input" placeholder="New size name" value={newSize.name} onChange={(e) => setNewSize((state) => ({ ...state, name: e.target.value }))} />
                <input className="brand-input" placeholder="Price delta" value={newSize.price} onChange={(e) => setNewSize((state) => ({ ...state, price: e.target.value }))} />
                <button
                  type="button"
                  className="touch-button bg-[#f7fbff] text-[#263362]"
                  onClick={() =>
                    void onCreateSize({
                      name: newSize.name,
                      priceDeltaCents: Math.round(Number(newSize.price || "0") * 100),
                      enabled: true,
                      sortOrder: bootstrap.sizes.length + 1,
                    }).then(() => setNewSize({ name: "", price: "0.00" }))
                  }
                >
                  Add Size
                </button>
              </div>
            </div>

            <div className="brand-section p-5">
              <div className="brand-section-title">Flavor Library</div>
              <div className="mt-4 space-y-3">
                {bootstrap.modifiers.map((modifier) => (
                  <div key={modifier.id} className="border border-[#e1e9f2] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#263362]">{modifier.name}</div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[#263362]/42">
                          {modifier.discountFlavor ? "Discount flavor" : "Standard flavor"}
                        </div>
                      </div>
                      <div className="text-sm text-[#5190E6]">{formatCurrency(modifier.priceCents)}</div>
                    </div>
                    <button
                      type="button"
                      className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#263362]/50 hover:text-[#263362]"
                      onClick={() =>
                        void onFlavorSave(modifier.id, {
                          name: modifier.name,
                          priceCents: modifier.priceCents,
                          discountFlavor: modifier.discountFlavor,
                          enabled: !modifier.enabled,
                          sortOrder: modifier.sortOrder,
                        })
                      }
                    >
                      {modifier.enabled ? "Hide Flavor" : "Re-enable Flavor"}
                    </button>
                  </div>
                ))}
                <input className="brand-input" placeholder="New flavor name" value={newFlavor.name} onChange={(e) => setNewFlavor((state) => ({ ...state, name: e.target.value }))} />
                <input className="brand-input" placeholder="Price adjustment" value={newFlavor.price} onChange={(e) => setNewFlavor((state) => ({ ...state, price: e.target.value }))} />
                <label className="brand-chip brand-chip-soft">
                  <input type="checkbox" checked={newFlavor.discount} onChange={(e) => setNewFlavor((state) => ({ ...state, discount: e.target.checked }))} />
                  Discount flavor
                </label>
                <button
                  type="button"
                  className="touch-button bg-[#f7fbff] text-[#263362]"
                  onClick={() =>
                    void onCreateFlavor({
                      name: newFlavor.name,
                      priceCents: Math.round(Number(newFlavor.price || "0") * 100),
                      discountFlavor: newFlavor.discount,
                      enabled: true,
                      sortOrder: bootstrap.modifiers.length + 1,
                    }).then(() => setNewFlavor({ name: "", price: "0.00", discount: false }))
                  }
                >
                  Add Flavor
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
