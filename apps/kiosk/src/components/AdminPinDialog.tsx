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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#162231] p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#1be4db]">
          <Lock size={12} /> Admin gate
        </div>
        <div className="mt-2 font-display text-2xl font-extrabold text-white">Enter PIN</div>
        <p className="mt-2 text-sm text-white/40">Enter the manager PIN to open admin tools.</p>
        <input
          type="password"
          inputMode="numeric"
          className="mt-6 w-full rounded-xl bg-white/[0.05] px-4 py-4 text-2xl tracking-[0.4em] text-white outline-none placeholder:text-white/15 focus:ring-2 focus:ring-[#1be4db]/20"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
        />
        {error ? (
          <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        ) : null}
        <div className="mt-6 flex gap-2">
          <button type="button" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] py-3 text-sm font-medium text-white/50 hover:bg-white/[0.07]" onClick={onClose}>
            <X size={15} /> Cancel
          </button>
          <button type="button" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1be4db] py-3 text-sm font-bold text-[#0f1923]" onClick={() => void onSubmit(pin)}>
            <Unlock size={15} /> Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
