import {
  formatCurrency,
  type AnalyticsRangeResponse,
  type BootstrapResponse,
  type UpsertCategoryInput,
  type UpsertFlavorCategoryInput,
  type UpsertModifierInput,
  type UpsertProductInput,
  type UpsertSizeOptionInput,
} from "@rhc-pos/shared";
import { ChevronUp, ChevronDown, Package, Settings, FolderOpen, Ruler, Droplets, ArrowLeft, Pencil, Trash2, Plus } from "lucide-react";
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
  onCreateFlavorCategory: (input: UpsertFlavorCategoryInput) => Promise<void>;
  onFlavorCategorySave: (categoryId: string, input: Partial<UpsertFlavorCategoryInput>) => Promise<void>;
  onFlavorCategoryDelete: (categoryId: string) => Promise<void>;
}

type AdminSubPage = "products" | "store" | "categories" | "sizes" | "flavors" | null;
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

function SubPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-xl bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.14]"
        onClick={onBack}
      >
        <ArrowLeft size={15} /> Back
      </button>
      <div className="font-display text-2xl font-extrabold text-white">{title}</div>
    </div>
  );
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
  onCreateFlavorCategory,
  onFlavorCategorySave,
  onFlavorCategoryDelete,
}: InventoryControlPageProps) {
  const confirm = useConfirm();
  const [subPage, setSubPage] = useState<AdminSubPage>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [taxRate, setTaxRate] = useState((bootstrap.settings.taxRateBasisPoints / 100).toFixed(2));
  const [productModal, setProductModal] = useState<{ mode: "create" | "edit"; productId: string | null } | null>(null);
  const [productDraft, setProductDraft] = useState<UpsertProductInput>(() => defaultProductDraft(bootstrap));
  const [productPriceStr, setProductPriceStr] = useState("0.00");
  const [productDiscountStr, setProductDiscountStr] = useState("0.00");
  const [productSortOrderStr, setProductSortOrderStr] = useState("1");
  const [productError, setProductError] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSize, setNewSize] = useState({ name: "", price: "0.00" });
  const [newFlavor, setNewFlavor] = useState({ name: "", price: "0.00", discount: false, flavorCategoryId: "" });
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, CategoryDraft>>({});
  const [sizeDrafts, setSizeDrafts] = useState<Record<string, SizeDraft>>({});
  const [successFlashToken, setSuccessFlashToken] = useState(0);
  const [selectedFlavorCategoryId, setSelectedFlavorCategoryId] = useState<string>("all");
  const [newFlavorCategoryName, setNewFlavorCategoryName] = useState("");
  const [editingFlavorCategory, setEditingFlavorCategory] = useState<{ id: string; name: string } | null>(null);
  const [editingFlavor, setEditingFlavor] = useState<{ id: string; name: string; price: string; discount: boolean; flavorCategoryId: string } | null>(null);

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
    if (productModal?.mode === "create") {
      setProductDraft(defaultProductDraft(bootstrap));
      setProductPriceStr("0.00");
      setProductDiscountStr("0.00");
      setProductSortOrderStr(String(bootstrap.products.length + 1));
      return;
    }
    if (productModal?.mode === "edit" && selectedProduct) {
      setProductDraft(toProductDraft(selectedProduct));
      setProductPriceStr((selectedProduct.priceCents / 100).toFixed(2));
      setProductDiscountStr((selectedProduct.discountCents / 100).toFixed(2));
      setProductSortOrderStr(String(selectedProduct.sortOrder));
    }
  }, [productModal?.mode, productModal?.productId, selectedProduct?.id]);

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
      const payload = {
        ...productDraft,
        priceCents: moneyInputToCents(productPriceStr),
        discountCents: moneyInputToCents(productDiscountStr),
        sortOrder: Number(productSortOrderStr || "0"),
      };
      if (productModal?.mode === "create") await onCreateProduct(payload);
      else if (selectedProduct) await onProductSave(selectedProduct.id, payload);
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
    const confirmed = await confirm({ message: `Delete "${selectedProduct.name}"? This cannot be undone.` });
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

  const handleReorderProduct = async (productId: string, direction: "up" | "down") => {
    const index = visibleProducts.findIndex((p) => p.id === productId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= visibleProducts.length) return;
    const a = visibleProducts[index];
    const b = visibleProducts[swapIndex];
    try {
      await Promise.all([
        onProductSave(a.id, { ...toProductDraft(a), sortOrder: b.sortOrder }),
        onProductSave(b.id, { ...toProductDraft(b), sortOrder: a.sortOrder }),
      ]);
      triggerSuccessFlash();
    } catch {
      // silent
    }
  };

  // ── Hub tiles ──────────────────────────────────────────────────────────────

  const HUB_TILES = [
    {
      key: "products" as AdminSubPage,
      icon: Package,
      label: "Products",
      description: "Add, edit, and reorder catalog items",
      stat: `${activeProducts} active`,
    },
    {
      key: "categories" as AdminSubPage,
      icon: FolderOpen,
      label: "Categories",
      description: "Manage product groupings",
      stat: `${bootstrap.categories.length} total`,
    },
    {
      key: "sizes" as AdminSubPage,
      icon: Ruler,
      label: "Sizes",
      description: "Cup sizes and price deltas",
      stat: `${bootstrap.sizes.filter((s) => s.enabled).length} enabled`,
    },
    {
      key: "flavors" as AdminSubPage,
      icon: Droplets,
      label: "Flavors",
      description: "Syrups, add-ons, and discount flavors",
      stat: `${bootstrap.modifiers.filter((m) => m.enabled).length} enabled`,
    },
    {
      key: "store" as AdminSubPage,
      icon: Settings,
      label: "Store Controls",
      description: "Tax rate and global settings",
      stat: `${(bootstrap.settings.taxRateBasisPoints / 100).toFixed(2)}% tax`,
    },
  ] as const;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[720px] p-4 md:p-5">
      <div className="mx-auto flex min-h-[720px] max-w-[1600px] flex-col">

        {/* Top header — only shown on hub */}
        {subPage === null && (
          <AdminWorkspaceHeader
            eyebrow="Admin Workbench"
            title="Inventory Control"
            description="Select a section below to manage your catalog, sizes, flavors, categories, or store settings."
            activeTab="inventory"
            onSelectTab={(tab) => { if (tab === "analytics") onNavigateAnalytics(); }}
            onClose={onClose}
          />
        )}

        {/* Sub-page back header */}
        {subPage !== null && (
          <div className="mb-6 flex items-center justify-between">
            <SubPageHeader
              title={{ products: "Products", categories: "Categories", sizes: "Sizes", flavors: "Flavors", store: "Store Controls" }[subPage]}
              onBack={() => { setSubPage(null); setLibraryError(null); }}
            />
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.14]"
              onClick={onClose}
            >
              <ArrowLeft size={15} /> Back to Register
            </button>
          </div>
        )}

        {/* ── HUB ── */}
        {subPage === null && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {HUB_TILES.map(({ key, icon: Icon, label, description, stat }) => (
              <button
                key={key}
                type="button"
                className="flex flex-col items-start gap-4 rounded-2xl bg-[#323232] p-5 text-left transition hover:bg-[#383838] active:scale-[0.98]"
                onClick={() => setSubPage(key)}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1be4db]/10">
                  <Icon size={22} className="text-[#1be4db]" />
                </div>
                <div>
                  <div className="font-display text-lg font-extrabold text-white">{label}</div>
                  <div className="mt-1 text-xs text-white/55">{description}</div>
                </div>
                <div className="mt-auto rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-white/70">
                  {stat}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {subPage === "products" && (
          <section className="overflow-hidden rounded-xl">
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
                <input className="brand-input" placeholder="Search product name" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="brand-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex items-center justify-start lg:justify-end">
                  <button type="button" className="touch-button" onClick={openCreateModal}>Add Product</button>
                </div>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-[#383838] text-[10px] uppercase tracking-wider text-white/75">
                  <tr>
                    <th className="w-12 px-2 py-3" />
                    <th className="px-5 py-3 text-left">Product</th>
                    <th className="px-5 py-3 text-left">Category</th>
                    <th className="px-5 py-3 text-right">Price</th>
                    <th className="px-5 py-3 text-right">14d Units</th>
                    <th className="px-5 py-3 text-left">Last Sold</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {visibleProducts.map((product, index) => {
                    const metric = productMetrics.get(product.id);
                    return (
                      <tr key={product.id} className="cursor-pointer transition hover:bg-white/[0.03]" onClick={() => openEditModal(product.id)}>
                        <td className="w-12 px-2 py-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              className="rounded p-1 text-white/40 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-default disabled:opacity-20"
                              onClick={() => void handleReorderProduct(product.id, "up")}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={index === visibleProducts.length - 1}
                              className="rounded p-1 text-white/40 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-default disabled:opacity-20"
                              onClick={() => void handleReorderProduct(product.id, "down")}
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white">{product.name}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-wider text-white/42">{product.id}</div>
                        </td>
                        <td className="px-5 py-4 text-white/80">
                          {categories.find((c) => c.id === product.categoryId)?.name ?? product.categoryId}
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
        )}

        {/* ── CATEGORIES ── */}
        {subPage === "categories" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-xl">
              <div className="bg-[#323232] px-5 py-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Library</div>
                <div className="mt-1 font-display text-2xl font-extrabold text-white">Categories</div>
              </div>
              <div className="grid gap-3 p-4">
                {categories.map((category) => {
                  const draft = categoryDrafts[category.id];
                  const productCount = bootstrap.products.filter((p) => p.categoryId === category.id).length;
                  if (!draft) return null;
                  return (
                    <div key={category.id} className="rounded-lg bg-white/[0.02] p-3">
                      <div className="grid gap-3">
                        <input
                          className="brand-input"
                          value={draft.name}
                          onChange={(e) => setCategoryDrafts((s) => ({ ...s, [category.id]: { ...s[category.id], name: e.target.value } }))}
                        />
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            className="brand-input"
                            value={draft.sortOrder}
                            onChange={(e) => setCategoryDrafts((s) => ({ ...s, [category.id]: { ...s[category.id], sortOrder: e.target.value } }))}
                          />
                          <label className="brand-chip brand-chip-soft">
                            <input
                              type="checkbox"
                              checked={draft.enabled}
                              onChange={(e) => setCategoryDrafts((s) => ({ ...s, [category.id]: { ...s[category.id], enabled: e.target.checked } }))}
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
                            onClick={() => void handleLibraryAction(
                              () => onCategorySave(category.id, { name: draft.name, sortOrder: Number(draft.sortOrder || "0"), enabled: draft.enabled }),
                              "Unable to update category.",
                            )}
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
                  <input className="brand-input" placeholder="New category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                  <button
                    type="button"
                    className="touch-button bg-[#1be4db] text-[#262626]"
                    onClick={() => void handleLibraryAction(async () => {
                      await onCreateCategory({ name: newCategoryName, enabled: true, sortOrder: bootstrap.categories.length + 1 });
                      setNewCategoryName("");
                    }, "Unable to create category.")}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SIZES ── */}
        {subPage === "sizes" && (
          <div className="overflow-hidden rounded-xl">
            <div className="bg-[#323232] px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Library</div>
              <div className="mt-1 font-display text-2xl font-extrabold text-white">Sizes</div>
            </div>
            <div className="grid gap-3 p-4 xl:grid-cols-2">
              {bootstrap.sizes.map((size) => {
                const draft = sizeDrafts[size.id];
                if (!draft) return null;
                return (
                  <div key={size.id} className="rounded-lg bg-white/[0.02] p-3">
                    <div className="grid gap-2">
                      <input
                        className="brand-input"
                        value={draft.name}
                        onChange={(e) => setSizeDrafts((s) => ({ ...s, [size.id]: { ...s[size.id], name: e.target.value } }))}
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        className="brand-input"
                        value={draft.price}
                        onChange={(e) => {
                          if (!isMoneyInput(e.target.value)) return;
                          setSizeDrafts((s) => ({ ...s, [size.id]: { ...s[size.id], price: e.target.value } }));
                        }}
                        onBlur={() => setSizeDrafts((s) => ({ ...s, [size.id]: { ...s[size.id], price: normalizeMoneyInput(s[size.id]?.price ?? "0") } }))}
                      />
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          className="brand-input"
                          value={draft.sortOrder}
                          onChange={(e) => setSizeDrafts((s) => ({ ...s, [size.id]: { ...s[size.id], sortOrder: e.target.value } }))}
                        />
                        <label className="brand-chip brand-chip-soft">
                          <input
                            type="checkbox"
                            checked={draft.enabled}
                            onChange={(e) => setSizeDrafts((s) => ({ ...s, [size.id]: { ...s[size.id], enabled: e.target.checked } }))}
                          />
                          Enabled
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="touch-button flex-1"
                          onClick={() => void handleLibraryAction(
                            () => onSizeSave(size.id, {
                              name: draft.name,
                              priceDeltaCents: Math.round(Number(draft.price || "0") * 100),
                              enabled: draft.enabled,
                              sortOrder: Number(draft.sortOrder || "0"),
                            }),
                            "Unable to update size.",
                          )}
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
              <div className="rounded-lg bg-white/[0.02] p-3">
                <div className="grid gap-2">
                  <input className="brand-input" placeholder="New size name" value={newSize.name} onChange={(e) => setNewSize((s) => ({ ...s, name: e.target.value }))} />
                  <input
                    type="text"
                    inputMode="decimal"
                    className="brand-input"
                    placeholder="Price delta (e.g. 0.50)"
                    value={newSize.price}
                    onChange={(e) => {
                      if (!isMoneyInput(e.target.value)) return;
                      setNewSize((s) => ({ ...s, price: e.target.value }));
                    }}
                    onBlur={() => setNewSize((s) => ({ ...s, price: normalizeMoneyInput(s.price) }))}
                  />
                  <button
                    type="button"
                    className="touch-button bg-[#1be4db] text-[#262626]"
                    onClick={() => void handleLibraryAction(async () => {
                      await onCreateSize({ name: newSize.name, priceDeltaCents: Math.round(Number(newSize.price || "0") * 100), enabled: true, sortOrder: bootstrap.sizes.length + 1 });
                      setNewSize({ name: "", price: "0.00" });
                    }, "Unable to create size.")}
                  >
                    Add Size
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FLAVORS ── */}
        {subPage === "flavors" && (() => {
          const flavorCategories = bootstrap.flavorCategories ?? [];
          const visibleModifiers = bootstrap.modifiers.filter((m) =>
            selectedFlavorCategoryId === "all" ? true
            : selectedFlavorCategoryId === "uncategorized" ? !m.flavorCategoryId
            : m.flavorCategoryId === selectedFlavorCategoryId,
          );
          return (
            <div className="grid gap-4 xl:grid-cols-[300px_1fr]">

              {/* LEFT — flavor categories */}
              <div className="overflow-hidden rounded-xl">
                <div className="bg-[#323232] px-5 py-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Groups</div>
                  <div className="mt-1 font-display text-xl font-extrabold text-white">Flavor Categories</div>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  <button type="button"
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition ${selectedFlavorCategoryId === "all" ? "bg-[#1be4db]/10 text-[#1be4db]" : "text-white/70 hover:bg-white/[0.03] hover:text-white"}`}
                    onClick={() => setSelectedFlavorCategoryId("all")}
                  >
                    <span>All Flavors</span>
                    <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px]">{bootstrap.modifiers.length}</span>
                  </button>
                  {flavorCategories.map((fc) => (
                    <div key={fc.id} className={`group flex items-center gap-2 px-4 py-3 transition ${selectedFlavorCategoryId === fc.id ? "bg-[#1be4db]/10" : "hover:bg-white/[0.03]"}`}>
                      <button type="button"
                        className={`flex flex-1 items-center justify-between text-left text-sm font-semibold transition ${selectedFlavorCategoryId === fc.id ? "text-[#1be4db]" : "text-white/70 hover:text-white"}`}
                        onClick={() => setSelectedFlavorCategoryId(fc.id)}
                      >
                        <span>{fc.name}</span>
                        <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px]">{bootstrap.modifiers.filter(m => m.flavorCategoryId === fc.id).length}</span>
                      </button>
                      <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                        <button type="button" className="rounded p-1 text-white/40 hover:text-white" onClick={() => setEditingFlavorCategory({ id: fc.id, name: fc.name })}><Pencil size={12} /></button>
                        <button type="button" className="rounded p-1 text-rose-400/60 hover:text-rose-300" onClick={() => void handleLibraryAction(() => onFlavorCategoryDelete(fc.id), "Unable to delete category.")}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                  {bootstrap.modifiers.some(m => !m.flavorCategoryId) && (
                    <button type="button"
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition ${selectedFlavorCategoryId === "uncategorized" ? "bg-[#1be4db]/10 text-[#1be4db]" : "text-white/70 hover:bg-white/[0.03] hover:text-white"}`}
                      onClick={() => setSelectedFlavorCategoryId("uncategorized")}
                    >
                      <span className="italic opacity-70">Uncategorized</span>
                      <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px]">{bootstrap.modifiers.filter(m => !m.flavorCategoryId).length}</span>
                    </button>
                  )}
                </div>
                <div className="border-t border-white/5 p-3">
                  {editingFlavorCategory ? (
                    <div className="grid gap-2">
                      <input className="brand-input" value={editingFlavorCategory.name} onChange={(e) => setEditingFlavorCategory((s) => s ? { ...s, name: e.target.value } : null)} />
                      <div className="flex gap-2">
                        <button type="button" className="touch-button flex-1 bg-[#1be4db] text-[#262626]" onClick={() => void handleLibraryAction(async () => {
                          await onFlavorCategorySave(editingFlavorCategory.id, { name: editingFlavorCategory.name });
                          setEditingFlavorCategory(null);
                        }, "Unable to update.")}>Save</button>
                        <button type="button" className="touch-button" onClick={() => setEditingFlavorCategory(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input className="brand-input flex-1" placeholder="New group name" value={newFlavorCategoryName} onChange={(e) => setNewFlavorCategoryName(e.target.value)} />
                      <button type="button"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1be4db]/10 text-[#1be4db] hover:bg-[#1be4db]/20"
                        onClick={() => void handleLibraryAction(async () => {
                          if (!newFlavorCategoryName.trim()) return;
                          await onCreateFlavorCategory({ name: newFlavorCategoryName, sortOrder: flavorCategories.length + 1 });
                          setNewFlavorCategoryName("");
                        }, "Unable to create category.")}
                      ><Plus size={16} /></button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT — flavors list + add/edit form */}
              <div className="overflow-hidden rounded-xl">
                <div className="flex items-center justify-between bg-[#323232] px-5 py-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Flavors</div>
                    <div className="mt-1 font-display text-xl font-extrabold text-white">
                      {selectedFlavorCategoryId === "all" ? "All Flavors" : selectedFlavorCategoryId === "uncategorized" ? "Uncategorized" : (flavorCategories.find(fc => fc.id === selectedFlavorCategoryId)?.name ?? "Flavors")}
                    </div>
                  </div>
                  <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-white/60">{visibleModifiers.length} items</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {visibleModifiers.map((modifier) => (
                    <div key={modifier.id} className="group flex items-center gap-3 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className={`font-semibold ${modifier.enabled ? "text-white" : "text-white/35"}`}>{modifier.name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/45">
                          <span>{modifier.discountFlavor ? "Discount" : "Add-on"}</span>
                          {modifier.flavorCategoryId && (
                            <span className="rounded-full bg-white/[0.06] px-2 py-0.5">{flavorCategories.find(fc => fc.id === modifier.flavorCategoryId)?.name}</span>
                          )}
                          {!modifier.enabled && <span className="text-white/30">· Hidden</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-[#1be4db]">
                        {modifier.priceCents === 0 ? "Free" : `${modifier.discountFlavor ? "-" : "+"}${formatCurrency(Math.abs(modifier.priceCents))}`}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button type="button" className="rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] font-semibold text-white/70 hover:text-white"
                          onClick={() => void handleLibraryAction(() => onFlavorSave(modifier.id, { ...modifier, enabled: !modifier.enabled }), "Unable to update.")}
                        >{modifier.enabled ? "Hide" : "Show"}</button>
                        <button type="button" className="rounded p-1.5 text-white/40 hover:text-white"
                          onClick={() => setEditingFlavor({ id: modifier.id, name: modifier.name, price: (modifier.priceCents / 100).toFixed(2), discount: modifier.discountFlavor, flavorCategoryId: modifier.flavorCategoryId ?? "" })}
                        ><Pencil size={13} /></button>
                      </div>
                    </div>
                  ))}
                  {visibleModifiers.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-white/35">No flavors in this group yet.</div>
                  )}
                </div>
                <div className="border-t border-white/5 p-4">
                  {editingFlavor ? (
                    <div className="grid gap-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Editing: {editingFlavor.name}</div>
                      <input className="brand-input" value={editingFlavor.name} onChange={(e) => setEditingFlavor((s) => s ? { ...s, name: e.target.value } : null)} />
                      <input type="text" inputMode="decimal" className="brand-input" placeholder="Price" value={editingFlavor.price}
                        onChange={(e) => { if (!isMoneyInput(e.target.value)) return; setEditingFlavor((s) => s ? { ...s, price: e.target.value } : null); }}
                        onBlur={() => setEditingFlavor((s) => s ? { ...s, price: normalizeMoneyInput(s.price) } : null)}
                      />
                      <select className="brand-select" value={editingFlavor.flavorCategoryId} onChange={(e) => setEditingFlavor((s) => s ? { ...s, flavorCategoryId: e.target.value } : null)}>
                        <option value="">Uncategorized</option>
                        {flavorCategories.map(fc => <option key={fc.id} value={fc.id}>{fc.name}</option>)}
                      </select>
                      <label className="brand-chip brand-chip-soft"><input type="checkbox" checked={editingFlavor.discount} onChange={(e) => setEditingFlavor((s) => s ? { ...s, discount: e.target.checked } : null)} /> Discount flavor</label>
                      <div className="flex gap-2">
                        <button type="button" className="touch-button flex-1 bg-[#1be4db] text-[#262626]" onClick={() => void handleLibraryAction(async () => {
                          if (!editingFlavor) return;
                          const orig = bootstrap.modifiers.find(m => m.id === editingFlavor.id);
                          await onFlavorSave(editingFlavor.id, { name: editingFlavor.name, priceCents: Math.round(Number(editingFlavor.price || "0") * 100), discountFlavor: editingFlavor.discount, enabled: orig?.enabled ?? true, sortOrder: orig?.sortOrder ?? 0, flavorCategoryId: editingFlavor.flavorCategoryId || null });
                          setEditingFlavor(null);
                        }, "Unable to save.")}>Save</button>
                        <button type="button" className="touch-button" onClick={() => setEditingFlavor(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Add New Flavor</div>
                      <input className="brand-input" placeholder="Name" value={newFlavor.name} onChange={(e) => setNewFlavor((s) => ({ ...s, name: e.target.value }))} />
                      <input type="text" inputMode="decimal" className="brand-input" placeholder="Price (e.g. 0.50)" value={newFlavor.price}
                        onChange={(e) => { if (!isMoneyInput(e.target.value)) return; setNewFlavor((s) => ({ ...s, price: e.target.value })); }}
                        onBlur={() => setNewFlavor((s) => ({ ...s, price: normalizeMoneyInput(s.price) }))}
                      />
                      <select className="brand-select" value={newFlavor.flavorCategoryId} onChange={(e) => setNewFlavor((s) => ({ ...s, flavorCategoryId: e.target.value }))}>
                        <option value="">Uncategorized</option>
                        {flavorCategories.map(fc => <option key={fc.id} value={fc.id}>{fc.name}</option>)}
                      </select>
                      <label className="brand-chip brand-chip-soft"><input type="checkbox" checked={newFlavor.discount} onChange={(e) => setNewFlavor((s) => ({ ...s, discount: e.target.checked }))} /> Discount flavor</label>
                      <button type="button" className="touch-button bg-[#1be4db] text-[#262626]"
                        onClick={() => void handleLibraryAction(async () => {
                          await onCreateFlavor({ name: newFlavor.name, priceCents: Math.round(Number(newFlavor.price || "0") * 100), discountFlavor: newFlavor.discount, enabled: true, sortOrder: bootstrap.modifiers.length + 1, flavorCategoryId: newFlavor.flavorCategoryId || null });
                          setNewFlavor({ name: "", price: "0.00", discount: false, flavorCategoryId: (selectedFlavorCategoryId === "all" || selectedFlavorCategoryId === "uncategorized") ? "" : selectedFlavorCategoryId });
                        }, "Unable to create flavor.")}
                      >Add Flavor</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── STORE CONTROLS ── */}
        {subPage === "store" && (
          <div className="max-w-md overflow-hidden rounded-xl">
            <div className="bg-[#323232] px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Settings</div>
              <div className="mt-1 font-display text-2xl font-extrabold text-white">Store Controls</div>
            </div>
            <div className="grid gap-3 p-4">
              <label className="grid gap-1.5">
                <span className="brand-kicker">Tax Rate (%)</span>
                <input type="text" inputMode="decimal" className="brand-input" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </label>
              <button
                type="button"
                className="touch-button bg-[#1be4db] text-[#262626]"
                onClick={() => void handleLibraryAction(() => onTaxSave(Math.round(Number(taxRate || "0") * 100)), "Unable to update tax rate.")}
              >
                Save Tax Rate
              </button>
              <div className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-xs font-medium leading-5 text-white/85">
                Enabled sizes and enabled flavors are available to every product globally.
              </div>
            </div>
          </div>
        )}

        {libraryError && (
          <div className="mt-5 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">{libraryError}</div>
        )}

        {/* ── Product modal ── */}
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
                    <input className="brand-input" value={productDraft.name} onChange={(e) => setProductDraft((d) => ({ ...d, name: e.target.value }))} />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="brand-kicker">Category</span>
                    <select className="brand-select" value={productDraft.categoryId} onChange={(e) => setProductDraft((d) => ({ ...d, categoryId: e.target.value }))}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="brand-kicker">Price</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="brand-input"
                      value={productPriceStr}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (isMoneyInput(raw)) {
                          setProductPriceStr(raw);
                        }
                      }}
                      onBlur={() => setProductPriceStr(normalizeMoneyInput(productPriceStr))}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="brand-kicker">Sort Order</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="brand-input"
                      value={productSortOrderStr}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!isIntegerInput(raw)) return;
                        setProductSortOrderStr(raw);
                      }}
                      onBlur={() => setProductSortOrderStr(normalizeIntegerInput(productSortOrderStr))}
                    />
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                  <label className="brand-chip brand-chip-soft">
                    <input type="checkbox" checked={productDraft.enabled} onChange={(e) => setProductDraft((d) => ({ ...d, enabled: e.target.checked }))} />
                    Enabled
                  </label>
                  <label className="grid gap-1.5">
                    <span className="brand-kicker">Item Discount</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="brand-input"
                      value={productDiscountStr}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (isMoneyInput(raw)) {
                          setProductDiscountStr(raw);
                        }
                      }}
                      onBlur={() => setProductDiscountStr(normalizeMoneyInput(productDiscountStr))}
                    />
                  </label>
                </div>
                <div className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-xs font-medium leading-5 text-white/85">
                  Size and flavor assignment is global — any enabled size or flavor applies everywhere.
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
                  <button type="button" className="touch-button" onClick={closeProductModal}>Cancel</button>
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
