import { type AnalyticsRangeResponse, type DraftOrder, type RegisterStatus, type SummaryResponse } from "@rhc-pos/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";

import { AppLockScreen } from "../components/AppLockScreen";
import { ActionBar } from "../components/ActionBar";
import { AdminPinDialog } from "../components/AdminPinDialog";
import { AnalyticsPage } from "../components/AnalyticsPage";
import { CardPaymentOverlay } from "../components/CardPaymentOverlay";
import { CartPanel } from "../components/CartPanel";
import { CashPaymentOverlay } from "../components/CashPaymentOverlay";
import { SplitTenderModal } from "../components/SplitTenderModal";
import { DrinkBuilderOverlay } from "../components/DrinkBuilderOverlay";
import { InventoryControlPage } from "../components/InventoryControlPage";
import { TransactionsPage } from "../components/TransactionsPage";
import { ProductGrid } from "../components/ProductGrid";
import { SuccessScreen } from "../components/SuccessScreen";
import { TopStatusBar } from "../components/TopStatusBar";
import { buildCartView } from "../lib/cart";
import { useConfirm } from "../lib/confirm";
import { ADMIN_ENABLED, CARD_ENABLED } from "../lib/env";
import { clearPersistedState, loadPersistedState, savePersistedState } from "../lib/storage";
import { API_BASE_URL, api } from "../services/api";
import { useAppStore } from "../store/app-store";

async function ensureOrder(
  currentOrder: DraftOrder | null,
  cartItems: Array<{ productId: string; quantity: number; sizeOptionId?: string | null; modifierIds: string[] }>,
) {
  if (currentOrder && currentOrder.status !== "paid") {
    return currentOrder;
  }
  return api.createOrder({ items: cartItems });
}

