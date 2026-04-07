import { Wifi, WifiOff, Server, ServerOff, Smartphone, CreditCard, Clock } from "lucide-react";
import type { BootstrapResponse, RegisterStatus } from "@rhc-pos/shared";

import { BrandBadge } from "./BrandBadge";

const POSITIVE_VALUES = ["online", "ready", "connected"];

interface TopStatusBarProps {
  bootstrap: BootstrapResponse;
  status: RegisterStatus;
  timeLabel: string;
}

export function TopStatusBar({ bootstrap, status, timeLabel }: TopStatusBarProps) {
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
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 bg-[#303030] px-4 text-white">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1">
        <BrandBadge />
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-white">
          {bootstrap.settings.locationName}
        </div>
        <div className="truncate text-[10px] font-medium uppercase tracking-wider text-white/52">
          {bootstrap.settings.registerName}
        </div>
      </div>

      <div className="flex-1" />

      <div className="hidden items-center gap-1.5 md:flex">
        <Clock size={13} className="text-white/47" />
        <span className="text-sm font-medium text-white/60">{timeLabel}</span>
      </div>

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
  );
}
