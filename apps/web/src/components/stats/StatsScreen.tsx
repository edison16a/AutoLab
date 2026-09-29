"use client";
import "@/styles/stats.css";
import "@/styles/stats-panels.css";
import "@/styles/stats-charts.css";
import Link from "next/link";
import { ChartNoAxesColumn } from "lucide-react";
import { formatDay, plural } from "@/lib/stats/format";
import { useAutolab } from "@/providers/autolab-context";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { LiveDevicePanel } from "./LiveDevicePanel";
import { StatTiles } from "./StatTiles";
import { StatsFilters } from "./StatsFilters";
import { CapturesPanel } from "./panels/CapturesPanel";
import { ConfidencePanel } from "./panels/ConfidencePanel";
import { HoursPanel } from "./panels/HoursPanel";
import { InferencePanel } from "./panels/InferencePanel";
import { LabelsPanel } from "./panels/LabelsPanel";
import { SourcesPanel } from "./panels/SourcesPanel";
import { useStats } from "./use-stats";

/** Counts and trends over the image library, plus what the device is doing now. */
export function StatsScreen() {
  const { photos, photosReady, devices, hasMore, loadMore } = useAutolab();
  const { filter, stats, now, setRange, setDevice } = useStats(photos, devices);
  const { summary, window } = stats;
  const hasData = photosReady && photos.length > 0;

  return (
    <div className="page stats">
      <PageHeader
        title="Statistics"
        subtitle={hasData ? `${formatDay(window.start)} to ${formatDay(now)}` : undefined}
      />
      {hasData ? (
        <StatsFilters filter={filter} devices={devices} onRange={setRange} onDevice={setDevice} />
      ) : null}
      {hasData && hasMore ? (
        <p className="stats__partial small muted">
          Based on the {plural(photos.length, "image")} loaded so far.
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void loadMore()}>
            Load more
          </button>
        </p>
      ) : null}

      {!photosReady ? <StatTiles summary={summary} loading /> : null}
      {photosReady && !photos.length ? (
        <div className="panel stats__empty">
          <EmptyState
            icon={ChartNoAxesColumn}
            title="No statistics yet"
            text="Captures and uploads are counted here."
            action={
              <Link href="/live" className="btn btn--primary">
                Open live view
              </Link>
            }
          />
        </div>
      ) : null}
      {hasData ? (
        <>
          <StatTiles summary={summary} />
          <div className="stats__grid">
            <CapturesPanel buckets={stats.days} />
            <HoursPanel hours={stats.hours} />
            <LabelsPanel labels={stats.labels} analyzed={summary.analyzed} />
            <ConfidencePanel bins={stats.confidence} median={stats.medianConfidence} analyzed={summary.analyzed} />
            <InferencePanel
              samples={stats.inference}
              window={window}
              median={summary.medianMs}
              analyzed={summary.analyzed}
            />
            {/* Two short panels share a column so the grid has no hole beside the tall timing chart. */}
            <div className="stats__stack">
              <SourcesPanel sources={stats.sources} />
              <LiveDevicePanel />
            </div>
          </div>
        </>
      ) : null}
      {photosReady && !photos.length ? <LiveDevicePanel /> : null}
    </div>
  );
}
