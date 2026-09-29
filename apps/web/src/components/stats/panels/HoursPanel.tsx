import { Clock } from "lucide-react";
import { formatCount, formatHour, plural } from "@/lib/stats/format";
import { busiest } from "@/lib/stats/time";
import type { HourBucket } from "@/lib/stats/types";
import { ChartPanel } from "../ChartPanel";
import { DataTable } from "../DataTable";
import { ColumnChart } from "../charts/ColumnChart";

/** Every six hours reads as morning, noon and evening. Narrow charts keep every other one. */
const TICK_HOURS = [0, 6, 12, 18];

/** Captures by local hour of the day, to show when the machine is in use. */
export function HoursPanel({ hours }: { hours: HourBucket[] }) {
  const peak = busiest(hours);

  return (
    <ChartPanel
      title="Time of day"
      headline={peak ? { value: formatHour(peak.hour), text: "busiest hour" } : undefined}
      empty={peak ? null : { icon: Clock, title: "No captures in this range" }}
      table={
        <DataTable
          caption="Captures by hour of day"
          columns={["Hour", "Captures"]}
          rows={hours.map((h) => ({ key: String(h.hour), cells: [formatHour(h.hour), formatCount(h.count)] }))}
        />
      }
    >
      <ColumnChart
        summary={`Captures by hour of day.${
          peak ? ` Busiest at ${formatHour(peak.hour)} with ${plural(peak.count, "capture")}.` : ""
        }`}
        data={hours.map((h) => ({
          key: String(h.hour),
          value: h.count,
          label: `${formatHour(h.hour)} to ${formatHour((h.hour + 1) % 24)}`,
        }))}
        describe={(value) => plural(value, "capture")}
        ticks={(fit) =>
          TICK_HOURS.filter((_, i) => fit >= TICK_HOURS.length || i % 2 === 0).map((hour) => ({
            at: hour + 0.5,
            label: formatHour(hour),
          }))
        }
      />
    </ChartPanel>
  );
}
