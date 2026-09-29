import type { Scale } from "@/lib/stats/math";
import { textWidth } from "./geometry";

/** Space the value labels take on the left, plus a small gap before the grid. */
export function axisWidth(scale: Scale, format: (value: number) => string) {
  return Math.ceil(Math.max(...scale.ticks.map((t) => textWidth(format(t))))) + 10;
}

interface ValueAxisProps {
  scale: Scale;
  format: (value: number) => string;
  left: number;
  right: number;
  y: (value: number) => number;
}

/**
 * Hairline gridlines with their values on the left. The zero line is one
 * step stronger because every bar grows from it.
 */
export function ValueAxis({ scale, format, left, right, y }: ValueAxisProps) {
  return (
    <g>
      {scale.ticks.map((tick) => {
        const at = Math.round(y(tick)) + 0.5;
        return (
          <g key={tick}>
            <line
              className={tick === 0 ? "stats-chart__baseline" : "stats-chart__grid"}
              x1={left}
              x2={right}
              y1={at}
              y2={at}
            />
            <text className="stats-chart__tick" x={left - 8} y={at} textAnchor="end" dominantBaseline="middle">
              {format(tick)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

interface CategoryTicksProps {
  ticks: { x: number; label: string; anchor: "start" | "middle" | "end" }[];
  y: number;
}

/** Labels under the x axis. Placement is worked out by each chart. */
export function CategoryTicks({ ticks, y }: CategoryTicksProps) {
  return (
    <g>
      {ticks.map((tick) => (
        <text key={`${tick.x}-${tick.label}`} className="stats-chart__tick" x={tick.x} y={y} textAnchor={tick.anchor}>
          {tick.label}
        </text>
      ))}
    </g>
  );
}
