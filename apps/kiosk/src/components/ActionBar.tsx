import { Banknote, CreditCard, Split, Trash2, Settings } from "lucide-react";

interface ActionBarProps {
  disabled: boolean;
  onCash: () => void;
  onCard: () => void;
  onSplit: () => void;
  onClear: () => void;
  onAdmin: () => void;
  cardEnabled?: boolean;
  adminEnabled?: boolean;
}

export function ActionBar({
  disabled,
  onCash,
  onCard,
  onSplit,
  onClear,
  onAdmin,
  cardEnabled = true,
  adminEnabled = true,
}: ActionBarProps) {
  return (
    <div className="shrink-0 bg-[var(--bg-surface)] px-3 pb-3 pt-2">
      <div className={`grid gap-2 ${cardEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-7 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-30"
          disabled={disabled}
          onClick={onCash}
        >
          <Banknote size={18} />
          Cash
        </button>
        {cardEnabled ? (
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#5191e5] py-7 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-30"
            disabled={disabled}
            onClick={onCard}
          >
            <CreditCard size={18} />
            Card
          </button>
        ) : null}
      </div>

      {cardEnabled ? (
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400/15 py-3.5 text-sm font-semibold text-amber-500 transition hover:bg-amber-400/20 active:scale-[0.97] disabled:opacity-30"
          disabled={disabled}
          onClick={onSplit}
        >
          <Split size={15} />
          Split Tender
        </button>
      ) : null}

      <div className={`mt-2 grid gap-2 ${adminEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--overlay-soft)] py-2.5 text-[11px] font-medium text-[var(--text-dimmer)] transition hover:text-[var(--text-muted)] disabled:opacity-30"
          disabled={disabled}
          onClick={onClear}
        >
          <Trash2 size={13} />
          Clear
        </button>
        {adminEnabled ? (
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--overlay-soft)] py-2.5 text-[11px] font-medium text-[var(--text-dimmer)] transition hover:text-[var(--text-muted)]"
            onClick={onAdmin}
          >
            <Settings size={13} />
            Admin
          </button>
        ) : null}
      </div>
    </div>
  );
}
