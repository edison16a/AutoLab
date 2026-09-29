"use client";
import type { ReactNode } from "react";
import { Cable, Camera, Cpu, HeartPulse, type LucideIcon } from "lucide-react";
import { formatDateTime, relativeTime } from "@/lib/format";
import type { Connection, DeviceStatus } from "@/model/types";
import { useAutolab } from "@/providers/autolab-context";
import { StatusDot, type DotState } from "../ui/StatusDot";
import { useNow } from "@/hooks/use-now";

interface Fact {
  label: string;
  icon: LucideIcon;
  value: ReactNode;
  /** Leave out for plain values such as a time. */
  dot?: DotState;
}

/** The camera only counts as connected once the Pi says so; a simulated one is named as such. */
function cameraFact(status: DeviceStatus): Fact {
  if (!status.camera_online) return { label: "Camera", icon: Camera, value: "Not detected", dot: "offline" };
  return { label: "Camera", icon: Camera, value: status.simulated ? "Simulator" : "Connected", dot: "online" };
}

const CONNECTION: Record<Connection, { value: string; dot: DotState }> = {
  connected: { value: "Connected", dot: "online" },
  connecting: { value: "Connecting", dot: "idle" },
  reconnecting: { value: "Reconnecting", dot: "idle" },
  idle: { value: "Not connected", dot: "offline" },
};

/**
 * The selected Autolab at a glance: is the Pi up, is the camera there, when
 * did we last hear from it, and is this browser linked to the gateway.
 */
export function DeviceCard() {
  const { status, connection } = useAutolab();
  const now = useNow(5_000);

  const heartbeat = status.last_seen ? (
    <time dateTime={status.last_seen} title={formatDateTime(status.last_seen)}>
      {relativeTime(status.last_seen, now)}
    </time>
  ) : (
    "Never"
  );

  const facts: Fact[] = [
    { label: "Raspberry Pi", icon: Cpu, value: status.online ? "Online" : "Offline", dot: status.online ? "online" : "offline" },
    cameraFact(status),
    { label: "Last heartbeat", icon: HeartPulse, value: heartbeat },
    { label: "Connection", icon: Cable, ...CONNECTION[connection] },
  ];

  return (
    <section className="panel home-device" aria-labelledby="home-device-title">
      <header className="panel__head">
        <h2 id="home-device-title" className="home-device__title">
          Device
        </h2>
      </header>
      <dl className="home-device__rows">
        {facts.map(({ label, icon: Icon, value, dot }) => (
          <div key={label} className="home-device__row">
            <dt>
              <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              {label}
            </dt>
            <dd>
              {dot ? <StatusDot state={dot} /> : null}
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
