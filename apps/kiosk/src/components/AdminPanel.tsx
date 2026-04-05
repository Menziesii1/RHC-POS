import {
  formatCurrency,
  type BootstrapResponse,
  type Product,
  type UpsertCategoryInput,
  type UpsertModifierInput,
  type UpsertProductInput,
  type UpsertSizeOptionInput,
} from "@rhc-pos/shared";
import { useMemo, useState } from "react";

interface AdminPanelProps {
  bootstrap: BootstrapResponse;
  adminPin: string;
  onClose: () => void;
  onProductSave: (productId: string, patch: Partial<Product>) => Promise<void>;
  onCreateCategory: (input: UpsertCategoryInput) => Promise<void>;
  onCreateFlavor: (input: UpsertModifierInput) => Promise<void>;
  onCreateSize: (input: UpsertSizeOptionInput) => Promise<void>;
  onCreateProduct: (input: UpsertProductInput) => Promise<void>;
  onTaxSave: (taxRateBasisPoints: number) => Promise<void>;
}

export function AdminPanel({
  bootstrap,
  adminPin,
  onClose,
  onProductSave,
  onCreateCategory,
  onCreateFlavor,
  onCreateSize,
  onCreateProduct,
  onTaxSave,
}: AdminPanelProps) {
  const [taxRate, setTaxRate] = useState((bootstrap.settings.taxRateBasisPoints / 100).toFixed(2));
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
  const [newProduct, setNewProduct] = useState<UpsertProductInput>({
    name: "",
    categoryId: bootstrap.categories[0]?.id ?? "drink",
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
  const [drafts, setDrafts] = useState<
    Record<string, { priceCents: number; enabled: boolean; sortOrder: number; categoryId: string; modifierIds: string[] }>
  >({});

  const visibleProducts = useMemo(
    () => bootstrap.products.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [bootstrap.products],
  );
  const categories = useMemo(
    () => bootstrap.categories.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [bootstrap.categories],
  );

  return (
    <div className="touch-card min-h-[720px] p-6">
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

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="brand-section p-5">
          <div className="brand-section-title">Store Settings</div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="number"
              step="0.01"
              className="brand-input w-full max-w-[160px] text-lg"
              value={taxRate}
              onChange={(event) => setTaxRate(event.target.value)}
            />
            <button
              type="button"
              className="touch-button bg-[#263362] text-white"
              onClick={() => void onTaxSave(Math.round(Number(taxRate || "0") * 100))}
            >
              Save Tax Rate
            </button>
            <span className="text-sm text-[#263362]/60">Admin PIN loaded: {adminPin.length > 0 ? "yes" : "no"}</span>
          </div>
        </div>

        <div className="brand-section p-5">
          <div className="brand-section-title">Category Roster</div>
          <div className="mt-4 grid gap-2">
            {categories.map((category) => {
              const count = bootstrap.products.filter((product) => product.categoryId === category.id).length;
              return (
                <div key={category.id} className="brand-rail flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-semibold text-[#263362]">{category.name}</div>
                    <div className="text-sm text-[#263362]/60">{category.id}</div>
                  </div>
                  <div className="brand-chip brand-chip-accent">{count} items</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <div className="brand-section p-5">
          <div className="brand-section-title">Create Category</div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
            <input
              className="brand-input"
              placeholder="Category name"
              value={newCategory.name}
              onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              type="number"
              className="brand-input"
              value={newCategory.sortOrder}
              onChange={(event) =>
                setNewCategory((current) => ({ ...current, sortOrder: Number(event.target.value || "0") }))
              }
            />
            <button
              type="button"
              className="touch-button bg-[#263362] text-white"
              onClick={() =>
                void onCreateCategory(newCategory).then(() =>
                  setNewCategory({ name: "", sortOrder: bootstrap.categories.length + 2, enabled: true }),
                )
              }
            >
              Add
            </button>
          </div>
        </div>

        <div className="brand-section p-5">
          <div className="brand-section-title">Create Size</div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_0.9fr_auto]">
            <input
              className="brand-input"
              placeholder="Size name"
              value={newSize.name}
              onChange={(event) => setNewSize((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              className="brand-input"
              value={(newSize.priceDeltaCents / 100).toFixed(2)}
              onChange={(event) =>
                setNewSize((current) => ({
                  ...current,
                  priceDeltaCents: Math.round(Number(event.target.value || "0") * 100),
                }))
              }
            />
            <button
              type="button"
              className="touch-button bg-[#5190E6] text-white"
              onClick={() =>
                void onCreateSize(newSize).then(() =>
                  setNewSize({
                    name: "",
                    priceDeltaCents: 0,
                    enabled: true,
                    sortOrder: bootstrap.sizes.length + 2,
                  }),
                )
              }
            >
              Add
            </button>
          </div>
        </div>

        <div className="brand-section p-5">
          <div className="brand-section-title">Create Flavor / Syrup</div>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
              <input
                className="brand-input"
                placeholder="Flavor name"
                value={newFlavor.name}
                onChange={(event) => setNewFlavor((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                type="number"
                step="0.01"
                className="brand-input"
                value={(newFlavor.priceCents / 100).toFixed(2)}
                onChange={(event) =>
                  setNewFlavor((current) => ({
                    ...current,
                    priceCents: Math.round(Number(event.target.value || "0") * 100),
                  }))
                }
              />
            </div>
            <label className="brand-chip brand-chip-soft w-fit">
              <input
                type="checkbox"
                checked={newFlavor.discountFlavor}
                onChange={(event) =>
                  setNewFlavor((current) => ({ ...current, discountFlavor: event.target.checked }))
                }
              />
              Discount flavor
            </label>
            <button
              type="button"
              className="touch-button bg-[#263362] text-white"
              onClick={() =>
                void onCreateFlavor(newFlavor).then(() =>
                  setNewFlavor({
                    name: "",
                    priceCents: 0,
                    discountFlavor: false,
                    enabled: true,
                    sortOrder: bootstrap.modifiers.length + 2,
                  }),
                )
              }
            >
              Add Flavor
            </button>
          </div>
        </div>

        <div className="brand-section p-5">
          <div className="brand-section-title">Create Product</div>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="brand-input"
                placeholder="Product name"
                value={newProduct.name}
                onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))}
              />
              <select
                className="brand-select"
                value={newProduct.categoryId}
                onChange={(event) =>
                  setNewProduct((current) => ({ ...current, categoryId: event.target.value }))
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                className="brand-input"
                placeholder="Base price"
                value={(newProduct.priceCents / 100).toFixed(2)}
                onChange={(event) =>
                  setNewProduct((current) => ({
                    ...current,
                    priceCents: Math.round(Number(event.target.value || "0") * 100),
                  }))
                }
              />
              <select
                className="brand-select"
                value={newProduct.productType}
                onChange={(event) =>
                  setNewProduct((current) => ({
                    ...current,
                    productType: event.target.value as UpsertProductInput["productType"],
                  }))
                }
              >
                <option value="drink">Drink</option>
                <option value="food">Food</option>
                <option value="discount">Discount</option>
                <option value="kids">Kids</option>
              </select>
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
                        setNewProduct((current) => {
                          const sizeOptionIds = active
                            ? current.sizeOptionIds.filter((id) => id !== size.id)
                            : [...current.sizeOptionIds, size.id];
                          return {
                            ...current,
                            sizeOptionIds,
                            defaultSizeOptionId:
                              current.defaultSizeOptionId && sizeOptionIds.includes(current.defaultSizeOptionId)
                                ? current.defaultSizeOptionId
                                : sizeOptionIds[0] ?? null,
                            sizeOptionPrices: sizeOptionIds.map((id) => ({
                              sizeOptionId: id,
                              priceDeltaCents:
                                current.sizeOptionPrices.find((entry) => entry.sizeOptionId === id)?.priceDeltaCents ?? 0,
                            })),
                          };
                        })
                      }
                    >
                      {size.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="brand-kicker">Allowed Flavors</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {bootstrap.modifiers.map((modifier) => {
                  const active = newProduct.modifierIds.includes(modifier.id);
                  return (
                    <button
                      key={modifier.id}
                      type="button"
                      className={`brand-chip ${active ? "brand-chip-accent" : "brand-chip-soft"}`}
                      onClick={() =>
                        setNewProduct((current) => ({
                          ...current,
                          modifierIds: active
                            ? current.modifierIds.filter((id) => id !== modifier.id)
                            : [...current.modifierIds, modifier.id],
                        }))
                      }
                    >
                      {modifier.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className="touch-button bg-[#5190E6] text-white"
              onClick={() =>
                void onCreateProduct(newProduct).then(() =>
                  setNewProduct({
                    name: "",
                    categoryId: bootstrap.categories[0]?.id ?? "drink",
                    priceCents: 0,
                    discountCents: 0,
                    enabled: true,
                    sortOrder: bootstrap.products.length + 2,
                    productType: "drink",
                    modifierIds: [],
                    sizeOptionIds: [],
                    sizeOptionPrices: [],
                    defaultSizeOptionId: null,
                  }),
                )
              }
            >
              Add Product
            </button>
          </div>
        </div>
      </div>

      <div className="brand-section-title">Product Inventory</div>
      <div className="mt-4 space-y-4">
        {visibleProducts.map((product) => {
          const draft =
            drafts[product.id] ?? {
              priceCents: product.priceCents,
              enabled: product.enabled,
              sortOrder: product.sortOrder,
              categoryId: product.categoryId,
              modifierIds: product.modifierIds,
            };

          return (
            <div key={product.id} className="brand-section p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-display text-2xl font-extrabold text-[#263362]">{product.name}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm text-[#263362]/60">
                    <span>{product.id}</span>
                    <span>Category: {draft.categoryId}</span>
                    <span>Order: {draft.sortOrder}</span>
                  </div>
                </div>
                <label className="brand-chip brand-chip-soft">
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [product.id]: { ...draft, enabled: event.target.checked },
                      }))
                    }
                  />
                  Enabled
                </label>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-4">
                <label className="grid gap-2">
                  <span className="brand-kicker">Category</span>
                  <select
                    className="brand-select"
                    value={draft.categoryId}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [product.id]: { ...draft, categoryId: event.target.value },
                      }))
                    }
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="brand-kicker">Display Order</span>
                  <input
                    type="number"
                    className="brand-input"
                    value={draft.sortOrder}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [product.id]: { ...draft, sortOrder: Number(event.target.value || "0") },
                      }))
                    }
                  />
                </label>

                <label className="grid gap-2">
                  <span className="brand-kicker">Price</span>
                  <input
                    type="number"
                    step="0.01"
                    className="brand-input"
                    value={(draft.priceCents / 100).toFixed(2)}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [product.id]: {
                          ...draft,
                          priceCents: Math.round(Number(event.target.value || "0") * 100),
                        },
                      }))
                    }
                  />
                </label>

                <div className="grid gap-2">
                  <span className="brand-kicker">Allowed Flavors</span>
                  <div className="flex flex-wrap gap-2">
                    {bootstrap.modifiers.map((modifier) => {
                      const active = draft.modifierIds.includes(modifier.id);
                      return (
                        <button
                          key={modifier.id}
                          type="button"
                          className={`brand-chip ${active ? "brand-chip-accent" : "brand-chip-soft"}`}
                          onClick={() =>
                            setDrafts((current) => ({
                              ...current,
                              [product.id]: {
                                ...draft,
                                modifierIds: active
                                  ? draft.modifierIds.filter((id) => id !== modifier.id)
                                  : [...draft.modifierIds, modifier.id],
                              },
                            }))
                          }
                        >
                          {modifier.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="brand-chip brand-chip-soft">Current: {formatCurrency(product.priceCents)}</div>
                <button
                  type="button"
                  className="touch-button bg-[#5190E6] text-white"
                  onClick={() => void onProductSave(product.id, draft)}
                >
                  Save Item
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
