interface ActionBarProps {
  disabled: boolean;
  onCash: () => void;
  onCard: () => void;
  onClear: () => void;
  onSummary: () => void;
  onAdmin: () => void;
}

export function ActionBar({ disabled, onCash, onCard, onClear, onSummary, onAdmin }: ActionBarProps) {
  return (
    <div className="shrink-0 border-t border-[#dde2ea] px-4 pb-4 pt-3">
      {/* Primary tender buttons */}
      <div className="grid grid-cols-2 gap-2">
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
      </div>

      {/* Utility row */}
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button
          type="button"
          className="border border-[#dde2ea] py-2.5 text-xs font-bold uppercase tracking-wide text-[#263362]/60 transition hover:border-[#5190E6] hover:text-[#263362] disabled:opacity-35"
          style={{ borderRadius: 4 }}
          disabled={disabled}
          onClick={onClear}
        >
          Clear
        </button>
        <button
          type="button"
          className="border border-[#dde2ea] py-2.5 text-xs font-bold uppercase tracking-wide text-[#263362]/60 transition hover:border-[#5190E6] hover:text-[#263362]"
          style={{ borderRadius: 4 }}
          onClick={onSummary}
        >
          Summary
        </button>
        <button
          type="button"
          className="border border-[#dde2ea] py-2.5 text-xs font-bold uppercase tracking-wide text-[#263362]/60 transition hover:border-[#5190E6] hover:text-[#263362]"
          style={{ borderRadius: 4 }}
          onClick={onAdmin}
        >
          Admin
        </button>
      </div>
    </div>
  );
}
