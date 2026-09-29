"use client";
import { useEffect, useRef } from "react";
import { detectObjects } from "@/lib/detection";
import { errorText } from "@/lib/errors";
import type { Analysis } from "@/model/types";

/**
 * Runs detection on the webcam, one frame at a time, while `enabled`. Each
 * loop waits for its result before grabbing the next frame, so a slow
 * computer gets fewer updates instead of a growing queue. The caller shows
 * the analyzed still rather than the video, which keeps the boxes on the
 * pixels they were found in.
 */
export function useWebcamDetection(
  enabled: boolean,
  grab: () => Promise<Blob>,
  onResult: (blob: Blob, analysis: Analysis) => void,
  onError: (message: string) => void,
) {
  const handlers = useRef({ onResult, onError });

  useEffect(() => {
    handlers.current = { onResult, onError };
  }, [onResult, onError]);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const blob = await grab();
        const analysis = await detectObjects(blob);
        if (stopped) return;
        handlers.current.onResult(blob, analysis);
      } catch (error) {
        if (!stopped) handlers.current.onError(errorText(error));
        return;
      }
      if (!stopped) timer = setTimeout(tick, 100);
    }

    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [enabled, grab]);
}
