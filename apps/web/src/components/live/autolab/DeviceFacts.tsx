"use client";
import { relativeTime } from "@/lib/format";
import { useAutolab } from "@/providers/autolab-context";
import { FactList, type Fact } from "../FactList";
import { useNow } from "../use-now";

/** The few things worth knowing about the Pi while watching its camera. */
export function DeviceFacts() {
  const { device, status } = useAutolab();
  const now = useNow();
  if (!device) return null;

  const camera: Fact = status.camera_online
    ? { label: "Camera", value: status.simulated ? "Simulator" : "Detected", dot: "online" }
    : { label: "Camera", value: "Not detected", dot: "offline" };

  const facts: Fact[] = [
    { label: "Name", value: device.name },
    { label: "Raspberry Pi", value: status.online ? "Online" : "Offline", dot: status.online ? "online" : "offline" },
    camera,
    { label: "Last heartbeat", value: relativeTime(status.last_seen, now) },
  ];
  if (status.agent_version) facts.push({ label: "Agent", value: status.agent_version });

  return <FactList title="Device" facts={facts} />;
}
