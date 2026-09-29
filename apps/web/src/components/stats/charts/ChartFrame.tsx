"use client";
import type { PointerEvent, ReactNode } from "react";
import { useActiveMark } from "./use-active-mark";
import { useWidth } from "./use-width";

/** What the tooltip says about one mark, and where to pin it in chart pixels. */
export interface Tip {
  x: number;
  y: number;
  value: string;
  label: string;
  detail?: string;
  /**
   * Above or below the point instead of beside it. Rows of horizontal bars
   * use this, since a tooltip beside the bar end would sit on the bar.
   */
  place?: "above" | "below";
}

interface ChartFrameProps {
  /** Screen reader summary of the whole chart. The table below has the numbers. */
  summary: string;
  height: number;
  /** How many marks the arrow keys step through. */
  count: number;
  start?: "first" | "last";
  /** Which mark sits under a point in chart pixels, if any. */
  hit: (x: number, y: number, width: number) => number | null;
  draw: (width: number, active: number | null) => ReactNode;
  tip: (index: number, width: number) => Tip;
}

/**
 * Everything the charts share: measuring, pointer and keyboard tracking, the
 * tooltip and a live region. Each chart only supplies how to draw itself and
 * how to find a mark under the pointer.
 */
export function ChartFrame({ summary, height, count, start, hit, draw, tip }: ChartFrameProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { active, keyboard, point, handlers } = useActiveMark(count, start);
  const current = active !== null && width ? tip(active, width) : null;

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    point(hit(event.clientX - box.left, event.clientY - box.top, width));
  };

  return (
    <div className="stats-chart">
      <div
        ref={ref}
        className="stats-chart__plot"
        style={{ height }}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerMove={track}
        onPointerDown={track}
        // A lifted finger also "leaves". Touch keeps the tooltip until the chart loses focus.
        onPointerLeave={(event) => event.pointerType !== "touch" && point(null)}
        {...handlers}
      >
        {width ? (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
            {draw(width, active)}
          </svg>
        ) : null}
        {current ? <Tooltip tip={current} width={width} height={height} /> : null}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {keyboard && current ? `${current.value}, ${current.label}${current.detail ? `, ${current.detail}` : ""}` : ""}
      </p>
    </div>
  );
}

/**
 * Sits beside the mark, on whichever side has more room, so it never covers
 * the thing being read. With `place` it sits above or below instead, centred
 * on the point and pulled in from the edges by about half its width.
 */
function Tooltip({ tip, width, height }: { tip: Tip; width: number; height: number }) {
  const style = tip.place
    ? { left: Math.min(Math.max(tip.x, 70), Math.max(70, width - 70)), top: tip.y }
    : { left: tip.x, top: Math.min(Math.max(tip.y, 30), height - 30) };
  const modifier = tip.place ?? (tip.x > width / 2 ? "left" : "right");
  return (
    <div className={`stats-tip stats-tip--${modifier}`} style={style}>
      <span className="stats-tip__value">{tip.value}</span>
      <span className="stats-tip__label">{tip.label}</span>
      {tip.detail ? <span className="stats-tip__label">{tip.detail}</span> : null}
    </div>
  );
}
