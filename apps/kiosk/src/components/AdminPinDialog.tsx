import { useState } from "react";

interface AdminPinDialogProps {
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  error: string | null;
}

export function AdminPinDialog({ onClose, onSubmit, error }: AdminPinDialogProps) {
  const [pin, setPin] = useState("");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#263362]/45 p-6 backdrop-blur-sm">
      <div className="touch-card w-full max-w-md p-8">
        <div className="brand-kicker">Admin gate</div>
        <div className="mt-2 font-display text-4xl font-extrabold text-[#263362]">Admin PIN</div>
        <p className="mt-2 text-[#263362]/70">Enter the manager PIN to open admin tools.</p>
        <input
          type="password"
          inputMode="numeric"
          className="brand-input mt-6 w-full px-4 py-4 text-2xl tracking-[0.4em]"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
        />
        {error ? <div className="mt-4 border border-[#e6b6ae] bg-[#fdf6f4] p-4 text-[#ba4a2f]">{error}</div> : null}
        <div className="mt-6 flex gap-3">
          <button type="button" className="touch-button flex-1 bg-[#f7fbff] text-[#263362]" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="touch-button flex-1 bg-[#263362] text-white" onClick={() => void onSubmit(pin)}>
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
