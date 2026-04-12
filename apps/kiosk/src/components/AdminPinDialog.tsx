import { Delete, Lock, Unlock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AdminPinDialogProps {
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  error: string | null;
}

export function AdminPinDialog({ onClose, onSubmit, error }: AdminPinDialogProps) {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasError = Boolean(error);
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;

  const appendDigit = (d: string) => {
    if (submitting) return;
    setPin((p) => (p.length >= 8 ? p : `${p}${d}`));
  };

  const deleteDigit = () => {
    if (submitting) return;
    setPin((p) => p.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!pin || submitting) return;
    setSubmitting(true);
    void submitRef.current(pin).finally(() => setSubmitting(false));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") { e.preventDefault(); appendDigit(e.key); return; }
      if (e.key === "Enter") { e.preventDefault(); handleSubmit(); return; }
      if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); deleteDigit(); return; }
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, submitting]);

  const digitBtn =
    "flex h-12 items-center justify-center rounded-xl border border-white/10 bg-[var(--bg-elevated)] text-xl font-semibold text-[var(--text-primary)] shadow-[0_4px_10px_rgba(0,0,0,0.18)] disabled:opacity-50 active:bg-[var(--overlay-active)]";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-7 backdrop-blur-sm sm:pt-10">
      <div className="w-full max-w-[20rem] rounded-2xl bg-[var(--bg-elevated)] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#1be4db]">
            <Lock size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Admin PIN</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--overlay-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* PIN dots */}
        <div className="mt-4 flex items-center justify-center gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg font-semibold shadow-[0_4px_10px_rgba(0,0,0,0.18)] ${
                pin.length > i
                  ? "border-[#1be4db]/35 bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  : "border-white/10 bg-[var(--overlay-soft)] text-[var(--text-dimmest)]"
              }`}
            >
              {pin.length > i ? "•" : ""}
            </span>
          ))}
        </div>

        {hasError && (
          <div className="mt-3 rounded-xl bg-red-500/10 p-2.5 text-xs text-red-400">{error}</div>
        )}

        {/* Numpad */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["1","2","3","4","5","6","7","8","9"] as const).map((d) => (
            <button key={d} type="button" disabled={submitting} onClick={() => appendDigit(d)} className={digitBtn}>
              {d}
            </button>
          ))}
          <button type="button" disabled={submitting} onClick={() => setPin("")}
            className={`${digitBtn} text-sm text-[var(--text-muted)]`}>
            Clear
          </button>
          <button type="button" disabled={submitting} onClick={() => appendDigit("0")} className={digitBtn}>
            0
          </button>
          <button type="button" disabled={submitting} onClick={deleteDigit}
            className={`${digitBtn} text-[var(--text-muted)]`}>
            <Delete size={18} />
          </button>
        </div>

        <button
          type="button"
          disabled={submitting || !pin}
          onClick={handleSubmit}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1be4db] py-3 text-sm font-bold text-[#1a1a1a] disabled:opacity-60"
        >
          <Unlock size={15} /> Unlock
        </button>
      </div>
    </div>
  );
}
