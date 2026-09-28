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
import { ChevronUp, ChevronDown, Package, Settings, FolderOpen, Ruler, Droplets, ArrowLeft, Plus, LayoutGrid } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { useConfirm } from "../lib/confirm";
import { ProductImagePicker } from "./ProductImagePicker";
import { AdminWorkspaceHeader } from "./AdminWorkspaceHeader";

interface InventoryControlPageProps {
  adminPin: string;
  bootstrap: BootstrapResponse;
  analytics: AnalyticsRangeResponse | null;
  onClose: () => void;
  onNavigateAnalytics: () => void;
  onNavigateTransactions: () => void;
  onCategorySave: (categoryId: string, input: Partial<UpsertCategoryInput>) => Promise<void>;
  onCategoryDelete: (categoryId: string) => Promise<void>;
  onProductSave: (productId: string, input: UpsertProductInput) => Promise<void>;
  onProductDelete: (productId: string) => Promise<void>;
  onCreateProduct: (input: UpsertProductInput) => Promise<void>;
  onSizeSave: (sizeId: string, input: UpsertSizeOptionInput) => Promise<void>;
  onSizeDelete: (sizeId: string) => Promise<void>;
  onFlavorSave: (modifierId: string, input: UpsertModifierInput) => Promise<void>;
  onFlavorDelete: (modifierId: string) => Promise<void>;
  onCreateCategory: (input: UpsertCategoryInput) => Promise<void>;
  onCreateFlavor: (input: UpsertModifierInput) => Promise<void>;
  onCreateSize: (input: UpsertSizeOptionInput) => Promise<void>;
  onTaxSave: (taxRateBasisPoints: number) => Promise<void>;
  onCreateFlavorCategory: (input: UpsertFlavorCategoryInput) => Promise<void>;
  onFlavorCategorySave: (categoryId: string, input: Partial<UpsertFlavorCategoryInput>) => Promise<void>;
  onFlavorCategoryDelete: (categoryId: string) => Promise<void>;
  onLockPinSave: (lockScreenPin: string) => Promise<void>;
}

type AdminSubPage = "products" | "store" | "categories" | "sizes" | "flavors" | null;
type CategoryDraft = { name: string; sortOrder: string; enabled: boolean };
type SizeDraft = { name: string; sortOrder: string; price: string; enabled: boolean };
type DeleteHoldTarget = { kind: "flavor" | "category"; id: string; label: string };

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

const HOLD_TO_ARM_MS = 1000;
const HOLD_TO_DELETE_MS = 1000;

function defaultProductDraft(bootstrap: BootstrapResponse): UpsertProductInput {
  return {
    name: "",
    imageId: null,
    customizable: true,
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
    imageId: product.imageId ?? null,
    customizable: product.customizable ?? true,
    categoryId: product.categoryId,
    priceCents: product.priceCents,
    discountCents: product.discountCents,
    enabled: product.enabled,
    sortOrder: product.sortOrder,
    productType: product.productType,
    modifierIds: product.modifierIds,
    sizeOptionIds: product.sizeOptionIds,
    sizeOptionPrices: product.sizeOptionPrices,
    defaultSizeOptionId: product.defaultSizeOptionId,
  };
}

function SubPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-xl bg-[var(--overlay-hover)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--overlay-hover)]"
        onClick={onBack}
      >
        <ArrowLeft size={15} /> Back
      </button>
      <div className="font-display text-2xl font-extrabold text-[var(--text-primary)]">{title}</div>
    </div>
  );
}

