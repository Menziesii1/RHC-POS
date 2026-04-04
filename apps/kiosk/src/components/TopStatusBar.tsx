import type { BootstrapResponse, RegisterStatus } from "@rhc-pos/shared";

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
    <header className="touch-card flex flex-wrap items-center justify-between gap-4 px-6 py-5">
      <div>
        <div className="font-display text-3xl font-bold text-bark">{bootstrap.settings.locationName}</div>
        <div className="text-sm text-bark/70">Single-purpose register</div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 rounded-full bg-oat px-4 py-2 text-sm font-semibold text-bark">
          Volunteer
          <select
            className="bg-transparent text-base outline-none"
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
        <div className="rounded-full bg-bark px-4 py-2 text-lg font-bold text-cream">{timeLabel}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`status-pill ${pillTone(status.internet)}`}>Internet: {status.internet}</span>
        <span className={`status-pill ${pillTone(status.backend)}`}>Backend: {status.backend}</span>
        <span className={`status-pill ${pillTone(status.reader)}`}>Reader: {status.reader}</span>
        <span className={`status-pill ${pillTone(status.stripe)}`}>Stripe: {status.stripe}</span>
      </div>
    </header>
  );
}
