import { formatCurrency, type BootstrapResponse } from "@rhc-pos/shared";
import { ChevronRight, ShoppingBag, Trash2, Pencil, Settings2, X } from "lucide-react";

import { useState } from "react";
import type { ReactNode } from "react";

import coloredLogoUrl from "../../assets/River Hills Logo without text Colored.svg?url";
import blackLogoUrl from "../../assets/River Hills Logo without text Black.svg?url";

import type { CartLineState } from "../types/ui";
import { useAppStore } from "../store/app-store";

interface EnrichedLine extends CartLineState {
  product: BootstrapResponse["products"][number];
  sizeOption?: BootstrapResponse["sizes"][number] | null;
  modifiers: BootstrapResponse["modifiers"];
  unitPriceCents: number;
  sizeAdjustmentCents?: number;
  flavorAdjustmentCents?: number;
  discountCents?: number;
  lineTotalCents: number;
}

interface CartPanelProps {
  bootstrap: BootstrapResponse;
  lines: EnrichedLine[];
  totalCents: number;
  paymentError?: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onRemoveLine: (lineId: string) => void;
  onEditLine: (lineId: string) => void;
  footer?: ReactNode;
}

export function CartPanel({
  bootstrap,
  lines,
  totalCents,
  paymentError,
  mobileOpen,
  onCloseMobile,
  onRemoveLine,
  onEditLine,
  footer,
}: CartPanelProps) {
  const { theme } = useAppStore();
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const editingLine = lines.find((l) => l.id === editingLineId) ?? null;
  const allowedModifiers = editingLine ? bootstrap.modifiers.filter((m) => m.enabled) : [];
  const logoUrl = theme === "light" ? blackLogoUrl : coloredLogoUrl;

  return (
    <div className={`fixed right-0 top-14 z-40 h-[calc(100dvh-3.5rem)] w-[min(88vw,220px)] min-[480px]:static min-[480px]:h-full min-[480px]:w-[220px] min-[480px]:shrink-0 ${mobileOpen ? "" : "pointer-events-none"}`}>

      <button
        type="button"
        aria-label="Collapse order panel"
        onClick={onCloseMobile}
        className={`pointer-events-auto absolute left-0 top-1/2 z-50 -translate-x-full -translate-y-1/2 flex items-center justify-center rounded-l-xl border border-white/10 border-r-0 bg-[var(--bg-elevated)] px-2 py-5 shadow-lg transition-opacity duration-75 active:scale-[0.97] min-[480px]:hidden ${
          mobileOpen ? "delay-150 opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight size={18} className="text-[#1be4db]" />
      </button>

      <section
        className={`pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-[var(--bg-card)] shadow-[0_24px_64px_rgba(0,0,0,0.42)] transition-transform duration-200 ease-out min-[480px]:translate-x-0 min-[480px]:shadow-none ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[var(--divider)] px-4 pb-2 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#1be4db]" />
              <h2 className="font-display text-base font-bold text-[var(--text-primary)]">Order</h2>
            </div>
            {lines.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1be4db] text-[10px] font-bold text-[#262626]">
                {lines.length}
              </span>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="relative flex-1 overflow-y-auto px-3 py-2">
          <img
            src={logoUrl}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 m-auto h-[80%] w-[80%] object-contain opacity-[0.09]"
            draggable={false}
          />
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--text-dimmest)]">
              <ShoppingBag size={32} strokeWidth={1.5} />
              <span className="text-sm">Tap items to start</span>
            </div>
          ) : null}

          <div className="space-y-1">
            {lines.map((line) => (
              <div key={line.id} className="flex items-start gap-1.5 px-2 py-2">
                {/* Left: name + subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {line.quantity > 1 && (
                      <span className="shrink-0 text-xs font-bold text-[#1be4db]">{line.quantity}x</span>
                    )}
                    <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {line.product.name}
                    </span>
                  </div>
                  {(line.sizeOption || line.modifiers.length > 0 || line.iced !== undefined) && (
                    <div className="mt-0.5 truncate text-[11px] text-[var(--text-dimmer)]">
                      {[line.iced ? "Iced" : "Hot", line.sizeOption?.name, ...line.modifiers.map((m) => m.name)]
                        .filter(Boolean)
                        .join(" \u00b7 ")}
                    </div>
                  )}
                </div>
                {/* Right: price + edit icon */}
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatCurrency(line.lineTotalCents)}
                  </span>
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--overlay-soft)] text-[var(--text-dimmer)] hover:bg-[var(--overlay-hover)] hover:text-[var(--text-muted)]"
                    onClick={() => setEditingLineId(line.id)}
                  >
                    <Settings2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Line edit modal */}
          {editingLine && (
            <>
              <div className="absolute inset-0 z-10 bg-black/30" onClick={() => setEditingLineId(null)} />
              <div className="absolute inset-x-3 top-1/2 z-20 -translate-y-1/2 overflow-hidden rounded-2xl bg-[var(--bg-card)] shadow-2xl">
                <div className="flex items-start justify-between gap-2 border-b border-[var(--divider)] px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{editingLine.product.name}</div>
                    <div className="text-xs text-[var(--text-dimmer)]">
                      {[editingLine.iced ? "Iced" : "Hot", editingLine.sizeOption?.name, ...editingLine.modifiers.map((m) => m.name)]
                        .filter(Boolean).join(" \u00b7 ")}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--overlay-soft)] text-[var(--text-dimmer)] hover:bg-[var(--overlay-hover)]"
                    onClick={() => setEditingLineId(null)}
                  >
                    <X size={11} />
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  {allowedModifiers.length > 0 && (
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--overlay-soft)] py-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--overlay-hover)]"
                      onClick={() => { setEditingLineId(null); onEditLine(editingLine.id); }}
                    >
                      <Pencil size={11} /> Edit Drink
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-500/10 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/15"
                    onClick={() => { onRemoveLine(editingLine.id); setEditingLineId(null); }}
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {paymentError && (
          <div className="px-4 py-2">
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
              {paymentError}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="shrink-0 border-t border-[var(--divider)] px-4 py-1.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-dimmer)]">Total</div>
              <div className="font-display text-lg font-bold text-[var(--text-primary)]">
                {formatCurrency(totalCents)}
              </div>
            </div>
            {lines.length > 0 && (
              <div className="text-[11px] text-[#1be4db]">
                {lines.reduce((sum, l) => sum + l.quantity, 0)} items
              </div>
            )}
          </div>
        </div>

        {footer}
      </section>
    </div>
  );

}
