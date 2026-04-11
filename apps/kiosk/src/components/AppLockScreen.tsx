import { ArrowRight, Coffee, Delete, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import fullLogoUrl from "../../assets/River Hills Logo with text Colored.svg?url";

interface AppLockScreenProps {
  onUnlock: (pin: string) => Promise<void>;
  onUnlockAccepted: () => void;
  onUnlocked: () => void;
  onOpenAdmin: () => void;
}

const UNLOCK_MS = 520;

export function AppLockScreen({ onUnlock, onUnlockAccepted, onUnlocked, onOpenAdmin }: AppLockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const unlockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current !== null) window.clearTimeout(unlockTimerRef.current);
    };
  }, []);

  const appendDigit = (digit: string) => {
    if (submitting || unlocking) return;
    setError(null);
    setPin((p) => (p.length >= 8 ? p : `${p}${digit}`));
  };

  const deleteDigit = () => {
    if (submitting || unlocking) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  const clearPin = () => {
    if (submitting || unlocking) return;
    setError(null);
    setPin("");
  };

  const submitPin = async () => {
    if (submitting || unlocking || !pin) return;
    try {
      setSubmitting(true);
      setError(null);
      await onUnlock(pin);
      setUnlocking(true);
      onUnlockAccepted();
      unlockTimerRef.current = window.setTimeout(() => onUnlocked(), UNLOCK_MS);
    } catch (err) {
      setPin("");
      setError(err instanceof Error ? err.message : "Invalid PIN.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative isolate flex flex-col sm:grid sm:grid-cols-2 min-h-svh overflow-hidden bg-gray-50 sm:bg-transparent">
      {/* Split background panels */}
      <div className="pointer-events-none absolute inset-0 z-0 hidden sm:block">
        <div className={`absolute inset-y-0 left-0 w-1/2 bg-[#262626] transition-[transform,opacity] duration-[520ms] ease-in-out ${unlocking ? "-translate-x-full opacity-0" : ""}`} />
        <div className={`absolute inset-y-0 right-0 w-1/2 bg-[var(--bg-elevated)] transition-[transform,opacity] duration-[520ms] ease-in-out ${unlocking ? "translate-x-full opacity-0" : ""}`} />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
      </div>

      {/* Logo */}
      <div className={`relative z-10 flex items-center justify-center px-6 pt-10 pb-2 sm:p-6 transition-opacity duration-[220ms] ${unlocking ? "opacity-0" : ""}`}>
        <img
          src={fullLogoUrl}
          alt="River Hills Coffee"
          className="w-52 max-h-[24vh] object-contain sm:w-[min(38rem,46vw)] sm:max-h-[70vh] sm:-mt-16"
          draggable={false}
        />
      </div>

      {/* PIN pad */}
      <div className={`relative z-10 flex flex-1 items-center justify-center p-8 transition-opacity duration-[220ms] ${unlocking ? "opacity-0" : ""}`}>
        <div className="w-full max-w-[19rem]">

          <div className="mb-6 flex items-center justify-center">
            <Coffee size={48} className="text-[#262626]" strokeWidth={2.35} />
          </div>

          {/* PIN dots */}
          <div className="flex items-center justify-center gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xl font-semibold shadow-[0_8px_20px_rgba(0,0,0,0.10)] sm:shadow-[0_8px_20px_rgba(0,0,0,0.18)] ${
                  pin.length > i
                    ? "border-[#1be4db]/35 bg-white sm:bg-[var(--bg-elevated)] text-gray-900 sm:text-[var(--text-primary)]"
                    : "border-gray-200 sm:border-white/10 bg-gray-100 sm:bg-[var(--overlay-soft)] text-gray-300 sm:text-[var(--text-dimmest)]/50"
                }`}
              >
                {pin.length > i ? "•" : ""}
              </span>
            ))}
          </div>

          {error ? <div className="mt-3 text-center text-sm text-red-500">{error}</div> : null}

          {/* Number grid */}
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {(["1","2","3","4","5","6","7","8","9"] as const).map((d) => (
              <button key={d} type="button" disabled={submitting || unlocking} onClick={() => appendDigit(d)}
                className="flex h-12 items-center justify-center rounded-xl border border-gray-200 sm:border-white/10 bg-white sm:bg-[var(--bg-elevated)] text-xl font-semibold text-gray-900 sm:text-[var(--text-primary)] shadow-[0_4px_10px_rgba(0,0,0,0.07)] sm:shadow-[0_8px_18px_rgba(0,0,0,0.18)] disabled:opacity-50">
                {d}
              </button>
            ))}
            <button type="button" disabled={submitting || unlocking} onClick={clearPin}
              className="flex h-12 items-center justify-center rounded-xl border border-gray-200 sm:border-white/10 bg-white sm:bg-[var(--bg-elevated)] text-base font-semibold text-gray-500 sm:text-[var(--text-muted)] shadow-[0_4px_10px_rgba(0,0,0,0.07)] sm:shadow-[0_8px_18px_rgba(0,0,0,0.18)] disabled:opacity-50">
              Clear
            </button>
            <button type="button" disabled={submitting || unlocking} onClick={() => appendDigit("0")}
              className="flex h-12 items-center justify-center rounded-xl border border-gray-200 sm:border-white/10 bg-white sm:bg-[var(--bg-elevated)] text-xl font-semibold text-gray-900 sm:text-[var(--text-primary)] shadow-[0_4px_10px_rgba(0,0,0,0.07)] sm:shadow-[0_8px_18px_rgba(0,0,0,0.18)] disabled:opacity-50">
              0
            </button>
            <button type="button" disabled={submitting || unlocking} onClick={submitPin}
              className="flex h-16 items-center justify-center gap-2 rounded-xl bg-[#1be4db] text-base font-bold text-[#1a1a1a] shadow-[0_10px_24px_rgba(27,228,219,0.2)] disabled:opacity-60">
              <ArrowRight size={20} />
              Enter
            </button>
          </div>

          <button type="button" disabled={submitting || unlocking} onClick={deleteDigit}
            className="mx-auto mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 sm:border-white/10 bg-white sm:bg-[var(--bg-elevated)] text-base font-medium text-gray-500 sm:text-[var(--text-muted)] shadow-[0_4px_10px_rgba(0,0,0,0.07)] sm:shadow-[0_8px_18px_rgba(0,0,0,0.14)] disabled:opacity-50">
            <Delete size={18} />
            Delete
          </button>
        </div>
      </div>

      {/* Admin button */}
      <button
        type="button"
        aria-label="Open admin tools"
        disabled={submitting || unlocking}
        onClick={onOpenAdmin}
        className="fixed bottom-4 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 sm:border-white/10 bg-white sm:bg-[var(--bg-elevated)] text-gray-600 sm:text-[var(--text-primary)] shadow-[0_4px_14px_rgba(0,0,0,0.10)] sm:shadow-[0_8px_24px_rgba(0,0,0,0.18)] disabled:opacity-50"
      >
        <Settings2 size={17} />
      </button>
    </main>
  );
}
