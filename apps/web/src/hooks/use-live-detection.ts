"use client";
/**
 * Runs object detection on the live preview, one frame at a time. The loop
 * waits for each result before taking the newest frame, so a slow computer
 * just gets fewer updates instead of a growing backlog.
 */
import { useEffect, useState, type RefObject } from "react";
import { detectObjects } from "@/lib/detection";
import { errorText } from "@/lib/errors";
import type { Frame } from "@/model/types";
import type { ObjectUrls } from "./use-object-urls";

/** Returns the most recent frame that has a detection result, or null. */
export function useLiveDetection(
  enabled: boolean,
  latest: RefObject<Frame | null>,
  { makeUrl, revoke }: ObjectUrls,
  onError: (message: string) => void,
) {
  const [analyzed, setAnalyzed] = useState<Frame | null>(null);

  useEffect(() => {
    if (!enabled) {
      setAnalyzed((old) => {
        revoke(old?.url);
        return null;
      });
      return;
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let lastId = "";
    async function tick() {
      const frame = latest.current;
      if (frame && frame.id !== lastId) {
        lastId = frame.id;
        try {
          const blob = await (await fetch(frame.url)).blob();
          const analysis = await detectObjects(blob);
          if (stopped) return;
          // Copy the frame, the buffer may revoke the original while we still show it.
          const url = makeUrl(blob);
          setAnalyzed((old) => {
            revoke(old?.url);
            return { ...frame, url, analysis };
          });
        } catch (error) {
          if (!stopped) onError(errorText(error));
          return;
        }
      }
      if (!stopped) timer = setTimeout(tick, 100);
    }
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [enabled, latest, makeUrl, revoke, onError]);

  return analyzed;
}
