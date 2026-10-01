"use client";
/**
 * Lab mode's commands as the rest of the app sees them. On the station a
 * photo is taken over the WebSocket as usual and logged. On a remote screen
 * the same button leaves a pending command for the station and waits for
 * the photo it took. Outside lab mode this passes the capture straight through.
 */
import { useCallback, useState } from "react";
import { labEnabled } from "@/lib/cloud";
import { errorText } from "@/lib/errors";
import { addAction, captureResult, getAction, settlePending, updateAction } from "@/lib/lab/actions";
import { fetchImage } from "@/lib/lab/images";
import type { ActionEntry, ActionKind, Photo, Role } from "@/model/types";
import type { ActionLog } from "./use-action-log";
import type { Notify } from "./use-notices";
import { PICKUP_MS } from "./use-station";

/** A Pi still can take up to a minute in the worst case, plus the upload. */
const RESULT_MS = 90_000;
/** Realtime normally reports the end. Polling covers a dropped subscription. */
const POLL_MS = 3_000;
const FINAL = new Set<ActionEntry["status"]>(["done", "failed", "expired"]);

interface LabActionInputs {
  role: Role;
  deviceId: string | null;
  capture: () => Promise<Photo | null>;
  saved: (id: string) => Promise<boolean>;
  log: ActionLog;
  notify: Notify;
}

export function useLabActions({ role, deviceId, capture, saved, log, notify }: LabActionInputs) {
  const [sending, setSending] = useState(0);
  const { upsert, listen } = log;

  /** Resolves with the command's final row, or null if it's still going after RESULT_MS. */
  const outcome = useCallback(
    (id: string) =>
      new Promise<ActionEntry | null>((resolve) => {
        const check = (entry: ActionEntry | null) => entry?.id === id && FINAL.has(entry.status) && finish(entry);
        const stop = listen(check);
        const poll = setInterval(() => void getAction(id).then(check, () => undefined), POLL_MS);
        // If nobody took it, expire it. The guard leaves it alone if the station took it just now.
        const expire = setTimeout(
          () => void settlePending(id, "expired", "The lab computer didn't pick this up. Check it's on with Autolab open.").catch(() => undefined),
          PICKUP_MS,
        );
        const giveUp = setTimeout(() => finish(null), RESULT_MS);
        function finish(entry: ActionEntry | null) {
          stop();
          clearInterval(poll);
          clearTimeout(expire);
          clearTimeout(giveUp);
          resolve(entry);
        }
      }),
    [listen],
  );

  const remoteCapture = useCallback(async () => {
    if (!deviceId) return null;
    setSending((n) => n + 1);
    try {
      const entry = await addAction({ device_id: deviceId, kind: "capture_photo", origin: "remote", status: "pending" });
      upsert(entry);
      const end = await outcome(entry.id);
      if (!end) {
        notify("The lab computer is still on it. The photo will appear in Data.", "info");
        return null;
      }
      if (end.status !== "done" || !end.image_id) {
        notify(end.error || "The photo wasn't taken.", "error");
        return null;
      }
      return await fetchImage(end.image_id);
    } catch (error) {
      notify(errorText(error), "error");
      return null;
    } finally {
      setSending((n) => n - 1);
    }
  }, [deviceId, upsert, outcome, notify]);

  const stationCapture = useCallback(async () => {
    // Logging never holds up or blocks the photo itself.
    const entry = addAction({ device_id: deviceId, kind: "capture_photo", origin: "station", status: "running" }).catch(() => null);
    const photo = await capture();
    void entry
      .then(async (row) => {
        if (!row) return;
        upsert(row);
        await updateAction(row.id, captureResult(photo, photo ? await saved(photo.id) : false));
      })
      .catch(() => undefined);
    return photo;
  }, [deviceId, capture, saved, upsert]);

  /** Logs a command that already ran on this screen. */
  const record = useCallback(
    (kind: ActionKind, imageId: string | null = null) => {
      if (!labEnabled) return;
      const origin = role === "remote" ? "remote" : "station";
      void addAction({ device_id: kind === "analyze_image" ? null : deviceId, kind, origin, status: "done", image_id: imageId })
        .then(upsert)
        .catch(() => undefined);
    },
    [role, deviceId, upsert],
  );

  /** Logs an analysis once its photo is stored, since the entry points at the photo's row. */
  const recordAnalysis = useCallback(
    (imageId: string) => void saved(imageId).then((stored) => record("analyze_image", stored ? imageId : null)),
    [saved, record],
  );

  return {
    capture: role === "remote" ? remoteCapture : role === "station" ? stationCapture : capture,
    sending: sending > 0,
    record,
    recordAnalysis,
  };
}
