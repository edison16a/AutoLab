"use client";
import { niceScale } from "@/lib/stats/math";
import { ChartFrame } from "./ChartFrame";
import { columnPath, columnWidth, edgeAnchor } from "./geometry";
import { CategoryTicks, ValueAxis, axisWidth } from "./ValueAxis";

export interface Column {
  key: string;
  value: number;
  /** Tooltip line under the value, such as the day. */
  label: string;
  detail?: string;
}

/** An x axis label. `at` is in column units: 0 is the left edge of the first column, 0.5 its middle. */
export interface ColumnTick {
  at: number;
  label: string;
}

interface ColumnChartProps {
  data: Column[];
  summary: string;
  /** The tooltip value, such as "3 captures". */
  describe: (value: number) => string;
  /** Labels for the x axis, given how many fit the measured width. */
  ticks: (fit: number) => ColumnTick[];
  height?: number;
}

const TOP = 22;
const BOTTOM = 26;
const RIGHT = 4;
/** Room each x label needs so neighbours never touch. */
const TICK_SPACE = 56;

const countLabel = (value: number) => value.toLocaleString();

/**
 * Vertical bars from one zero line, one accent colour. The tallest column
 * carries its value on the cap. Every other value is in the tooltip and the
 * table.
 */
export function ColumnChart({ data, summary, describe, ticks, height = 220 }: ColumnChartProps) {
  const scale = niceScale(Math.max(0, ...data.map((d) => d.value)), 4, true);
  const left = axisWidth(scale, countLabel);
  const bottom = height - BOTTOM;
  const y = (value: number) => bottom - (value / scale.max) * (bottom - TOP);
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? 0) ? i : best), -1);

  const layout = (width: number) => {
    const plot = Math.max(1, width - left - RIGHT);
    const band = plot / Math.max(1, data.length);
    return { band, bar: columnWidth(band), center: (i: number) => left + band * (i + 0.5) };
  };

  return (
    <ChartFrame
      summary={summary}
      height={height}
      count={data.length}
      start="last"
      hit={(x, _y, width) => {
        const { band } = layout(width);
        const index = Math.floor((x - left) / band);
        return index >= 0 && index < data.length ? index : null;
      }}
      tip={(i, width) => ({
        x: layout(width).center(i),
        y: y(data[i].value),
        value: describe(data[i].value),
        label: data[i].label,
        detail: data[i].detail,
      })}
      draw={(width, active) => {
        const { band, bar, center } = layout(width);
        const placed = ticks(Math.floor((width - left) / TICK_SPACE)).map((t) => ({
          ...edgeAnchor(left + band * t.at, t.label, width),
          label: t.label,
        }));
        return (
          <>
            <ValueAxis scale={scale} format={countLabel} left={left} right={width - RIGHT} y={y} />
            {data.map((d, i) =>
              d.value > 0 ? (
                <path
                  key={d.key}
                  className={`stats-chart__bar ${active !== null && active !== i ? "stats-chart__bar--dim" : ""}`}
                  d={columnPath(center(i) - bar / 2, y(d.value), bar, bottom)}
                />
              ) : null,
            )}
            {peak >= 0 ? (
              <text className="stats-chart__cap" x={center(peak)} y={y(data[peak].value) - 7} textAnchor="middle">
                {countLabel(data[peak].value)}
              </text>
            ) : null}
            <CategoryTicks ticks={placed} y={height - 6} />
          </>
        );
      }}
    />
  );
}
