import type { BootstrapResponse, RegisterStatus } from "@rhc-pos/shared";

import { BrandBadge } from "./BrandBadge";

function pillTone(value: string) {
  if (["online", "ready", "connected"].includes(value)) return "border-green-400/40 bg-green-400/15 text-green-200";
  if (["mock", "degraded", "busy"].includes(value)) return "border-yellow-400/40 bg-yellow-400/15 text-yellow-200";
  return "border-red-400/40 bg-red-400/15 text-red-200";
}

interface TopStatusBarProps {
  bootstrap: BootstrapResponse;
  status: RegisterStatus;
  cashierId: string;
  timeLabel: string;
  onCashierChange: (cashierId: string) => void;
}

export function TopStatusBar({ bootstrap, status, cashierId, timeLabel, onCashierChange }: TopStatusBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 bg-[#263362] px-5">
      <BrandBadge />

      <div className="font-display text-base font-extrabold tracking-tight text-white">
        {bootstrap.settings.locationName}
      </div>

      <div className="mx-4 h-5 w-px bg-white/20" />

      <label className="flex items-center gap-2 text-sm text-white/70">
        <span className="text-xs font-bold uppercase tracking-widest text-white/50">Volunteer</span>
        <select
          className="border border-white/20 bg-white/10 px-3 py-1 text-sm font-semibold text-white outline-none focus:border-white/40"
          style={{ borderRadius: 3 }}
          value={cashierId}
          onChange={(e) => onCashierChange(e.target.value)}
        >
          {bootstrap.cashiers.map((cashier) => (
            <option key={cashier.id} value={cashier.id} className="bg-[#263362]">
              {cashier.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex-1" />

      <div className="text-sm font-bold text-white/80">{timeLabel}</div>

      <div className="mx-3 h-5 w-px bg-white/20" />

      <div className="flex items-center gap-2">
        {(
          [
            ["Internet", status.internet],
            ["Backend", status.backend],
            ["Reader", status.reader],
            ["Stripe", status.stripe],
          ] as const
        ).map(([label, value]) => (
          <span
            key={label}
            className={`border px-2 py-0.5 text-xs font-semibold ${pillTone(value)}`}
            style={{ borderRadius: 3 }}
          >
            {label}: {value}
          </span>
        ))}
      </div>
    </header>
  );
}
