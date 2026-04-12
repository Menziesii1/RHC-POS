import { useState } from "react";
import { Wifi, WifiOff, Server, ServerOff, Smartphone, CreditCard, Clock, Sun, Moon, History, Lock } from "lucide-react";
import type { BootstrapResponse, RegisterStatus } from "@rhc-pos/shared";

import { BrandBadge } from "./BrandBadge";
import { useAppStore } from "../store/app-store";
import { OrderHistoryModal } from "./OrderHistoryModal";

const POSITIVE_VALUES = ["online", "ready", "connected"];

interface TopStatusBarProps {
  bootstrap: BootstrapResponse;
  status: RegisterStatus;
  timeLabel: string;
  onLock: () => void;
}

export function TopStatusBar({ bootstrap, status, timeLabel, onLock }: TopStatusBarProps) {
  const { theme, toggleTheme } = useAppStore();
  const [historyOpen, setHistoryOpen] = useState(false);

  const statusItems: Array<{
    icon: typeof Wifi;
    offIcon?: typeof WifiOff;
    label: string;
    value: string;
  }> = [
    { icon: Wifi, offIcon: WifiOff, label: "Net", value: status.internet },
    { icon: Server, offIcon: ServerOff, label: "API", value: status.backend },
    { icon: Smartphone, label: "Reader", value: status.reader },
    { icon: CreditCard, label: "Stripe", value: status.stripe },
  ];

  return (
    <>
    <header className="relative z-20 flex h-18 shrink-0 items-center gap-4 bg-[var(--bg-surface)] px-5 text-[var(--text-primary)]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1">
        <BrandBadge />
      </div>

      <div className="min-w-0">
        <div className="truncate text-base font-bold text-[var(--text-primary)]">
          {bootstrap.settings.locationName}
        </div>
        <div className="truncate text-xs font-medium uppercase tracking-wider text-[var(--text-dimmer)]">
          {bootstrap.settings.registerName}
        </div>
      </div>

      <div className="flex-1" />

      <div className="hidden items-center gap-1.5 md:flex">
        <Clock size={15} className="text-[var(--text-dimmest)]" />
        <span className="text-base font-medium text-[var(--text-muted)]">{timeLabel}</span>
      </div>

      {/* Order History button */}
      <button
        type="button"
        aria-label="Order history"
        onClick={() => setHistoryOpen((v) => !v)}
        className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition ${
          historyOpen
            ? "bg-[var(--overlay-hover)] text-[var(--text-primary)]"
            : "text-[var(--text-dimmer)] hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)]"
        }`}
      >
        <History size={16} />
        <span className="hidden sm:inline">Order History</span>
      </button>

      <button
        type="button"
        aria-label="Lock kiosk"
        onClick={onLock}
        className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[0_6px_14px_rgba(0,0,0,0.12)]"
      >
        <Lock size={20} strokeWidth={2.8} />
      </button>

      {/* Theme toggle */}
      <button
        type="button"
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-[var(--overlay-hover)] text-[var(--text-dimmer)] hover:text-[var(--text-primary)]"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Status dots */}
      <div className="flex items-center gap-2.5">
        {statusItems.map(({ icon: Icon, offIcon: OffIcon, label, value }) => {
          const ok = POSITIVE_VALUES.includes(value);
          const DisplayIcon = !ok && OffIcon ? OffIcon : Icon;
          return (
            <div key={label} className="flex items-center gap-1" title={`${label}: ${value}`}>
              <DisplayIcon size={16} className={ok ? "text-emerald-400" : value === "mock" || value === "degraded" ? "text-amber-400" : "text-red-400"} />
              <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : value === "mock" || value === "degraded" ? "bg-amber-400" : "bg-red-400"}`} />
            </div>
          );
        })}
      </div>
    </header>

    {historyOpen && <OrderHistoryModal onClose={() => setHistoryOpen(false)} />}
    </>
  );
}
