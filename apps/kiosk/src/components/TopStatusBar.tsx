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
  timeLabel: string;
}

export function TopStatusBar({ bootstrap, status, timeLabel }: TopStatusBarProps) {
  return (
    <header className="flex h-20 shrink-0 items-center gap-5 bg-[#263362] px-5">
      <div className="flex h-full shrink-0 items-center py-2">
        <BrandBadge />
      </div>

      <div className="min-w-0">
        <div className="truncate font-display text-2xl font-extrabold tracking-tight text-white">
          {bootstrap.settings.locationName}
        </div>
        <div className="truncate pt-1 text-sm font-semibold uppercase tracking-[0.28em] text-white/55">
          {bootstrap.settings.registerName}
        </div>
      </div>

      <div className="flex-1" />

      <div className="text-2xl font-bold text-white/80">{timeLabel}</div>

      <div className="mx-1 h-8 w-px bg-white/20" />

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
