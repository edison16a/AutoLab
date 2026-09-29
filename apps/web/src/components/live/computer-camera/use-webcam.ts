"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/errors";

export type WebcamState = "idle" | "starting" | "running";

export interface VideoSize {
  width: number;
  height: number;
}

/** getUserMedia errors are DOMExceptions with terse names. These say what to do. */
function cameraErrorText(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") return "Camera access was blocked. Allow it in the browser and try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera found on this computer.";
  if (name === "NotReadableError") return "The camera is in use by another app.";
  return errorText(error);
}

/**
 * Owns the computer's camera stream. Every way out (stop, cancel, a failed
 * start, the camera being unplugged, unmount) stops the tracks and detaches
 * the stream from the video element, so the camera light goes off.
 */
export function useWebcam(onError: (message: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  // Kept apart from videoRef: React clears that ref before unmount cleanup runs.
  const attached = useRef<HTMLVideoElement | null>(null);
  // Bumped by every start and stop, so a slow getUserMedia from an older attempt knows it lost.
  const attempt = useRef(0);
  const reportError = useRef(onError);
  const [state, setState] = useState<WebcamState>("idle");
  const [size, setSize] = useState<VideoSize | null>(null);

  useEffect(() => {
    reportError.current = onError;
  }, [onError]);

  const release = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (attached.current) attached.current.srcObject = null;
    attached.current = null;
  }, []);

  const stop = useCallback(() => {
    attempt.current++;
    release();
    setState("idle");
    setSize(null);
  }, [release]);

  const start = useCallback(async () => {
    const id = ++attempt.current;
    setState("starting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access needs HTTPS and a supported browser.");
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (id !== attempt.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) throw new Error("The camera view isn't ready yet.");
      stream.current = media;
      attached.current = video;
      video.srcObject = media;
      // The camera was unplugged or permission was taken away mid stream.
      media.getVideoTracks()[0]?.addEventListener("ended", () => id === attempt.current && stop());
      await video.play();
      if (id !== attempt.current) return;
      setSize({ width: video.videoWidth, height: video.videoHeight });
      setState("running");
    } catch (error) {
      if (id !== attempt.current) return;
      release();
      setState("idle");
      reportError.current(cameraErrorText(error));
    }
  }, [release, stop]);

  /** The current frame as a JPEG, at the camera's full resolution. */
  const grab = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) throw new Error("Waiting for a camera frame.");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read the camera frame.");
    context.drawImage(video, 0, 0);
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not save the frame."))), "image/jpeg", 0.92),
    );
  }, []);

  useEffect(
    () => () => {
      attempt.current++;
      release();
    },
    [release],
  );

  return { videoRef, state, size, start, stop, grab };
}
