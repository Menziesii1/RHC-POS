import { Banknote, CreditCard, Trash2, Settings } from "lucide-react";

interface ActionBarProps {
  disabled: boolean;
  onCash: () => void;
  onCard: () => void;
  onClear: () => void;
  onAdmin: () => void;
  cardEnabled?: boolean;
  adminEnabled?: boolean;
}

export function ActionBar({
  disabled,
  onCash,
  onCard,
  onClear,
  onAdmin,
  cardEnabled = true,
  adminEnabled = true,
}: ActionBarProps) {
  return (
    <div className="shrink-0 bg-[#0c1520] px-3 pb-3 pt-2">
      <div className={`grid gap-2 ${cardEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-5 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-30"
          disabled={disabled}
          onClick={onCash}
        >
          <Banknote size={18} />
          Cash
        </button>
        {cardEnabled ? (
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#5191e5] py-5 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-30"
            disabled={disabled}
            onClick={onCard}
          >
            <CreditCard size={18} />
            Card
          </button>
        ) : null}
      </div>

      <div className={`mt-2 grid gap-2 ${adminEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 py-2.5 text-[11px] font-medium text-white/35 transition hover:text-white/50 disabled:opacity-30"
          disabled={disabled}
          onClick={onClear}
        >
          <Trash2 size={13} />
          Clear
        </button>
        {adminEnabled ? (
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 py-2.5 text-[11px] font-medium text-white/35 transition hover:text-white/50"
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
