import { useState } from "react";

interface AdminPinDialogProps {
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  error: string | null;
}

export function AdminPinDialog({ onClose, onSubmit, error }: AdminPinDialogProps) {
  const [pin, setPin] = useState("");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-bark/45 p-6 backdrop-blur-sm">
      <div className="touch-card w-full max-w-md p-8">
        <div className="font-display text-4xl font-bold text-bark">Admin PIN</div>
        <p className="mt-2 text-bark/70">Enter the manager PIN to open admin tools.</p>
        <input
          type="password"
          inputMode="numeric"
          className="mt-6 w-full rounded-[20px] border border-bark/15 bg-cream px-4 py-4 text-2xl tracking-[0.4em] outline-none"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
        />
        {error ? <div className="mt-4 rounded-[18px] bg-ember/12 p-4 text-ember">{error}</div> : null}
        <div className="mt-6 flex gap-3">
          <button type="button" className="flex-1 rounded-full bg-oat px-5 py-4 text-lg font-bold text-bark" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="flex-1 rounded-full bg-bark px-5 py-4 text-lg font-bold text-white" onClick={() => void onSubmit(pin)}>
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
