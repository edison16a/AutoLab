"use client";
import { Plug } from "lucide-react";
import { useDeviceSummary } from "@/hooks/use-device-summary";
import { formatDateTime, relativeTime } from "@/lib/format";
import { useAutolab } from "@/providers/autolab-context";
import { StatusDot } from "../ui/StatusDot";
import { useNow } from "@/hooks/use-now";

/**
 * What the selected Autolab is doing right now. Kept apart from the charts
 * and marked "Current" because the filters above don't apply to it.
 */
export function LiveDevicePanel() {
  const { device, status, preview, fps, openConnect } = useAutolab();
  const summary = useDeviceSummary();
  const now = useNow(5_000);

  return (
    <section className="panel stats-live" aria-labelledby="stats-live-title">
      <header className="stats-live__head">
        <h2 id="stats-live-title" className="stats-panel__title">
          Live device
        </h2>
        <span className="badge">Current</span>
        {device ? <span className="stats-live__name">{device.name}</span> : null}
      </header>
      {device ? (
        <dl className="stats-live__facts">
          <div className="stats-live__fact">
            <dt>Status</dt>
            <dd className="row">
              <StatusDot state={summary.dot} />
              {summary.label}
            </dd>
          </div>
          <div className="stats-live__fact">
            <dt>Last heartbeat</dt>
            <dd>
              {status.last_seen ? (
                <time dateTime={status.last_seen} title={formatDateTime(status.last_seen)}>
                  {relativeTime(status.last_seen, now)}
                </time>
              ) : (
                "Never"
              )}
            </dd>
          </div>
          <div className="stats-live__fact">
            <dt>Preview</dt>
            <dd className="num">{preview ? `${fps.toFixed(1)} fps` : "Off"}</dd>
          </div>
        </dl>
      ) : (
        // A quiet row, not a second big call to action: the top bar already has one.
        <div className="stats-live__none">
          <Plug size={16} strokeWidth={1.8} aria-hidden="true" />
          <p className="grow">No device connected</p>
          <button type="button" className="btn btn--sm" onClick={openConnect}>
            Connect device
          </button>
        </div>
      )}
    </section>
  );
}
