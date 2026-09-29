import { ChartColumn } from "lucide-react";
import { bucketName, formatCount, formatDay, formatDecimal, formatWeekday, plural } from "@/lib/stats/format";
import { indexTicks } from "@/lib/stats/ticks";
import { busiest } from "@/lib/stats/time";
import type { TimeBucket } from "@/lib/stats/types";
import { ChartPanel } from "../ChartPanel";
import { DataTable } from "../DataTable";
import { ColumnChart } from "../charts/ColumnChart";

/** Captures per day, or per week once the window is too long for daily columns. */
export function CapturesPanel({ buckets }: { buckets: TimeBucket[] }) {
  const weekly = buckets[0]?.days === 7;
  const unit = weekly ? "week" : "day";
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const peak = busiest(buckets);
  // Short windows name the weekday. Longer ones need the date to be findable.
  const tickName = buckets.length <= 7 && !weekly ? formatWeekday : formatDay;

  return (
    <ChartPanel
      title={weekly ? "Captures per week" : "Captures per day"}
      headline={{ value: formatDecimal(total / Math.max(1, buckets.length)), text: `per ${unit} on average` }}
      empty={total ? null : { icon: ChartColumn, title: "No captures in this range" }}
      table={
        <DataTable
          caption={weekly ? "Captures per week" : "Captures per day"}
          columns={[weekly ? "Week" : "Day", "Captures", "Analyzed"]}
          rows={buckets.map((b) => ({
            key: String(b.start),
            cells: [bucketName(b), formatCount(b.count), formatCount(b.analyzed)],
          }))}
        />
      }
    >
      <ColumnChart
        summary={`Captures per ${unit} over ${plural(buckets.length, unit)}. ${plural(total, "capture")} in total${
          peak ? `, most on ${bucketName(peak)} with ${formatCount(peak.count)}` : ""
        }.`}
        data={buckets.map((b) => ({
          key: String(b.start),
          value: b.count,
          label: bucketName(b),
          detail: `${formatCount(b.analyzed)} analyzed`,
        }))}
        describe={(value) => plural(value, "capture")}
        ticks={(fit) =>
          indexTicks(buckets.length, fit).map((i) => ({ at: i + 0.5, label: tickName(buckets[i].start) }))
        }
      />
    </ChartPanel>
  );
}
