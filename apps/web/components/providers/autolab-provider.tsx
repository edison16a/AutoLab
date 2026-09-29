"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, cloudEnabled, token } from "@/lib/cloud";
import {
  detectObjects,
  disposeDetector,
  watchDetector,
  type Analysis,
} from "@/lib/detection";
import { keys, photoStore, readJSON, writeJSON } from "@/lib/storage";
import {
  offlineStatus,
  type Activity,
  type ActivityKind,
  type Connection,
  type Device,
  type DeviceStatus,
  type Frame,
  type Photo,
  type PhotoSource,
  type Toast,
} from "@/lib/types";
import type { User } from "./auth-provider";

const defaultGateway = (
  process.env.NEXT_PUBLIC_GATEWAY_URL || "ws://localhost:8000"
).replace(/\/$/, "");
/** Demo library bounds, per signed-in user, stored in this browser only. */
const DEMO_MAX_PHOTOS = 150,
  DEMO_MAX_BYTES = 400 * 1024 * 1024;
const CAPTURE_TIMEOUT = 65000;

type CloudImageRow = {
  id: string;
  device_id: string;
  captured_at: string;
  width: number;
  height: number;
  url: string;
  image_analysis?: { result_json: Analysis; created_at: string }[];
};

export type AutolabValue = {
  user: User;
  mode: "demo" | "cloud";
  gateway: string;
  setGateway: (url: string) => void;
  devices: Device[];
  device: Device | null;
  selectDevice: (id: string) => void;
  addDevice: (id: string, name: string) => void;
  renameDevice: (id: string, name: string) => Promise<void>;
  forgetDevice: (id: string) => void;
  connection: Connection;
  status: DeviceStatus;
  reconnect: () => void;
  preview: boolean;
  startPreview: () => void;
  stopPreview: () => void;
  /** What the live viewport should render: the analyzed frame while live detection is on. */
  liveFrame: Frame | null;
  liveDetect: boolean;
  setLiveDetect: (enabled: boolean) => void;
  fps: number;
  photos: Photo[];
  photosReady: boolean;
  capturing: boolean;
  /** Resolves with the new photo once the Pi returns the full-resolution still. */
  capture: () => Promise<Photo | null>;
  analyzing: string[];
  analyze: (photo: Photo) => Promise<void>;
  removePhotos: (ids: string[]) => Promise<void>;
  download: (photo: Photo) => Promise<void>;
  saveLocal: (
    blob: Blob,
    source: Extract<PhotoSource, "computer" | "upload">,
    analysis?: Analysis,
  ) => Promise<Photo | null>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refreshPhotos: () => Promise<void>;
  clearLocalData: () => Promise<void>;
  detectorStatus: string;
  events: Activity[];
  toasts: Toast[];
  notify: (text: string, kind?: ActivityKind) => void;
  dismissToast: (id: string) => void;
  connectOpen: boolean;
  openConnect: () => void;
  closeConnect: () => void;
};

const AutolabContext = createContext<AutolabValue | null>(null);

