import { ScanSearch } from "lucide-react";
import { formatCount, plural } from "@/lib/stats/format";
import { shares } from "@/lib/stats/math";
import type { LabelCount } from "@/lib/stats/types";
import { ChartPanel } from "../ChartPanel";
import { DataTable } from "../DataTable";
import { BarList } from "../charts/BarList";

interface LabelsPanelProps {
  labels: LabelCount[];
  /** Tells "nothing analyzed yet" apart from "analyzed, found nothing". */
  analyzed: number;
}

/** The most common detected objects, with the tail folded into "Other". */
export function LabelsPanel({ labels, analyzed }: LabelsPanelProps) {
  const total = labels.reduce((sum, l) => sum + l.count, 0);
  const share = shares(labels.map((l) => l.count));
  const top = labels.find((l) => !l.other);
  const empty = !total ? { icon: ScanSearch, title: analyzed ? "No objects found" : "No analyzed images" } : null;

  return (
    <ChartPanel
      title="Detected objects"
      headline={top ? { value: top.label, text: "most common" } : undefined}
      empty={empty}
      table={
        <DataTable
          caption="Detected objects by label"
          columns={["Label", "Objects", "Share"]}
          rows={labels.map((l, i) => ({
            key: l.label,
            cells: [l.label, formatCount(l.count), `${share[i]}%`],
          }))}
        />
      }
    >
      <BarList
        summary={`Detected objects by label. ${plural(total, "object")} in total${
          top ? `, ${top.label} most common with ${formatCount(top.count)}` : ""
        }.`}
        rows={labels.map((l, i) => ({
          key: l.label,
          label: l.label,
          value: l.count,
          muted: l.other,
          detail: `${share[i]}% of objects`,
        }))}
        describe={(value) => plural(value, "object")}
        height={220}
      />
    </ChartPanel>
  );
}
