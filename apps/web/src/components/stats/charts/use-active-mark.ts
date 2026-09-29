"use client";
import { useCallback, useState, type FocusEvent, type KeyboardEvent } from "react";

/** Which mark is highlighted, and whether the keyboard put it there. */
interface ActiveMark {
  index: number;
  keyboard: boolean;
}

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * The highlighted bar or dot in a chart. The pointer sets it by position and
 * the keyboard steps through marks with the arrow keys, so a chart is one tab
 * stop no matter how many marks it has. `start` picks where keyboard focus
 * lands first: the newest point on a time series, the top row on a list.
 */
export function useActiveMark(count: number, start: "first" | "last" = "first") {
  const [mark, setMark] = useState<ActiveMark | null>(null);
  const active = mark && mark.index < count ? mark : null;

  const point = useCallback((index: number | null) => {
    setMark(index === null ? null : { index, keyboard: false });
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (!count) return;
    if (event.key === "Escape" && active) {
      event.preventDefault();
      setMark(null);
      return;
    }
    let next: number | null = null;
    if (event.key in STEPS) next = (active?.index ?? (start === "last" ? count : -1)) + STEPS[event.key];
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next === null) return;
    event.preventDefault();
    setMark({ index: Math.max(0, Math.min(count - 1, next)), keyboard: true });
  };

  // Only keyboard focus picks a mark. A click focuses the chart too, and the
  // pointer already says which mark it's over.
  const onFocus = (event: FocusEvent<HTMLElement>) => {
    if (!count || !event.currentTarget.matches(":focus-visible")) return;
    setMark({ index: start === "last" ? count - 1 : 0, keyboard: true });
  };

  const onBlur = () => setMark(null);

  return {
    active: active?.index ?? null,
    keyboard: active?.keyboard ?? false,
    point,
    handlers: { onKeyDown, onFocus, onBlur },
  };
}
