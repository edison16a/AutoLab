"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface MenuProps {
  /** Renders the button that opens the menu. */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  /** Menu items. Call close() after an item acts. */
  children: (close: () => void) => ReactNode;
  label: string;
  align?: "start" | "end";
}

/** A dropdown that closes on outside click, on Escape and after an item is chosen. */
export function Menu({ trigger, children, label, align = "end" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={root}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <div className={`menu__panel menu__panel--${align}`} role="menu" aria-label={label}>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
