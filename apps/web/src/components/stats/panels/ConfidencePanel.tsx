import { Gauge } from "lucide-react";
import { formatCount, formatPercent, plural } from "@/lib/stats/format";
import type { ConfidenceBin } from "@/lib/stats/types";
import { ChartPanel } from "../ChartPanel";
import { DataTable } from "../DataTable";
import { ColumnChart } from "../charts/ColumnChart";

interface ConfidencePanelProps {
  bins: ConfidenceBin[];
  median: number | null;
  analyzed: number;
}

const binName = (bin: ConfidenceBin) => `${formatPercent(bin.from)} to ${formatPercent(bin.to)}`;

/** How sure the detector was, as a histogram of every detection's score. */
export function ConfidencePanel({ bins, median, analyzed }: ConfidencePanelProps) {
  const total = bins.reduce((sum, b) => sum + b.count, 0);
  const empty = !total ? { icon: Gauge, title: analyzed ? "No objects found" : "No analyzed images" } : null;

  return (
    <ChartPanel
      title="Confidence"
      headline={median !== null ? { value: formatPercent(median), text: "median confidence" } : undefined}
      empty={empty}
      table={
        <DataTable
          caption="Detections by confidence"
          columns={["Confidence", "Objects"]}
          rows={bins.map((b) => ({ key: String(b.from), cells: [binName(b), formatCount(b.count)] }))}
        />
      }
    >
      <ColumnChart
        summary={`Detection confidence for ${plural(total, "object")}${
          median !== null ? `, median ${formatPercent(median)}` : ""
        }.`}
        data={bins.map((b) => ({ key: String(b.from), value: b.count, label: binName(b) }))}
        describe={(value) => plural(value, "object")}
        // Labels sit on bin edges, every 10 points, plus 100% at the far end.
        ticks={(fit) => {
          const edges = bins
            .map((b, i) => ({ at: i, label: formatPercent(b.from), round: Math.round(b.from * 100) % 10 === 0 }))
            .filter((edge) => edge.round);
          edges.push({ at: bins.length, label: "100%", round: true });
          const step = Math.max(1, Math.ceil(edges.length / Math.max(1, fit)));
          return edges.filter((_, i) => (edges.length - 1 - i) % step === 0);
        }}
      />
    </ChartPanel>
  );
}
