"use client";
/**
 * Lab mode's stand in for the gateway WebSocket, with the same shape so the
 * screens don't know the difference. The Pi talks to Supabase itself:
 * status comes from the report it writes every 15 seconds, preview frames
 * come over the Autolab's private Realtime channel, and photos are commands
 * in the action log.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorText } from "@/lib/errors";
import { addAction } from "@/lib/lab/actions";
import { frameBlob, joinDeviceChannel, type ChannelState } from "@/lib/lab/channel";
import { capturePhoto } from "@/lib/lab/command";
import { OFFLINE_STATUS, type Connection, type Device, type DeviceStatus, type Photo } from "@/model/types";
import type { ChannelHandlers } from "./use-device-channel";
import { useFrameBuffer } from "./use-frame-buffer";
import { useNow } from "./use-now";
import type { ObjectUrls } from "./use-object-urls";

/** Three missed reports. */
const STALE_MS = 45_000;
/** The Pi keeps streaming for 12 seconds after the last "watch". */
const WATCH_EVERY = 4_000;

/**
 * When this screen last saw the Pi's report change. That uses this computer's
 * own clock, so a screen whose clock is off still tells a live Pi from a quiet one.
 */
function useReportFreshness(device: Device | null) {
  const lastSeen = device?.report?.last_seen ?? null;
  const [seenAt, setSeenAt] = useState(0);
  useEffect(() => {
    if (lastSeen) setSeenAt(Date.now());
  }, [lastSeen]);
  const now = useNow(5_000);
  // Until a fresh report arrives, judge the stored one by the clocks.
  const firstLook = !!lastSeen && now - Date.parse(lastSeen) < STALE_MS;
  return (seenAt > 0 && now - seenAt < STALE_MS) || firstLook;
}

export function useLabChannel(device: Device | null, _gateway: string, urls: ObjectUrls, handlers: ChannelHandlers) {
  const deviceId = device?.id ?? null;
  const [link, setLink] = useState<ChannelState>("joining");
  const [preview, setPreview] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [retry, setRetry] = useState(0);
  const channel = useRef<ReturnType<typeof joinDeviceChannel> | null>(null);
  // A ref as well as state, so a double click logs one start, not two.
  const previewing = useRef(false);
  const on = useRef(handlers);
  on.current = handlers;
  const frames = useFrameBuffer(urls, preview);
  const { push: pushFrame, clear: clearFrames } = frames;
  const { makeUrl } = urls;

  const fresh = useReportFreshness(device);
  const report = device?.report;
  const status = useMemo<DeviceStatus>(
    () => ({
      ...OFFLINE_STATUS,
      online: fresh && !!report?.online,
      camera_online: fresh && !!report?.online && !!report?.camera_online,
      simulated: !!report?.simulated,
      last_seen: report?.last_seen ?? null,
      agent_version: report?.agent_version,
      components: fresh && report?.online ? report.components : [],
    }),
    [fresh, report],
  );

  useEffect(() => {
    previewing.current = false;
    setPreview(false);
    clearFrames();
    if (!deviceId) return;
    setLink("joining");
    const joined = joinDeviceChannel(
      deviceId,
      (frame) => pushFrame({ id: frame.id, url: makeUrl(frameBlob(frame.jpeg)), width: frame.w, height: frame.h }),
      setLink,
    );
    channel.current = joined;
    return () => {
      joined.leave();
      channel.current = null;
    };
  }, [deviceId, retry, pushFrame, clearFrames, makeUrl]);

  // Ask for frames while the live view is open. The Pi stops by itself once the asking stops.
  useEffect(() => {
    if (!preview || link !== "joined") return;
    channel.current?.send("watch");
    const timer = setInterval(() => channel.current?.send("watch"), WATCH_EVERY);
    return () => clearInterval(timer);
  }, [preview, link]);

  useEffect(() => {
    if (!status.online) clearFrames();
  }, [status.online, clearFrames]);

  const log = useCallback(
    (kind: "start_preview" | "stop_preview") => {
      if (deviceId) void addAction({ device_id: deviceId, kind, status: "done" }).catch(() => undefined);
    },
    [deviceId],
  );

  const startPreview = useCallback(() => {
    if (previewing.current) return;
    previewing.current = true;
    setPreview(true);
    log("start_preview");
  }, [log]);

  const stopPreview = useCallback(() => {
    if (!previewing.current) return;
    previewing.current = false;
    setPreview(false);
    clearFrames();
    log("stop_preview");
  }, [log, clearFrames]);

  const capture = useCallback(async (): Promise<Photo | null> => {
    if (!deviceId) return null;
    setCapturing(true);
    try {
      const outcome = await capturePhoto(deviceId, () => channel.current?.send("wake"));
      if ("error" in outcome) {
        on.current.notify(outcome.error, "error");
        return null;
      }
      on.current.log("Photo captured", "success");
      return outcome.photo;
    } catch (error) {
      on.current.notify(errorText(error), "error");
      return null;
    } finally {
      setCapturing(false);
    }
  }, [deviceId]);

  const connection: Connection = !deviceId ? "idle" : link === "joined" ? "connected" : link === "lost" ? "reconnecting" : "connecting";
  return {
    connection,
    status,
    preview,
    startPreview,
    stopPreview,
    frame: frames.frame,
    latestFrame: frames.latest,
    fps: frames.fps,
    capturing,
    capture,
    // No ML worker in lab mode. Detection runs in the browser.
    sendBinary: useCallback(() => false, []),
    reconnect: useCallback(() => setRetry((v) => v + 1), []),
  };
}
