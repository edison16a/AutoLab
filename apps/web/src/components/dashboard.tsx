"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Boxes,
  ArrowUpRight,
  Camera,
  Check,
  CircleHelp,
  Cpu,
  Download,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Settings,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import { api, cloudEnabled, supabase, token } from "@/lib/cloud";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import DigitalTwin from "./autolab-3d/DigitalTwin";
import type { DeviceRealtimeState } from "./autolab-3d/state/useAutolab3DState";
import {
  detectObjects,
  disposeDetector,
  watchDetector,
  type Analysis,
} from "@/lib/detection";
import ComputerCamera from "./computer-camera";
const OnboardingWizard = dynamic(
  () => import("./autolab-3d/onboarding/OnboardingWizard"),
  { ssr: false },
);

type Photo = {
  id: string;
  url: string;
  width: number;
  height: number;
  captured_at: string;
  analysis?: Analysis;
  bytes?: number;
  cloudImage?: boolean;
};
type Device = { id: string; name: string };
type Frame = {
  url: string;
  width: number;
  height: number;
  id: string;
  analysis?: Analysis;
};
const defaultGateway =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "ws://localhost:8000";
const validId =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function View({
  frame,
  overlays = true,
}: {
  frame: Frame;
  overlays?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = frame.width;
    c.height = frame.height;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!overlays || !frame.analysis) return;
    const scale = Math.max(1, c.width / 640);
    ctx.lineWidth = 2 * scale;
    ctx.font = `${12 * scale}px sans-serif`;
    for (const d of frame.analysis.detections) {
      ctx.strokeStyle = "#b9f08b";
      ctx.fillStyle = "rgba(185,240,139,.12)";
      if (d.polygon?.length) {
        ctx.beginPath();
        d.polygon.forEach(([x, y], i) =>
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      const [x1, y1, x2, y2] = d.bbox;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      const label = `${d.label} ${Math.round(d.confidence * 100)}%`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = "#b9f08b";
      ctx.fillRect(
        x1,
        Math.max(0, y1 - 20 * scale),
        tw + 12 * scale,
        20 * scale,
      );
      ctx.fillStyle = "#172511";
      ctx.fillText(label, x1 + 6 * scale, Math.max(14 * scale, y1 - 6 * scale));
    }
  }, [frame, overlays]);
  return (
    <div
      className="image-stage"
      style={
        { "--image-ratio": frame.width / frame.height } as React.CSSProperties
      }
    >
      <img src={frame.url} alt="Autolab camera capture" />
      <canvas ref={canvas} aria-label="Detection and segmentation overlay" />
    </div>
  );
}
export default function Dashboard() {
  const router = useRouter(),
    pathname = usePathname();
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTabState] = useState("Components"),
    [gateway, setGateway] = useState(defaultGateway),
    [gatewayInput, setGatewayInput] = useState(defaultGateway);
  const [devices, setDevices] = useState<Device[]>([]),
    [device, setDevice] = useState<Device | null>(null),
    [connectOpen, setConnectOpen] = useState(false);
  const [connection, setConnection] = useState("Disconnected"),
    [status, setStatus] = useState<
      DeviceRealtimeState & { worker_online: boolean }
    >({
      online: false,
      camera_online: false,
      worker_online: false,
      simulated: false,
      last_seen: null as string | null,
    });
  const [preview, setPreview] = useState(false),
    [ml, setMl] = useState(false),
    [frame, setFrame] = useState<Frame | null>(null),
    [analyzedFrame, setAnalyzedFrame] = useState<Frame | null>(null),
    [photos, setPhotos] = useState<Photo[]>([]),
    [selected, setSelected] = useState<Photo | null>(null),
    [overlay, setOverlay] = useState(true);
  const [detectorStatus, setDetectorStatus] = useState("Not loaded"),
    [cameraSource, setCameraSource] = useState<"pi" | "computer">("pi");
  const latestFrame = useRef<Frame | null>(null);
  const imageGeneration = useRef(0);
  useEffect(() => {
    latestFrame.current = frame;
  }, [frame]);
  useEffect(() => watchDetector(setDetectorStatus), []);
  useEffect(
    () => () => {
      imageGeneration.current++;
      disposeDetector();
    },
    [],
  );
  const [capturing, setCapturing] = useState(false),
    [analyzing, setAnalyzing] = useState<string[]>([]),
    [notice, setNotice] = useState(""),
    [events, setEvents] = useState<{ text: string; time: string }[]>([]),
    [retry, setRetry] = useState(0);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [session, setSession] = useState(false),
    [authReady, setAuthReady] = useState(!cloudEnabled),
    [busy, setBusy] = useState(false);
  const ws = useRef<WebSocket | null>(null),
    urls = useRef(new Set<string>()),
    frames = useRef(new Map<string, Frame>()),
    captureTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    mlRef = useRef(false),
    previewRef = useRef(false);
  function setTab(next: string) {
    setTabState(next);
    if (next === "Components" && device)
      router.push(`/autolab/${device.id}/components`, { scroll: false });
    else if (pathname.endsWith("/components"))
      router.push("/", { scroll: false });
  }
  useEffect(() => {
    const match = pathname.match(/^\/autolab\/([0-9a-f-]{36})\/components$/i);
    if (match && validId.test(match[1])) {
      setTabState("Components");
      setDevice((old) =>
        old?.id === match[1] ? old : { id: match[1], name: "Autolab" },
      );
    }
  }, [pathname]);
  const addEvent = useCallback((text: string) => {
    setEvents((v) =>
      [{ text, time: new Date().toLocaleTimeString() }, ...v].slice(0, 30),
    );
  }, []);
  const error = useCallback(
    (message: string) => {
      setNotice(message);
      addEvent(message);
    },
    [addEvent],
  );
  const makeUrl = useCallback((blob: Blob) => {
    const u = URL.createObjectURL(blob);
    urls.current.add(u);
    return u;
  }, []);
  const revoke = useCallback((url: string) => {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
      urls.current.delete(url);
    }
  }, []);
  useEffect(
    () => () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!cloudEnabled) return;
    try {
      const c = supabase();
      c.auth.getSession().then(({ data }) => {
        setSession(!!data.session);
        setAuthReady(true);
      });
      const { data } = c.auth.onAuthStateChange((_event, s) => {
        setSession(!!s);
        if (!s) {
          setDevice(null);
          setDevices([]);
          setPhotos([]);
          setSelected(null);
          setEvents([]);
          urls.current.forEach((u) => URL.revokeObjectURL(u));
          urls.current.clear();
        }
      });
      return () => data.subscription.unsubscribe();
    } catch (e) {
      error(String(e));
      setAuthReady(true);
    }
  }, [error]);
  useEffect(() => {
    if (!cloudEnabled || !session) return;
    api(gateway, "/devices")
      .then(setDevices)
      .catch((e) => error(e.message));
  }, [session, gateway, error]);
  const loadPhotos = useCallback(
    async (id: string, offset = 0) => {
      if (!cloudEnabled) return;
      const rows = await api(gateway, `/devices/${id}/images?offset=${offset}`);
      setHasMore(rows.length === 25);
      const mapped = rows.map((r: Record<string, unknown>) => ({
        ...r,
        id: r.id,
        cloudImage: true,
        analysis: (r.image_analysis as { result_json: Analysis }[])?.at(-1)
          ?.result_json,
      }));
      setPhotos((old) =>
        offset
          ? [
              ...old,
              ...mapped.filter((p: Photo) => !old.some((x) => x.id === p.id)),
            ]
          : mapped,
      );
    },
    [gateway],
  );
  useEffect(() => {
    if (!device || (cloudEnabled && !session)) return;
    let stopped = false,
      reconnect: ReturnType<typeof setTimeout>,
      delay = 1000;
    const deviceId = device.id;
    imageGeneration.current++;
    setPhotos([]);
    setSelected(null);
    setFrame(null);
    setAnalyzedFrame((old) => {
      if (old) revoke(old.url);
      return null;
    });
    setPreview(false);
    setMl(false);
    previewRef.current = false;
    mlRef.current = false;
    setCapturing(false);
    setAnalyzing([]);
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current.clear();
    frames.current.clear();
    loadPhotos(deviceId).catch((e) => error(e.message));
    async function open() {
      if (stopped) return;
      setConnection("Connecting");
      try {
        const access = await token();
        if (stopped) return;
        const socket = new WebSocket(
          `${gateway.replace(/\/$/, "")}/ws/client/${deviceId}`,
        );
        socket.binaryType = "arraybuffer";
        ws.current = socket;
        socket.onopen = () =>
          socket.send(JSON.stringify({ type: "hello", token: access }));
        socket.onmessage = (event) => {
          if (stopped) return;
          try {
            if (event.data instanceof ArrayBuffer) {
              const data = event.data;
              if (data.byteLength < 5) return;
              const len = new DataView(data).getUint32(0);
              if (len > 8192 || len + 4 >= data.byteLength) return;
              const h = JSON.parse(
                new TextDecoder().decode(data.slice(4, len + 4)),
              );
              const blob = new Blob([data.slice(len + 4)], {
                type: "image/jpeg",
              });
              const url = makeUrl(blob);
              if (h.type === "frame") {
                const f = {
                  url,
                  width: h.width,
                  height: h.height,
                  id: h.frame_id,
                };
                frames.current.set(h.frame_id, f);
                while (frames.current.size > 16) {
                  const key = frames.current.keys().next().value!;
                  const old = frames.current.get(key)!;
                  frames.current.delete(key);
                  revoke(old.url);
                }
                setFrame(f);
              } else if (h.type === "capture") {
                const photo = {
                  id: h.image_id,
                  url,
                  width: h.width,
                  height: h.height,
                  captured_at: h.captured_at,
                  bytes: blob.size,
                  cloudImage: cloudEnabled,
                };
                setPhotos((list) => {
                  const next = [
                    photo,
                    ...list.filter((p) => p.id !== photo.id),
                  ];
                  let bytes = next.reduce((n, p) => n + (p.bytes || 0), 0);
                  while (
                    !cloudEnabled &&
                    (next.length > 40 || bytes > 100 * 1024 * 1024)
                  ) {
                    const old = next.pop()!;
                    bytes -= old.bytes || 0;
                    revoke(old.url);
                  }
                  return next;
                });
                setCapturing(false);
                if (captureTimer.current) clearTimeout(captureTimer.current);
                addEvent("Photo captured");
              } else revoke(url);
              return;
            }
            const m = JSON.parse(event.data);
            if (m.type === "ready") {
              if (m.mode !== (cloudEnabled ? "cloud" : "demo")) {
                error("Web app and gateway modes do not match");
                socket.close();
                return;
              }
              setConnection("Connected");
              delay = 1000;
              addEvent("Gateway connected");
              if (previewRef.current)
                socket.send(JSON.stringify({ type: "start_preview" }));
            }
            if (m.type === "status") {
              setStatus(m);
              if (!m.online) {
                setFrame(null);
                setAnalyzedFrame((old) => {
                  if (old) revoke(old.url);
                  return null;
                });
              }
            }
            if (m.type === "preview") setPreview(m.active);
            if (m.type === "error") {
              error(m.message);
              setCapturing(false);
              setAnalyzing([]);
            }
            if (m.type === "analysis") {
              if (m.image_id) {
                setPhotos((list) =>
                  list.map((p) =>
                    p.id === m.image_id ? { ...p, analysis: m } : p,
                  ),
                );
                setSelected((p) =>
                  p && p.id === m.image_id ? { ...p, analysis: m } : p,
                );
                setAnalyzing((v) => v.filter((id) => id !== m.image_id));
                addEvent("Image analysis complete");
              } else {
                const f = frames.current.get(m.frame_id);
                if (f) {
                  fetch(f.url)
                    .then((r) => r.blob())
                    .then((b) => {
                      if (stopped || !mlRef.current) return;
                      const copy = makeUrl(b);
                      setAnalyzedFrame((old) => {
                        if (old) revoke(old.url);
                        return { ...f, url: copy, analysis: m };
                      });
                    })
                    .catch(() => {});
                }
              }
            }
          } catch {
            error("Received an invalid gateway message");
          }
        };
        socket.onerror = () => setConnection("Reconnecting");
        socket.onclose = () => {
          if (stopped) return;
          setConnection("Reconnecting");
          setStatus((s) => ({
            ...s,
            online: false,
            camera_online: false,
            worker_online: false,
            components: [],
          }));
          setFrame(null);
          setAnalyzedFrame((old) => {
            if (old) revoke(old.url);
            return null;
          });
          setCapturing(false);
          reconnect = setTimeout(open, delay);
          delay = Math.min(delay * 2, 30000);
        };
      } catch (e) {
        error(String(e));
        reconnect = setTimeout(open, 5000);
      }
    }
    open();
    return () => {
      stopped = true;
      clearTimeout(reconnect);
      ws.current?.close();
      if (captureTimer.current) clearTimeout(captureTimer.current);
    };
  }, [
    device?.id,
    gateway,
    session,
    retry,
    addEvent,
    error,
    loadPhotos,
    makeUrl,
    revoke,
  ]);
  useEffect(() => {
    if (!ml || !preview) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      lastId = "";
    async function tick() {
      const f = latestFrame.current;
      if (f && f.id !== lastId) {
        lastId = f.id;
        try {
          const response = await fetch(f.url);
          if (!response.ok) throw new Error("Could not read camera frame");
          const blob = await response.blob();
          const analysis = await detectObjects(blob);
          if (stopped) return;
          const copy = makeUrl(blob);
          setAnalyzedFrame((old) => {
            if (old) revoke(old.url);
            return { ...f, url: copy, analysis };
          });
        } catch (e) {
          if (!stopped) {
            error(String(e));
            setMl(false);
            mlRef.current = false;
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
  }, [ml, preview, device?.id, makeUrl, revoke, error]);
  function send(type: string, extra: Record<string, unknown> = {}) {
    if (ws.current?.readyState !== WebSocket.OPEN) {
      error("Connect to the gateway first");
      return false;
    }
    ws.current.send(
      JSON.stringify({ type, request_id: crypto.randomUUID(), ...extra }),
    );
    return true;
  }
  function capture() {
    if (send("capture_photo")) {
      setCapturing(true);
      captureTimer.current = setTimeout(() => {
        setCapturing(false);
        error("Capture timed out. Check the Pi agent.");
      }, 65000);
    }
  }
  function togglePreview() {
    const value = !preview;
    if (send(value ? "start_preview" : "stop_preview")) {
      previewRef.current = value;
      setPreview(value);
      if (!value) {
        mlRef.current = false;
        setMl(false);
      }
    }
  }
  function toggleMl() {
    const value = !ml;
    mlRef.current = value;
    setMl(value);
    if (!value)
      setAnalyzedFrame((old) => {
        if (old) revoke(old.url);
        return null;
      });
  }
  async function connectDevice(id: string, name: string) {
    setStatus({
      online: false,
      camera_online: false,
      worker_online: false,
      simulated: false,
      last_seen: null,
    });
    const d = { id, name: name.trim() || "My Autolab" };
    setDevices((v) => [...v.filter((x) => x.id !== id), d]);
    setDevice(d);
    setTab("Components");
  }
  async function analyze(p: Photo) {
    // Cloud captures retain the gateway's authenticated, durable analysis path.
    if (cloudEnabled && p.cloudImage) {
      try {
        if (!status.worker_online)
          throw new Error("Connect your cloud ML worker to save an analysis");
        const response = await fetch(p.url);
        if (!response.ok) throw new Error("Could not read image");
        const bytes = await response.arrayBuffer();
        const header = new TextEncoder().encode(
          JSON.stringify({ type: "analyze", image_id: p.id }),
        );
        const packet = new Uint8Array(4 + header.length + bytes.byteLength);
        new DataView(packet.buffer).setUint32(0, header.length);
        packet.set(header, 4);
        packet.set(new Uint8Array(bytes), 4 + header.length);
        if (ws.current?.readyState !== 1)
          throw new Error("Gateway disconnected");
        ws.current.send(packet);
        setAnalyzing((v) => [...v, p.id]);
      } catch (e) {
        error(String(e));
      }
      return;
    }
    const generation = imageGeneration.current;
    setAnalyzing((v) => [...v, p.id]);
    try {
      const response = await fetch(p.url);
      if (!response.ok) throw new Error("Could not read image");
      const analysis = await detectObjects(await response.blob());
      if (generation !== imageGeneration.current) return;
      setPhotos((list) =>
        list.map((photo) =>
          photo.id === p.id ? { ...photo, analysis } : photo,
        ),
      );
      setSelected((photo) =>
        photo?.id === p.id ? { ...photo, analysis } : photo,
      );
    } catch (e) {
      if (generation === imageGeneration.current) error(String(e));
    } finally {
      if (generation === imageGeneration.current)
        setAnalyzing((v) => v.filter((id) => id !== p.id));
    }
  }
  async function saveComputerCapture(blob: Blob, analysis?: Analysis) {
    const generation = imageGeneration.current;
    const bitmap = await createImageBitmap(blob);
    if (generation !== imageGeneration.current) {
      bitmap.close();
      return;
    }
    const photo: Photo = {
      id: crypto.randomUUID(),
      url: makeUrl(blob),
      width: bitmap.width,
      height: bitmap.height,
      captured_at: new Date().toISOString(),
      bytes: blob.size,
      analysis,
    };
    bitmap.close();
    setPhotos((list) => {
      const next = [photo, ...list];
      let bytes = next.reduce((n, p) => n + (p.bytes || 0), 0);
      while (next.length > 40 || bytes > 100 * 1024 * 1024) {
        const old = next.pop()!;
        bytes -= old.bytes || 0;
        revoke(old.url);
      }
      return next;
    });
  }
  async function download(p: Photo) {
    try {
      const response = await fetch(p.url);
      if (!response.ok)
        throw new Error(
          "Download failed. Refresh the cloud library and try again.",
        );
      const url = makeUrl(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `autolab-${p.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => revoke(url), 1000);
    } catch (e) {
      error(String(e));
    }
  }
  async function remove(p: Photo) {
    if (!confirm("Delete this photo and its analysis?")) return;
    try {
      if (cloudEnabled && p.cloudImage)
        await api(gateway, `/images/${p.id}`, "DELETE");
      setPhotos((v) => v.filter((x) => x.id !== p.id));
      setSelected(null);
      revoke(p.url);
      addEvent("Photo deleted");
    } catch (e) {
      error(String(e));
    }
  }
  async function auth(signup: boolean) {
    setBusy(true);
    try {
      const c = supabase();
      const { error: err } = signup
        ? await c.auth.signUp({ email, password })
        : await c.auth.signInWithPassword({ email, password });
      if (err) throw err;
      if (signup)
        setNotice("Account created. Check your email to confirm your account.");
    } catch (e) {
      error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function rename() {
    if (!device) return;
    const name = prompt("Device name", device.name)?.trim();
    if (!name) return;
    try {
      if (cloudEnabled)
        await api(gateway, `/devices/${device.id}`, "PATCH", { name });
      setDevices((v) =>
        v.map((d) => (d.id === device.id ? { ...d, name } : d)),
      );
      setDevice({ ...device, name });
    } catch (e) {
      error(String(e));
    }
  }
  const displayFrame = ml && analyzedFrame ? analyzedFrame : frame;
  const photoCard = (p: Photo) => (
    <article className="photo-card" key={p.id}>
      <button
        className="photo-thumb"
        onClick={() => {
          setSelected(p);
          setOverlay(true);
        }}
      >
        <img
          src={p.url}
          alt={`Captured ${new Date(p.captured_at).toLocaleString()}`}
        />
        {p.analysis && (
          <span className="image-badge">
            <Check size={12} /> Analyzed
          </span>
        )}
      </button>
      <div className="photo-info">
        <strong>
          {new Date(p.captured_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </strong>
        <span>
          {p.width} × {p.height}
        </span>
      </div>
      <div className="photo-bottom">
        <span>{new Date(p.captured_at).toLocaleDateString()}</span>
        <button
          className="icon-button"
          aria-label="Delete photo"
          onClick={() => remove(p)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
  if (cloudEnabled && (!authReady || !session))
    return (
      <main className="auth-page">
        <form
          className="panel auth-card"
          onSubmit={(e) => {
            e.preventDefault();
            auth(false);
          }}
        >
          <div className="brand">Autolab</div>
          <h1>Sign in</h1>
          <p>Sign in to access your devices and image library.</p>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <button className="primary" disabled={busy || !authReady}>
            Sign in
          </button>
          <button type="button" onClick={() => auth(true)} disabled={busy}>
            Create an account
          </button>
          {notice && <p role="alert">{notice}</p>}
        </form>
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="app-name" href="/">
          Autolab
        </a>
        <nav>
          {[
            { name: "Components", icon: Boxes },
            { name: "Live camera", icon: Camera },
            { name: "Image library", icon: FolderOpen },
            { name: "ML analysis", icon: Cpu },
          ].map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => setTab(name)}
            >
              <Icon size={18} />
              {name}
              {name === "Image library" && (
                <span className="count">{photos.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-label device-label">
          DEVICES
          <button
            aria-label="Add device"
            className="icon-button"
            onClick={() => setConnectOpen(true)}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="device-list">
          {devices.length ? (
            devices.map((d) => (
              <button
                key={d.id}
                className={device?.id === d.id ? "selected-device" : ""}
                onClick={() => setDevice(d)}
              >
                <span
                  className={`dot ${device?.id === d.id && status.online ? "green" : ""}`}
                />
                <span>{d.name}</span>
              </button>
            ))
          ) : (
            <button onClick={() => setConnectOpen(true)}>
              <Plus size={16} />
              Connect your first device
            </button>
          )}
        </div>
        <div className="sidebar-bottom">
          <button
            className={tab === "Settings" ? "active" : ""}
            onClick={() => setTab("Settings")}
          >
            <Settings size={18} />
            Settings
          </button>
          <button onClick={() => setTab("Setup guide")}>
            <CircleHelp size={18} />
            Setup guide
            <ArrowUpRight size={14} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <main className="content">
          <div className="page-heading">
            <div className="heading-line">
              <div>
                <h1>{tab === "Overview" ? "Autolab" : tab}</h1>
                <p>
                  {tab === "Overview"
                    ? device?.name || "Connect a device to start a session."
                    : tab === "Image library"
                      ? ""
                      : tab === "ML analysis"
                        ? "Object detection"
                        : tab === "Live camera"
                          ? "Camera preview and capture."
                          : tab === "Components"
                            ? "Select a part to inspect it."
                            : "Device settings and setup."}
                </p>
              </div>
              <button className="primary" onClick={() => setConnectOpen(true)}>
                <Plus size={16} />
                Connect device
              </button>
            </div>
          </div>
          {(tab === "Overview" || tab === "Components") && (
            <DigitalTwin
              deviceId={device?.id}
              status={status}
              connection={connection}
              preview={preview}
              lastCapture={photos[0]?.captured_at}
              capturing={capturing}
              onCapture={capture}
              onLive={() => {
                setMl(true);
                mlRef.current = true;
                if (!preview && status.camera_online) {
                  send("start_preview");
                  setPreview(true);
                  previewRef.current = true;
                }
              }}
              onSettings={() => setTab("Settings")}
              full={tab === "Components"}
              livePanel={
                displayFrame && preview ? (
                  <>
                    <View frame={displayFrame} />
                    <div className="camera-actions">
                      <button aria-pressed={ml} onClick={toggleMl}>
                        Detect objects
                      </button>
                      <span aria-live="polite">{ml ? detectorStatus : ""}</span>
                    </div>
                  </>
                ) : (
                  <div className="twin-preview-empty">
                    {status.camera_online
                      ? "Waiting for camera frames…"
                      : "Camera is offline"}
                  </div>
                )
              }
            />
          )}
          {tab === "Live camera" && (
            <div className="camera-source">
              <button
                aria-pressed={cameraSource === "pi"}
                onClick={() => setCameraSource("pi")}
              >
                Autolab camera
              </button>
              <button
                aria-pressed={cameraSource === "computer"}
                onClick={() => setCameraSource("computer")}
              >
                Computer camera
              </button>
            </div>
          )}
          {tab === "Live camera" && cameraSource === "computer" && (
            <ComputerCamera
              onCapture={saveComputerCapture}
              renderFrame={(f) => <View frame={f} />}
            />
          )}
          {(tab === "Overview" ||
            (tab === "Live camera" && cameraSource === "pi")) && (
            <>
              <div className="stats-grid">
                <div className="stat">
                  <span>
                    Device connection
                    <Wifi size={16} />
                  </span>
                  <strong>
                    <i className={`dot ${status.online ? "green" : ""}`} />
                    {status.online ? "Online" : "Not connected"}
                  </strong>
                  <small>
                    {device ? device.name : "Connect a Raspberry Pi to begin"}
                  </small>
                </div>
                <div className="stat">
                  <span>
                    Camera status
                    <Camera size={16} />
                  </span>
                  <strong>
                    {status.camera_online
                      ? "Ready to capture"
                      : "Awaiting camera"}
                  </strong>
                  <small>
                    {status.simulated
                      ? "Simulator, no physical camera"
                      : status.camera_online
                        ? "Picamera2 camera detected"
                        : "Camera status appears when connected"}
                  </small>
                </div>
                <div className="stat">
                  <span>
                    Session captures
                    <FolderOpen size={16} />
                  </span>
                  <strong>
                    {String(photos.length).padStart(2, "0")}
                    <em>images</em>
                  </strong>
                </div>
                <div className="stat">
                  <span>
                    Object detection
                    <Cpu size={16} />
                  </span>
                  <strong>
                    <i
                      className={`dot ${detectorStatus.startsWith("Ready") ? "green" : ""}`}
                    />
                    {detectorStatus}
                  </strong>
                  <small>Optional local inference</small>
                </div>
              </div>
              <div
                className={`camera-layout ${tab === "Overview" ? "camera-overview" : ""}`}
              >
                <section className="panel camera-panel">
                  <div className="panel-heading">
                    <div>
                      <Camera size={17} />
                      <strong>Live camera</strong>
                      <span className="muted">
                        {device?.name || "No device selected"}
                      </span>
                    </div>
                    <span className="tiny-label">
                      {preview && status.online ? "LIVE PREVIEW" : "STANDBY"}
                    </span>
                  </div>
                  <div className="camera-viewport">
                    {displayFrame && preview ? (
                      <View frame={displayFrame} />
                    ) : (
                      <div className="camera-empty">
                        <div className="camera-empty-icon">
                          <Camera size={32} strokeWidth={1.3} />
                        </div>
                        <h3>
                          {status.online
                            ? "Your camera is ready"
                            : "A window into your lab"}
                        </h3>
                        <p>
                          {status.online
                            ? "Start preview to see the live camera feed."
                            : "Connect your Raspberry Pi to start a live preview and capture your first image."}
                        </p>
                        <button
                          onClick={() =>
                            status.online
                              ? togglePreview()
                              : setConnectOpen(true)
                          }
                        >
                          {status.online ? (
                            <Play size={15} />
                          ) : (
                            <Plus size={15} />
                          )}{" "}
                          {status.online ? "Start preview" : "Connect a device"}
                        </button>
                      </div>
                    )}
                    <div className="viewport-tag">
                      <span
                        className={`dot ${preview && status.online ? "green" : ""}`}
                      />
                      {status.simulated
                        ? "SIMULATED CAMERA"
                        : preview
                          ? "LIVE CAMERA"
                          : "CAMERA OFFLINE"}
                    </div>
                    {preview && (
                      <span className="resolution-tag">640 × 480 / ~4 FPS</span>
                    )}
                  </div>
                  <div className="camera-actions">
                    <button
                      className="primary"
                      disabled={!status.camera_online || capturing}
                      onClick={capture}
                    >
                      {capturing ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Camera size={16} />
                      )}{" "}
                      {capturing ? "Capturing…" : "Take photo"}
                    </button>
                    <button
                      disabled={!status.camera_online}
                      onClick={togglePreview}
                    >
                      {preview ? <Pause size={15} /> : <Play size={15} />}{" "}
                      {preview ? "Stop preview" : "Start preview"}
                    </button>
                    <div className="live-ml">
                      <Cpu size={16} />
                      <span>Detect objects</span>
                      <button
                        className={`toggle ${ml ? "on" : ""}`}
                        role="switch"
                        aria-checked={ml}
                        aria-label="Detect objects"
                        onClick={toggleMl}
                        disabled={!preview}
                      >
                        <i />
                      </button>
                    </div>
                  </div>
                </section>
                {tab === "Live camera" && (
                  <aside className="right-panels">
                    <section className="panel device-panel">
                      <div className="panel-heading">
                        <strong>Device details</strong>
                        <Activity size={16} />
                      </div>
                      <div className="hardware-icon">
                        <Cpu size={30} />
                      </div>
                      <h3>{device?.name || "No device connected"}</h3>
                      <p>
                        {status.simulated
                          ? "Software camera simulator"
                          : "Raspberry Pi 4 Model B"}
                      </p>
                      <dl>
                        <div>
                          <dt>Gateway</dt>
                          <dd>{connection}</dd>
                        </div>
                        <div>
                          <dt>Camera</dt>
                          <dd>
                            {status.camera_online ? "Online" : "Unavailable"}
                          </dd>
                        </div>
                        <div>
                          <dt>Last heartbeat</dt>
                          <dd>
                            {status.last_seen
                              ? new Date(status.last_seen).toLocaleTimeString()
                              : "Waiting"}
                          </dd>
                        </div>
                      </dl>
                      <button
                        className="full"
                        onClick={() =>
                          device ? rename() : setConnectOpen(true)
                        }
                      >
                        {device ? "Rename device" : "Set up device"}
                        <ArrowUpRight size={14} />
                      </button>
                    </section>
                    <section className="panel activity-panel">
                      <div className="panel-heading">
                        <strong>Activity</strong>
                        <span className="dot blue" />
                      </div>
                      {events.length ? (
                        events.slice(0, 3).map((e, i) => (
                          <div className="event" key={i}>
                            <span className="dot" />
                            <div>
                              {e.text}
                              <small>{e.time}</small>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="quiet">
                          <Activity size={21} />
                          <p>
                            Your workspace is ready.
                            <br />
                            Device activity will appear here.
                          </p>
                        </div>
                      )}
                    </section>
                  </aside>
                )}
              </div>
              {tab === "Overview" && (
                <section className="recent">
                  <div className="section-heading">
                    <h2>
                      Recent captures <span>{photos.length}</span>
                    </h2>
                    <button onClick={() => setTab("Image library")}>
                      View library
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {photos.length ? (
                    <div className="photo-grid">
                      {photos.slice(0, 4).map(photoCard)}
                    </div>
                  ) : (
                    <div className="empty-library">
                      <FolderOpen size={24} />
                      <div>
                        <strong>Your first capture starts here</strong>
                        <p>
                          Take a photo from your connected camera. It will
                          appear in this library.
                        </p>
                      </div>
                      <button
                        disabled={!status.camera_online || capturing}
                        onClick={capture}
                      >
                        <Camera size={15} />
                        Take photo
                      </button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
          {tab === "Image library" && (
            <>
              {cloudEnabled && device && (
                <button
                  onClick={() =>
                    loadPhotos(device.id).catch((e) => error(e.message))
                  }
                >
                  <RefreshCw size={15} />
                  Refresh cloud library
                </button>
              )}
              <div className="section-heading">
                <h2>
                  All captures <span>{photos.length}</span>
                </h2>
                {cloudEnabled && <span className="muted">Private storage</span>}
              </div>
              {photos.length ? (
                <div className="photo-grid">{photos.map(photoCard)}</div>
              ) : (
                <div className="empty-state">
                  <FolderOpen size={38} />
                  <h2>No captures yet</h2>
                  <p>Open the live camera and take your first photo.</p>
                  <button onClick={() => setTab("Live camera")}>
                    Open camera
                  </button>
                </div>
              )}
            </>
          )}
          {tab === "Image library" && cloudEnabled && hasMore && device && (
            <button
              onClick={() =>
                loadPhotos(device.id, photos.length).catch((e) =>
                  error(e.message),
                )
              }
            >
              Load older images
            </button>
          )}
          {tab === "ML analysis" && (
            <>
              <section className="panel guide">
                <h2>Object detection</h2>
                <p>Select a photo to detect objects, or open your camera.</p>
                <button
                  onClick={() => {
                    setCameraSource("computer");
                    setTab("Live camera");
                  }}
                >
                  Open computer camera
                </button>
                <span className="detector-status" aria-live="polite">
                  {detectorStatus}
                </span>
              </section>
              <div className="photo-grid">{photos.map(photoCard)}</div>
            </>
          )}
          {tab === "Settings" && (
            <section className="panel guide">
              <h2>Connection settings</h2>
              <p>
                Use your deployed gateway’s secure WebSocket URL. The gateway
                and web app must run in the same mode.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    const u = new URL(gatewayInput);
                    if (
                      u.protocol !== "wss:" &&
                      !(
                        u.protocol === "ws:" &&
                        ["localhost", "127.0.0.1"].includes(u.hostname)
                      )
                    )
                      throw new Error("Use wss:// for a remote gateway");
                    setGateway(gatewayInput.replace(/\/$/, ""));
                    setRetry((v) => v + 1);
                    setNotice("Gateway updated");
                  } catch (e) {
                    error(String(e));
                  }
                }}
              >
                <label>
                  Gateway URL
                  <input
                    value={gatewayInput}
                    onChange={(e) => setGatewayInput(e.target.value)}
                    placeholder="wss://your-gateway.example.com"
                  />
                </label>
                <button className="primary">Apply connection settings</button>
              </form>
              {cloudEnabled && (
                <button onClick={() => supabase().auth.signOut()}>
                  Sign out
                </button>
              )}
            </section>
          )}
          {tab === "Setup guide" && (
            <section className="panel guide">
              <h2>Connect your Autolab</h2>
              <p>
                The Pi makes an outbound connection to the gateway. No Bluetooth
                or inbound port forwarding is needed.
              </p>
              <h3>1. Start the gateway</h3>
              <pre>
                {
                  "cd services/gateway\npython -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt\nuvicorn main:app --host 0.0.0.0 --port 8000"
                }
              </pre>
              <h3>2. Run the Raspberry Pi agent</h3>
              <p>
                Install Raspberry Pi OS camera packages first. Full hardware and
                systemd instructions are in the repository README.
              </p>
              <pre>{`cd devices/raspberry-pi\npython3 -m venv --system-site-packages .venv\nsource .venv/bin/activate\npip install -r requirements.txt\npython -m autolab_agent.main --gateway ${gateway}`}</pre>
              <h3>3. Connect this browser</h3>
              <p>
                {cloudEnabled
                  ? "Enter the six-digit pairing code printed by the agent."
                  : "Copy the Device ID printed by the agent and paste it into Connect device."}
              </p>
              <button className="primary" onClick={() => setConnectOpen(true)}>
                <Plus size={16} />
                Connect device
              </button>
              <h3>Try it without a Pi</h3>
              <p>
                Add <code>--simulate</code> to the agent command to stream
                clearly labeled synthetic images.
              </p>
            </section>
          )}
        </main>
      </div>
      {notice && (
        <div className="toast" role="alert">
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {connectOpen && (
        <OnboardingWizard
          gateway={gateway}
          onClose={() => setConnectOpen(false)}
          onConnect={connectDevice}
          online={status.online}
          cameraOnline={status.camera_online}
          deviceId={device?.id}
        />
      )}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="modal image-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <h2 id="photo-title">Image detail</h2>
              <button
                className="icon-button"
                aria-label="Close image"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <View
              frame={{ ...selected, analysis: selected.analysis }}
              overlays={overlay}
            />
            <div className="detail-meta">
              <span>{new Date(selected.captured_at).toLocaleString()}</span>
              <span>
                {selected.width} × {selected.height}
              </span>
            </div>
            <div className="detail-actions">
              <button
                onClick={() => setOverlay((v) => !v)}
                disabled={!selected.analysis}
              >
                {overlay ? "Hide overlay" : "Show overlay"}
              </button>
              <button
                className="primary"
                onClick={() => analyze(selected)}
                disabled={analyzing.includes(selected.id)}
              >
                <Cpu size={15} />
                {analyzing.includes(selected.id)
                  ? "Analyzing…"
                  : "Analyze image"}
              </button>
              <button onClick={() => download(selected)}>
                <Download size={15} />
                Download
              </button>
              <button className="danger" onClick={() => remove(selected)}>
                <Trash2 size={15} />
                Delete
              </button>
            </div>
            {selected.analysis && (
              <div className="analysis-detail">
                <strong>{selected.analysis.model}</strong>
                <span>{selected.analysis.detections.length} detections</span>
                {selected.analysis.detections.map((d, i) => (
                  <div key={i}>
                    {d.label}
                    <span>{Math.round(d.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
