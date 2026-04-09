import { useState } from "react";
import { Wifi, WifiOff, Server, ServerOff, Smartphone, CreditCard, Clock, Sun, Moon, History } from "lucide-react";
import type { BootstrapResponse, RegisterStatus } from "@rhc-pos/shared";

import { BrandBadge } from "./BrandBadge";
import { useAppStore } from "../store/app-store";
import { OrderHistoryModal } from "./OrderHistoryModal";

const POSITIVE_VALUES = ["online", "ready", "connected"];

interface TopStatusBarProps {
  bootstrap: BootstrapResponse;
  status: RegisterStatus;
  timeLabel: string;
}

export function TopStatusBar({ bootstrap, status, timeLabel }: TopStatusBarProps) {
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
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 bg-[var(--bg-surface)] px-4 text-[var(--text-primary)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1">
        <BrandBadge />
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-[var(--text-primary)]">
          {bootstrap.settings.locationName}
        </div>
        <div className="truncate text-[10px] font-medium uppercase tracking-wider text-[var(--text-dimmer)]">
          {bootstrap.settings.registerName}
        </div>
      </div>

      <div className="flex-1" />

      <div className="hidden items-center gap-1.5 md:flex">
        <Clock size={13} className="text-[var(--text-dimmest)]" />
        <span className="text-sm font-medium text-[var(--text-muted)]">{timeLabel}</span>
      </div>

      {/* Order History button */}
      <button
        type="button"
        aria-label="Order history"
        onClick={() => setHistoryOpen((v) => !v)}
        className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ${
          historyOpen
            ? "bg-[var(--overlay-hover)] text-[var(--text-primary)]"
            : "text-[var(--text-dimmer)] hover:bg-[var(--overlay-hover)] hover:text-[var(--text-primary)]"
        }`}
      >
        <History size={14} />
        <span className="hidden sm:inline">Order History</span>
      </button>

      {/* Theme toggle */}
      <button
        type="button"
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        onClick={toggleTheme}
        className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[var(--overlay-hover)] text-[var(--text-dimmer)] hover:text-[var(--text-primary)]"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Status dots */}
      <div className="flex items-center gap-2">
        {statusItems.map(({ icon: Icon, offIcon: OffIcon, label, value }) => {
          const ok = POSITIVE_VALUES.includes(value);
          const DisplayIcon = !ok && OffIcon ? OffIcon : Icon;
          return (
            <div key={label} className="flex items-center gap-1" title={`${label}: ${value}`}>
              <DisplayIcon size={14} className={ok ? "text-emerald-400" : value === "mock" || value === "degraded" ? "text-amber-400" : "text-red-400"} />
              <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : value === "mock" || value === "degraded" ? "bg-amber-400" : "bg-red-400"}`} />
            </div>
          );
        })}
      </div>
    </header>

    {historyOpen && <OrderHistoryModal onClose={() => setHistoryOpen(false)} />}
    </>
  );
}
