"use client";
import { useCallback, useEffect, useRef } from "react";
import { useAutolab } from "@/providers/autolab-context";

/**
 * Streams the Autolab preview only while someone is looking at it. The
 * preview starts as soon as the camera is reachable, now or later, and stops
 * when the view unmounts so the Pi isn't encoding frames for nobody.
 *
 * A pause the person asked for sticks: if the camera drops and comes back we
 * don't restart behind their back. Switching devices clears it.
 */
export function useAutoPreview() {
  const { device, connection, status, preview, startPreview, stopPreview } = useAutolab();
  const ready = Boolean(device) && connection === "connected" && status.online && status.camera_online;
  const paused = useRef(false);
  const previewNow = useRef(preview);
  const stopNow = useRef(stopPreview);

  useEffect(() => {
    previewNow.current = preview;
    stopNow.current = stopPreview;
  }, [preview, stopPreview]);

  useEffect(() => {
    paused.current = false;
  }, [device?.id]);

  // Only `ready` drives this. Reacting to `preview` too would undo a pause.
  useEffect(() => {
    if (ready && !previewNow.current && !paused.current) startPreview();
  }, [ready, startPreview]);

  useEffect(() => () => stopNow.current(), []);

  const pause = useCallback(() => {
    paused.current = true;
    stopPreview();
  }, [stopPreview]);

  const resume = useCallback(() => {
    paused.current = false;
    startPreview();
  }, [startPreview]);

  return { ready, pause, resume };
}
