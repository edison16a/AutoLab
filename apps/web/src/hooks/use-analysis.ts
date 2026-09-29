"use client";
/**
 * Object detection for saved photos. It normally runs in the browser. In
 * cloud mode, when an ML worker is connected to the photo's device, the image
 * goes to that worker instead so the result is saved to Supabase.
 */
import { useCallback, useState } from "react";
import { cloudEnabled } from "@/lib/cloud";
import { detectObjects } from "@/lib/detection";
import { errorText } from "@/lib/errors";
import { packEnvelope } from "@/lib/protocol";
import type { Analysis, Photo } from "@/model/types";
import type { Log, Notify } from "./use-notices";

interface AnalysisDeps {
  setAnalysis: (id: string, analysis: Analysis) => void;
  /** Sends a binary message on the device channel. False when offline. */
  sendBinary: (packet: Uint8Array) => boolean;
  /** True when a cloud worker can take jobs for this photo right now. */
  workerFor: (photo: Photo) => boolean;
  notify: Notify;
  log: Log;
}

export function useAnalysis({ setAnalysis, sendBinary, workerFor, notify, log }: AnalysisDeps) {
  /** IDs of photos with a detection in flight, so screens can show progress. */
  const [analyzing, setAnalyzing] = useState<string[]>([]);
  const finish = useCallback((id: string) => setAnalyzing((ids) => ids.filter((x) => x !== id)), []);

  const analyze = useCallback(
    async (photo: Photo) => {
      setAnalyzing((ids) => [...ids, photo.id]);
      try {
        const response = await fetch(photo.url);
        if (!response.ok) throw new Error("Could not read the image. Refresh and try again.");
        if (cloudEnabled && photo.cloud && workerFor(photo)) {
          // The worker's reply arrives on the device channel and calls finish().
          const packet = packEnvelope({ type: "analyze", image_id: photo.id }, await response.arrayBuffer());
          if (!sendBinary(packet)) throw new Error("Autolab is not connected yet.");
          return;
        }
        const analysis = await detectObjects(await response.blob());
        setAnalysis(photo.id, analysis);
        log(`Found ${analysis.detections.length} objects`, "success");
        finish(photo.id);
      } catch (error) {
        notify(errorText(error), "error");
        finish(photo.id);
      }
    },
    [setAnalysis, sendBinary, workerFor, notify, log, finish],
  );

  return { analyzing, analyze, finish };
}
