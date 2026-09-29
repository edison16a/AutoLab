import { useMemo } from "react";
import { autolabComponents } from "../registry/componentRegistry";
export type Telemetry = Record<string, string | number | boolean>;
export type AutolabComponentState = {
  id: string;
  installed: boolean;
  online?: boolean;
  status: string;
  telemetry?: Telemetry;
  lastUpdated?: string;
};
export type DeviceRealtimeState = {
  online: boolean;
  camera_online: boolean;
  simulated: boolean;
  last_seen: string | null;
  agent_version?: string;
  network?: string;
  components?: AutolabComponentState[];
};
export function useAutolab3DState(
  deviceId: string | undefined,
  device: DeviceRealtimeState,
  connection: string,
  preview: boolean,
  lastCapture?: string,
) {
  return useMemo(() => {
    const map: Record<string, AutolabComponentState> = {};
    for (const c of autolabComponents)
      map[c.id] = { id: c.id, installed: false, status: "Not installed" };
    if (deviceId) {
      map.raspberry_pi = {
        id: "raspberry_pi",
        installed: true,
        online: device.online,
        status: device.online
          ? device.simulated
            ? "Simulator online"
            : "Online"
          : "Offline",
        lastUpdated: device.last_seen || undefined,
        telemetry: {
          "Device ID": deviceId,
          Hardware: device.simulated
            ? "Software simulator"
            : "Raspberry Pi 4 Model B, 1 GB",
          Gateway: connection,
          Camera: device.camera_online ? "Connected" : "Unavailable",
          ...(device.network ? { Network: device.network } : {}),
          ...(device.agent_version
            ? { "Agent version": device.agent_version }
            : {}),
        },
      };
      map.camera = {
        id: "camera",
        installed: device.camera_online,
        online: device.online && device.camera_online,
        status: !device.online
          ? "Offline"
          : device.camera_online
            ? device.simulated
              ? "Simulated camera"
              : "Connected"
            : "Not detected",
        telemetry: {
          Connection: device.simulated ? "Synthetic images" : "CSI",
          Cable: device.simulated ? "Not applicable" : "HBv RPi 160 FPC",
          Preview: preview ? "Active" : "Stopped",
          ...(lastCapture
            ? { "Last capture": new Date(lastCapture).toLocaleString() }
            : {}),
        },
        lastUpdated: device.last_seen || undefined,
      };
      map.fpc = {
        id: "fpc",
        installed: !device.simulated && device.camera_online,
        status: device.simulated
          ? "Not used by simulator"
          : device.camera_online
            ? "Camera link active"
            : "Not verified",
      };
    }
    // Future sensor states arrive through the SAME authenticated device channel.
    // An installed flag alone is insufficient to manufacture numeric measurements.
    for (const incoming of device.components || []) {
      if (
        map[incoming.id] &&
        !["raspberry_pi", "camera", "fpc"].includes(incoming.id)
      )
        map[incoming.id] = {
          ...incoming,
          telemetry: incoming.installed ? incoming.telemetry : undefined,
          status: incoming.installed ? incoming.status : "Not installed",
        };
    }
    return map;
  }, [deviceId, device, connection, preview, lastCapture]);
}
