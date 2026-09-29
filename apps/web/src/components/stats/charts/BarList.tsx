"use client";
import { ChartFrame } from "./ChartFrame";
import { barPath, textWidth } from "./geometry";

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Muted text after the value, such as a share. */
  note?: string;
  /** Context rows such as "Other" are drawn in grey. */
  muted?: boolean;
  detail?: string;
}

interface BarListProps {
  rows: BarRow[];
  summary: string;
  describe: (value: number) => string;
  /** Fits the rows into this height, up to the normal row size, so the panel lines up with its neighbour. */
  height?: number;
}

const ROW = 30;
const THICKNESS = 12;
const LABEL_SIZE = 12;

/** Cuts a label that would run into its bar. The full text is in the tooltip and table. */
function fit(label: string, room: number) {
  if (textWidth(label, LABEL_SIZE) <= room) return label;
  const chars = Math.max(1, Math.floor(room / (LABEL_SIZE * 0.58)) - 1);
  return `${label.slice(0, chars)}…`;
}

/**
 * Horizontal bars with the name on the left and the value at the tip, so
 * every row is read directly with no legend or axis.
 */
export function BarList({ rows, summary, describe, height: room }: BarListProps) {
  const pitch = room ? Math.min(ROW, room / Math.max(1, rows.length)) : ROW;
  const height = rows.length * pitch;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const valueText = (row: BarRow) => `${row.value.toLocaleString()}${row.note ? `  ${row.note}` : ""}`;
  const valueRoom = Math.max(...rows.map((r) => textWidth(valueText(r), LABEL_SIZE))) + 12;

  const layout = (width: number) => {
    const labelRoom = Math.min(Math.max(...rows.map((r) => textWidth(r.label, LABEL_SIZE))) + 16, width * 0.38);
    const span = Math.max(1, width - labelRoom - valueRoom);
    return { labelRoom, end: (value: number) => labelRoom + Math.max(2, (value / max) * span) };
  };

  return (
    <ChartFrame
      summary={summary}
      height={height}
      count={rows.length}
      hit={(_x, y) => {
        const index = Math.floor(y / pitch);
        return index >= 0 && index < rows.length ? index : null;
      }}
      tip={(i, width) => ({
        x: layout(width).end(rows[i].value),
        y: i * pitch + pitch / 2,
        value: describe(rows[i].value),
        label: rows[i].label,
        detail: rows[i].detail,
      })}
      draw={(width, active) => {
        const { labelRoom, end } = layout(width);
        return rows.map((row, i) => {
          const mid = i * pitch + pitch / 2;
          const tip = end(row.value);
          const dim = active !== null && active !== i ? "stats-chart__bar--dim" : "";
          return (
            <g key={row.key}>
              <text className="stats-chart__label" x={0} y={mid} dominantBaseline="middle">
                {fit(row.label, labelRoom - 12)}
              </text>
              <path
                className={`stats-chart__bar ${row.muted ? "stats-chart__bar--other" : ""} ${dim}`}
                d={barPath(labelRoom, mid - THICKNESS / 2, tip, THICKNESS)}
              />
              <text className="stats-chart__value" x={tip + 8} y={mid} dominantBaseline="middle">
                {row.value.toLocaleString()}
                {row.note ? <tspan className="stats-chart__note" dx={6}>{row.note}</tspan> : null}
              </text>
            </g>
          );
        });
      }}
    />
  );
}
