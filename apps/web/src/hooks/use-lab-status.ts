"use client";
/**
 * Lab mode's shared device status. The station writes what its WebSocket
 * sees to Supabase every so often and whenever it changes. Remote screens
 * read it back, and treat a report that stopped coming as offline, since
 * that means the station closed or lost its network.
 *
 * A station only reports once it has reached the Autolab. Until then it
 * knows nothing, and a computer switched to station by mistake, or one still
 * loading, would otherwise mark a working Autolab offline for everyone.
 */
import { useEffect, useMemo, useState } from "react";
import { reportDevice } from "@/lib/lab/devices";
import { OFFLINE_STATUS, type Connection, type Device, type DeviceStatus, type Role } from "@/model/types";
import { useNow } from "./use-now";

const REPORT_MS = 30_000;
/** Two missed reports and a little slack. */
const STALE_MS = 75_000;

interface LabStatusInputs {
  role: Role;
  device: Device | null;
  connection: Connection;
  status: DeviceStatus;
}

/** Returns the connection and status screens should show, which for a remote screen come from the report. */
export function useLabStatus({ role, device, connection, status }: LabStatusInputs) {
  const deviceId = device?.id ?? null;
  const live = connection === "connected" && status.online;
  const { camera_online, simulated, agent_version } = status;
  /** The device this station has reached, so it may report on it. */
  const [reached, setReached] = useState<string | null>(null);
  useEffect(() => {
    if (connection === "connected" && deviceId) setReached(deviceId);
  }, [connection, deviceId]);
  const mayReport = role === "station" && !!deviceId && reached === deviceId;

  useEffect(() => {
    if (!mayReport || !deviceId) return;
    const report = () =>
      void reportDevice(deviceId, {
        online: live,
        camera_online: live && camera_online,
        last_seen: new Date().toISOString(),
        simulated,
        agent_version,
      }).catch(() => undefined); // The next round tries again, and a failed report only makes the station look stale.
    report();
    const timer = setInterval(report, REPORT_MS);
    return () => clearInterval(timer);
  }, [mayReport, deviceId, live, camera_online, simulated, agent_version]);

  const now = useNow(10_000);
  const report = device?.report;
  return useMemo(() => {
    if (role !== "remote") return { connection, status };
    const fresh = !!report?.last_seen && now - Date.parse(report.last_seen) < STALE_MS;
    const shared: DeviceStatus = {
      ...OFFLINE_STATUS,
      online: fresh && !!report?.online,
      camera_online: fresh && !!report?.camera_online,
      simulated: !!report?.simulated,
      last_seen: report?.last_seen ?? null,
      agent_version: report?.agent_version,
    };
    return { connection: (fresh ? "connected" : "idle") as Connection, status: shared };
  }, [role, connection, status, report, now]);
}
