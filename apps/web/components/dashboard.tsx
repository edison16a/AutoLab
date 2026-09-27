"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
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

type Detection = {
  label: string;
  confidence: number;
  bbox: number[];
  polygon: number[][];
};
type Analysis = {
  model: string;
  width: number;
  height: number;
  detections: Detection[];
  frame_id?: string;
};
type Photo = {
  id: string;
  url: string;
  width: number;
  height: number;
  captured_at: string;
  analysis?: Analysis;
  bytes?: number;
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
      ctx.strokeStyle = "#57a5ff";
      ctx.fillStyle = "rgba(38,132,255,.18)";
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
      ctx.fillStyle = "#2684ff";
      ctx.fillRect(
        x1,
        Math.max(0, y1 - 20 * scale),
        tw + 12 * scale,
        20 * scale,
      );
      ctx.fillStyle = "#fff";
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
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTab] = useState("Overview"),
    [gateway, setGateway] = useState(defaultGateway),
    [gatewayInput, setGatewayInput] = useState(defaultGateway);
  const [devices, setDevices] = useState<Device[]>([]),
    [device, setDevice] = useState<Device | null>(null),
    [connectOpen, setConnectOpen] = useState(false),
    [inputId, setInputId] = useState(""),
    [inputName, setInputName] = useState("Neurotech Autolab"),
    [code, setCode] = useState("");
  const [connection, setConnection] = useState("Disconnected"),
    [status, setStatus] = useState({
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
              if (mlRef.current)
                socket.send(JSON.stringify({ type: "live_ml", enabled: true }));
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
        send("live_ml", { enabled: false });
      }
    }
  }
  function toggleMl() {
    const value = !ml;
    if (send("live_ml", { enabled: value })) {
      mlRef.current = value;
      setMl(value);
      if (!value)
        setAnalyzedFrame((old) => {
          if (old) revoke(old.url);
          return null;
        });
    }
  }
  async function connectDevice(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let id = inputId.trim();
      if (cloudEnabled) {
        const r = await api(gateway, "/devices/claim", "POST", {
          code,
          name: inputName,
        });
        id = r.device_id;
      } else if (!validId.test(id))
        throw new Error("Paste the Device ID printed by your Pi agent");
      const d = { id, name: inputName.trim() || "My Autolab" };
      setDevices((v) => [...v.filter((x) => x.id !== id), d]);
      setDevice(d);
      setConnectOpen(false);
      setTab("Overview");
    } catch (e) {
      error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function analyze(p: Photo) {
    try {
      if (!status.worker_online)
        throw new Error("Connect your local ML worker first");
      const b = await (await fetch(p.url)).arrayBuffer();
      const head = new TextEncoder().encode(
        JSON.stringify({ type: "analyze", image_id: p.id }),
      );
      const packet = new Uint8Array(4 + head.length + b.byteLength);
      new DataView(packet.buffer).setUint32(0, head.length);
      packet.set(head, 4);
      packet.set(new Uint8Array(b), 4 + head.length);
      if (ws.current?.readyState !== 1) throw new Error("Gateway disconnected");
      ws.current.send(packet);
      setAnalyzing((v) => [...v, p.id]);
    } catch (e) {
      error(String(e));
    }
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
      if (cloudEnabled) await api(gateway, `/images/${p.id}`, "DELETE");
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
          <div className="brand">
            <FlaskConical /> AUTOLAB
          </div>
          <h1>Your lab, connected.</h1>
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
        <a className="brand" href="/">
          <span className="brand-icon">
            <FlaskConical size={22} />
          </span>
          AUTOLAB
        </a>
        <div className="workspace">
          <span className="workspace-icon">N</span>
          <div>
            Neurotech workspace
            <small>{cloudEnabled ? "Personal workspace" : "Public demo"}</small>
          </div>
          <span className="version">v1</span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {[
            { name: "Overview", icon: LayoutDashboard },
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
          <div className="session-card">
            <span className="dot blue" />
            <div>
              {cloudEnabled ? "Cloud workspace" : "Temporary session"}
              <small>
                {cloudEnabled
                  ? "Images saved privately"
                  : "Images clear on refresh"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span>Workspace</span>
            <span className="slash">/</span>
            {tab}
          </div>
          <div className="top-status">
            <span
              className={`dot ${connection === "Connected" ? "green" : ""}`}
            />
            {connection}
            <span className="mode-pill">
              {cloudEnabled ? "CLOUD" : "DEMO MODE"}
            </span>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div className="eyebrow">REMOTE IMAGING PLATFORM</div>
            <div className="heading-line">
              <div>
                <h1>{tab === "Overview" ? "Your lab, in view." : tab}</h1>
                <p>
                  {tab === "Overview"
                    ? "Capture, observe, and explore. All from one workspace."
                    : tab === "Image library"
                      ? "Your captures and analysis, together in one place."
                      : tab === "ML analysis"
                        ? "Connect a local worker to detect and segment objects."
                        : tab === "Live camera"
                          ? "A direct view into your connected Autolab."
                          : "Configure your workspace and connected hardware."}
                </p>
              </div>
              <button className="primary" onClick={() => setConnectOpen(true)}>
                <Plus size={16} />
                Connect device
              </button>
            </div>
          </div>
          {!cloudEnabled && (
            <div className="demo-banner">
              <Radio size={16} />
              <span>
                <strong>You’re in demo mode.</strong> Photos and analysis stay
                in this tab and disappear on refresh.
              </span>
              <button onClick={() => setTab("Setup guide")}>
                How to connect
                <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          {(tab === "Overview" || tab === "Live camera") && (
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
                  <small>
                    {cloudEnabled
                      ? "Private cloud storage"
                      : "Up to 40 images / 100 MB in memory"}
                  </small>
                </div>
                <div className="stat">
                  <span>
                    ML worker
                    <Cpu size={16} />
                  </span>
                  <strong>
                    <i
                      className={`dot ${status.worker_online ? "green" : ""}`}
                    />
                    {status.worker_online ? "Connected" : "Not connected"}
                  </strong>
                  <small>Optional local inference</small>
                </div>
              </div>
              <div className="camera-layout">
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
                      <span>Live ML</span>
                      <button
                        className={`toggle ${ml ? "on" : ""}`}
                        role="switch"
                        aria-checked={ml}
                        aria-label="Live ML"
                        onClick={toggleMl}
                        disabled={!preview || !status.worker_online}
                      >
                        <i />
                      </button>
                    </div>
                  </div>
                </section>
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
                      <div>
                        <dt>Storage</dt>
                        <dd>{cloudEnabled ? "Supabase" : "Browser memory"}</dd>
                      </div>
                    </dl>
                    <button
                      className="full"
                      onClick={() => (device ? rename() : setConnectOpen(true))}
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
                <span className="muted">
                  {cloudEnabled ? "Private storage" : "This session only"}
                </span>
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
                <Cpu size={30} />
                <h2>Bring your own compute.</h2>
                <p>
                  Run the Python ML worker on your computer. It receives images
                  through the gateway and returns bounding boxes and
                  segmentation polygons.
                </p>
                <pre>{`cd workers/ml\npython -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt\npython main.py --gateway ${gateway} --device ${device?.id || "DEVICE_ID"}`}</pre>
                <p className="muted">
                  Generic YOLO results demonstrate the pipeline. They are not
                  validated biological measurements.
                </p>
                <div className="worker-state">
                  <span
                    className={`dot ${status.worker_online ? "green" : ""}`}
                  />
                  {status.worker_online
                    ? "Worker connected. Select an image below to analyze."
                    : "Waiting for a local worker"}
                </div>
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
                    setNotice("Gateway updated for this session");
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
              <hr />
              <h3>{cloudEnabled ? "Cloud storage" : "Session storage"}</h3>
              <p>
                {cloudEnabled
                  ? "Your captures are stored in your private Supabase bucket."
                  : "No account, localStorage, IndexedDB, or database is used. Refreshing clears this session. Download photos you want to keep."}
              </p>
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
                  : "Copy the Device ID printed by the agent and paste it into Connect device. Anyone with that ID can view and control the demo camera."}
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
          <footer>
            <FlaskConical size={13} />
            <span>AUTOLAB</span>
            <span>Built for exploration.</span>
            <span className="footer-right">
              {cloudEnabled ? "Private workspace" : "Session-only imaging"}
            </span>
          </footer>
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
        <div className="modal-backdrop" onClick={() => setConnectOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={() => setConnectOpen(false)}
            >
              <X />
            </button>
            <div className="modal-icon">
              <Wifi size={25} />
            </div>
            <h2 id="connect-title">Connect your Autolab</h2>
            <p>
              {cloudEnabled
                ? "Enter the pairing code shown on your Raspberry Pi."
                : "Run the Pi agent, then paste its Device ID below. This public demo does not require an account."}
            </p>
            <form onSubmit={connectDevice}>
              <label>
                Device name
                <input
                  autoFocus
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  required
                  maxLength={80}
                />
              </label>
              {cloudEnabled ? (
                <label>
                  Six-digit pairing code
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    pattern="[0-9]{6}"
                    inputMode="numeric"
                    maxLength={6}
                    required
                  />
                </label>
              ) : (
                <label>
                  Device ID
                  <input
                    value={inputId}
                    onChange={(e) => setInputId(e.target.value)}
                    placeholder="Paste the UUID from your agent"
                    required
                  />
                </label>
              )}
              <div className="connection-note">
                <span className="dot blue" />
                {gateway}
              </div>
              <button className="primary full" disabled={busy}>
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Plus size={16} />
                )}
                Connect device
              </button>
            </form>
          </section>
        </div>
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
                disabled={
                  !status.worker_online || analyzing.includes(selected.id)
                }
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
