import { Lock, X, Unlock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AdminPinDialogProps {
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  error: string | null;
}

export function AdminPinDialog({ onClose, onSubmit, error }: AdminPinDialogProps) {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && pin && !submitting) {
        e.preventDefault();
        setSubmitting(true);
        void onSubmit(pin).finally(() => setSubmitting(false));
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, submitting, onSubmit, onClose]);

  const handleSubmit = () => {
    if (!pin || submitting) return;
    setSubmitting(true);
    void onSubmit(pin).finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-7 backdrop-blur-sm sm:pt-10">
      <div className="w-full max-w-[20rem] rounded-2xl bg-[var(--bg-elevated)] p-5">
        <div className="flex justify-center text-[#1be4db]">
          <Lock size={22} />
        </div>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          className="mt-4 w-full rounded-xl bg-[var(--overlay-soft)] px-3 py-3 text-xl tracking-[0.35em] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-dimmest)] focus:ring-2 focus:ring-[#1be4db]/20"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          disabled={submitting}
        />
        {error ? (
          <div className="mt-3 rounded-xl bg-red-500/10 p-2.5 text-xs text-red-400">{error}</div>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--overlay-soft)] py-2.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--overlay-hover)]" onClick={onClose} disabled={submitting}>
            <X size={15} /> Cancel
          </button>
          <button type="button" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1be4db] py-2.5 text-xs font-bold text-[#1a1a1a] disabled:opacity-60" onClick={handleSubmit} disabled={submitting || !pin}>
            <Unlock size={15} /> Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