function message(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export function AutolabProvider({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  const [gateway, setGatewayState] = useState(defaultGateway),
    [devices, setDevices] = useState<Device[]>([]),
    [deviceId, setDeviceId] = useState<string | null>(null),
    [connection, setConnection] = useState<Connection>("idle"),
    [status, setStatus] = useState<DeviceStatus>(offlineStatus),
    [retry, setRetry] = useState(0);
  const [preview, setPreview] = useState(false),
    [liveDetect, setLiveDetectState] = useState(false),
    [frame, setFrame] = useState<Frame | null>(null),
    [analyzedFrame, setAnalyzedFrame] = useState<Frame | null>(null),
    [fps, setFps] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]),
    [photosReady, setPhotosReady] = useState(false),
    [hasMoreByDevice, setHasMoreByDevice] = useState<Record<string, boolean>>(
      {},
    ),
    [capturing, setCapturing] = useState(false),
    [analyzing, setAnalyzing] = useState<string[]>([]),
    [detectorStatus, setDetectorStatus] = useState("Not loaded");
  const [events, setEvents] = useState<Activity[]>([]),
    [toasts, setToasts] = useState<Toast[]>([]),
    [connectOpen, setConnectOpen] = useState(false);

  const ws = useRef<WebSocket | null>(null),
    urls = useRef(new Set<string>()),
    frames = useRef(new Map<string, Frame>()),
    frameTimes = useRef<number[]>([]),
    latestFrame = useRef<Frame | null>(null),
    statusRef = useRef<DeviceStatus>(offlineStatus),
    previewRef = useRef(false),
    liveDetectRef = useRef(false),
    photosRef = useRef<Photo[]>([]),
    alive = useRef(true),
    waiters = useRef(
      new Map<
        string,
        {
          resolve: (p: Photo | null) => void;
          timer: ReturnType<typeof setTimeout>;
        }
      >(),
    );
  const device = devices.find((d) => d.id === deviceId) || null;
  useEffect(() => {
    latestFrame.current = frame;
  }, [frame]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => watchDetector(setDetectorStatus), []);

  /* ---------- object URLs ---------- */
  const makeUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    return url;
  }, []);
  const revoke = useCallback((url?: string) => {
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
      urls.current.delete(url);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const owned = urls.current,
      pending = waiters.current;
    return () => {
      alive.current = false;
      owned.forEach((u) => URL.revokeObjectURL(u));
      owned.clear();
      pending.forEach((w) => clearTimeout(w.timer));
      pending.clear();
      disposeDetector();
    };
  }, []);

  /* ---------- activity + toasts ---------- */
  const addEvent = useCallback((text: string, kind: ActivityKind = "info") => {
    setEvents((list) =>
      [
        {
          id: crypto.randomUUID(),
          text,
          kind,
          time: new Date().toISOString(),
        },
        ...list,
      ].slice(0, 50),
    );
  }, []);
  const dismissToast = useCallback(
    (id: string) => setToasts((list) => list.filter((t) => t.id !== id)),
    [],
  );
  const notify = useCallback(
    (text: string, kind: ActivityKind = "info") => {
      const id = crypto.randomUUID();
      setToasts((list) => [...list.slice(-2), { id, text, kind }]);
      if (kind === "error") addEvent(text, kind);
      setTimeout(() => dismissToast(id), kind === "error" ? 7000 : 4000);
    },
    [addEvent, dismissToast],
  );

  /* ---------- gateway + devices ---------- */
  useEffect(() => {
    const saved = readJSON<string | null>(keys.gateway, null);
    if (saved) setGatewayState(saved);
    if (!cloudEnabled) {
      const list = readJSON<Device[]>(keys.devices(user.id), []);
      setDevices(list);
      const selected = readJSON<string | null>(keys.selected(user.id), null);
      setDeviceId(list.some((d) => d.id === selected) ? selected : list[0]?.id || null);
    }
  }, [user.id]);
  const setGateway = useCallback((url: string) => {
    const clean = url.trim().replace(/\/$/, "");
    setGatewayState(clean);
    writeJSON(keys.gateway, clean === defaultGateway ? null : clean);
  }, []);
  useEffect(() => {
    if (!cloudEnabled) return;
    let cancelled = false;
    api(gateway, "/devices")
      .then((rows: Device[]) => {
        if (cancelled) return;
        const list = rows.map((r) => ({ id: r.id, name: r.name }));
        setDevices(list);
        const selected = readJSON<string | null>(keys.selected(user.id), null);
        setDeviceId((current) =>
          list.some((d) => d.id === current)
            ? current
            : list.some((d) => d.id === selected)
              ? selected
              : list[0]?.id || null,
        );
      })
      .catch((e) => !cancelled && notify(message(e), "error"));
    return () => {
      cancelled = true;
    };
  }, [gateway, user.id, retry, notify]);
  const persistDevices = useCallback(
    (next: Device[]) => {
      if (!cloudEnabled) writeJSON(keys.devices(user.id), next);
    },
    [user.id],
  );
  const selectDevice = useCallback(
    (id: string) => {
      setDeviceId(id);
      writeJSON(keys.selected(user.id), id);
    },
    [user.id],
  );
  const addDevice = useCallback(
    (id: string, name: string) => {
      const entry = { id, name: name.trim() || "My Autolab" };
      setDevices((list) => {
        const next = [...list.filter((d) => d.id !== id), entry];
        persistDevices(next);
        return next;
      });
      selectDevice(id);
      addEvent(`${entry.name} added`, "success");
    },
    [persistDevices, selectDevice, addEvent],
  );
  const renameDevice = useCallback(
    async (id: string, name: string) => {
      const clean = name.trim();
      if (!clean) return;
      if (cloudEnabled)
        await api(gateway, `/devices/${id}`, "PATCH", { name: clean });
      setDevices((list) => {
        const next = list.map((d) => (d.id === id ? { ...d, name: clean } : d));
        persistDevices(next);
        return next;
      });
    },
    [gateway, persistDevices],
  );
  const forgetDevice = useCallback(
    (id: string) => {
      if (cloudEnabled) {
        notify("Cloud devices stay linked to your account.", "error");
        return;
      }
      setDevices((list) => {
        const next = list.filter((d) => d.id !== id);
        persistDevices(next);
        setDeviceId((current) => (current === id ? next[0]?.id || null : current));
        return next;
      });
    },
    [persistDevices, notify],
  );

  /* ---------- photos ---------- */
  const capPhotos = useCallback(
    (list: Photo[]) => {
      if (cloudEnabled) return list;
      const next = [...list];
      let bytes = next.reduce((n, p) => n + (p.bytes || 0), 0);
      const evicted: string[] = [];
      while (next.length > DEMO_MAX_PHOTOS || bytes > DEMO_MAX_BYTES) {
        const old = next.pop()!;
        bytes -= old.bytes || 0;
        evicted.push(old.id);
        revoke(old.url);
      }
      if (evicted.length) photoStore.remove(evicted);
      return next;
    },
    [revoke],
  );
  const addPhoto = useCallback(
    (photo: Photo) =>
      setPhotos((list) =>
        capPhotos(
          [photo, ...list.filter((p) => p.id !== photo.id)].sort((a, b) =>
            b.captured_at.localeCompare(a.captured_at),
          ),
        ),
      ),
    [capPhotos],
  );
  const loadCloudPage = useCallback(
    async (id: string, offset: number) => {
      const rows: CloudImageRow[] = await api(
        gateway,
        `/devices/${id}/images?offset=${offset}`,
      );
      setHasMoreByDevice((v) => ({ ...v, [id]: rows.length === 25 }));
      const mapped: Photo[] = rows.map((r) => {
        const latest = [...(r.image_analysis || [])].sort((a, b) =>
          a.created_at.localeCompare(b.created_at),
        );
        return {
          id: r.id,
          device_id: r.device_id,
          url: r.url,
          width: r.width,
          height: r.height,
          captured_at: r.captured_at,
          source: "pi",
          cloud: true,
          analysis: latest.at(-1)?.result_json,
          analyzed_at: latest.at(-1)?.created_at,
        };
      });
      setPhotos((list) => {
        const fresh = new Map(mapped.map((p) => [p.id, p]));
        const kept = list.filter(
          (p) =>
            !fresh.has(p.id) &&
            // A first page replaces that device's signed URLs.
            !(offset === 0 && p.cloud && p.device_id === id),
        );
        return [...kept, ...mapped].sort((a, b) =>
          b.captured_at.localeCompare(a.captured_at),
        );
      });
    },
    [gateway],
  );
  const refreshPhotos = useCallback(async () => {
    if (!cloudEnabled) {
      const rows = await photoStore.list(user.id);
      if (!alive.current) return;
      photosRef.current.forEach((p) => revoke(p.url));
      const next = capPhotos(
        rows.map((r) => ({
          id: r.id,
          device_id: r.device_id,
          url: makeUrl(r.blob),
          width: r.width,
          height: r.height,
          captured_at: r.captured_at,
          source: r.source,
          bytes: r.bytes,
          analysis: r.analysis,
          analyzed_at: r.analyzed_at,
        })),
      );
      photosRef.current = next;
      setPhotos(next);
      setPhotosReady(true);
      return;
    }
    try {
      await Promise.all(devices.map((d) => loadCloudPage(d.id, 0)));
    } catch (e) {
      notify(message(e), "error");
    } finally {
      if (alive.current) setPhotosReady(true);
    }
  }, [user.id, devices, loadCloudPage, makeUrl, revoke, capPhotos, notify]);
  const refreshRef = useRef(refreshPhotos);
  refreshRef.current = refreshPhotos;
  const deviceKey = devices.map((d) => d.id).join(",");
  useEffect(() => {
    // Demo: load once per user. Cloud: load after the device list arrives.
    if (cloudEnabled && !deviceKey) {
      setPhotosReady(true);
      return;
    }
    refreshRef.current();
  }, [user.id, cloudEnabled ? deviceKey : "", gateway]);
  const hasMore = Object.values(hasMoreByDevice).some(Boolean);
  const loadMore = useCallback(async () => {
    try {
      await Promise.all(
        Object.entries(hasMoreByDevice)
          .filter(([, more]) => more)
          .map(([id]) =>
            loadCloudPage(
              id,
              photosRef.current.filter((p) => p.cloud && p.device_id === id)
                .length,
            ),
          ),
      );
    } catch (e) {
      notify(message(e), "error");
    }
  }, [hasMoreByDevice, loadCloudPage, notify]);

  /* ---------- device channel ---------- */
  const resolveWaiter = useCallback((id: string, photo: Photo | null) => {
    const waiter = waiters.current.get(id);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    waiters.current.delete(id);
    waiter.resolve(photo);
  }, []);
  const clearLive = useCallback(() => {
    setFrame(null);
    setAnalyzedFrame((old) => {
      revoke(old?.url);
      return null;
    });
    frames.current.forEach((f) => revoke(f.url));
    frames.current.clear();
    frameTimes.current = [];
    setFps(0);
  }, [revoke]);
  useEffect(() => {
    if (!deviceId) {
      setConnection("idle");
      setStatus(offlineStatus);
      return;
    }
    let stopped = false,
      reconnectTimer: ReturnType<typeof setTimeout>,
      delay = 1000;
    const id = deviceId;
    setStatus(offlineStatus);
    setPreview(false);
    previewRef.current = false;
    setLiveDetectState(false);
    liveDetectRef.current = false;
    setCapturing(false);
    setConnection("connecting");
    clearLive();
    async function open() {
      if (stopped) return;
      try {
        const access = await token();
        if (stopped) return;
        const socket = new WebSocket(`${gateway}/ws/client/${id}`);
        socket.binaryType = "arraybuffer";
        ws.current = socket;
        socket.onopen = () =>
          socket.send(JSON.stringify({ type: "hello", token: access }));
        socket.onmessage = (event) => {
          if (stopped) return;
          try {
            if (event.data instanceof ArrayBuffer) handleBinary(event.data);
            else handleJson(JSON.parse(event.data), socket);
          } catch {
            notify("Received an invalid gateway message", "error");
          }
        };
        socket.onerror = () => setConnection("reconnecting");
        socket.onclose = () => {
          if (stopped) return;
          setConnection("reconnecting");
          setStatus((s) => ({
            ...s,
            online: false,
            camera_online: false,
            worker_online: false,
            components: [],
          }));
          clearLive();
          setCapturing(false);
          reconnectTimer = setTimeout(open, delay);
          delay = Math.min(delay * 2, 30000);
        };
      } catch (e) {
        notify(message(e), "error");
        reconnectTimer = setTimeout(open, 5000);
      }
    }
    function handleBinary(data: ArrayBuffer) {
      if (data.byteLength < 5) return;
      const length = new DataView(data).getUint32(0);
      if (length > 8192 || length + 4 >= data.byteLength) return;
      const header = JSON.parse(
        new TextDecoder().decode(data.slice(4, length + 4)),
      );
      const blob = new Blob([data.slice(length + 4)], { type: "image/jpeg" });
      if (header.type === "frame") {
        const f: Frame = {
          id: header.frame_id,
          url: makeUrl(blob),
          width: header.width,
          height: header.height,
        };
        frames.current.set(f.id, f);
        while (frames.current.size > 16) {
          const key = frames.current.keys().next().value!;
          revoke(frames.current.get(key)?.url);
          frames.current.delete(key);
        }
        frameTimes.current.push(performance.now());
        setFrame(f);
        return;
      }
      if (header.type === "capture") {
        const photo: Photo = {
          id: header.image_id,
          device_id: id,
          url: makeUrl(blob),
          width: header.width,
          height: header.height,
          captured_at: header.captured_at,
          bytes: blob.size,
          source: statusRef.current.simulated ? "simulator" : "pi",
          cloud: cloudEnabled,
        };
        addPhoto(photo);
        if (!cloudEnabled)
          photoStore
            .put({
              id: photo.id,
              owner: user.id,
              device_id: id,
              blob,
              width: photo.width,
              height: photo.height,
              captured_at: photo.captured_at,
              bytes: blob.size,
              source: photo.source,
            })
            .then((ok) => {
              if (!ok) notify("Photo kept for this session only. Browser storage is unavailable.", "error");
            });
        setCapturing(waiters.current.size > 1);
        resolveWaiter(photo.id, photo);
        addEvent("Photo captured", "success");
      }
    }
    function handleJson(m: Record<string, unknown>, socket: WebSocket) {
      if (m.type === "ready") {
        if (m.mode !== (cloudEnabled ? "cloud" : "demo")) {
          notify("The web app and gateway are running in different modes.", "error");
          socket.close();
          return;
        }
        setConnection("connected");
        delay = 1000;
        if (previewRef.current)
          socket.send(JSON.stringify({ type: "start_preview" }));
      } else if (m.type === "status") {
        const { type: _type, ...next } = m;
        const wasOnline = statusRef.current.online;
        setStatus(next as DeviceStatus);
        if (!next.online) clearLive();
        if (next.online && !wasOnline) addEvent("Autolab online", "success");
        if (!next.online && wasOnline) addEvent("Autolab offline", "error");
      } else if (m.type === "preview") {
        setPreview(!!m.active);
        if (!m.active) clearLive();
      } else if (m.type === "error") {
        notify(String(m.message || "Device error"), "error");
        if (typeof m.request_id === "string") resolveWaiter(m.request_id, null);
        setCapturing(waiters.current.size > 0);
        // Gateway analysis timeouts carry the image ID as request_id.
        setAnalyzing((list) =>
          list.filter((x) => x !== m.image_id && x !== m.request_id),
        );
      } else if (m.type === "analysis") {
        const analysis = m as unknown as Analysis & {
          image_id?: string;
          frame_id?: string;
        };
        if (analysis.image_id) {
          const analyzed_at = new Date().toISOString();
          setPhotos((list) =>
            list.map((p) =>
              p.id === analysis.image_id ? { ...p, analysis, analyzed_at } : p,
            ),
          );
          setAnalyzing((list) => list.filter((x) => x !== analysis.image_id));
          addEvent(`Analysis saved: ${analysis.detections.length} objects`, "success");
        }
      }
    }
    open();
    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      ws.current?.close();
      ws.current = null;
      waiters.current.forEach((w) => {
        clearTimeout(w.timer);
        w.resolve(null);
      });
      waiters.current.clear();
      clearLive();
    };
  }, [deviceId, gateway, retry, user.id, makeUrl, revoke, notify, addEvent, addPhoto, resolveWaiter, clearLive]);

  /* ---------- live preview ---------- */
  useEffect(() => {
    if (!preview) return;
    const timer = setInterval(() => {
      const now = performance.now();
      frameTimes.current = frameTimes.current.filter((t) => now - t < 3000);
      setFps(Math.round((frameTimes.current.length / 3) * 10) / 10);
    }, 1000);
    return () => clearInterval(timer);
  }, [preview]);
  const send = useCallback(
    (type: string, extra: Record<string, unknown> = {}) => {
      if (ws.current?.readyState !== WebSocket.OPEN) {
        notify("Autolab is not connected yet.", "error");
        return null;
      }
      const request_id = crypto.randomUUID();
      ws.current.send(JSON.stringify({ type, request_id, ...extra }));
      return request_id;
    },
    [notify],
  );
  const startPreview = useCallback(() => {
    if (previewRef.current) return;
    if (send("start_preview")) {
      previewRef.current = true;
      setPreview(true);
    }
  }, [send]);
  const stopPreview = useCallback(() => {
    previewRef.current = false;
    liveDetectRef.current = false;
    setLiveDetectState(false);
    setPreview(false);
    clearLive();
    if (ws.current?.readyState === WebSocket.OPEN)
      ws.current.send(
        JSON.stringify({ type: "stop_preview", request_id: crypto.randomUUID() }),
      );
  }, [clearLive]);
  const setLiveDetect = useCallback(
    (enabled: boolean) => {
      liveDetectRef.current = enabled;
      setLiveDetectState(enabled);
      if (enabled && !previewRef.current) startPreview();
      if (!enabled)
        setAnalyzedFrame((old) => {
          revoke(old?.url);
          return null;
        });
    },
    [startPreview, revoke],
  );
  useEffect(() => {
    if (!liveDetect || !preview) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      lastId = "";
    async function tick() {
      const f = latestFrame.current;
      if (f && f.id !== lastId) {
        lastId = f.id;
        try {
          const blob = await (await fetch(f.url)).blob();
          const analysis = await detectObjects(blob);
          if (stopped || !liveDetectRef.current) return;
          const copy = makeUrl(blob);
          setAnalyzedFrame((old) => {
            revoke(old?.url);
            return { ...f, url: copy, analysis };
          });
        } catch (e) {
          if (!stopped) {
            notify(message(e), "error");
            liveDetectRef.current = false;
            setLiveDetectState(false);
          }
          return;
        }
      }
      if (!stopped) timer = setTimeout(tick, 100);
    }
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [liveDetect, preview, deviceId, makeUrl, revoke, notify]);

  /* ---------- actions ---------- */
  const capture = useCallback(() => {
    const request = send("capture_photo");
    if (!request) return Promise.resolve(null);
    setCapturing(true);
    return new Promise<Photo | null>((resolve) => {
      const timer = setTimeout(() => {
        waiters.current.delete(request);
        setCapturing(waiters.current.size > 0);
        notify("Capture timed out. Check the Pi agent.", "error");
        resolve(null);
      }, CAPTURE_TIMEOUT);
      waiters.current.set(request, { resolve, timer });
    });
  }, [send, notify]);

  const analyze = useCallback(
    async (p: Photo) => {
      // Cloud captures use the durable worker path when a worker is online.
      if (cloudEnabled && p.cloud && statusRef.current.worker_online && p.device_id === deviceId) {
        try {
          const bytes = await (await fetch(p.url)).arrayBuffer();
          const header = new TextEncoder().encode(
            JSON.stringify({ type: "analyze", image_id: p.id }),
          );
          const packet = new Uint8Array(4 + header.length + bytes.byteLength);
          new DataView(packet.buffer).setUint32(0, header.length);
          packet.set(header, 4);
          packet.set(new Uint8Array(bytes), 4 + header.length);
          if (ws.current?.readyState !== WebSocket.OPEN)
            throw new Error("Autolab is not connected yet.");
          ws.current.send(packet);
          setAnalyzing((list) => [...list, p.id]);
        } catch (e) {
          notify(message(e), "error");
        }
        return;
      }
      setAnalyzing((list) => [...list, p.id]);
      try {
        const response = await fetch(p.url);
        if (!response.ok) throw new Error("Could not read image");
        const analysis = await detectObjects(await response.blob());
        if (!alive.current) return;
        const analyzed_at = new Date().toISOString();
        setPhotos((list) =>
          list.map((x) => (x.id === p.id ? { ...x, analysis, analyzed_at } : x)),
        );
        if (!p.cloud) photoStore.setAnalysis(p.id, analysis, analyzed_at);
        addEvent(`Found ${analysis.detections.length} objects`, "success");
      } catch (e) {
        if (alive.current) notify(message(e), "error");
      } finally {
        if (alive.current) setAnalyzing((list) => list.filter((x) => x !== p.id));
      }
    },
    [deviceId, notify, addEvent],
  );

  const removePhotos = useCallback(
    async (ids: string[]) => {
      const targets = photosRef.current.filter((p) => ids.includes(p.id));
      const removed: string[] = [];
      for (const p of targets) {
        try {
          if (p.cloud) await api(gateway, `/images/${p.id}`, "DELETE");
          removed.push(p.id);
        } catch (e) {
          notify(message(e), "error");
        }
      }
      await photoStore.remove(targets.filter((p) => !p.cloud).map((p) => p.id));
      setPhotos((list) => list.filter((p) => !removed.includes(p.id)));
      targets.filter((p) => removed.includes(p.id)).forEach((p) => revoke(p.url));
      if (removed.length)
        addEvent(removed.length === 1 ? "Photo deleted" : `${removed.length} photos deleted`);
    },
    [gateway, notify, revoke, addEvent],
  );

  const download = useCallback(
    async (p: Photo) => {
      try {
        const response = await fetch(p.url);
        if (!response.ok)
          throw new Error("Download failed. Refresh and try again.");
        const url = makeUrl(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = `autolab-${p.captured_at.slice(0, 19).replace(/[:T]/g, "-")}.jpg`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => revoke(url), 1000);
      } catch (e) {
        notify(message(e), "error");
      }
    },
    [makeUrl, revoke, notify],
  );

  const saveLocal = useCallback(
    async (
      blob: Blob,
      source: Extract<PhotoSource, "computer" | "upload">,
      analysis?: Analysis,
    ) => {
      try {
        const bitmap = await createImageBitmap(blob);
        const photo: Photo = {
          id: crypto.randomUUID(),
          device_id: null,
          url: makeUrl(blob),
          width: bitmap.width,
          height: bitmap.height,
          captured_at: new Date().toISOString(),
          bytes: blob.size,
          source,
          analysis,
          analyzed_at: analysis ? new Date().toISOString() : undefined,
        };
        bitmap.close();
        if (!alive.current) return null;
        addPhoto(photo);
        await photoStore.put({
          id: photo.id,
          owner: user.id,
          device_id: null,
          blob,
          width: photo.width,
          height: photo.height,
          captured_at: photo.captured_at,
          bytes: blob.size,
          source,
          analysis,
          analyzed_at: photo.analyzed_at,
        });
        addEvent(source === "upload" ? "Image uploaded" : "Photo captured", "success");
        return photo;
      } catch (e) {
        notify(message(e), "error");
        return null;
      }
    },
    [makeUrl, addPhoto, user.id, addEvent, notify],
  );

  const clearLocalData = useCallback(async () => {
    await photoStore.clear(user.id);
    setPhotos((list) => {
      list.filter((p) => !p.cloud).forEach((p) => revoke(p.url));
      return list.filter((p) => p.cloud);
    });
    addEvent("Local images cleared");
  }, [user.id, revoke, addEvent]);

  const value = useMemo<AutolabValue>(
    () => ({
      user,
      mode: cloudEnabled ? "cloud" : "demo",
      gateway,
      setGateway,
      devices,
      device,
      selectDevice,
      addDevice,
      renameDevice,
      forgetDevice,
      connection,
      status,
      reconnect: () => setRetry((v) => v + 1),
      preview,
      startPreview,
      stopPreview,
      liveFrame: liveDetect && analyzedFrame ? analyzedFrame : frame,
      liveDetect,
      setLiveDetect,
      fps,
      photos,
      photosReady,
      capturing,
      capture,
      analyzing,
      analyze,
      removePhotos,
      download,
      saveLocal,
      hasMore,
      loadMore,
      refreshPhotos,
      clearLocalData,
      detectorStatus,
      events,
      toasts,
      notify,
      dismissToast,
      connectOpen,
      openConnect: () => setConnectOpen(true),
      closeConnect: () => setConnectOpen(false),
    }),
    [
      user, gateway, setGateway, devices, device, selectDevice, addDevice,
      renameDevice, forgetDevice, connection, status, preview, startPreview,
      stopPreview, liveDetect, analyzedFrame, frame, setLiveDetect, fps, photos,
      photosReady, capturing, capture, analyzing, analyze, removePhotos, download,
      saveLocal, hasMore, loadMore, refreshPhotos, clearLocalData, detectorStatus,
      events, toasts, notify, dismissToast, connectOpen,
    ],
  );
  return (
    <AutolabContext.Provider value={value}>{children}</AutolabContext.Provider>
  );
}

export function useAutolab() {
  const value = useContext(AutolabContext);
  if (!value) throw new Error("useAutolab must be used inside AutolabProvider");
  return value;
}
