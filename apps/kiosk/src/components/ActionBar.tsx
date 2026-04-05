interface ActionBarProps {
  disabled: boolean;
  onCash: () => void;
  onCard: () => void;
  onClear: () => void;
  onSummary: () => void;
  onAdmin: () => void;
}

export function ActionBar({
  disabled,
  onCash,
  onCard,
  onClear,
  onSummary,
  onAdmin,
}: ActionBarProps) {
  return (
    <div className="touch-card grid gap-3 p-4 lg:grid-cols-[1.1fr_1.1fr_0.9fr_0.9fr_0.9fr]">
      <button
        type="button"
        className="touch-button bg-[#5190E6] text-white disabled:opacity-40"
        disabled={disabled}
        onClick={onCash}
      >
        <span className="block text-[0.72rem] uppercase tracking-[0.2em] opacity-80">Tender</span>
        <span className="block text-2xl font-extrabold">Cash</span>
      </button>
      <button
        type="button"
        className="touch-button bg-[#263362] text-white disabled:opacity-40"
        disabled={disabled}
        onClick={onCard}
      >
        <span className="block text-[0.72rem] uppercase tracking-[0.2em] opacity-80">Tender</span>
        <span className="block text-2xl font-extrabold">Card</span>
      </button>
      <button type="button" className="touch-button bg-[#f7fbff] text-[#263362] disabled:opacity-40" disabled={disabled} onClick={onClear}>
        Clear Cart
      </button>
      <button type="button" className="touch-button bg-[#f7fbff] text-[#263362]" onClick={onSummary}>
        Daily Summary
      </button>
      <button type="button" className="touch-button bg-[#f7fbff] text-[#263362]" onClick={onAdmin}>
        More
      </button>
    </div>
  );
}
