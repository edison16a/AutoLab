"use client";
/**
 * Toasts for things the person should see right now, plus a short activity
 * log for things worth remembering this session. Errors go to both.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Notice, NoticeKind } from "@/model/types";

const MAX_TOASTS = 3;
const MAX_ACTIVITY = 50;

function makeNotice(text: string, kind: NoticeKind): Notice {
  return { id: crypto.randomUUID(), text, kind, time: new Date().toISOString() };
}

export function useNotices() {
  const [toasts, setToasts] = useState<Notice[]>([]);
  const [activity, setActivity] = useState<Notice[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  /** Adds an entry to the activity log without interrupting anyone. */
  const log = useCallback((text: string, kind: NoticeKind = "info") => {
    setActivity((list) => [makeNotice(text, kind), ...list].slice(0, MAX_ACTIVITY));
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  /** Shows a toast. Errors stay up longer and are also logged. */
  const notify = useCallback(
    (text: string, kind: NoticeKind = "info") => {
      const notice = makeNotice(text, kind);
      setToasts((list) => [...list.slice(-(MAX_TOASTS - 1)), notice]);
      if (kind === "error") log(text, kind);
      const timer = setTimeout(
        () => {
          timers.current.delete(timer);
          dismiss(notice.id);
        },
        kind === "error" ? 7000 : 4000,
      );
      timers.current.add(timer);
    },
    [log, dismiss],
  );

  return { toasts, activity, notify, log, dismiss };
}

export type Notify = ReturnType<typeof useNotices>["notify"];
export type Log = ReturnType<typeof useNotices>["log"];
