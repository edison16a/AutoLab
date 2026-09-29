/**
 * Reads colours from the CSS design tokens so the 3D scene never drifts from
 * the rest of the app. Only the accent crosses over: product materials are
 * physical neutrals and stay the same in both themes.
 */
const ACCENT_FALLBACK = "#2684ff";

/** The current value of a CSS custom property on <html>, or the fallback. */
export function readCssColor(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** The single accent, used for selection, lit LEDs and emphasised connectors. */
export function accentColor(): string {
  return readCssColor("--accent", ACCENT_FALLBACK);
}
