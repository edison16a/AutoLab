import { Images } from "lucide-react";
import { SOURCE_LABEL } from "@/lib/format";
import { formatCount, plural } from "@/lib/stats/format";
import type { SourceCount } from "@/lib/stats/types";
import { ChartPanel } from "../ChartPanel";
import { DataTable } from "../DataTable";
import { BarList } from "../charts/BarList";

/** Where images came from: the Autolab camera, the simulator, a computer camera or uploads. */
export function SourcesPanel({ sources }: { sources: SourceCount[] }) {
  const total = sources.reduce((sum, s) => sum + s.count, 0);
  const top = sources[0];

  return (
    <ChartPanel
      title="Sources"
      className="stats-panel--compact"
      headline={top ? { value: SOURCE_LABEL[top.source], text: `${top.share}% of images` } : undefined}
      empty={total ? null : { icon: Images, title: "No images in this range" }}
      table={
        <DataTable
          caption="Images by source"
          columns={["Source", "Images", "Share"]}
          rows={sources.map((s) => ({
            key: s.source,
            cells: [SOURCE_LABEL[s.source], formatCount(s.count), `${s.share}%`],
          }))}
        />
      }
    >
      <BarList
        summary={`Images by source. ${sources
          .map((s) => `${SOURCE_LABEL[s.source]} ${formatCount(s.count)}, ${s.share}%`)
          .join("; ")}.`}
        rows={sources.map((s) => ({
          key: s.source,
          label: SOURCE_LABEL[s.source],
          value: s.count,
          note: `${s.share}%`,
        }))}
        describe={(value) => plural(value, "image")}
      />
    </ChartPanel>
  );
}
