"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { detectObjects } from "@/lib/detection";
import { errorText } from "@/lib/errors";
import type { Analysis } from "@/model/types";
import { useAutolab } from "@/providers/autolab-context";
import { useSnapshot } from "./use-snapshot";
import { useWebcam } from "./use-webcam";
import { useWebcamDetection } from "./use-webcam-detection";

/** Anything bigger is almost always a mistake and would stall the detector. */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Reads the real pixel size up front so an upload can show before detection finishes. */
async function imageSize(file: Blob) {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    throw new Error("Could not read this image. Try a JPEG or PNG.");
  }
}

/**
 * Everything the computer camera tab does: the webcam, live detection,
 * taking photos and analyzing uploads. The components only draw.
 */
export function useComputerCamera() {
  const { saveLocal, notify } = useAutolab();
  const [error, setError] = useState<string | null>(null);
  const [detect, setDetect] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { snapshot, show, clear } = useSnapshot();
  const webcam = useWebcam(setError);
  const running = webcam.state === "running";
  // Bumped whenever something else takes the stage, so a slow upload knows it was replaced.
  const turn = useRef(0);
  // Set in the same tick as stop and toggle, so a detection result already in flight is dropped.
  const liveWanted = useRef(false);

  // Leaving mid upload still saves the file, but nothing touches the unmounted stage.
  useEffect(
    () => () => {
      turn.current++;
    },
    [],
  );

  const onLiveResult = useCallback(
    (blob: Blob, analysis: Analysis) => {
      if (liveWanted.current) show({ blob, analysis, width: analysis.width, height: analysis.height, origin: "live" });
    },
    [show],
  );
  const onLiveError = useCallback(
    (message: string) => {
      liveWanted.current = false;
      setDetect(false);
      setError(message);
      clear();
    },
    [clear],
  );
  useWebcamDetection(running && detect, webcam.grab, onLiveResult, onLiveError);

  const { start: startWebcam, stop: stopWebcam, grab } = webcam;

  const start = useCallback(() => {
    turn.current++;
    liveWanted.current = detect;
    setError(null);
    setUploading(false);
    clear();
    void startWebcam();
  }, [detect, clear, startWebcam]);

  const stop = useCallback(() => {
    turn.current++;
    liveWanted.current = false;
    stopWebcam();
    clear();
  }, [clear, stopWebcam]);

  const toggleDetect = useCallback(
    (on: boolean) => {
      liveWanted.current = on;
      setDetect(on);
      // Back to the moving video. An upload on the stage stays put.
      if (!on && snapshot?.origin === "live") clear();
    },
    [snapshot, clear],
  );

  /** Saves what's on screen: the analyzed still while detecting, else a fresh frame. */
  const takePhoto = useCallback(async () => {
    if (!running || saving) return;
    setSaving(true);
    try {
      const still = detect && snapshot?.origin === "live" ? snapshot : null;
      const photo = await saveLocal(still ? still.blob : await grab(), "computer", still?.analysis);
      if (photo) notify("Photo saved", "success");
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setSaving(false);
    }
  }, [running, saving, detect, snapshot, grab, saveLocal, notify]);

  /**
   * Shows the file right away, adds boxes when detection finishes, then
   * saves it. A failed detection still saves the image, since it can be
   * analyzed again from the library.
   */
  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return setError("Choose an image file.");
      if (file.size > MAX_UPLOAD_BYTES) return setError("Choose an image smaller than 20 MB.");
      liveWanted.current = false;
      stopWebcam();
      const mine = ++turn.current;
      setError(null);
      setUploading(true);
      try {
        const size = await imageSize(file);
        if (mine === turn.current) show({ blob: file, ...size, origin: "upload" });
        let analysis: Analysis | undefined;
        let detectError: string | null = null;
        try {
          analysis = await detectObjects(file);
        } catch (failure) {
          detectError = errorText(failure);
        }
        if (mine === turn.current && analysis)
          show({ blob: file, width: analysis.width, height: analysis.height, analysis, origin: "upload" });
        const photo = await saveLocal(file, "upload", analysis);
        if (photo) notify("Image saved", "success");
        if (detectError && mine === turn.current) setError(`Saved without detection. ${detectError}`);
      } catch (failure) {
        if (mine === turn.current) setError(errorText(failure));
      } finally {
        if (mine === turn.current) setUploading(false);
      }
    },
    [stopWebcam, show, saveLocal, notify],
  );

  return {
    videoRef: webcam.videoRef,
    state: webcam.state,
    size: webcam.size,
    snapshot,
    detect,
    uploading,
    saving,
    error,
    start,
    stop,
    toggleDetect,
    takePhoto,
    upload,
  };
}

export type ComputerCameraModel = ReturnType<typeof useComputerCamera>;
