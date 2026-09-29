"use client";
import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons along the bottom edge. */
  actions?: ReactNode;
}

/**
 * A small centered dialog. Escape and a backdrop click close it, focus moves
 * inside on open and goes back to whatever opened it on close.
 */
export function Dialog({ open, title, onClose, children, actions }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    // The last button is the main action by convention, so it gets focus.
    const buttons = panel.current?.querySelectorAll<HTMLElement>("button, input");
    (buttons?.[buttons.length - 1] ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className="dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <h2 className="dialog__title">{title}</h2>
        {children}
        {actions ? <div className="dialog__actions">{actions}</div> : null}
      </div>
    </div>
  );
}