function SplashCard({
  title,
  body,
  detail,
  loading = false,
}: {
  title: string;
  body: string;
  detail?: string;
  loading?: boolean;
}) {
  return (
    <main className="pos-app-shell flex items-center justify-center px-4 py-6">
      <div className="pos-ambient pos-ambient-primary" />
      <div className="pos-ambient pos-ambient-warm" />

      <section className="pos-center-card">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#1be4db]">River Hills Coffee</div>
        <div className="mt-4 font-display text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">RHC POS</div>
        <div className="mt-4 text-lg font-semibold text-[var(--text-muted)]">{title}</div>
        <p className="mt-3 max-w-[32rem] text-sm leading-7 text-[var(--text-dimmer)]">{body}</p>
        {detail ? (
          <div className="mt-6 rounded-xl bg-[var(--overlay-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
            {detail}
          </div>
        ) : null}
        {loading ? (
          <div className="mt-8 flex items-center gap-4">
            <div className="pos-spinner h-12 w-12 animate-spin" />
            <div className="text-sm font-medium uppercase tracking-widest text-[var(--text-dimmer)]">Booting register</div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export function App() {
  const store = useAppStore();
  const confirm = useConfirm();
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsRangeResponse | null>(null);
  const [analyticsRangeDays, setAnalyticsRangeDays] = useState(28);
  const [splitCardCents, setSplitCardCents] = useState<number | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [appLocked, setAppLocked] = useState(true);
  const [lockOverlayVisible, setLockOverlayVisible] = useState(true);
  const [lockOverlayDropping, setLockOverlayDropping] = useState(false);
  const [lockAdminPromptOpen, setLockAdminPromptOpen] = useState(false);
  const lockDropTimerRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  const cartView = useMemo(
    () => buildCartView(store.bootstrap, store.cartLines),
    [store.bootstrap, store.cartLines],
  );

  const registerStatus = useMemo<RegisterStatus>(() => {
    if (!store.bootstrap) {
      return {
        internet: store.internetOnline ? "online" : "offline",
        backend: store.backendOnline ? "online" : "offline",
        reader: "offline" as const,
        stripe: "offline" as const,
        lastWebhookAt: null,
      };
    }

    return {
      ...store.bootstrap.status,
      internet: store.internetOnline ? "online" : "offline",
      backend: store.backendOnline ? store.bootstrap.status.backend : "offline",
    };
  }, [store.backendOnline, store.bootstrap, store.internetOnline]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", store.theme);
  }, [store.theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => useAppStore.getState().setInternetOnline(true);
    const handleOffline = () => useAppStore.getState().setInternetOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number;
    let retryDelay = 5_000;

    const scheduleNext = (delayMs: number) => {
      timeoutId = window.setTimeout(() => void fetchBootstrap(), delayMs);
    };

    const fetchBootstrap = async () => {
      try {
        const bootstrap = await api.getBootstrap();
        if (cancelled) return;
        const state = useAppStore.getState();
        state.setBootstrap(bootstrap);
        state.setBackendOnline(true);
        setBootstrapError(null);
        retryDelay = 5_000;
        scheduleNext(30_000);
      } catch (error) {
        if (cancelled) return;
        useAppStore.getState().setBackendOnline(false);
        setBootstrapError(
          error instanceof Error
            ? error.message
            : `Unable to reach the API at ${API_BASE_URL}.`,
        );
        scheduleNext(retryDelay);
        retryDelay = Math.min(retryDelay * 2, 60_000);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchBootstrap();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!store.bootstrap || hydratedRef.current) {
      return;
    }

    const persisted = loadPersistedState(store.bootstrap.settings.recoveryTtlSeconds);
    if (persisted) {
      useAppStore.getState().restorePersisted({
        cartLines: persisted.cartLines,
        selectedCategoryId: persisted.selectedCategoryId || "all",
        pendingTransaction: persisted.pendingTransaction,
        pendingOrder: persisted.pendingOrder,
      });
    }
    hydratedRef.current = true;
  }, [store.bootstrap]);

  useEffect(() => {
    if (!store.bootstrap || !hydratedRef.current) {
      return;
    }

    savePersistedState({
      savedAt: new Date().toISOString(),
      selectedCategoryId: store.selectedCategoryId,
      cartLines: store.cartLines,
      pendingTransaction: store.pendingTransaction,
      pendingOrder: store.pendingOrder,
    });
  }, [
    store.bootstrap,
    store.selectedCategoryId,
    store.cartLines,
    store.pendingTransaction,
    store.pendingOrder,
  ]);

  useEffect(() => {
    const orderId = store.pendingTransaction?.orderId;
    if (!orderId) {
      return;
    }

    let cancelled = false;

    const reconcile = async () => {
      try {
        const order = await api.getOrder(orderId);
        if (cancelled) {
          return;
        }
        const state = useAppStore.getState();
        state.setPendingOrder(order);
        if (order.status === "paid") {
          setSplitCardCents(null);
          state.markSuccess(order);
          clearPersistedState();
        } else if (order.payment.status === "failed" || order.payment.status === "canceled") {
          setSplitCardCents(null);
          state.setPaymentError(order.payment.failureMessage ?? "Card payment did not complete.");
          state.setOverlay("card");
        } else if (order.payment.status === "pending" || order.payment.status === "requires_action") {
          state.setPaymentError(null);
        }
      } catch {
        if (!cancelled) {
          useAppStore.getState().setPaymentError("Unable to reconcile the pending payment right now.");
        }
      }
    };

    void reconcile();
    const interval = window.setInterval(() => void reconcile(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [store.pendingTransaction?.orderId]);

  useEffect(() => {
    if (store.view !== "register") {
      setMobileCartOpen(false);
    }
  }, [store.view]);

  useEffect(() => {
    if (store.overlay !== "success") {
      return;
    }

    const timeout = window.setTimeout(() => {
      store.dismissSuccess();
      clearPersistedState();
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [store.overlay]);

  useEffect(() => {
    return () => {
      if (lockDropTimerRef.current !== null) {
        window.clearTimeout(lockDropTimerRef.current);
      }
    };
  }, []);

  const mutateCart = (callback: () => void) => {
    if (store.pendingOrder && store.pendingOrder.status !== "paid") {
      store.setPendingOrder(null);
      store.setPendingTransaction(null);
      store.setPaymentError(null);
    }
    callback();
  };

  const refreshBootstrap = async () => {
    const bootstrap = await api.getBootstrap();
    store.setBootstrap(bootstrap);
    return bootstrap;
  };

  const refreshAnalytics = async (days = analyticsRangeDays) => {
    const [dashboard, range] = await Promise.all([
      api.getDashboard().catch(() => null),
      api.getAnalyticsRange(days).catch(() => null),
    ]);
    setSummary(dashboard);
    setAnalytics(range);
  };

  const handleSelectProduct = (productId: string) => {
    const bootstrap = store.bootstrap;
    if (!bootstrap) {
      return;
    }
    const product = bootstrap.products.find((entry) => entry.id === productId);
    if (!product) {
      return;
    }

    mutateCart(() => {
      const defaultSize =
        (product.defaultSizeOptionId &&
        bootstrap.sizes.some((size) => size.id === product.defaultSizeOptionId && size.enabled)
          ? product.defaultSizeOptionId
          : bootstrap.sizes.find((size) => size.enabled)?.id) ?? null;
      const hasEnabledModifiers = bootstrap.modifiers.some((modifier) => modifier.enabled);
      const hasEnabledSizes = bootstrap.sizes.some((size) => size.enabled);
      const needsConfigurator = hasEnabledSizes || hasEnabledModifiers;

      if (needsConfigurator) {
        const icedByDefault = ["frappuccino", "frap", "red bull", "italian soda"].some((kw) =>
          product.name.toLowerCase().includes(kw),
        );
        store.beginDraftLine(productId, defaultSize, icedByDefault);
        store.setOverlay("drink-builder");
        return;
      }

      store.addProduct(productId);
    });
  };

  const handleStartCash = async () => {
    if (cartView.lines.length === 0) {
      return;
    }
    store.setOverlay("cash");
  };

  const handleConfirmCash = async (tenderedCents: number) => {
    try {
      const order = await ensureOrder(
        store.pendingOrder,
        store.cartLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          sizeOptionId: line.sizeOptionId ?? null,
          modifierIds: line.modifierIds,
          isIced: line.iced,
        })),
      );
      store.setPendingOrder(order);
      store.setPendingTransaction({ orderId: order.id, stage: "cash", savedAt: new Date().toISOString() });
      const paid = await api.payCash(order.id, tenderedCents);
      store.markSuccess(paid);
      clearPersistedState();
    } catch (error) {
      store.setPaymentError(error instanceof Error ? error.message : "Cash payment failed.");
      store.setOverlay("none");
    }
  };

  const handleStartCard = async () => {
    if (!CARD_ENABLED) {
      store.setPaymentError("Card payments are unavailable in local cash-only mode.");
      return;
    }
    if (cartView.lines.length === 0) {
      return;
    }

    try {
      store.setPaymentError(null);
      const order = await ensureOrder(
        store.pendingOrder,
        store.cartLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          sizeOptionId: line.sizeOptionId ?? null,
          modifierIds: line.modifierIds,
          isIced: line.iced,
        })),
      );
      store.setPendingOrder(order);
      store.setPendingTransaction({ orderId: order.id, stage: "card", savedAt: new Date().toISOString() });
      store.setOverlay("card");
      const started = await api.startCard(order.id);
      if (started.status === "paid") {
        store.markSuccess(started);
        clearPersistedState();
      } else {
        store.setPendingOrder(started);
      }
    } catch (error) {
      store.setOverlay("none");
      store.setPaymentError(error instanceof Error ? error.message : "Card payment failed to start.");
    }
  };

  const handleStartSplit = () => {
    if (cartView.lines.length === 0) return;
    store.setOverlay("split");
  };

  const handleSplitTender = async (
    tender1: { type: "cash" | "card"; cents: number },
    tender2: { type: "cash" | "card"; cents: number },
  ) => {
    store.setOverlay("none");
    store.setPaymentError(null);

    // Normalise: always process card before cash
    const [cardTender, cashTender] = (tender1.type === "card" ? [tender1, tender2] : [tender2, tender1]) as [
      { type: "cash" | "card"; cents: number },
      { type: "cash" | "card"; cents: number },
    ];

    const hasCard = cardTender.type === "card";

    try {
      const order = await ensureOrder(
        store.pendingOrder,
        store.cartLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          sizeOptionId: line.sizeOptionId ?? null,
          modifierIds: line.modifierIds,
          isIced: line.iced,
        })),
      );
      store.setPendingOrder(order);

      if (!hasCard) {
        // Both cash — just combine and pay
        store.setPendingTransaction({ orderId: order.id, stage: "cash", savedAt: new Date().toISOString() });
        const paid = await api.payCash(order.id, cardTender.cents + cashTender.cents);
        if (paid.status === "paid") {
          store.markSuccess(paid);
          clearPersistedState();
        } else {
          // Partial payment recorded
          store.setPendingOrder(paid);
          const remaining = paid.totalCents - (paid.payment.paidCents ?? 0);
          store.setPaymentError(`Partial payment recorded. Balance remaining: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(remaining / 100)}`);
          store.setPendingTransaction(null);
        }
        return;
      }

      // Card + cash: start card for card portion, backend auto-applies cash after success
      setSplitCardCents(cardTender.cents);
      store.setPendingTransaction({ orderId: order.id, stage: "card", savedAt: new Date().toISOString() });
      store.setOverlay("card");
      const started = await api.startCard(order.id, cardTender.cents);
      if (started.status === "paid") {
        setSplitCardCents(null);
        store.markSuccess(started);
        clearPersistedState();
      } else {
        store.setPendingOrder(started);
      }
    } catch (error) {
      setSplitCardCents(null);
      store.setOverlay("none");
      store.setPaymentError(error instanceof Error ? error.message : "Split tender failed.");
    }
  };

  const handleCancelCard = async () => {
    try {
      if (store.pendingOrder?.id) {
        const canceled = await api.cancelCard(store.pendingOrder.id);
        store.setPendingOrder(canceled);
      }
      setSplitCardCents(null);
      store.setOverlay("none");
      store.setPendingTransaction(null);
      store.setPaymentError(null);
    } catch (error) {
      store.setPaymentError(error instanceof Error ? error.message : "Unable to cancel the reader payment.");
    }
  };

  const handleAdminOpen = () => {
    if (!ADMIN_ENABLED) {
      return;
    }
    if (store.adminUnlocked) {
      store.setView("inventory");
      void refreshAnalytics(analyticsRangeDays);
      return;
    }
    setAdminError(null);
    store.setOverlay("admin-pin");
  };

  const handleAdminSubmit = async (pin: string) => {
    try {
      await api.verifyAdminPin(pin);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Admin PIN is invalid.");
      return;
    }

    setAdminError(null);
    store.unlockAdmin(pin);
    setAppLocked(false);
    setLockOverlayVisible(false);
    setMobileCartOpen(false);
    setLockAdminPromptOpen(false);

    void refreshAnalytics(analyticsRangeDays).catch(() => {
      // Admin access should still open even if analytics cannot refresh immediately.
    });
  };

  const handleSummaryOpen = async () => {
    store.setView("analytics");
    await refreshAnalytics(analyticsRangeDays);
  };

  const handleTransactionsOpen = () => {
    store.setView("transactions");
  };

  const handleAnalyticsRangeChange = async (days: number) => {
    setAnalyticsRangeDays(days);
    await refreshAnalytics(days);
  };

  const handleClearCart = async () => {
    if (cartView.lines.length === 0) {
      return;
    }

    const confirmed = await confirm({ message: "Clear the cart?" });
    if (!confirmed) {
      return;
    }

    store.clearCart();
    clearPersistedState();
  };

  const handleProductSave = async (productId: string, input: Parameters<typeof api.updateProduct>[2]) => {
    await api.updateProduct(store.adminPin, productId, input);
    await refreshBootstrap();
  };

  const handleCategorySave = async (categoryId: string, input: Parameters<typeof api.updateCategory>[2]) => {
    await api.updateCategory(store.adminPin, categoryId, input);
    await refreshBootstrap();
  };

  const handleCategoryDelete = async (categoryId: string) => {
    await api.deleteCategory(store.adminPin, categoryId);
    await refreshBootstrap();
  };

  const handleSizeSave = async (sizeId: string, input: Parameters<typeof api.updateSize>[2]) => {
    await api.updateSize(store.adminPin, sizeId, input);
    await refreshBootstrap();
  };

  const handleSizeDelete = async (sizeId: string) => {
    await api.deleteSize(store.adminPin, sizeId);
    await refreshBootstrap();
  };

  const handleFlavorSave = async (modifierId: string, input: Parameters<typeof api.updateFlavor>[2]) => {
    await api.updateFlavor(store.adminPin, modifierId, input);
    await refreshBootstrap();
  };

  const handleFlavorDelete = async (modifierId: string) => {
    await api.deleteFlavor(store.adminPin, modifierId);
    await refreshBootstrap();
  };

  const handleProductDelete = async (productId: string) => {
    await api.deleteProduct(store.adminPin, productId);
    mutateCart(() => store.purgeProductFromCart(productId));
    await refreshBootstrap();
  };

  const handleTaxSave = async (taxRateBasisPoints: number) => {
    await api.patchSettings(store.adminPin, { taxRateBasisPoints });
    await refreshBootstrap();
  };

  const handleLockPinSave = async (lockScreenPin: string) => {
    await api.patchSettings(store.adminPin, { lockScreenPin });
    await refreshBootstrap();
  };

  const handleCreateCategory = async (input: Parameters<typeof api.createCategory>[1]) => {
    await api.createCategory(store.adminPin, input);
    await refreshBootstrap();
  };

  const handleCreateFlavor = async (input: Parameters<typeof api.createFlavor>[1]) => {
    await api.createFlavor(store.adminPin, input);
    await refreshBootstrap();
  };

  const handleCreateFlavorCategory = async (input: Parameters<typeof api.createFlavorCategory>[1]) => {
    await api.createFlavorCategory(store.adminPin, input);
    await refreshBootstrap();
  };

  const handleFlavorCategorySave = async (categoryId: string, input: Parameters<typeof api.updateFlavorCategory>[2]) => {
    await api.updateFlavorCategory(store.adminPin, categoryId, input);
    await refreshBootstrap();
  };

  const handleFlavorCategoryDelete = async (categoryId: string) => {
    await api.deleteFlavorCategory(store.adminPin, categoryId);
    await refreshBootstrap();
  };

  const handleCreateSize = async (input: Parameters<typeof api.createSize>[1]) => {
    await api.createSize(store.adminPin, input);
    await refreshBootstrap();
  };

  const handleCreateProduct = async (input: Parameters<typeof api.createProduct>[1]) => {
    await api.createProduct(store.adminPin, input);
    await refreshBootstrap();
  };

  const handleUnlockApp = async (pin: string) => {
    await api.verifyLockPin(pin);
  };

  const handleLockApp = () => {
    setLockAdminPromptOpen(false);
    setAdminError(null);
    setMobileCartOpen(false);
    store.setOverlay("none");
    store.setView("register");
    setAppLocked(true);
    setLockOverlayVisible(true);
    setLockOverlayDropping(true);
    if (lockDropTimerRef.current !== null) {
      window.clearTimeout(lockDropTimerRef.current);
    }
    lockDropTimerRef.current = window.setTimeout(() => {
      setLockOverlayDropping(false);
    }, 20);
  };

  const lockOverlay = lockOverlayVisible ? (
    <div
      className={`fixed inset-0 z-[50] transition-[transform,opacity,box-shadow] duration-[420ms] ease-[cubic-bezier(0.18,0.92,0.24,1)] ${
        lockOverlayDropping
          ? "-translate-y-full opacity-0 shadow-none"
          : "translate-y-0 opacity-100 shadow-[0_24px_50px_rgba(0,0,0,0.22)]"
      }`}
    >
      <AppLockScreen
        onUnlock={handleUnlockApp}
        onUnlockAccepted={() => {
          setAppLocked(false);
          setMobileCartOpen(false);
          store.setView("register");
        }}
        onUnlocked={() => {
          setLockOverlayDropping(false);
          setLockOverlayVisible(false);
        }}
        onOpenAdmin={() => {
          setAdminError(null);
          setLockAdminPromptOpen(true);
        }}
      />
    </div>
  ) : null;

  const lockAdminPrompt = lockAdminPromptOpen ? (
    <AdminPinDialog
      onClose={() => {
        setAdminError(null);
        setLockAdminPromptOpen(false);
      }}
      onSubmit={handleAdminSubmit}
      error={adminError}
    />
  ) : null;

  const cardPaymentStatus = store.pendingOrder?.payment.status;
  const cardPaymentActive = cardPaymentStatus === "pending" || cardPaymentStatus === "requires_action";
  const cardFailureMessage = cardPaymentActive
    ? null
    : (store.pendingOrder?.payment.failureMessage ?? store.paymentError);

  const appBody = loading && !store.bootstrap ? (
    <SplashCard
      title="Loading register"
      body="Syncing products, pricing, and register status so the kiosk starts from a clean operational state."
      loading
    />
  ) : !store.bootstrap ? (
    <SplashCard
      title="Register cannot reach the backend"
      body={bootstrapError ?? "The kiosk is retrying the connection every 5 seconds while the local shell stays ready."}
      detail={`API target: ${API_BASE_URL}`}
    />
  ) : (
    <main className="pos-app-shell p-3 lg:p-5">
      <div className="pos-ambient pos-ambient-primary" />
      <div className="pos-ambient pos-ambient-warm" />

      <section className="pos-workspace">
        <TopStatusBar
          bootstrap={store.bootstrap}
          status={registerStatus}
          timeLabel={now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          onLock={handleLockApp}
        />

        {store.view === "register" ? (
          <div className="relative flex min-h-0 flex-1 p-3 lg:p-4">
            <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl bg-[var(--bg-surface)]">
              <ProductGrid
                bootstrap={store.bootstrap}
                selectedCategoryId={store.selectedCategoryId}
                onSelectProduct={handleSelectProduct}
              />
              <CartPanel
                bootstrap={store.bootstrap}
                lines={cartView.lines}
                totalCents={cartView.totalCents}
                paymentError={store.paymentError}
                mobileOpen={mobileCartOpen}
                onCloseMobile={() => setMobileCartOpen(false)}
                onRemoveLine={(lineId) => mutateCart(() => store.removeLine(lineId))}
                onEditLine={(lineId) => {
                  store.beginDraftLineFromCartLine(lineId);
                  store.setOverlay("drink-builder");
                }}
                footer={
                  <ActionBar
                    disabled={cartView.lines.length === 0}
                    onCash={() => void handleStartCash()}
                    onCard={() => void handleStartCard()}
                    onSplit={handleStartSplit}
                    onClear={() => void handleClearCart()}
                    onAdmin={handleAdminOpen}
                    cardEnabled={CARD_ENABLED}
                    adminEnabled={ADMIN_ENABLED}
                  />
                }
              />
            </div>
          </div>
        ) : null}

        {store.view === "inventory" && ADMIN_ENABLED ? (
          <div className="flex-1 overflow-auto p-3 lg:p-4">
            <div className="pos-view-panel p-5 lg:p-6">
              <InventoryControlPage
                bootstrap={store.bootstrap}
                analytics={analytics}
                onClose={() => store.setView("register")}
                onNavigateAnalytics={() => void handleSummaryOpen()}
                onNavigateTransactions={handleTransactionsOpen}
                onCategorySave={handleCategorySave}
                onCategoryDelete={handleCategoryDelete}
                onProductSave={handleProductSave}
                onProductDelete={handleProductDelete}
                onCreateProduct={handleCreateProduct}
                onSizeSave={handleSizeSave}
                onSizeDelete={handleSizeDelete}
                onFlavorSave={handleFlavorSave}
                onFlavorDelete={handleFlavorDelete}
                onCreateCategory={handleCreateCategory}
                onCreateFlavor={handleCreateFlavor}
                onCreateSize={handleCreateSize}
                onCreateFlavorCategory={handleCreateFlavorCategory}
                onFlavorCategorySave={handleFlavorCategorySave}
                onFlavorCategoryDelete={handleFlavorCategoryDelete}
                onTaxSave={handleTaxSave}
                onLockPinSave={handleLockPinSave}
              />
            </div>
          </div>
        ) : null}

        {store.view === "analytics" ? (
          <div className="flex-1 overflow-auto p-3 lg:p-4">
            <div className="pos-view-panel p-5 lg:p-6">
              <AnalyticsPage
                summary={summary}
                analytics={analytics}
                onClose={() => store.setView("register")}
                onNavigateInventory={() => {
                  if (ADMIN_ENABLED && store.adminUnlocked) {
                    store.setView("inventory");
                    return;
                  }
                  handleAdminOpen();
                }}
                onNavigateTransactions={handleTransactionsOpen}
                canOpenInventory={ADMIN_ENABLED && store.adminUnlocked}
                selectedRangeDays={analyticsRangeDays}
                onSelectRangeDays={(days) => void handleAnalyticsRangeChange(days)}
              />
            </div>
          </div>
        ) : null}

        {store.view === "transactions" && ADMIN_ENABLED ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto p-3 lg:p-4">
            <div className="pos-view-panel flex min-h-0 flex-1 flex-col p-5 lg:p-6">
              <TransactionsPage
                adminPin={store.adminPin}
                onClose={() => store.setView("register")}
                onNavigateInventory={() => store.setView("inventory")}
                onNavigateAnalytics={() => void handleSummaryOpen()}
              />
            </div>
          </div>
        ) : null}
      </section>

      {store.overlay === "split" ? (
        <SplitTenderModal
          totalCents={cartView.totalCents}
          cardEnabled={CARD_ENABLED}
          onClose={() => store.setOverlay("none")}
          onConfirm={(t1, t2) => void handleSplitTender(t1, t2)}
        />
      ) : null}

      {store.overlay === "cash" ? (
        <CashPaymentOverlay
          totalCents={cartView.totalCents}
          onClose={() => store.setOverlay("none")}
          onConfirm={(tenderedCents) => void handleConfirmCash(tenderedCents)}
        />
      ) : null}

      {store.overlay === "drink-builder" && store.draftLine ? (
        <DrinkBuilderOverlay
          bootstrap={store.bootstrap}
          draftLine={store.draftLine}
          onClose={() => {
            store.clearDraftLine();
            store.setOverlay("none");
          }}
          onSelectSize={store.setDraftLineSize}
          onSetIced={store.setDraftLineIced}
          onToggleFlavor={store.toggleDraftLineFlavor}
          onConfirm={() => {
            store.commitDraftLine();
            store.setOverlay("none");
          }}
        />
      ) : null}

      {store.overlay === "card" ? (
        <CardPaymentOverlay
          totalCents={splitCardCents ?? store.pendingOrder?.totalCents ?? cartView.totalCents}
          statusLabel={
            cardPaymentActive
              ? "Customer may tap, insert, or swipe"
              : "Waiting for reader..."
          }
          failureMessage={cardFailureMessage}
          onCancel={() => void handleCancelCard()}
        />
      ) : null}

      {store.overlay === "admin-pin" ? (
        <AdminPinDialog onClose={() => store.setOverlay("none")} onSubmit={handleAdminSubmit} error={adminError} />
      ) : null}

      {store.overlay === "success" && store.successOrder ? (
        <SuccessScreen orderNumber={store.successOrder.orderNumber} totalCents={store.successOrder.totalCents} />
      ) : null}

      {store.view === "register" && cartView.lines.length > 0 && !mobileCartOpen && (
        <button
          type="button"
          aria-label="Open order panel"
          onClick={() => setMobileCartOpen(true)}
          className="fixed bottom-[65px] right-0 z-[60] flex items-center gap-3 rounded-l-2xl bg-[#1be4db] px-6 py-4 shadow-[0_6px_20px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.15)] transition active:scale-[0.97] min-[480px]:hidden"
        >
          <ShoppingBag size={18} className="text-[#0d1a1a]" />
          <span className="text-base font-bold text-[#0d1a1a]">Order</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0d1a1a]/20 text-[10px] font-bold text-[#0d1a1a]">
            {cartView.lines.length}
          </span>
        </button>
      )}

    </main>
  );

  return (
    <div>
      <div
        className={`transition-opacity duration-[520ms] ease-in-out ${
          appLocked ? "pointer-events-none select-none opacity-0" : "opacity-100"
        }`}
      >
        {appBody}
      </div>
      {lockOverlay}
      {lockAdminPrompt}
    </div>
  );
}
