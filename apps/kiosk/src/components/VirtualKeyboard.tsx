import { useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";

type KbMode = "numeric" | "decimal" | "qwerty" | "email";

function detectMode(el: HTMLInputElement | HTMLTextAreaElement): KbMode {
  if (el instanceof HTMLTextAreaElement) return "qwerty";
  const im = el.inputMode;
  const type = el.type;
  if (im === "numeric" || type === "tel") return "numeric";
  if (im === "decimal") return "decimal";
  if (type === "email") return "email";
  return "qwerty";
}

const inputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
const textareaValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;

function reactSet(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = el instanceof HTMLTextAreaElement ? textareaValueSetter : inputValueSetter;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function appendChar(el: HTMLInputElement | HTMLTextAreaElement, char: string) {
  reactSet(el, el.value + char);
}

function deleteChar(el: HTMLInputElement | HTMLTextAreaElement) {
  reactSet(el, el.value.slice(0, -1));
}

function submitTarget(el: HTMLInputElement | HTMLTextAreaElement) {
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
}

// ─── Numpad ───────────────────────────────────────────────────────────────────

const NUMPAD_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
];

function Numpad({
  mode,
  onKey,
  onBack,
  onDone,
}: {
  mode: "numeric" | "decimal";
  onKey: (k: string) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const btn =
    "flex h-14 items-center justify-center rounded-xl text-xl font-semibold text-[var(--text-primary)] bg-[var(--overlay-soft)] active:bg-[var(--overlay-active)] select-none";
  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {NUMPAD_ROWS.map((row) =>
        row.map((d) => (
          <button
            key={d}
            type="button"
            className={btn}
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onKey(d)}
          >
            {d}
          </button>
        )),
      )}
      {/* Bottom row */}
      {mode === "decimal" ? (
        <button
          type="button"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onKey(".")}
        >
          .
        </button>
      ) : (
        <button
          type="button"
          className={`${btn} text-sm text-[var(--text-dimmer)]`}
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
          onClick={onDone}
        >
          Done
        </button>
      )}
      <button
        type="button"
        className={btn}
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => onKey("0")}
      >
        0
      </button>
      {mode === "decimal" ? (
        <button
          type="button"
          className={`${btn} text-sm text-[var(--text-dimmer)]`}
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
          onClick={onDone}
        >
          Done
        </button>
      ) : (
        <button
          type="button"
          className={`${btn} flex items-center justify-center`}
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
          onClick={onBack}
        >
          <Delete size={20} />
        </button>
      )}
      {/* Extra backspace row for decimal since Done took its spot */}
      {mode === "decimal" ? (
        <button
          type="button"
          className={`${btn} col-span-3 flex items-center justify-center gap-2 text-sm`}
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
          onClick={onBack}
        >
          <Delete size={18} />
          <span>Backspace</span>
        </button>
      ) : null}
    </div>
  );
}

// ─── QWERTY ───────────────────────────────────────────────────────────────────

const QWERTY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const QWERTY_ROWS_UPPER = QWERTY_ROWS.map((row) => row.map((k) => k.toUpperCase()));

function Qwerty({
  mode,
  onKey,
  onBack,
  onDone,
}: {
  mode: "qwerty" | "email";
  onKey: (k: string) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const [upper, setUpper] = useState(false);
  const rows = upper ? QWERTY_ROWS_UPPER : QWERTY_ROWS;

  const keyBtn =
    "flex h-11 min-w-0 flex-1 items-center justify-center rounded-lg text-sm font-semibold text-[var(--text-primary)] bg-[var(--overlay-soft)] active:bg-[var(--overlay-active)] select-none";
  const actionBtn =
    "flex h-11 items-center justify-center rounded-lg px-3 text-xs font-semibold text-[var(--text-muted)] bg-[rgba(255,255,255,0.03)] active:bg-[var(--overlay-active)] select-none";

  const press = (k: string) => {
    onKey(k);
    if (upper) setUpper(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-1.5 p-3 pb-4">
      {/* Numbers row — top */}
      <div className="flex gap-1">
        {"1234567890".split("").map((d) => (
          <button
            key={d}
            type="button"
            className={`${keyBtn} text-xs`}
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onKey(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {/* QWERTY rows */}
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-1">
          {ri === 2 && (
            <button
              type="button"
              className={`${actionBtn} w-12`}
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setUpper((u) => !u)}
            >
              {upper ? "⬆" : "⇧"}
            </button>
          )}
          {row.map((k) => (
            <button
              key={k}
              type="button"
              className={keyBtn}
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => press(k)}
            >
              {k}
            </button>
          ))}
          {ri === 2 && (
            <button
              type="button"
              className={`${actionBtn} w-12`}
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => e.preventDefault()}
              onClick={onBack}
            >
              <Delete size={16} />
            </button>
          )}
        </div>
      ))}

      {/* Space / email specials / Done */}
      <div className="mt-0.5 flex gap-1">
        {mode === "email" && (
          <>
            <button
              type="button"
              className={`${keyBtn} flex-none px-3`}
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onKey("@")}
            >
              @
            </button>
            <button
              type="button"
              className={`${keyBtn} flex-none px-3`}
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onKey(".")}
            >
              .
            </button>
          </>
        )}
        <button
          type="button"
          className={`${keyBtn} flex-1`}
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onKey(" ")}
        >
          space
        </button>
        <button
          type="button"
          className="flex h-11 items-center justify-center rounded-lg bg-[#1be4db] px-4 text-xs font-bold text-[#1a1a1a] active:opacity-80 select-none"
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
          onClick={onDone}
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Container ───────────────────────────────────────────────────────────────

export function VirtualKeyboard() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<KbMode>("qwerty");
  const targetRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return;
      // File pickers and other non-text controls must retain their native behavior.
      if (["hidden", "checkbox", "radio", "file", "button", "submit", "range", "color"].includes(el.type)) return;

      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      targetRef.current = el;
      setMode(detectMode(el));
      setVisible(true);
    };

    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Element | null;
      // Don't hide if focus moved into the keyboard itself
      if (next?.closest("[data-vkb]")) return;
      hideTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        targetRef.current = null;
      }, 150);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  if (!visible) return null;

  const handleKey = (k: string) => {
    if (targetRef.current) appendChar(targetRef.current, k);
  };

  const handleBack = () => {
    if (targetRef.current) deleteChar(targetRef.current);
  };

  const handleDone = () => {
    if (targetRef.current) {
      submitTarget(targetRef.current);
      targetRef.current.blur();
    }
    setVisible(false);
  };

  return (
    <div
      data-vkb="1"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-[var(--divider)] bg-[var(--bg-surface)] shadow-[0_-4px_24px_rgba(0,0,0,0.18)]"
    >
      {mode === "numeric" || mode === "decimal" ? (
        <div className="mx-auto max-w-xs">
          <Numpad mode={mode} onKey={handleKey} onBack={handleBack} onDone={handleDone} />
        </div>
      ) : (
        <Qwerty mode={mode} onKey={handleKey} onBack={handleBack} onDone={handleDone} />
      )}
    </div>
  );
}
