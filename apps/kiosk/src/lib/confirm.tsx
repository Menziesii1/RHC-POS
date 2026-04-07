import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { ConfirmDialog } from "../components/ConfirmDialog";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ResolvedConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

interface PendingConfirm {
  options: ResolvedConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

function resolveOptions(options: ConfirmOptions): ResolvedConfirmOptions {
  return {
    title: options.title ?? "Are you sure?",
    message: options.message,
    confirmLabel: options.confirmLabel ?? "Yes",
    cancelLabel: options.cancelLabel ?? "No",
  };
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [activeConfirm, setActiveConfirm] = useState<PendingConfirm | null>(null);
  const activeConfirmRef = useRef<PendingConfirm | null>(null);
  const queueRef = useRef<PendingConfirm[]>([]);

  const openNextConfirm = useCallback(() => {
    if (activeConfirmRef.current || queueRef.current.length === 0) {
      return;
    }

    const nextConfirm = queueRef.current.shift() ?? null;
    activeConfirmRef.current = nextConfirm;
    setActiveConfirm(nextConfirm);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        queueRef.current.push({ options: resolveOptions(options), resolve });
        openNextConfirm();
      }),
    [openNextConfirm],
  );

  const settleConfirm = useCallback((confirmed: boolean) => {
    const currentConfirm = activeConfirmRef.current;
    if (!currentConfirm) {
      return;
    }

    currentConfirm.resolve(confirmed);
    const nextConfirm = queueRef.current.shift() ?? null;
    activeConfirmRef.current = nextConfirm;
    setActiveConfirm(nextConfirm);
  }, []);

  useEffect(
    () => () => {
      activeConfirmRef.current?.resolve(false);
      activeConfirmRef.current = null;

      for (const pendingConfirm of queueRef.current) {
        pendingConfirm.resolve(false);
      }

      queueRef.current = [];
    },
    [],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={activeConfirm !== null}
        title={activeConfirm?.options.title ?? "Are you sure?"}
        message={activeConfirm?.options.message ?? ""}
        confirmLabel={activeConfirm?.options.confirmLabel ?? "Yes"}
        cancelLabel={activeConfirm?.options.cancelLabel ?? "No"}
        onConfirm={() => settleConfirm(true)}
        onCancel={() => settleConfirm(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);

  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmProvider.");
  }

  return confirm;
}
