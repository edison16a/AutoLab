import type { Stats } from "@/lib/stats/compute";
import { LiveDevicePanel } from "./LiveDevicePanel";
import { CapturesPanel } from "./panels/CapturesPanel";
import { ConfidencePanel } from "./panels/ConfidencePanel";
import { HoursPanel } from "./panels/HoursPanel";
import { InferencePanel } from "./panels/InferencePanel";
import { LabelsPanel } from "./panels/LabelsPanel";
import { SourcesPanel } from "./panels/SourcesPanel";

/** The chart grid: two columns on wide screens, one on phones. */
export function StatsCharts({ stats }: { stats: Stats }) {
  const { summary } = stats;
  return (
    <div className="stats__grid">
      <CapturesPanel buckets={stats.days} />
      <HoursPanel hours={stats.hours} />
      <LabelsPanel labels={stats.labels} analyzed={summary.analyzed} />
      <ConfidencePanel bins={stats.confidence} median={stats.medianConfidence} analyzed={summary.analyzed} />
      <InferencePanel samples={stats.inference} window={stats.window} median={summary.medianMs} analyzed={summary.analyzed} />
      {/* Two short panels share a column so the grid has no hole beside the tall timing chart. */}
      <div className="stats__stack">
        <SourcesPanel sources={stats.sources} />
        <LiveDevicePanel />
      </div>
    </div>
  );
}
