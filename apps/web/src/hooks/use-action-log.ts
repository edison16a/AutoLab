"use client";
/**
 * Lab mode's action log as this screen sees it: the newest commands across
 * the account, kept live over Realtime. Other hooks listen in to pick up new
 * commands or to hear how one they sent ended.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { labEnabled } from "@/lib/cloud";
import { recentActions, watchActions } from "@/lib/lab/actions";
import type { ActionEntry } from "@/model/types";

const KEEP = 30;

type Listener = (entry: ActionEntry) => void;

export function useActionLog(userId: string) {
  const [entries, setEntries] = useState<ActionEntry[]>([]);
  const listeners = useRef(new Set<Listener>());

  const upsert = useCallback(
    (entry: ActionEntry) =>
      setEntries((list) =>
        [entry, ...list.filter((e) => e.id !== entry.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, KEEP),
      ),
    [],
  );

  useEffect(() => {
    if (!labEnabled) return;
    let cancelled = false;
    // Watch first, so nothing that lands during the first load is missed.
    const stop = watchActions((entry) => {
      upsert(entry);
      listeners.current.forEach((listener) => listener(entry));
    });
    recentActions(KEEP)
      .then((list) => !cancelled && list.forEach(upsert))
      .catch(() => undefined); // An empty log is fine. Commands still work.
    return () => {
      cancelled = true;
      stop();
    };
  }, [userId, upsert]);

  /** Calls back with every new or changed entry. Returns the unsubscribe. */
  const listen = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => void listeners.current.delete(listener);
  }, []);

  return { entries, upsert, listen };
}

export type ActionLog = ReturnType<typeof useActionLog>;
