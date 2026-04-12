import { Banknote, CreditCard, Split, Trash2, Settings, Wallet } from "lucide-react";
import { useState } from "react";

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
  const [tenderOpen, setTenderOpen] = useState(false);

  const handleCash = () => { setTenderOpen(false); onCash(); };
  const handleCard = () => { setTenderOpen(false); onCard(); };
  const handleSplit = () => { setTenderOpen(false); onSplit(); };

  return (
    <div className="relative shrink-0 bg-[var(--bg-grid)] px-3 pb-3 pt-2">
      {/* Tender popup */}
      {tenderOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setTenderOpen(false)}
          />
          {/* Modal card */}
          <div className="absolute bottom-full left-0 right-0 z-50 mb-2 mx-3 overflow-hidden rounded-2xl bg-[var(--bg-surface)] shadow-[0_8px_40px_rgba(0,0,0,0.28)] ring-1 ring-black/10">
            <div className="p-2 flex flex-col gap-1.5">
              {cardEnabled && (
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-xl bg-[#5191e5] px-4 py-3 text-sm font-bold text-white transition active:scale-[0.97]"
                  onClick={handleCard}
                >
                  <CreditCard size={16} /> Card
                </button>
              )}
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition active:scale-[0.97]"
                onClick={handleCash}
              >
                <Banknote size={16} /> Cash
              </button>
              {cardEnabled && (
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-xl bg-amber-400/15 px-4 py-3 text-sm font-semibold text-amber-500 transition hover:bg-amber-400/20 active:scale-[0.97]"
                  onClick={handleSplit}
                >
                  <Split size={16} /> Split Tender
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Tender button */}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5191e5] py-5 text-base font-bold text-white shadow-md transition active:scale-[0.97] disabled:opacity-30"
        disabled={disabled}
        onClick={() => setTenderOpen((o) => !o)}
      >
        <Wallet size={20} />
        Tender
      </button>

      {/* Clear / Admin */}
      <div className={`mt-2 grid gap-2 ${adminEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-elevated)] py-3 text-sm font-medium text-[var(--text-dimmer)] shadow-sm transition hover:text-[var(--text-muted)] disabled:opacity-30"
          disabled={disabled}
          onClick={onClear}
        >
          <Trash2 size={16} />
          Clear
        </button>
        {adminEnabled && (
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-elevated)] py-3 text-sm font-medium text-[var(--text-dimmer)] shadow-sm transition hover:text-[var(--text-muted)]"
            onClick={onAdmin}
          >
            <Settings size={16} />
            Admin
          </button>
        )}
      </div>
    </div>
  );
}
