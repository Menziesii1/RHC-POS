import { Lock, X, Unlock } from "lucide-react";
import { useState } from "react";

interface AdminPinDialogProps {
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  error: string | null;
}

export function AdminPinDialog({ onClose, onSubmit, error }: AdminPinDialogProps) {
  const [pin, setPin] = useState("");

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-7 backdrop-blur-sm sm:pt-10">
      <div className="w-full max-w-[20rem] rounded-2xl bg-[var(--bg-elevated)] p-5">
        <div className="flex justify-center text-[#1be4db]">
          <Lock size={22} />
        </div>
        <input
          type="password"
          inputMode="numeric"
          className="mt-4 w-full rounded-xl bg-[var(--overlay-soft)] px-3 py-3 text-xl tracking-[0.35em] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-dimmest)] focus:ring-2 focus:ring-[#1be4db]/20"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
        />
        {error ? (
          <div className="mt-3 rounded-xl bg-red-500/10 p-2.5 text-xs text-red-400">{error}</div>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--overlay-soft)] py-2.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--overlay-hover)]" onClick={onClose}>
            <X size={15} /> Cancel
          </button>
          <button type="button" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1be4db] py-2.5 text-xs font-bold text-[#1a1a1a]" onClick={() => void onSubmit(pin)}>
            <Unlock size={15} /> Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
