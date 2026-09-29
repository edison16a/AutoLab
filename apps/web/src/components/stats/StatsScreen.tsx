"use client";
import "@/styles/stats.css";
import "@/styles/stats-tiles.css";
import "@/styles/stats-panels.css";
import "@/styles/stats-charts.css";
import "@/styles/stats-live.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarX2, ChartNoAxesColumn } from "lucide-react";
import { formatDay, plural } from "@/lib/stats/format";
import { ALL_DEVICES } from "@/lib/stats/types";
import { useAutolab } from "@/providers/autolab-context";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { LiveDevicePanel } from "./LiveDevicePanel";
import { StatTiles } from "./StatTiles";
import { StatsCharts } from "./StatsCharts";
import { StatsFilters } from "./StatsFilters";
import { useStats } from "./use-stats";

/** Counts and trends over the image library, plus what the device is doing now. */
export function StatsScreen() {
  const { photos, photosReady, devices, hasMore, loadMore } = useAutolab();
  const { filter, stats, now, setRange, setDevice } = useStats(photos, devices);
  const { summary, window } = stats;
  const hasData = photosReady && photos.length > 0;

  let content: ReactNode;
  if (!photosReady) content = <StatTiles summary={summary} loading />;
  else if (!photos.length)
    content = (
      <>
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
        <LiveDevicePanel />
      </>
    );
  else if (!stats.photos.length)
    // One empty state for the whole range reads better than six empty charts.
    content = (
      <>
        <StatTiles summary={summary} />
        <div className="panel stats__empty">
          <EmptyState
            compact
            icon={CalendarX2}
            title="No images in this range"
            action={
              filter.range !== "all" ? (
                <button type="button" className="btn" onClick={() => setRange("all")}>
                  Show all time
                </button>
              ) : (
                <button type="button" className="btn" onClick={() => setDevice(ALL_DEVICES)}>
                  Show all devices
                </button>
              )
            }
          />
        </div>
        <LiveDevicePanel />
      </>
    );
  else
    content = (
      <>
        <StatTiles summary={summary} />
        <StatsCharts stats={stats} />
      </>
    );

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
      {content}
    </div>
  );
}
