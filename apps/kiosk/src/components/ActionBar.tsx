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
    <div className="shrink-0 border-t border-[#dde2ea] px-4 pb-4 pt-3">
      {/* Primary tender buttons */}
      <div className={`grid gap-2 ${cardEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
        <button
          type="button"
          className="py-5 text-center font-bold text-white transition disabled:opacity-35"
          style={{ borderRadius: 4, background: disabled ? "#5190E6" : "#5190E6" }}
          disabled={disabled}
          onClick={onCash}
        >
          <span className="block text-[0.65rem] font-bold uppercase tracking-[0.2em] opacity-70">Tender</span>
          <span className="block text-xl font-extrabold">Cash</span>
        </button>
        {cardEnabled ? (
          <button
            type="button"
            className="py-5 text-center font-bold text-white transition disabled:opacity-35"
            style={{ borderRadius: 4, background: "#263362" }}
            disabled={disabled}
            onClick={onCard}
          >
            <span className="block text-[0.65rem] font-bold uppercase tracking-[0.2em] opacity-70">Tender</span>
            <span className="block text-xl font-extrabold">Card</span>
          </button>
        ) : null}
      </div>

      {/* Utility row */}
      <div className={`mt-2 grid gap-2 ${adminEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
        <button
          type="button"
          className="border border-[#dde2ea] py-2.5 text-xs font-bold uppercase tracking-wide text-[#263362]/60 transition hover:border-[#5190E6] hover:text-[#263362] disabled:opacity-35"
          style={{ borderRadius: 4 }}
          disabled={disabled}
          onClick={onClear}
        >
          Clear
        </button>
        {adminEnabled ? (
          <button
            type="button"
            className="border border-[#dde2ea] py-2.5 text-xs font-bold uppercase tracking-wide text-[#263362]/60 transition hover:border-[#5190E6] hover:text-[#263362]"
            style={{ borderRadius: 4 }}
            onClick={onAdmin}
          >
            Admin
          </button>
        ) : null}
      </div>
    </div>
  );
}
