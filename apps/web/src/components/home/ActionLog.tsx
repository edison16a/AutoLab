"use client";
import Link from "next/link";
import { Camera, ListChecks, ScanSearch, Video, VideoOff, type LucideIcon } from "lucide-react";
import { formatDateTime, relativeTime } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import type { ActionEntry, ActionKind, ActionStatus } from "@/model/types";
import { useAutolab } from "@/providers/autolab-context";
import { EmptyState } from "../ui/EmptyState";
import { StatusDot, type DotState } from "../ui/StatusDot";

const SHOWN = 8;

const KIND: Record<ActionKind, { label: string; icon: LucideIcon; done: string }> = {
  capture_photo: { label: "Take photo", icon: Camera, done: "Saved to Data" },
  start_preview: { label: "Start preview", icon: Video, done: "Live view opened" },
  stop_preview: { label: "Stop preview", icon: VideoOff, done: "Live view closed" },
  analyze_image: { label: "Analyze image", icon: ScanSearch, done: "Objects found" },
};

/** One short line under the command: the failure's reason, or what is happening. */
function detail(entry: ActionEntry) {
  if (entry.error) return entry.error;
  if (entry.status === "pending") return "Waiting for the Autolab";
  if (entry.status === "running") return "The Autolab is on it";
  return KIND[entry.kind].done;
}

const STATUS: Record<ActionStatus, { label: string; dot: DotState }> = {
  pending: { label: "Waiting", dot: "idle" },
  running: { label: "Running", dot: "idle" },
  done: { label: "Done", dot: "online" },
  failed: { label: "Failed", dot: "offline" },
  expired: { label: "Not picked up", dot: "offline" },
};

function ActionRow({ entry, now }: { entry: ActionEntry; now: number }) {
  const { label, icon: Icon } = KIND[entry.kind];
  const state = STATUS[entry.status];
  const title = entry.image_id ? (
    <Link href={`/data/${entry.image_id}`} className="home-action__link">
      {label}
    </Link>
  ) : (
    label
  );
  return (
    <li className="home-action">
      <span className="home-action__icon" aria-hidden="true">
        <Icon size={16} strokeWidth={1.8} />
      </span>
      <span className="home-action__what">
        <span className="home-action__title">{title}</span>
        <span className="home-action__detail">{detail(entry)}</span>
      </span>
      <span className="home-action__state">
        <StatusDot state={state.dot} />
        {state.label}
      </span>
      <time className="home-action__time" dateTime={entry.created_at} title={formatDateTime(entry.created_at)}>
        {relativeTime(entry.created_at, now)}
      </time>
    </li>
  );
}

/** Lab mode: the newest commands sent to this account's Autolabs, from any screen, and how each ended. */
export function ActionLog() {
  const { actions } = useAutolab();
  const now = useNow(10_000);
  const shown = actions.slice(0, SHOWN);

  return (
    <section className="section home-actions" aria-labelledby="home-actions-title">
      <div className="section__head">
        <h2 id="home-actions-title">Activity</h2>
      </div>
      {shown.length ? (
        <ul className="panel home-actions__list" aria-live="polite">
          {shown.map((entry) => (
            <ActionRow key={entry.id} entry={entry} now={now} />
          ))}
        </ul>
      ) : (
        <div className="panel home-actions__empty">
          <EmptyState icon={ListChecks} title="No commands yet" />
        </div>
      )}
    </section>
  );
}
