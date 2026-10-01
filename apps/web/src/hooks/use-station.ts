"use client";
/**
 * Lab mode, on the station: runs the commands other screens leave for this
 * computer's Autolab. Realtime brings them in at once, and a slow poll
 * catches any it missed. Each one is claimed before it runs, so a second
 * station tab can't take the same photo twice.
 */
import { useCallback, useEffect, useRef } from "react";
import { errorText } from "@/lib/errors";
import { captureResult, pendingActions, settlePending, updateAction } from "@/lib/lab/actions";
import type { ActionEntry, Photo } from "@/model/types";
import type { ActionLog } from "./use-action-log";
import type { Notify } from "./use-notices";

const POLL_MS = 10_000;
/** Remote screens give up after this, so older commands are expired, not run. */
export const PICKUP_MS = 20_000;

interface StationInputs {
  active: boolean;
  deviceId: string | null;
  online: boolean;
  capture: () => Promise<Photo | null>;
  saved: (id: string) => Promise<boolean>;
  log: ActionLog;
  notify: Notify;
}

export function useStation({ active, deviceId, online, capture, saved, log, notify }: StationInputs) {
  // Commands run with whatever is current when their turn comes.
  const latest = useRef({ active, deviceId, online, capture, saved });
  latest.current = { active, deviceId, online, capture, saved };
  const taken = useRef(new Set<string>());
  const queue = useRef(Promise.resolve());

  const run = useCallback(async (entry: ActionEntry) => {
    const now = latest.current;
    if (!(await settlePending(entry.id, "running"))) return;
    if (!now.online) return updateAction(entry.id, { status: "failed", error: "The Autolab is offline." });
    if (entry.kind !== "capture_photo")
      return updateAction(entry.id, { status: "failed", error: "Only photos can be taken from another screen." });
    const photo = await now.capture();
    await updateAction(entry.id, captureResult(photo, photo ? await now.saved(photo.id) : false));
  }, []);

  const take = useCallback(
    (entry: ActionEntry) => {
      const { active, deviceId } = latest.current;
      if (!active || entry.status !== "pending" || entry.origin !== "remote" || entry.device_id !== deviceId) return;
      if (taken.current.has(entry.id)) return;
      taken.current.add(entry.id);
      // One at a time: the Pi takes one still at a time anyway.
      queue.current = queue.current.then(() => run(entry)).catch((error) => notify(errorText(error), "error"));
    },
    [run, notify],
  );

  const { listen } = log;
  useEffect(() => (active ? listen(take) : undefined), [active, listen, take]);

  useEffect(() => {
    if (!active || !deviceId) return;
    const sweep = () =>
      void pendingActions(deviceId)
        .then((list) =>
          list.forEach((entry) => {
            if (Date.now() - Date.parse(entry.created_at) < PICKUP_MS) take(entry);
            else void settlePending(entry.id, "expired", "No lab computer picked this up in time.").catch(() => undefined);
          }),
        )
        .catch(() => undefined);
    sweep();
    const timer = setInterval(sweep, POLL_MS);
    return () => clearInterval(timer);
  }, [active, deviceId, online, take]);
}
