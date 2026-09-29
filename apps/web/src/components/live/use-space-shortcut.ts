"use client";
import { useEffect, useRef } from "react";

/**
 * Things that already do something with Space (buttons, switches, tabs) or
 * where Space is typed. Taking a photo there would fire twice or eat a key.
 */
const USES_SPACE = [
  "input",
  "textarea",
  "select",
  "button",
  "[contenteditable]",
  "[role='button']",
  "[role='switch']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='menuitem']",
  "[role='slider']",
].join(",");

/**
 * Space works like a shutter button while `enabled`. It stays quiet while a
 * dialog is open, on key repeat (holding Space shouldn't fire a burst) and
 * with modifiers, so browser and OS shortcuts keep working.
 */
export function useSpaceShortcut(action: () => void, enabled: boolean) {
  const latest = useRef(action);

  useEffect(() => {
    latest.current = action;
  }, [action]);

  useEffect(() => {
    if (!enabled) return;
    function onKey(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest(USES_SPACE)) return;
      if (document.querySelector("[aria-modal='true']")) return;
      // Without this the page would also scroll.
      event.preventDefault();
      latest.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
