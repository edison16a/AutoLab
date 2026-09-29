"use client";
import { useMemo } from "react";
import type { DotState } from "@/components/ui/StatusDot";
import { HARDWARE_PARTS } from "@/data/hardware-parts";
import type { ComponentReport, Connection, Device, DeviceStatus, Photo } from "@/model/types";
import { useAutolab } from "@/providers/autolab-context";

/** One line in the details panel. Times are ISO strings the panel shows as "5m ago". */
export interface PartFact {
  label: string;
  value?: string;
  time?: string | null;
  mono?: boolean;
}

export interface PartState {
  dot: DotState;
  status: string;
  /** The part is reporting and working now. Lights its LED in the 3D model. */
  live: boolean;
  installed: boolean;
  facts: PartFact[];
}

const NOT_INSTALLED: PartState = { dot: "offline", status: "Not installed", live: false, installed: false, facts: [] };
const NOT_CONNECTED: PartState = { dot: "offline", status: "Not connected", live: false, installed: false, facts: [] };

const GATEWAY_LABEL: Record<Connection, string> = {
  idle: "Not connected",
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
};

/** These three are derived from the device itself, never from a component report. */
const DERIVED = new Set(["raspberry_pi", "camera", "fpc"]);

function piState(device: Device, status: DeviceStatus, connection: Connection): PartState {
  const facts: PartFact[] = [
    { label: "Device ID", value: device.id, mono: true },
    { label: "Last heartbeat", time: status.last_seen },
  ];
  if (status.agent_version) facts.push({ label: "Agent", value: status.agent_version });
  if (status.network) facts.push({ label: "Network", value: status.network });
  facts.push({ label: "Gateway", value: GATEWAY_LABEL[connection] });
  if (connection !== "connected")
    return { dot: "idle", status: GATEWAY_LABEL[connection], live: false, installed: true, facts };
  if (!status.online) return { dot: "offline", status: "Offline", live: false, installed: true, facts };
  // The simulator stays labelled everywhere, so synthetic data is never mistaken for a real Pi.
  return { dot: "online", status: status.simulated ? "Simulator online" : "Online", live: true, installed: true, facts };
}

function cameraState(status: DeviceStatus, connection: Connection, preview: boolean, lastPhoto: string | undefined): PartState {
  const facts: PartFact[] = [
    { label: "Source", value: status.simulated ? "Synthetic frames" : "CSI" },
    { label: "Preview", value: preview ? "Streaming" : "Stopped" },
  ];
  if (lastPhoto) facts.push({ label: "Last photo", time: lastPhoto });
  if (connection !== "connected" || !status.online) return { dot: "offline", status: "Offline", live: false, installed: true, facts };
  if (!status.camera_online) return { dot: "idle", status: "Not detected", live: false, installed: false, facts };
  return { dot: "online", status: status.simulated ? "Simulated camera" : "Connected", live: true, installed: true, facts };
}

/** The ribbon can't report. It's only called active when a real camera is streaming through it. */
function ribbonState(status: DeviceStatus): PartState {
  if (status.simulated) return { ...NOT_INSTALLED, status: "Not used by simulator" };
  if (status.online && status.camera_online) return { dot: "online", status: "Camera link active", live: true, installed: true, facts: [] };
  return { dot: "idle", status: "Not verified", live: false, installed: false, facts: [] };
}

function formatReading(value: string | number | boolean) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/**
 * Future sensors report through the Pi's heartbeat. An installed flag alone
 * never produces readings: only telemetry the agent actually sent is shown.
 */
function reportedState(report: ComponentReport): PartState {
  if (!report.installed) return NOT_INSTALLED;
  const facts: PartFact[] = Object.entries(report.telemetry ?? {}).map(([label, value]) => ({ label, value: formatReading(value) }));
  if (report.lastUpdated) facts.push({ label: "Updated", time: report.lastUpdated });
  return { dot: report.online ? "online" : "idle", status: report.status, live: !!report.online, installed: true, facts };
}

/** Newest still from this device's camera, real or simulated. */
function lastCameraPhoto(photos: Photo[], deviceId: string) {
  return photos.find((photo) => photo.device_id === deviceId && (photo.source === "pi" || photo.source === "simulator"))?.captured_at;
}

/**
 * Status of every part, keyed by part id. Only the Pi and camera are live
 * today; everything else reads "Not installed" until the agent reports it.
 */
export function usePartStates(): Record<string, PartState> {
  const { device, status, connection, preview, photos } = useAutolab();
  const lastPhoto = device ? lastCameraPhoto(photos, device.id) : undefined;

  return useMemo(() => {
    const states: Record<string, PartState> = {};
    for (const part of HARDWARE_PARTS) states[part.id] = NOT_INSTALLED;
    if (!device) {
      states.raspberry_pi = NOT_CONNECTED;
      states.camera = NOT_CONNECTED;
      return states;
    }
    states.raspberry_pi = piState(device, status, connection);
    states.camera = cameraState(status, connection, preview, lastPhoto);
    states.fpc = ribbonState(status);
    for (const report of status.components ?? []) {
      if (report.id in states && !DERIVED.has(report.id)) states[report.id] = reportedState(report);
    }
    return states;
  }, [device, status, connection, preview, lastPhoto]);
}
