import { Timer } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { formatDay, formatMs, formatWeekday, plural } from "@/lib/stats/format";
import { daySpan } from "@/lib/stats/range";
import type { InferenceSample, Window } from "@/lib/stats/types";
import { ChartPanel } from "../ChartPanel";
import { DataTable } from "../DataTable";
import { DotTimeChart } from "../charts/DotTimeChart";

interface InferencePanelProps {
  samples: InferenceSample[];
  window: Window;
  median: number | null;
  analyzed: number;
}

/** How long each detection run took, over time. Slow runs usually mean the CPU fallback. */
export function InferencePanel({ samples, window, median, analyzed }: InferencePanelProps) {
  const empty = !samples.length ? { icon: Timer, title: analyzed ? "No timings recorded" : "No analyzed images" } : null;
  const day = daySpan(window.start, window.end) <= 7 ? formatWeekday : formatDay;
  const when = (s: InferenceSample) => formatDateTime(new Date(s.time).toISOString());

  return (
    <ChartPanel
      title="Inference time"
      headline={median !== null ? { value: formatMs(median), text: `median over ${plural(samples.length, "run")}` } : undefined}
      empty={empty}
      table={
        <DataTable
          caption="Inference time per analysis"
          columns={["Analyzed", "Time", "Backend"]}
          rows={samples.map((s) => ({ key: s.id, cells: [when(s), formatMs(s.ms), s.backend ?? "Unknown"] }))}
        />
      }
    >
      <DotTimeChart
        summary={`Inference time for ${plural(samples.length, "run")}${
          median !== null ? `, median ${formatMs(median)}` : ""
        }.`}
        points={samples.map((s) => ({
          key: s.id,
          time: s.time,
          value: s.ms,
          label: when(s),
          detail: s.backend,
        }))}
        window={window}
        tick={formatMs}
        describe={formatMs}
        day={day}
        reference={median !== null ? { value: median, label: `Median ${formatMs(median)}` } : undefined}
        // Taller than the other charts to match the Sources and Live device stack beside it.
        height={266}
      />
    </ChartPanel>
  );
}
