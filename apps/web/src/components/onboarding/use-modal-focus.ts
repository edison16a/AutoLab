"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]';

/** Controls a person can tab to right now. Hidden ones (display none) have no client rects. */
function focusables(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
}

/**
 * Keeps keyboard focus inside a modal: Tab and Shift+Tab wrap around,
 * Escape calls onClose, and focus goes back to whatever opened the modal
 * when it unmounts. Focus starts inside the modal, so screen readers
 * announce it before anything behind it.
 */
export function useModalFocus(root: RefObject<HTMLElement | null>, onClose: () => void) {
  // Read onClose through a ref so a new callback each render doesn't re-run the setup.
  const close = useRef(onClose);
  close.current = onClose;

  // Taken during the first render: child effects run before this hook's and may move focus.
  const [opener] = useState(() =>
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  useEffect(() => {
    // A child may already have taken focus (the first step's heading). Otherwise start on the modal.
    if (!root.current?.contains(document.activeElement)) root.current?.focus();

    function onKey(event: KeyboardEvent) {
      const modal = root.current;
      if (!modal) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables(modal);
      if (items.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !modal.contains(active);
      if (event.shiftKey && (active === first || active === modal || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    }

    // Capture phase, so Escape closes the wizard before anything behind it reacts.
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (opener?.isConnected) opener.focus();
    };
  }, [root, opener]);
}
