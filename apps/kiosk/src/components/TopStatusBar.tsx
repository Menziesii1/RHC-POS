import type { BootstrapResponse, RegisterStatus } from "@rhc-pos/shared";

import { BrandBadge } from "./BrandBadge";

function pillTone(value: string) {
  if (["online", "ready", "connected"].includes(value)) {
    return "bg-pine/15 text-pine";
  }
  if (["mock", "degraded", "busy"].includes(value)) {
    return "bg-brass/20 text-bark";
  }
  return "bg-ember/15 text-ember";
}

interface TopStatusBarProps {
  bootstrap: BootstrapResponse;
  status: RegisterStatus;
  cashierId: string;
  timeLabel: string;
  onCashierChange: (cashierId: string) => void;
}

export function TopStatusBar({
  bootstrap,
  status,
  cashierId,
  timeLabel,
  onCashierChange,
}: TopStatusBarProps) {
  return (
    <header className="touch-card grid gap-4 px-5 py-5 xl:grid-cols-[auto_1fr_auto] xl:items-center">
      <div className="flex items-center gap-4">
        <BrandBadge />
        <div>
          <div className="font-display text-3xl font-extrabold tracking-tight text-[#263362]">
            {bootstrap.settings.locationName}
          </div>
          <div className="brand-kicker mt-1">Single-purpose register</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 xl:justify-center">
        <label className="brand-section flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#263362]">
          <span className="brand-section-title">Volunteer</span>
          <select
            className="brand-select min-w-[160px] bg-transparent text-base"
            value={cashierId}
            onChange={(event) => onCashierChange(event.target.value)}
          >
            {bootstrap.cashiers.map((cashier) => (
              <option key={cashier.id} value={cashier.id}>
                {cashier.name}
              </option>
            ))}
          </select>
        </label>
        <div className="brand-section px-5 py-3 text-lg font-extrabold text-[#263362]">{timeLabel}</div>
      </div>

      <div className="flex flex-wrap gap-2 xl:justify-end">
        <span className={`status-pill ${pillTone(status.internet)}`}>Internet: {status.internet}</span>
        <span className={`status-pill ${pillTone(status.backend)}`}>Backend: {status.backend}</span>
        <span className={`status-pill ${pillTone(status.reader)}`}>Reader: {status.reader}</span>
        <span className={`status-pill ${pillTone(status.stripe)}`}>Stripe: {status.stripe}</span>
      </div>
    </header>
  );
}
