import { type AnalyticsRangeResponse, type DraftOrder, type RegisterStatus, type SummaryResponse } from "@rhc-pos/shared";
import { useEffect, useMemo, useRef, useState } from "react";

import { ActionBar } from "../components/ActionBar";
import { AdminPinDialog } from "../components/AdminPinDialog";
import { AnalyticsPage } from "../components/AnalyticsPage";
import { CardPaymentOverlay } from "../components/CardPaymentOverlay";
import { CartPanel } from "../components/CartPanel";
import { CashPaymentOverlay } from "../components/CashPaymentOverlay";
import { DrinkBuilderOverlay } from "../components/DrinkBuilderOverlay";
import { InventoryControlPage } from "../components/InventoryControlPage";
import { ProductGrid } from "../components/ProductGrid";
import { SuccessScreen } from "../components/SuccessScreen";
import { TopStatusBar } from "../components/TopStatusBar";
import { buildCartView } from "../lib/cart";
import { ADMIN_ENABLED, CARD_ENABLED } from "../lib/env";
import { clearPersistedState, loadPersistedState, savePersistedState } from "../lib/storage";
import { API_BASE_URL, api } from "../services/api";
import { useAppStore } from "../store/app-store";

async function ensureOrder(
  currentOrder: DraftOrder | null,
  cashierId: string,
  cartItems: Array<{ productId: string; quantity: number; modifierIds: string[] }>,
) {
  if (currentOrder && currentOrder.status !== "paid") {
    return currentOrder;
  }
  return api.createOrder({ cashierId, items: cartItems });
}

