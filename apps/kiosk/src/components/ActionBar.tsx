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
    <div className="touch-card grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
      <button type="button" className="touch-button bg-pine text-cream disabled:opacity-40" disabled={disabled} onClick={onCash}>
        Cash
      </button>
      <button type="button" className="touch-button bg-bark text-cream disabled:opacity-40" disabled={disabled} onClick={onCard}>
        Card
      </button>
      <button type="button" className="touch-button bg-oat text-bark disabled:opacity-40" disabled={disabled} onClick={onClear}>
        Clear Cart
      </button>
      <button type="button" className="touch-button bg-oat text-bark" onClick={onSummary}>
        Daily Summary
      </button>
      <button type="button" className="touch-button bg-oat text-bark" onClick={onAdmin}>
        More
      </button>
    </div>
  );
}
