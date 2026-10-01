"use client";
/**
 * Lab mode's layer between the device channel and the screens. It swaps in
 * the shared status on remote screens, logs every command, runs other
 * screens' commands on the station and makes the computer that adds an
 * Autolab its station. Outside lab mode it passes everything straight through.
 */
import { useCallback } from "react";
import { labEnabled } from "@/lib/cloud";
import type { Analysis, Connection, Device, DeviceStatus, Photo, Role } from "@/model/types";
import { useActionLog } from "./use-action-log";
import { useLabActions } from "./use-lab-actions";
import { useLabStatus } from "./use-lab-status";
import type { Notify } from "./use-notices";
import { useStation } from "./use-station";

interface LabModeInputs {
  userId: string;
  role: Role;
  setStation: (on: boolean) => void;
  device: Device | null;
  addDevice: (id: string, name: string) => Promise<void>;
  channel: {
    connection: Connection;
    status: DeviceStatus;
    preview: boolean;
    startPreview: () => void;
    stopPreview: () => void;
    capture: () => Promise<Photo | null>;
  };
  setAnalysis: (id: string, analysis: Analysis) => void;
  /** Resolves true once a photo's row exists, so log entries can point at it. */
  saved: (id: string) => Promise<boolean>;
  notify: Notify;
}

export function useLabMode({ userId, role, setStation, device, addDevice, channel, setAnalysis, saved, notify }: LabModeInputs) {
  const deviceId = device?.id ?? null;
  const { connection, status, preview, startPreview: openPreview, stopPreview: closePreview, capture } = channel;
  const online = connection === "connected" && status.online;
  const shared = useLabStatus({ role, device, connection, status });
  const log = useActionLog(userId);
  const lab = useLabActions({ role, deviceId, capture, saved, log, notify });
  useStation({ active: role === "station", deviceId, online, capture, saved, log, notify });

  const { record, recordAnalysis } = lab;
  // Remote screens have no frames to show, so their preview never starts.
  const startPreview = useCallback(() => {
    if (role === "remote") return;
    if (!preview && online) record("start_preview");
    openPreview();
  }, [role, preview, online, record, openPreview]);
  const stopPreview = useCallback(() => {
    if (preview) record("stop_preview");
    closePreview();
  }, [preview, record, closePreview]);

  /** Adding an Autolab from this computer means it sits next to it, so it becomes the station. */
  const add = useCallback(
    async (id: string, name: string) => {
      await addDevice(id, name);
      if (labEnabled) setStation(true);
    },
    [addDevice, setStation],
  );

  const analyzed = useCallback(
    (id: string, result: Analysis) => {
      setAnalysis(id, result);
      recordAnalysis(id);
    },
    [setAnalysis, recordAnalysis],
  );

  return {
    connection: shared.connection,
    status: shared.status,
    startPreview,
    stopPreview,
    capture: lab.capture,
    sending: lab.sending,
    actions: log.entries,
    addDevice: add,
    setAnalysis: analyzed,
  };
}
