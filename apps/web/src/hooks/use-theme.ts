"use client";
/**
 * Light and dark theme. The theme lives on <html data-theme>, set before
 * first paint by the boot script in app/layout.tsx, and is remembered in
 * localStorage under the same key that script reads.
 */
import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/storage/local-settings";

export type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Tells the 3D scene and anything else drawn outside CSS that the theme changed. */
const THEME_EVENT = "autolab:theme";

/** Returns the active theme and a way to flip it. Every caller stays in sync. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(readTheme());
    const sync = () => setThemeState(readTheme());
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, next);
    } catch {
      // Storage can be blocked. The theme still applies for this visit.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const toggleTheme = useCallback(() => setTheme(readTheme() === "dark" ? "light" : "dark"), [setTheme]);

  return { theme, setTheme, toggleTheme };
}

/**
 * Runs inline in <head> so the page never flashes the wrong theme. Falls back
 * to the system preference when nothing is saved.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORAGE_KEYS.theme,
)});if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`;
