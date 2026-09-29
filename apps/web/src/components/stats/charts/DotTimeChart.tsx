"use client";
import { niceScale } from "@/lib/stats/math";
import { dayTicks } from "@/lib/stats/ticks";
import type { Window } from "@/lib/stats/types";
import { ChartFrame } from "./ChartFrame";
import { edgeAnchor } from "./geometry";
import { CategoryTicks, ValueAxis, axisWidth } from "./ValueAxis";

export interface TimePoint {
  key: string;
  time: number;
  value: number;
  label: string;
  detail?: string;
}

interface DotTimeChartProps {
  /** Oldest first. */
  points: TimePoint[];
  window: Window;
  summary: string;
  /** Axis label for a value, such as "150 ms". */
  tick: (value: number) => string;
  /** Tooltip value, such as "152 ms". */
  describe: (value: number) => string;
  /** Short date for the x axis. */
  day: (time: number) => string;
  /** A labelled hairline, such as the median. */
  reference?: { value: number; label: string };
  height?: number;
}

const TOP = 14;
const BOTTOM = 26;
const RIGHT = 10;
const TICK_SPACE = 64;

/**
 * One dot per measurement over time. The pointer snaps a crosshair to the
 * nearest point by time, so nobody has to land on an 8px dot.
 */
export function DotTimeChart({ points, window, summary, tick, describe, day, reference, height = 220 }: DotTimeChartProps) {
  const scale = niceScale(Math.max(0, ...points.map((p) => p.value)), 4);
  const left = axisWidth(scale, tick);
  const bottom = height - BOTTOM;
  const y = (value: number) => bottom - (value / scale.max) * (bottom - TOP);
  const span = Math.max(1, window.end - window.start);

  const xOf = (width: number) => (time: number) => {
    const clamped = Math.min(window.end, Math.max(window.start, time));
    return left + ((clamped - window.start) / span) * (width - left - RIGHT);
  };

  const nearest = (x: number, width: number) => {
    const at = xOf(width);
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(at(p.time) - x) < Math.abs(at(points[best].time) - x)) best = i;
    });
    return best;
  };

  return (
    <ChartFrame
      summary={summary}
      height={height}
      count={points.length}
      start="last"
      hit={(x, _y, width) => (points.length && x >= left - 12 ? nearest(x, width) : null)}
      tip={(i, width) => ({
        x: xOf(width)(points[i].time),
        y: y(points[i].value),
        value: describe(points[i].value),
        label: points[i].label,
        detail: points[i].detail,
      })}
      draw={(width, active) => {
        const x = xOf(width);
        const ticks = dayTicks(window.start, window.end, Math.floor((width - left) / TICK_SPACE)).map((t) => ({
          ...edgeAnchor(x(t), day(t), width),
          label: day(t),
        }));
        const activeX = active !== null ? Math.round(x(points[active].time)) + 0.5 : null;
        return (
          <>
            <ValueAxis scale={scale} format={tick} left={left} right={width - RIGHT} y={y} />
            {activeX !== null ? <line className="stats-chart__cross" x1={activeX} x2={activeX} y1={TOP - 6} y2={bottom} /> : null}
            {reference ? (
              <line className="stats-chart__ref" x1={left} x2={width - RIGHT} y1={y(reference.value)} y2={y(reference.value)} />
            ) : null}
            {points.map((p) => (
              <circle key={p.key} className="stats-chart__dot" cx={x(p.time)} cy={y(p.value)} r={4} />
            ))}
            {/* The label goes over the dots. Its halo keeps it readable where they cross. */}
            {reference ? (
              <text className="stats-chart__ref-label" x={width - RIGHT} y={y(reference.value) - 5} textAnchor="end">
                {reference.label}
              </text>
            ) : null}
            {/* Drawn again on top so a crowded point is never hidden under its neighbours. */}
            {active !== null ? (
              <circle className="stats-chart__dot" cx={x(points[active].time)} cy={y(points[active].value)} r={5.5} />
            ) : null}
            <CategoryTicks ticks={ticks} y={height - 6} />
          </>
        );
      }}
    />
  );
}
