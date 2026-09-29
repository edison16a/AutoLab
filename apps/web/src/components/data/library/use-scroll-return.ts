"use client";
import { useEffect } from "react";

const KEY = "autolab:data-scroll";

/** The app scrolls inside <main id="main">, not the window, so the browser can't restore it. */
function scroller() {
  return document.getElementById("main");
}

/** Called as an image opens, so coming back lands on the same row. */
export function rememberScroll() {
  try {
    sessionStorage.setItem(KEY, String(scroller()?.scrollTop ?? 0));
  } catch {
    // Storage blocked. Coming back starts at the top, which is fine.
  }
}

/**
 * Puts the library back where it was once the grid has rendered. The saved
 * spot is used once, so arriving from the top nav later starts at the top.
 * Thumbnails reserve their 4:3 box up front, so the layout is already the
 * right height before the images decode.
 */
export function useScrollReturn(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(KEY);
      sessionStorage.removeItem(KEY);
    } catch {
      return;
    }
    const main = scroller();
    if (main && saved) main.scrollTop = Number(saved);
  }, [ready]);
}
