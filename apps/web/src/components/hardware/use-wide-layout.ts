"use client";
import { useEffect, useState } from "react";

/** Matches the layout breakpoint in layout.css: above it, panels float over the canvas. */
const WIDE = "(min-width: 861px)";

/** True when the details panel floats over the canvas instead of sitting below it. */
export function useWideLayout() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return wide;
}