export function App() {
  const store = useAppStore();
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsRangeResponse | null>(null);
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
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => store.setInternetOnline(true);
    const handleOffline = () => store.setInternetOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number;

    const scheduleNext = (delayMs: number) => {
      timeoutId = window.setTimeout(() => void fetchBootstrap(), delayMs);
    };

      const fetchBootstrap = async () => {
        try {
          const bootstrap = await api.getBootstrap();
          if (cancelled) return;
          store.setBootstrap(bootstrap);
          store.setBackendOnline(true);
          setBootstrapError(null);
          scheduleNext(15000);
        } catch (error) {
          if (cancelled) return;
          store.setBackendOnline(false);
          setBootstrapError(
            error instanceof Error
              ? error.message
              : `Unable to reach the API at ${API_BASE_URL}.`,
          );
          // Back off to 5 s when the API is unreachable to avoid flooding
          scheduleNext(5000);
        } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchBootstrap();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [store]);

  useEffect(() => {
    if (!store.bootstrap || hydratedRef.current) {
      return;
    }

    const persisted = loadPersistedState(store.bootstrap.settings.recoveryTtlSeconds);
    if (persisted) {
      store.restorePersisted({
        cartLines: persisted.cartLines,
        cashierId: persisted.cashierId || store.bootstrap.cashiers[0]?.id || "",
        selectedCategoryId: persisted.selectedCategoryId || "all",
        pendingTransaction: persisted.pendingTransaction,
        pendingOrder: persisted.pendingOrder,
      });
    }
    hydratedRef.current = true;
  }, [store, store.bootstrap]);

  useEffect(() => {
    if (!store.bootstrap || !hydratedRef.current) {
      return;
    }

    savePersistedState({
      savedAt: new Date().toISOString(),
      cashierId: store.cashierId,
      selectedCategoryId: store.selectedCategoryId,
      cartLines: store.cartLines,
      pendingTransaction: store.pendingTransaction,
      pendingOrder: store.pendingOrder,
    });
  }, [
    store.bootstrap,
    store.cashierId,
    store.selectedCategoryId,
    store.cartLines,
    store.pendingTransaction,
    store.pendingOrder,
  ]);

  useEffect(() => {
    if (!store.pendingTransaction?.orderId) {
      return;
    }

    let cancelled = false;

    const reconcile = async () => {
      try {
        const order = await api.getOrder(store.pendingTransaction!.orderId);
        if (cancelled) {
          return;
        }
        store.setPendingOrder(order);
        if (order.status === "paid") {
          store.markSuccess(order);
          clearPersistedState();
        } else if (order.payment.status === "failed" || order.payment.status === "canceled") {
          store.setPaymentError(order.payment.failureMessage ?? "Card payment did not complete.");
          store.setOverlay("card");
        }
      } catch {
        if (!cancelled) {
          store.setPaymentError("Unable to reconcile the pending payment right now.");
        }
      }
    };

    void reconcile();
    const interval = window.setInterval(() => void reconcile(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [store.pendingTransaction, store]);

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

  const refreshAnalytics = async (days = 14) => {
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
      const defaultSize = product.defaultSizeOptionId ?? product.sizeOptionIds[0] ?? null;
      const hasEnabledModifiers = bootstrap.modifiers.some((m) => m.enabled && product.modifierIds.includes(m.id));
      const needsConfigurator = product.sizeOptionIds.length > 0 || hasEnabledModifiers;

      if (needsConfigurator) {
        store.beginDraftLine(productId, defaultSize);
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
        store.cashierId,
        store.cartLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          modifierIds: line.modifierIds,
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
        store.cashierId,
        store.cartLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          modifierIds: line.modifierIds,
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

  const handleCancelCard = async () => {
    try {
      if (store.pendingOrder?.id) {
        await api.cancelCard(store.pendingOrder.id);
      }
    } finally {
      store.setOverlay("none");
      store.setPendingTransaction(null);
      store.setPaymentError(null);
    }
  };

  const handleAdminOpen = () => {
    if (!ADMIN_ENABLED) {
      return;
    }
    if (store.adminUnlocked) {
      store.setView("inventory");
      void refreshAnalytics();
      return;
    }
    setAdminError(null);
    store.setOverlay("admin-pin");
  };

  const handleAdminSubmit = async (pin: string) => {
    try {
      await api.verifyAdminPin(pin);
      setAdminError(null);
      store.unlockAdmin(pin);
      await refreshAnalytics();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Admin PIN is invalid.");
    }
  };

  const handleSummaryOpen = async () => {
    store.setView("analytics");
    await refreshAnalytics();
  };

  const handleProductSave = async (productId: string, input: Parameters<typeof api.updateProduct>[2]) => {
    await api.updateProduct(store.adminPin, productId, input);
    await refreshBootstrap();
  };

  const handleSizeSave = async (sizeId: string, input: Parameters<typeof api.updateSize>[2]) => {
    await api.updateSize(store.adminPin, sizeId, input);
    await refreshBootstrap();
  };

  const handleFlavorSave = async (modifierId: string, input: Parameters<typeof api.updateFlavor>[2]) => {
    await api.updateFlavor(store.adminPin, modifierId, input);
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

  const handleCreateCategory = async (input: Parameters<typeof api.createCategory>[1]) => {
    await api.createCategory(store.adminPin, input);
    await refreshBootstrap();
  };

  const handleCreateFlavor = async (input: Parameters<typeof api.createFlavor>[1]) => {
    await api.createFlavor(store.adminPin, input);
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

  if (loading && !store.bootstrap) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#f3f4f8]">
        <div className="border border-[#dde2ea] bg-white p-10 text-center" style={{ borderRadius: 4 }}>
          <div className="font-display text-5xl font-bold text-[#263362]">RHC POS</div>
          <div className="mt-3 text-lg text-[#263362]/60">Loading register...</div>
          <div className="mt-6 flex justify-center">
            <div
              className="h-8 w-8 animate-spin border-[3px] border-[#dde2ea] border-t-[#5190E6]"
              style={{ borderRadius: "50%" }}
            />
          </div>
        </div>
      </main>
    );
  }

  if (!store.bootstrap) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#f3f4f8] p-6">
        <div className="max-w-xl border border-[#dde2ea] bg-white p-10 text-center" style={{ borderRadius: 4 }}>
          <div className="font-display text-5xl font-bold text-[#263362]">RHC POS</div>
          <div className="mt-3 text-2xl font-bold text-[#263362]">Register cannot reach the backend</div>
          <div className="mt-4 text-lg text-[#263362]/75">
            {bootstrapError ?? "The kiosk is retrying the connection every 5 seconds."}
          </div>
          <div className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#5190E6]">
            API target: {API_BASE_URL}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#f3f4f8]">
      <TopStatusBar
        bootstrap={store.bootstrap}
        status={registerStatus}
        timeLabel={now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      />

      {store.view === "register" ? (
        <div className="flex flex-1 overflow-hidden">
          <ProductGrid
            bootstrap={store.bootstrap}
            selectedCategoryId={store.selectedCategoryId}
            onSelectCategory={store.setSelectedCategoryId}
            onSelectProduct={handleSelectProduct}
          />
          <CartPanel
            bootstrap={store.bootstrap}
            lines={cartView.lines}
            selectedLineId={store.selectedLineId}
            subtotalCents={cartView.subtotalCents}
            taxCents={cartView.taxCents}
            totalCents={cartView.totalCents}
            paymentError={store.paymentError}
            onSelectLine={store.selectLine}
            onAdjustLineQuantity={(lineId, delta) => mutateCart(() => store.adjustLineQuantity(lineId, delta))}
            onRemoveLine={(lineId) => mutateCart(() => store.removeLine(lineId))}
            onToggleModifier={(lineId, modifierId) => mutateCart(() => store.toggleModifier(lineId, modifierId))}
            footer={
              <ActionBar
                disabled={cartView.lines.length === 0}
                onCash={() => void handleStartCash()}
                onCard={() => void handleStartCard()}
                onClear={() => {
                  if (cartView.lines.length > 0 && window.confirm("Clear the cart?")) {
                    store.clearCart();
                    clearPersistedState();
                  }
                }}
                onAdmin={handleAdminOpen}
                cardEnabled={CARD_ENABLED}
                adminEnabled={ADMIN_ENABLED}
              />
            }
          />
        </div>
      ) : null}

      {store.view === "inventory" && ADMIN_ENABLED ? (
        <div className="flex-1 overflow-auto p-5">
          <InventoryControlPage
            bootstrap={store.bootstrap}
            analytics={analytics}
            onClose={() => store.setView("register")}
            onNavigateAnalytics={() => void handleSummaryOpen()}
            onProductSave={handleProductSave}
            onProductDelete={handleProductDelete}
            onCreateProduct={handleCreateProduct}
            onSizeSave={handleSizeSave}
            onFlavorSave={handleFlavorSave}
            onCreateCategory={handleCreateCategory}
            onCreateFlavor={handleCreateFlavor}
            onCreateSize={handleCreateSize}
            onTaxSave={handleTaxSave}
          />
        </div>
      ) : null}

      {store.view === "analytics" ? (
        <div className="flex-1 overflow-auto p-5">
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
            canOpenInventory={ADMIN_ENABLED && store.adminUnlocked}
          />
        </div>
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
          totalCents={store.pendingOrder?.totalCents ?? cartView.totalCents}
          statusLabel={
            store.pendingOrder?.payment.status === "pending"
              ? "Customer may tap, insert, or swipe"
              : "Waiting for reader..."
          }
          failureMessage={store.paymentError}
          onCancel={() => void handleCancelCard()}
        />
      ) : null}

      {store.overlay === "admin-pin" ? (
        <AdminPinDialog onClose={() => store.setOverlay("none")} onSubmit={handleAdminSubmit} error={adminError} />
      ) : null}

      {store.overlay === "success" && store.successOrder ? (
        <SuccessScreen orderNumber={store.successOrder.orderNumber} totalCents={store.successOrder.totalCents} />
      ) : null}

    </main>
  );
}
