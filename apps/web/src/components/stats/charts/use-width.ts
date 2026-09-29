"use client";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Tracks an element's width in CSS pixels. Charts draw with a viewBox equal
 * to their real size, so text stays 11px on a phone instead of shrinking
 * with the whole drawing. Zero until the first measurement.
 */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(Math.floor(element.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