export function InventoryControlPage({
  adminPin,
  bootstrap,
  analytics,
  onClose,
  onNavigateAnalytics,
  onNavigateTransactions,
  onCategorySave,
  onCategoryDelete,
  onProductSave,
  onProductDelete,
  onCreateProduct,
  onSizeSave,
  onSizeDelete,
  onFlavorSave,
  onFlavorDelete,
  onCreateCategory,
  onCreateFlavor,
  onCreateSize,
  onTaxSave,
  onCreateFlavorCategory,
  onFlavorCategorySave,
  onFlavorCategoryDelete,
  onLockPinSave,
}: InventoryControlPageProps) {
  const confirm = useConfirm();
  const [subPage, setSubPage] = useState<AdminSubPage>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [taxRate, setTaxRate] = useState((bootstrap.settings.taxRateBasisPoints / 100).toFixed(2));
  const [lockScreenPin, setLockScreenPin] = useState("");
  const [productModal, setProductModal] = useState<{ mode: "create" | "edit"; productId: string | null } | null>(null);
  const [productDraft, setProductDraft] = useState<UpsertProductInput>(() => defaultProductDraft(bootstrap));
  const [productPriceStr, setProductPriceStr] = useState("0.00");
  const [productDiscountStr, setProductDiscountStr] = useState("0.00");
  const [productSortOrderStr, setProductSortOrderStr] = useState("1");
  const [productError, setProductError] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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
  const [showAddFlavorModal, setShowAddFlavorModal] = useState(false);
  const [showFlavorGrid, setShowFlavorGrid] = useState(false);
  const [showAddGroupInput, setShowAddGroupInput] = useState(false);
  const [deleteHoldTarget, setDeleteHoldTarget] = useState<DeleteHoldTarget | null>(null);
  const [deleteHoldProgress, setDeleteHoldProgress] = useState(0);
  const deleteHoldStartRef = useRef<{ target: DeleteHoldTarget; startedAt: number; pointerId: number; originX: number; originY: number } | null>(null);
  const deleteHoldRafRef = useRef<number | null>(null);
  const deleteHoldAwaitingConfirmRef = useRef(false);

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

  useEffect(() => () => clearDeleteHold(), []);

  const activeProducts = bootstrap.products.filter((product) => product.enabled).length;
  const canSubmitProduct = productDraft.name.trim().length > 0 && productDraft.categoryId.trim().length > 0 && !isSavingProduct && !isUploadingImage;

  const openCreateModal = () => { setProductError(null); setProductModal({ mode: "create", productId: null }); };
  const openEditModal = (productId: string) => { setProductError(null); setProductModal({ mode: "edit", productId }); };
  const closeProductModal = () => { setIsUploadingImage(false); setProductError(null); setProductModal(null); };
  const triggerSuccessFlash = () => setSuccessFlashToken(Date.now());

  const clearDeleteHold = () => {
    if (deleteHoldRafRef.current !== null) {
      window.cancelAnimationFrame(deleteHoldRafRef.current);
      deleteHoldRafRef.current = null;
    }
    deleteHoldStartRef.current = null;
    setDeleteHoldTarget(null);
    setDeleteHoldProgress(0);
    deleteHoldAwaitingConfirmRef.current = false;
  };

  const cancelDeleteHold = () => {
    if (deleteHoldAwaitingConfirmRef.current) {
      return;
    }
    clearDeleteHold();
  };

  const completeDeleteHold = async (target: DeleteHoldTarget, deleteAction: () => Promise<void>) => {
    const confirmed = await confirm({
      title: `Delete ${target.kind === "flavor" ? "Flavor" : "Category"}?`,
      message: `Delete "${target.label}"? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });

      if (!confirmed) {
        return;
      }

      await deleteAction();
  };

  const startDeleteHold =
    (target: DeleteHoldTarget, deleteAction: () => Promise<void>) => (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      cancelDeleteHold();

      const startedAt = performance.now();
      deleteHoldStartRef.current = {
        target,
        startedAt,
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
      };
      setDeleteHoldTarget(target);
      setDeleteHoldProgress(0);

      const step = (now: number) => {
        const current = deleteHoldStartRef.current;
        if (!current || current.target.id !== target.id || current.target.kind !== target.kind) {
          return;
        }

        const elapsed = now - current.startedAt;
        const progress =
          elapsed < HOLD_TO_ARM_MS
            ? 0
            : Math.min(1, (elapsed - HOLD_TO_ARM_MS) / HOLD_TO_DELETE_MS);
        setDeleteHoldProgress(progress);

        if (progress >= 1) {
          if (deleteHoldRafRef.current !== null) {
            window.cancelAnimationFrame(deleteHoldRafRef.current);
            deleteHoldRafRef.current = null;
          }
          deleteHoldStartRef.current = null;
          deleteHoldAwaitingConfirmRef.current = true;
          setDeleteHoldProgress(1);
          void (async () => {
            try {
              await completeDeleteHold(target, deleteAction);
            } finally {
              clearDeleteHold();
            }
          })();
          return;
        }

        deleteHoldRafRef.current = window.requestAnimationFrame(step);
      };

      deleteHoldRafRef.current = window.requestAnimationFrame(step);
    };

  const updateDeleteHoldPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const current = deleteHoldStartRef.current;
    if (!current || event.pointerId !== current.pointerId) {
      return;
    }

    const moved = Math.hypot(event.clientX - current.originX, event.clientY - current.originY);
    if (moved > 12) {
      cancelDeleteHold();
    }
  };

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
            onSelectTab={(tab) => {
              if (tab === "analytics") onNavigateAnalytics();
              else if (tab === "transactions") onNavigateTransactions();
            }}
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
              className="flex items-center gap-1.5 rounded-xl bg-[var(--overlay-hover)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--overlay-hover)]"
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
                className="flex flex-col items-start gap-4 rounded-2xl bg-[var(--bg-elevated)] p-5 text-left transition hover:bg-[var(--bg-card-hover)] active:scale-[0.98]"
                onClick={() => setSubPage(key)}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1be4db]/10">
                  <Icon size={22} className="text-[#1be4db]" />
                </div>
                <div>
                  <div className="font-display text-lg font-extrabold text-[var(--text-primary)]">{label}</div>
                  <div className="mt-1 text-xs text-[var(--text-dimmer)]">{description}</div>
                </div>
                <div className="mt-auto rounded-full bg-[var(--overlay-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
                  {stat}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {subPage === "products" && (
          <section className="overflow-hidden rounded-xl">
            <div className="bg-[var(--bg-elevated)] px-5 py-4 text-[var(--text-primary)]">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Catalog</div>
                  <div className="mt-1 font-display text-2xl font-extrabold tracking-tight">Products</div>
                </div>
                <div className="rounded-full bg-[var(--overlay-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
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
                <thead className="sticky top-0 z-10 bg-[var(--bg-grid-inner)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
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
                      <tr key={product.id} className="cursor-pointer transition hover:bg-[var(--overlay-soft)]" onClick={() => openEditModal(product.id)}>
                        <td className="w-12 px-2 py-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              className="rounded p-1 text-[var(--text-dimmer)] transition hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-20"
                              onClick={() => void handleReorderProduct(product.id, "up")}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={index === visibleProducts.length - 1}
                              className="rounded p-1 text-[var(--text-dimmer)] transition hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-20"
                              onClick={() => void handleReorderProduct(product.id, "down")}
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[var(--text-primary)]">{product.name}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-dimmest)]">{product.id}</div>
                        </td>
                        <td className="px-5 py-4 text-[var(--text-muted)]">
                          {categories.find((c) => c.id === product.categoryId)?.name ?? product.categoryId}
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-[var(--text-primary)]">{formatCurrency(product.priceCents)}</td>
                        <td className="px-5 py-4 text-right font-semibold text-[var(--text-primary)]">{metric?.quantity ?? 0}</td>
                        <td className="px-5 py-4 text-[var(--text-muted)]">{metric?.lastActiveDate ?? "No sales yet"}</td>
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
              <div className="bg-[var(--bg-elevated)] px-5 py-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Library</div>
                <div className="mt-1 font-display text-2xl font-extrabold text-[var(--text-primary)]">Categories</div>
              </div>
              <div className="grid gap-3 p-4">
                {categories.map((category) => {
                  const draft = categoryDrafts[category.id];
                  const productCount = bootstrap.products.filter((p) => p.categoryId === category.id).length;
                  if (!draft) return null;
                  return (
                    <div key={category.id} className="rounded-lg bg-[var(--overlay-soft)] p-3">
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
                        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
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
            <div className="bg-[var(--bg-elevated)] px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Library</div>
              <div className="mt-1 font-display text-2xl font-extrabold text-[var(--text-primary)]">Sizes</div>
            </div>
            <div className="grid gap-3 p-4 xl:grid-cols-2">
              {bootstrap.sizes.map((size) => {
                const draft = sizeDrafts[size.id];
                if (!draft) return null;
                return (
                  <div key={size.id} className="rounded-lg bg-[var(--overlay-soft)] p-3">
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
              <div className="rounded-lg bg-[var(--overlay-soft)] p-3">
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
            <div className="grid grid-cols-[220px_1fr] gap-4" style={{ minWidth: 0, height: "min(70vh, 640px)" }}>

              {/* LEFT — flavor categories */}
              <div className="flex min-h-0 flex-col overflow-hidden rounded-xl">
                <div className="bg-[var(--bg-elevated)] px-5 py-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Groups</div>
                  <div className="mt-1 font-display text-xl font-extrabold text-[var(--text-primary)]">Flavor Categories</div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
                  <button type="button"
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition ${selectedFlavorCategoryId === "all" ? "bg-[#1be4db]/10 text-[#1be4db]" : "text-[var(--text-muted)] hover:bg-[var(--overlay-soft)] hover:text-[var(--text-primary)]"}`}
                    onClick={() => setSelectedFlavorCategoryId("all")}
                  >
                    <span>All Flavors</span>
                    <span className="rounded-full bg-[var(--overlay-hover)] px-2 py-0.5 text-[11px]">{bootstrap.modifiers.length}</span>
                  </button>
                  {flavorCategories.map((fc) => {
                    const selected = selectedFlavorCategoryId === fc.id;
                    const deleteTarget = { kind: "category" as const, id: fc.id, label: fc.name };
                    return (
                      <div
                        key={fc.id}
                        className={`relative overflow-hidden flex flex-col gap-2 px-4 py-3 transition ${selected ? "bg-[#1be4db]/10" : "hover:bg-[var(--overlay-soft)]"}`}
                        onPointerDown={startDeleteHold(deleteTarget, () =>
                          handleLibraryAction(() => onFlavorCategoryDelete(fc.id), "Unable to delete category."),
                        )}
                        onPointerUp={cancelDeleteHold}
                        onPointerLeave={cancelDeleteHold}
                        onPointerCancel={cancelDeleteHold}
                        onPointerMove={updateDeleteHoldPointer}
                        onContextMenu={(event) => event.preventDefault()}
                      >
                        <button
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          className={`flex items-center justify-between text-left text-sm font-semibold transition ${selected ? "text-[#1be4db]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                          onClick={() => setSelectedFlavorCategoryId(fc.id)}
                        >
                          <span>{fc.name}</span>
                          <span className="rounded-full bg-[var(--overlay-hover)] px-2 py-0.5 text-[11px]">
                            {bootstrap.modifiers.filter(m => m.flavorCategoryId === fc.id).length}
                          </span>
                        </button>
                        {selected ? (
                          <div className="ml-auto flex w-fit flex-col items-end gap-2">
                            <button
                              type="button"
                              onPointerDown={(event) => event.stopPropagation()}
                              className="rounded-xl bg-[var(--overlay-soft)] px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] transition hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)] active:bg-[#1be4db]/15 active:text-[var(--text-primary)]"
                              onClick={() => setEditingFlavorCategory({ id: fc.id, name: fc.name })}
                            >
                              Edit
                            </button>
                          </div>
                        ) : null}
                        {deleteHoldTarget?.kind === "category" && deleteHoldTarget.id === fc.id && deleteHoldProgress > 0 ? (
                          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl bg-rose-500/10">
                            <div
                              className="absolute inset-0 origin-left bg-rose-500/60"
                              style={{ transform: `scaleX(${deleteHoldProgress})` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {bootstrap.modifiers.some(m => !m.flavorCategoryId) && (
                    <button type="button"
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition ${selectedFlavorCategoryId === "uncategorized" ? "bg-[#1be4db]/10 text-[#1be4db]" : "text-[var(--text-muted)] hover:bg-[var(--overlay-soft)] hover:text-[var(--text-primary)]"}`}
                      onClick={() => setSelectedFlavorCategoryId("uncategorized")}
                    >
                      <span className="italic opacity-70">Uncategorized</span>
                      <span className="rounded-full bg-[var(--overlay-hover)] px-2 py-0.5 text-[11px]">{bootstrap.modifiers.filter(m => !m.flavorCategoryId).length}</span>
                    </button>
                  )}
                </div>
                <div className="shrink-0 border-t border-[var(--divider)] p-3">
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
                  ) : showAddGroupInput ? (
                    <div className="grid gap-2">
                      <input
                        className="brand-input"
                        placeholder="Group name"
                        value={newFlavorCategoryName}
                        autoFocus
                        onChange={(e) => setNewFlavorCategoryName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") { setShowAddGroupInput(false); setNewFlavorCategoryName(""); } }}
                      />
                      <div className="flex gap-2">
                        <button type="button" className="touch-button flex-1 bg-[#1be4db] text-[#262626]"
                          onClick={() => void handleLibraryAction(async () => {
                            if (!newFlavorCategoryName.trim()) return;
                            await onCreateFlavorCategory({ name: newFlavorCategoryName, sortOrder: flavorCategories.length + 1 });
                            setNewFlavorCategoryName("");
                            setShowAddGroupInput(false);
                          }, "Unable to create category.")}
                        >Add</button>
                        <button type="button" className="touch-button" onClick={() => { setShowAddGroupInput(false); setNewFlavorCategoryName(""); }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button"
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--overlay-soft)] py-2 text-xs font-semibold text-[var(--text-dimmer)] hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)]/80"
                      onClick={() => setShowAddGroupInput(true)}
                    >
                      <Plus size={13} /> New Group
                    </button>
                  )}
                </div>
              </div>

              {/* RIGHT — flavors list + add/edit form */}
              <div className="flex min-h-0 flex-col overflow-hidden rounded-xl">
                <div className="flex items-center justify-between bg-[var(--bg-elevated)] px-5 py-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Flavors</div>
                    <div className="mt-1 font-display text-xl font-extrabold text-[var(--text-primary)]">
                      {selectedFlavorCategoryId === "all" ? "All Flavors" : selectedFlavorCategoryId === "uncategorized" ? "Uncategorized" : (flavorCategories.find(fc => fc.id === selectedFlavorCategoryId)?.name ?? "Flavors")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[var(--overlay-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--text-dimmer)]">{visibleModifiers.length} items</span>
                    <button
                      type="button"
                      aria-label="Grid view"
                      onClick={() => setShowFlavorGrid(true)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--overlay-soft)] text-[var(--text-dimmer)] hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)] transition"
                    >
                      <LayoutGrid size={15} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
                  {visibleModifiers.map((modifier) => {
                    const deleteTarget = { kind: "flavor" as const, id: modifier.id, label: modifier.name };
                    return (
                    <div
                      key={modifier.id}
                      className="relative overflow-hidden flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:gap-4"
                      onPointerDown={startDeleteHold(deleteTarget, () =>
                        handleLibraryAction(() => onFlavorDelete(modifier.id), "Unable to delete flavor."),
                      )}
                      onPointerUp={cancelDeleteHold}
                      onPointerLeave={cancelDeleteHold}
                      onPointerCancel={cancelDeleteHold}
                      onPointerMove={updateDeleteHoldPointer}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      <div className="relative z-10 min-w-0 flex-1">
                        <div className={`font-semibold ${modifier.enabled ? "text-[var(--text-primary)]" : "text-[var(--text-dimmest)]"}`}>{modifier.name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-dimmest)]">
                          <span>{modifier.discountFlavor ? "Discount" : "Add-on"}</span>
                          {modifier.flavorCategoryId && (
                            <span className="rounded-full bg-[var(--overlay-soft)] px-2 py-0.5">{flavorCategories.find(fc => fc.id === modifier.flavorCategoryId)?.name}</span>
                          )}
                          {!modifier.enabled && <span className="text-[var(--text-dimmest)]">· Hidden</span>}
                        </div>
                      </div>
                      <div className="relative z-10 flex items-center justify-between gap-3 md:shrink-0 md:flex-col md:items-end">
                        <div className="shrink-0 text-sm font-semibold text-[#1be4db]">
                          {modifier.priceCents === 0 ? "Free" : `${modifier.discountFlavor ? "-" : "+"}${formatCurrency(Math.abs(modifier.priceCents))}`}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            className="rounded-xl bg-[var(--overlay-soft)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)] active:bg-[#1be4db]/15 active:text-[var(--text-primary)]"
                            onClick={() => void handleLibraryAction(() => onFlavorSave(modifier.id, { ...modifier, enabled: !modifier.enabled }), "Unable to update.")}
                          >
                            {modifier.enabled ? "Hide" : "Show"}
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            className="rounded-xl bg-[var(--overlay-soft)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)] active:bg-[#1be4db]/15 active:text-[var(--text-primary)]"
                            onClick={() => setEditingFlavor({ id: modifier.id, name: modifier.name, price: (Math.abs(modifier.priceCents) / 100).toFixed(2), discount: modifier.discountFlavor, flavorCategoryId: modifier.flavorCategoryId ?? "" })}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      {deleteHoldTarget?.kind === "flavor" && deleteHoldTarget.id === modifier.id && deleteHoldProgress > 0 ? (
                        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl bg-rose-500/10">
                          <div
                            className="absolute inset-0 origin-left bg-rose-500/60"
                            style={{ transform: `scaleX(${deleteHoldProgress})` }}
                          />
                        </div>
                      ) : null}
                    </div>
                    );
                  })}
                  {visibleModifiers.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-[var(--text-dimmest)]">No flavors in this group yet.</div>
                  )}
                </div>
                <div className="border-t border-[var(--divider)] px-5 py-3 text-[11px] font-medium text-[var(--text-dimmest)]">
                  Hold a flavor for 1 second to delete it.
                </div>
                <div className="shrink-0 border-t border-[var(--divider)] p-2">
                  <button type="button"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--overlay-soft)] py-2.5 text-xs font-semibold text-[var(--text-dimmer)] hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)]/80"
                    onClick={() => {
                      setNewFlavor({ name: "", price: "0.00", discount: false, flavorCategoryId: (selectedFlavorCategoryId === "all" || selectedFlavorCategoryId === "uncategorized") ? "" : selectedFlavorCategoryId });
                      setShowAddFlavorModal(true);
                    }}
                  >
                    <Plus size={13} /> Add Flavor
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── STORE CONTROLS ── */}
        {subPage === "store" && (
          <div className="max-w-md overflow-hidden rounded-xl">
            <div className="bg-[var(--bg-elevated)] px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Settings</div>
              <div className="mt-1 font-display text-2xl font-extrabold text-[var(--text-primary)]">Store Controls</div>
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
              <label className="grid gap-1.5 pt-2">
                <span className="brand-kicker">Lock Screen PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  className="brand-input"
                  value={lockScreenPin}
                  onChange={(e) => setLockScreenPin(e.target.value)}
                  placeholder="Set a separate PIN"
                />
              </label>
              <button
                type="button"
                className="touch-button"
                onClick={() =>
                  void handleLibraryAction(async () => {
                    if (!lockScreenPin.trim()) {
                      throw new Error("Enter a lock screen PIN before saving.");
                    }
                    await onLockPinSave(lockScreenPin.trim());
                    setLockScreenPin("");
                  }, "Unable to update lock screen PIN.")
                }
              >
                Save Lock PIN
              </button>
              <div className="rounded-lg bg-[var(--overlay-soft)] px-3 py-2.5 text-xs font-medium leading-5 text-[var(--text-muted)]">
                The lock PIN is separate from the admin PIN and is used for the kiosk lock screen.
              </div>
            </div>
          </div>
        )}

        {libraryError && (
          <div className="mt-5 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">{libraryError}</div>
        )}

        {/* ── Flavor grid overlay ── */}
        {showFlavorGrid && (() => {
          const flavorCategories = bootstrap.flavorCategories ?? [];
          const gridModifiers = bootstrap.modifiers.filter((m) =>
            selectedFlavorCategoryId === "all" ? true
            : selectedFlavorCategoryId === "uncategorized" ? !m.flavorCategoryId
            : m.flavorCategoryId === selectedFlavorCategoryId,
          );
          return (
            <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-base)]">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between bg-[var(--bg-elevated)] px-6 py-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">Flavor Grid</div>
                  <div className="mt-0.5 font-display text-xl font-extrabold text-[var(--text-primary)]">
                    {selectedFlavorCategoryId === "all" ? "All Flavors" : selectedFlavorCategoryId === "uncategorized" ? "Uncategorized" : (flavorCategories.find(fc => fc.id === selectedFlavorCategoryId)?.name ?? "Flavors")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFlavorGrid(false)}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--overlay-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--overlay-hover)]"
                >
                  <ArrowLeft size={15} /> Close
                </button>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                  {gridModifiers.map((modifier) => {
                    const deleteTarget = { kind: "flavor" as const, id: modifier.id, label: modifier.name };
                    const isHolding = deleteHoldTarget?.kind === "flavor" && deleteHoldTarget.id === modifier.id;
                    return (
                      <div
                        key={modifier.id}
                        className="relative aspect-square overflow-hidden rounded-xl bg-[var(--bg-elevated)] select-none cursor-pointer"
                        onPointerDown={startDeleteHold(deleteTarget, () =>
                          handleLibraryAction(() => onFlavorDelete(modifier.id), "Unable to delete flavor."),
                        )}
                        onPointerUp={cancelDeleteHold}
                        onPointerLeave={cancelDeleteHold}
                        onPointerCancel={cancelDeleteHold}
                        onPointerMove={updateDeleteHoldPointer}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {/* Hold-to-delete progress fill */}
                        {isHolding && deleteHoldProgress > 0 && (
                          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl bg-rose-500/10">
                            <div className="absolute inset-0 origin-bottom bg-rose-500/60" style={{ transform: `scaleY(${deleteHoldProgress})` }} />
                          </div>
                        )}

                        <div className="relative z-20 flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
                          <div className={`text-[clamp(0.6rem,1.8cqi,0.9rem)] font-semibold leading-tight ${modifier.enabled ? "text-[var(--text-primary)]" : "text-[var(--text-dimmest)]"}`}>
                            {modifier.name}
                          </div>
                          <div className="text-[clamp(0.5rem,1.4cqi,0.75rem)] font-medium text-[#1be4db]">
                            {modifier.priceCents === 0 ? "Free" : `${modifier.discountFlavor ? "-" : "+"}${formatCurrency(Math.abs(modifier.priceCents))}`}
                          </div>
                          {!modifier.enabled && (
                            <div className="text-[clamp(0.45rem,1.2cqi,0.65rem)] text-[var(--text-dimmest)]">Hidden</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {gridModifiers.length === 0 && (
                  <div className="flex h-40 items-center justify-center text-sm text-[var(--text-dimmest)]">No flavors here</div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Product modal ── */}
        {/* ── Add Flavor modal ── */}
        {showAddFlavorModal && (() => {
          const flavorCategories = bootstrap.flavorCategories ?? [];
          return (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
              <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--bg-base)] shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
                <div className="bg-[var(--bg-elevated)] px-5 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-[#1be4db]">New Flavor</div>
                  <div className="mt-1 font-display text-xl font-extrabold text-[var(--text-primary)]">Add Flavor</div>
                </div>
                <div className="grid gap-3 p-5">
                  <label className="grid gap-1.5">
                    <span className="brand-kicker">Name</span>
                    <input className="brand-input" placeholder="e.g. Lavender" autoFocus value={newFlavor.name} onChange={(e) => setNewFlavor((s) => ({ ...s, name: e.target.value }))} />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="brand-kicker">Price adjustment</span>
                    <input type="text" inputMode="decimal" className="brand-input" placeholder="0.00" value={newFlavor.price}
                      onChange={(e) => { if (!isMoneyInput(e.target.value)) return; setNewFlavor((s) => ({ ...s, price: e.target.value })); }}
                      onBlur={() => setNewFlavor((s) => ({ ...s, price: normalizeMoneyInput(s.price) }))}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="brand-kicker">Category</span>
                    <select
                      className="brand-input"
                      value={newFlavor.flavorCategoryId}
                      onChange={(e) => setNewFlavor((s) => ({ ...s, flavorCategoryId: e.target.value }))}
                    >
                      <option value="">Uncategorized</option>
                      {flavorCategories.map((fc) => (
                        <option key={fc.id} value={fc.id}>{fc.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="brand-chip brand-chip-soft">
                    <input type="checkbox" checked={newFlavor.discount} onChange={(e) => setNewFlavor((s) => ({ ...s, discount: e.target.checked }))} />
                    Discount flavor (reduces price)
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button type="button" className="touch-button flex-1 bg-[#1be4db] text-[#262626]"
                      onClick={() => void handleLibraryAction(async () => {
                        await onCreateFlavor({ name: newFlavor.name, priceCents: newFlavor.discount ? -100 : Math.round(Number(newFlavor.price || "0") * 100), discountFlavor: newFlavor.discount, enabled: true, sortOrder: bootstrap.modifiers.length + 1, flavorCategoryId: newFlavor.flavorCategoryId || null });
                        setShowAddFlavorModal(false);
                        setNewFlavor({ name: "", price: "0.00", discount: false, flavorCategoryId: "" });
                      }, "Unable to create flavor.")}
                    >Add Flavor</button>
                    <button type="button" className="touch-button" onClick={() => setShowAddFlavorModal(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Edit Flavor modal ── */}
        {editingFlavor && (() => {
          const flavorCategories = bootstrap.flavorCategories ?? [];
          return (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
              <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--bg-base)] shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
                <div className="bg-[var(--bg-elevated)] px-5 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-[#1be4db]">Edit Flavor</div>
                  <div className="mt-1 font-display text-xl font-extrabold text-[var(--text-primary)]">{editingFlavor.name}</div>
                </div>
                <div className="grid gap-3 p-5">
                  <label className="grid gap-1.5">
                    <span className="brand-kicker">Name</span>
                    <input className="brand-input" autoFocus value={editingFlavor.name} onChange={(e) => setEditingFlavor((s) => s ? { ...s, name: e.target.value } : null)} />
                  </label>
                  {!editingFlavor.discount && (
                    <label className="grid gap-1.5">
                      <span className="brand-kicker">Price adjustment</span>
                      <input type="text" inputMode="decimal" className="brand-input" value={editingFlavor.price}
                        onChange={(e) => { if (!isMoneyInput(e.target.value)) return; setEditingFlavor((s) => s ? { ...s, price: e.target.value } : null); }}
                        onBlur={() => setEditingFlavor((s) => s ? { ...s, price: normalizeMoneyInput(s.price) } : null)}
                      />
                    </label>
                  )}
                  {editingFlavor.discount && (
                    <div className="brand-input flex items-center text-emerald-500 font-semibold">$1.00 off (fixed)</div>
                  )}
                  <label className="grid gap-1.5">
                    <span className="brand-kicker">Category</span>
                    <div className="grid gap-2">
                      <button
                        type="button"
                        className={`flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                          !editingFlavor.flavorCategoryId ? "bg-[#1be4db] text-[#262626]" : "bg-[var(--overlay-soft)] text-[var(--text-primary)] hover:bg-[var(--overlay-hover)]"
                        }`}
                        onClick={() => setEditingFlavor((s) => (s ? { ...s, flavorCategoryId: "" } : null))}
                      >
                        <span>Uncategorized</span>
                        {!editingFlavor.flavorCategoryId ? <span className="text-xs font-bold uppercase tracking-wider">Selected</span> : null}
                      </button>
                      <div className="grid gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {flavorCategories.map((fc) => {
                          const selected = editingFlavor.flavorCategoryId === fc.id;
                          return (
                            <button
                              key={fc.id}
                              type="button"
                              className={`flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                                selected ? "bg-[#1be4db] text-[#262626]" : "bg-[var(--overlay-soft)] text-[var(--text-primary)] hover:bg-[var(--overlay-hover)]"
                              }`}
                              onClick={() => setEditingFlavor((s) => (s ? { ...s, flavorCategoryId: fc.id } : null))}
                            >
                              <span>{fc.name}</span>
                              {selected ? <span className="text-xs font-bold uppercase tracking-wider">Selected</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </label>
                  <label className="brand-chip brand-chip-soft">
                    <input type="checkbox" checked={editingFlavor.discount} onChange={(e) => setEditingFlavor((s) => s ? { ...s, discount: e.target.checked } : null)} />
                    Discount flavor (reduces price)
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button type="button" className="touch-button flex-1 bg-[#1be4db] text-[#262626]"
                      onClick={() => void handleLibraryAction(async () => {
                        if (!editingFlavor) return;
                        const orig = bootstrap.modifiers.find(m => m.id === editingFlavor.id);
                        await onFlavorSave(editingFlavor.id, { name: editingFlavor.name, priceCents: editingFlavor.discount ? -100 : Math.round(Number(editingFlavor.price || "0") * 100), discountFlavor: editingFlavor.discount, enabled: orig?.enabled ?? true, sortOrder: orig?.sortOrder ?? 0, flavorCategoryId: editingFlavor.flavorCategoryId || null });
                        setEditingFlavor(null);
                      }, "Unable to save.")}
                    >Save Changes</button>
                    <button type="button" className="touch-button" onClick={() => setEditingFlavor(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {productModal ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[var(--bg-base)] shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
              <div className="bg-[var(--bg-elevated)] px-5 py-4 text-[var(--text-primary)]">
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
                <label className="flex items-center justify-between gap-4 rounded-xl bg-[var(--overlay-soft)] p-4 text-[var(--text-primary)]">
                  <span>
                    <span className="block text-sm font-bold">Customizable</span>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                      {productDraft.customizable !== false
                        ? "Show size, flavor, and hot/iced options when this item is tapped."
                        : "Add directly to the cart with no options."}
                    </span>
                  </span>
                  <span className="relative shrink-0">
                    <input type="checkbox" role="switch" aria-label="Customizable" className="peer sr-only"
                      checked={productDraft.customizable !== false}
                      onChange={(e) => setProductDraft((draft) => ({ ...draft, customizable: e.target.checked }))} />
                    <span aria-hidden="true" className="block h-7 w-12 rounded-full bg-zinc-500 transition peer-checked:bg-[#0a8f89] peer-focus-visible:ring-2 peer-focus-visible:ring-[#1be4db] peer-focus-visible:ring-offset-2" />
                    <span aria-hidden="true" className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                  </span>
                </label>
                <ProductImagePicker key={productModal.productId ?? "new-product"} adminPin={adminPin}
                  productName={productDraft.name} imageId={productDraft.imageId} disabled={isSavingProduct}
                  onChange={(imageId) => setProductDraft((draft) => ({ ...draft, imageId }))}
                  onBusyChange={setIsUploadingImage} />
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
