"use client";
/**
 * The browser's WebSocket to the gateway for the selected device. It says
 * hello (with a Supabase token in cloud mode), keeps the device status
 * current, streams preview frames, delivers captures and reconnects with
 * backoff when the network drops. Only one device is connected at a time.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { cloudEnabled, token } from "@/lib/cloud";
import { errorText } from "@/lib/errors";
import { frameFromEnvelope, photoFromCapture } from "@/lib/channel-messages";
import { unpackEnvelope } from "@/lib/protocol";
import { OFFLINE_STATUS, type Analysis, type Connection, type DeviceStatus, type Photo } from "@/model/types";
import { useCaptureRequests } from "./use-capture-requests";
import { useFrameBuffer } from "./use-frame-buffer";
import type { Log, Notify } from "./use-notices";
import type { ObjectUrls } from "./use-object-urls";

export interface ChannelHandlers {
  onCapture: (photo: Photo, blob: Blob) => void;
  /** A cloud ML worker finished and saved an analysis. */
  onSavedAnalysis: (imageId: string, analysis: Analysis) => void;
  /** The gateway reported an error for a request, which may be an analysis. */
  onRequestError: (requestId: string) => void;
  notify: Notify;
  log: Log;
}

export function useDeviceChannel(deviceId: string | null, gateway: string, urls: ObjectUrls, handlers: ChannelHandlers) {
  const [connection, setConnection] = useState<Connection>("idle");
  const [status, setStatus] = useState<DeviceStatus>(OFFLINE_STATUS);
  const [preview, setPreview] = useState(false);
  const [retry, setRetry] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const wantsPreview = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;
  // Handlers change every render. Reading them through a ref keeps the socket from reconnecting.
  const on = useRef(handlers);
  on.current = handlers;
  const frames = useFrameBuffer(urls, preview);
  const captures = useCaptureRequests(handlers.notify);
  const { push: pushFrame, clear: clearFrames } = frames;
  const { begin, settle, cancelAll } = captures;
  const { makeUrl } = urls;

  useEffect(() => {
    setStatus(OFFLINE_STATUS);
    setPreview(false);
    wantsPreview.current = false;
    clearFrames();
    if (!deviceId) {
      setConnection("idle");
      return;
    }
    const id = deviceId;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let delay = 1000;
    setConnection("connecting");

    function onBinary(data: ArrayBuffer) {
      const envelope = unpackEnvelope(data);
      if (envelope?.header.type === "frame") pushFrame(frameFromEnvelope(envelope, makeUrl(envelope.jpeg)));
      if (envelope?.header.type !== "capture") return;
      const photo = photoFromCapture(envelope, id, makeUrl(envelope.jpeg), statusRef.current.simulated);
      on.current.onCapture(photo, envelope.jpeg);
      settle(photo.id, photo);
      on.current.log("Photo captured", "success");
    }

    function onJson(m: Record<string, unknown>, ws: WebSocket) {
      if (m.type === "ready") {
        if (m.mode !== (cloudEnabled ? "cloud" : "demo")) {
          on.current.notify("The web app and gateway are running in different modes.", "error");
          ws.close();
          return;
        }
        setConnection("connected");
        delay = 1000;
        // Resume a preview someone was watching before the connection dropped.
        if (wantsPreview.current) ws.send(JSON.stringify({ type: "start_preview" }));
      } else if (m.type === "status") {
        const { type: _type, ...next } = m as unknown as DeviceStatus & { type: string };
        if (next.online !== statusRef.current.online) on.current.log(next.online ? "Autolab online" : "Autolab offline");
        if (!next.online) clearFrames();
        setStatus(next);
      } else if (m.type === "preview") {
        setPreview(Boolean(m.active));
        if (!m.active) clearFrames();
      } else if (m.type === "error") {
        on.current.notify(String(m.message ?? "Device error"), "error");
        const requestId = String(m.request_id ?? m.image_id ?? "");
        if (requestId) {
          settle(requestId, null);
          on.current.onRequestError(requestId);
        }
      } else if (m.type === "analysis" && typeof m.image_id === "string") {
        on.current.onSavedAnalysis(m.image_id, m as unknown as Analysis);
      }
    }

    function scheduleReconnect() {
      timer = setTimeout(open, delay);
      delay = Math.min(delay * 2, 30_000);
    }

    async function open() {
      if (stopped) return;
      try {
        const access = await token();
        if (stopped) return;
        const ws = new WebSocket(`${gateway}/ws/client/${id}`);
        ws.binaryType = "arraybuffer";
        socket.current = ws;
        ws.onopen = () => ws.send(JSON.stringify({ type: "hello", token: access }));
        ws.onmessage = (event) => {
          if (stopped) return;
          if (event.data instanceof ArrayBuffer) return onBinary(event.data);
          try {
            onJson(JSON.parse(event.data), ws);
          } catch {
            on.current.notify("Received an invalid gateway message.", "error");
          }
        };
        ws.onclose = () => {
          if (stopped) return;
          setConnection("reconnecting");
          setStatus((s) => ({ ...s, online: false, camera_online: false, worker_online: false, components: [] }));
          clearFrames();
          cancelAll();
          scheduleReconnect();
        };
      } catch (error) {
        on.current.notify(errorText(error), "error");
        scheduleReconnect();
      }
    }

    void open();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket.current?.close();
      socket.current = null;
      cancelAll();
      clearFrames();
    };
  }, [deviceId, gateway, retry, makeUrl, pushFrame, clearFrames, settle, cancelAll]);

  /** Sends a JSON command. Returns its request ID, or null when offline. */
  const send = useCallback((type: string, extra: Record<string, unknown> = {}) => {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      on.current.notify("Autolab is not connected yet.", "error");
      return null;
    }
    const requestId = crypto.randomUUID();
    socket.current.send(JSON.stringify({ type, request_id: requestId, ...extra }));
    return requestId;
  }, []);

  const sendBinary = useCallback((packet: Uint8Array) => {
    if (socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(packet);
    return true;
  }, []);

  const startPreview = useCallback(() => {
    if (wantsPreview.current || !send("start_preview")) return;
    wantsPreview.current = true;
    setPreview(true);
  }, [send]);

  const stopPreview = useCallback(() => {
    if (!wantsPreview.current) return;
    wantsPreview.current = false;
    setPreview(false);
    clearFrames();
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: "stop_preview" }));
  }, [clearFrames]);

  /** Asks the Pi for a full resolution still. Resolves when it arrives. */
  const capture = useCallback(async () => {
    const requestId = send("capture_photo");
    return requestId ? begin(requestId) : null;
  }, [send, begin]);

  return {
    connection,
    status,
    preview,
    startPreview,
    stopPreview,
    frame: frames.frame,
    latestFrame: frames.latest,
    fps: frames.fps,
    capturing: captures.capturing,
    capture,
    sendBinary,
    reconnect: useCallback(() => setRetry((v) => v + 1), []),
  };
}
