import { ArrowRight, Delete, LockKeyhole, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

import fullLogoUrl from "../../assets/River Hills Logo with text Colored.svg?url";

interface AppLockScreenProps {
  onUnlock: (pin: string) => Promise<void>;
  onUnlocked: () => void;
  onOpenAdmin: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const UNLOCK_ANIMATION_MS = 520;

export function AppLockScreen({ onUnlock, onUnlocked, onOpenAdmin }: AppLockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (!unlocking) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onUnlocked();
    }, UNLOCK_ANIMATION_MS);

    return () => window.clearTimeout(timeout);
  }, [unlocking, onUnlocked]);

  const appendDigit = (digit: string) => {
    if (submitting || unlocking) return;
    setError(null);
    setPin((current) => (current.length >= 8 ? current : `${current}${digit}`));
  };

  const deleteDigit = () => {
    if (submitting || unlocking) return;
    setError(null);
    setPin((current) => current.slice(0, -1));
  };

  const clearPin = () => {
    if (submitting || unlocking) return;
    setError(null);
    setPin("");
  };

  const submitPin = async () => {
    if (submitting || unlocking || !pin) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onUnlock(pin);
      setUnlocking(true);
    } catch (unlockError) {
      setPin("");
      setError(unlockError instanceof Error ? unlockError.message : "Invalid PIN.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="pos-app-shell relative isolate flex min-h-screen overflow-hidden px-4 py-6">
      <div className="pos-ambient pos-ambient-primary" />
      <div className="pos-ambient pos-ambient-warm" />

      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-0 hidden w-1/2 bg-[#262626] transition-transform duration-[520ms] ease-in-out lg:block ${
          unlocking ? "-translate-x-full" : "translate-x-0"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-1/2 bg-[var(--bg-elevated)] transition-transform duration-[520ms] ease-in-out lg:block ${
          unlocking ? "translate-x-full" : "translate-x-0"
        }`}
      />

      <section
        className={`relative z-10 flex min-h-full w-full flex-col items-center justify-center gap-8 transition-opacity duration-300 lg:grid lg:grid-cols-2 lg:items-center ${
          unlocking ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex w-full items-center justify-center px-2 lg:min-h-full">
          <img
            src={fullLogoUrl}
            alt="River Hills Coffee"
            className="w-[clamp(18rem,68vw,34rem)] max-h-[38vh] object-contain lg:w-[clamp(24rem,40vw,58rem)] lg:max-h-[72vh]"
            draggable={false}
          />
        </div>

        <div className="flex w-full items-center justify-center px-2 lg:min-h-full">
          <div className="w-full max-w-[20rem]">
            <div className="mb-4 hidden items-center justify-center lg:flex">
              <LockKeyhole size={66} className="text-[#1be4db]" strokeWidth={2.35} />
            </div>

            <div className="flex items-center justify-center gap-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <span
                  key={index}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xl font-semibold shadow-[0_14px_35px_rgba(0,0,0,0.18)] transition ${
                    pin.length > index
                      ? "border-[#1be4db]/35 bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      : "border-white/10 bg-[var(--overlay-soft)] text-[var(--text-dimmest)]/50"
                  }`}
                >
                  {pin.length > index ? "•" : ""}
                </span>
              ))}
            </div>

            {error ? <div className="mt-4 text-center text-sm text-red-400">{error}</div> : null}

            <div className="mx-auto mt-5 grid w-fit grid-cols-3 gap-2">
              {KEYS.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={submitting || unlocking}
                  onClick={() => appendDigit(digit)}
                  className="flex h-12 w-20 items-center justify-center rounded-xl border border-white/10 bg-[var(--bg-elevated)] text-base font-semibold text-[var(--text-primary)] shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition active:scale-[0.97] disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                disabled={submitting || unlocking}
                onClick={clearPin}
                className="flex h-12 w-20 items-center justify-center rounded-xl border border-white/10 bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-muted)] shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition active:scale-[0.97] disabled:opacity-50"
              >
                Clear
              </button>

              <button
                type="button"
                disabled={submitting || unlocking}
                onClick={() => appendDigit("0")}
                className="flex h-12 w-20 items-center justify-center rounded-xl border border-white/10 bg-[var(--bg-elevated)] text-base font-semibold text-[var(--text-primary)] shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition active:scale-[0.97] disabled:opacity-50"
              >
                0
              </button>

              <button
                type="button"
                disabled={submitting || unlocking}
                onClick={submitPin}
                className="flex h-12 w-20 items-center justify-center gap-2 rounded-xl bg-[#1be4db] text-xs font-bold text-[#1a1a1a] shadow-[0_16px_34px_rgba(27,228,219,0.2)] transition active:scale-[0.97] disabled:opacity-60"
              >
                <ArrowRight size={16} />
                Enter
              </button>
            </div>

            <button
              type="button"
              disabled={submitting || unlocking}
              onClick={deleteDigit}
              className="mx-auto mt-3 flex h-11 w-20 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-muted)] shadow-[0_14px_28px_rgba(0,0,0,0.14)] transition active:scale-[0.97] disabled:opacity-50"
            >
              <Delete size={15} />
              Delete
            </button>
          </div>
        </div>
      </section>

      <button
        type="button"
        aria-label="Open admin tools"
        disabled={submitting || unlocking}
        onClick={onOpenAdmin}
        className="absolute bottom-4 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[0_14px_32px_rgba(0,0,0,0.18)] transition active:scale-[0.96] disabled:opacity-50"
      >
        <Settings2 size={20} />
      </button>
    </main>
  );
}
