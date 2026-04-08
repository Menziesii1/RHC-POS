import { AlertTriangle } from "lucide-react";
import { useEffect, useId, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCancel(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl bg-[#323232] p-6"
        role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center"><AlertTriangle size={28} className="text-amber-400" /></div>
        <div id={titleId} className="mt-3 text-center font-display text-xl font-extrabold text-white">{title}</div>
        <p id={messageId} className="mt-2 text-center text-sm text-white/60">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button ref={cancelButtonRef} type="button" className="min-w-[110px] rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/15" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="min-w-[110px] rounded-xl bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.08]" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
