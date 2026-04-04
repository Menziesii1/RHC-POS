import { formatCurrency, type DraftOrder, type RegisterStatus, type SummaryResponse } from "@rhc-pos/shared";
import { useEffect, useMemo, useRef, useState } from "react";

import { ActionBar } from "../components/ActionBar";
import { AdminPanel } from "../components/AdminPanel";
import { AdminPinDialog } from "../components/AdminPinDialog";
import { CardPaymentOverlay } from "../components/CardPaymentOverlay";
import { CartPanel } from "../components/CartPanel";
import { CashPaymentOverlay } from "../components/CashPaymentOverlay";
import { ProductGrid } from "../components/ProductGrid";
import { SuccessScreen } from "../components/SuccessScreen";
import { SummaryPanel } from "../components/SummaryPanel";
import { TopStatusBar } from "../components/TopStatusBar";
import { buildCartView } from "../lib/cart";
import { clearPersistedState, loadPersistedState, savePersistedState } from "../lib/storage";
import { api } from "../services/api";
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
  const [adminError, setAdminError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
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

    const fetchBootstrap = async () => {
      try {
        const bootstrap = await api.getBootstrap();
        if (cancelled) {
          return;
        }
        store.setBootstrap(bootstrap);
        store.setBackendOnline(true);
      } catch {
        if (!cancelled) {
          store.setBackendOnline(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchBootstrap();
    const interval = window.setInterval(() => void fetchBootstrap(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
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
      store.setOverlay("none");
      clearPersistedState();
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [store, store.overlay]);

  const mutateCart = (callback: () => void) => {
    if (store.pendingOrder && store.pendingOrder.status !== "paid") {
      store.setPendingOrder(null);
      store.setPendingTransaction(null);
      store.setPaymentError(null);
    }
    callback();
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
    if (store.adminUnlocked) {
      store.setView("admin");
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
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Admin PIN is invalid.");
    }
  };

  const handleSummaryOpen = async () => {
    store.setView("summary");
    setSummary(await api.getSummary().catch(() => null));
  };

  const handleProductSave = async (productId: string, patch: Partial<{ priceCents: number; enabled: boolean }>) => {
    if (!store.bootstrap) {
      return;
    }
    const product = store.bootstrap.products.find((entry) => entry.id === productId);
    if (!product) {
      return;
    }
    await api.updateProduct(store.adminPin, productId, {
      ...product,
      ...patch,
    });
    const bootstrap = await api.getBootstrap();
    store.setBootstrap(bootstrap);
  };

  const handleTaxSave = async (taxRateBasisPoints: number) => {
    await api.patchSettings(store.adminPin, { taxRateBasisPoints });
    const bootstrap = await api.getBootstrap();
    store.setBootstrap(bootstrap);
  };

  if (loading || !store.bootstrap) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="touch-card p-10 text-center">
          <div className="font-display text-5xl font-bold text-bark">RHC POS</div>
          <div className="mt-3 text-lg text-bark/70">Loading register…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-5 lg:p-6">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-5">
        <TopStatusBar
          bootstrap={store.bootstrap}
          status={registerStatus}
          cashierId={store.cashierId}
          timeLabel={now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          onCashierChange={store.setCashierId}
        />

        {store.view === "register" ? (
          <>
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.95fr]">
              <ProductGrid
                bootstrap={store.bootstrap}
                selectedCategoryId={store.selectedCategoryId}
                onSelectCategory={store.setSelectedCategoryId}
                onSelectProduct={(productId) => mutateCart(() => store.addProduct(productId))}
              />
              <CartPanel
                bootstrap={store.bootstrap}
                lines={cartView.lines}
                selectedLineId={store.selectedLineId}
                subtotalCents={cartView.subtotalCents}
                taxCents={cartView.taxCents}
                totalCents={cartView.totalCents}
                onSelectLine={store.selectLine}
                onAdjustLineQuantity={(lineId, delta) => mutateCart(() => store.adjustLineQuantity(lineId, delta))}
                onRemoveLine={(lineId) => mutateCart(() => store.removeLine(lineId))}
                onToggleModifier={(lineId, modifierId) => mutateCart(() => store.toggleModifier(lineId, modifierId))}
              />
            </div>

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
              onSummary={() => void handleSummaryOpen()}
              onAdmin={handleAdminOpen}
            />

            {store.paymentError ? (
              <div className="rounded-[22px] bg-ember/12 px-5 py-4 text-lg font-semibold text-ember">
                {store.paymentError}
              </div>
            ) : null}
          </>
        ) : null}

        {store.view === "admin" ? (
          <AdminPanel
            bootstrap={store.bootstrap}
            adminPin={store.adminPin}
            onClose={() => store.setView("register")}
            onProductSave={handleProductSave}
            onTaxSave={handleTaxSave}
          />
        ) : null}

        {store.view === "summary" ? (
          <SummaryPanel summary={summary} onClose={() => store.setView("register")} />
        ) : null}
      </div>

      {store.overlay === "cash" ? (
        <CashPaymentOverlay
          totalCents={cartView.totalCents}
          onClose={() => store.setOverlay("none")}
          onConfirm={(tenderedCents) => void handleConfirmCash(tenderedCents)}
        />
      ) : null}

      {store.overlay === "card" ? (
        <CardPaymentOverlay
          totalCents={store.pendingOrder?.totalCents ?? cartView.totalCents}
          statusLabel={
            store.pendingOrder?.payment.status === "pending"
              ? "Customer may tap, insert, or swipe"
              : "Waiting for reader…"
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

      <div className="pointer-events-none fixed bottom-4 right-4 rounded-full bg-bark px-4 py-2 text-sm font-bold text-cream shadow-panel">
        {formatCurrency(cartView.totalCents)}
      </div>
    </main>
  );
}
