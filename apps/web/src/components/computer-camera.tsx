"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { detectObjects, watchDetector, type Analysis } from "@/lib/detection";

type Snapshot = {
  url: string;
  id: string;
  width: number;
  height: number;
  analysis?: Analysis;
};
export default function ComputerCamera({
  onCapture,
  renderFrame,
}: {
  onCapture: (blob: Blob, analysis?: Analysis) => Promise<void>;
  renderFrame: (frame: Snapshot) => ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null);
  const epoch = useRef(0),
    alive = useRef(true),
    url = useRef<string | null>(null);
  const [running, setRunning] = useState(false),
    [starting, setStarting] = useState(false),
    [detecting, setDetecting] = useState(true);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [status, setStatus] = useState("Not loaded"),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  useEffect(() => watchDetector(setStatus), []);
  function clearSnapshot() {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setSnapshot(null);
  }
  function stop() {
    epoch.current++;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setRunning(false);
    setStarting(false);
    clearSnapshot();
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      epoch.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  async function start() {
    const generation = ++epoch.current;
    setStarting(true);
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera access requires HTTPS and a supported browser.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!alive.current || generation !== epoch.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      video.current!.srcObject = media;
      await video.current!.play();
      if (alive.current && generation === epoch.current) setRunning(true);
    } catch (e) {
      if (alive.current && generation === epoch.current) {
        stream.current?.getTracks().forEach((t) => t.stop());
        stream.current = null;
        setError(e instanceof Error ? e.message : "Could not open camera");
      }
    } finally {
      if (alive.current && generation === epoch.current) setStarting(false);
    }
  }
  async function image() {
    const v = video.current;
    if (!v || v.readyState < 2) throw new Error("Waiting for a camera frame");
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Capture failed"))),
        "image/jpeg",
        0.9,
      ),
    );
  }
  useEffect(() => {
    if (!running || !detecting) return;
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try {
        const blob = await image();
        const analysis = await detectObjects(blob);
        if (cancelled) return;
        const next = URL.createObjectURL(blob);
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = next;
        setSnapshot({
          url: next,
          id: crypto.randomUUID(),
          width: analysis.width,
          height: analysis.height,
          analysis,
        });
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setDetecting(false);
        }
        return;
      }
      if (!cancelled) timer = setTimeout(tick, 100);
    }
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [running, detecting]);
  async function upload(file?: File) {
    if (!file) return;
    stop();
    setUploading(true);
    setError("");
    const generation = epoch.current;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Choose an image smaller than 20 MB.");
      const analysis = await detectObjects(file);
      if (!alive.current || generation !== epoch.current) return;
      const next = URL.createObjectURL(file);
      url.current = next;
      setSnapshot({
        url: next,
        id: crypto.randomUUID(),
        width: analysis.width,
        height: analysis.height,
        analysis,
      });
      await onCapture(file, analysis);
    } catch (e) {
      if (alive.current && generation === epoch.current) setError(String(e));
    } finally {
      if (alive.current && generation === epoch.current) setUploading(false);
    }
  }
  return (
    <section className="panel browser-camera">
      <div className="panel-heading">
        <strong>Computer camera</strong>
        <span className="muted" aria-live="polite">
          {uploading || (running && detecting) ? status : ""}
        </span>
      </div>
      <div className="camera-viewport">
        <video
          ref={video}
          muted
          playsInline
          style={{
            display: running && (!detecting || !snapshot) ? "block" : "none",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
        {snapshot && (!running || detecting) && renderFrame(snapshot)}
        {!running && !snapshot && (
          <div className="camera-empty">
            <p>Open your camera or choose an image.</p>
          </div>
        )}
      </div>
      <div className="camera-actions">
        <button
          className="primary"
          onClick={running || starting ? stop : start}
          disabled={uploading}
        >
          {starting
            ? "Cancel"
            : running
              ? "Stop camera"
              : "Start computer camera"}
        </button>
        <button
          disabled={!running}
          onClick={async () => {
            try {
              await onCapture(await image());
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Take photo
        </button>
        <label className="button upload-image">
          {uploading ? "Analyzing…" : "Upload image"}
          <input
            aria-label="Upload image"
            type="file"
            accept="image/*"
            disabled={uploading || starting}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <label className="detect-toggle">
          <input
            type="checkbox"
            checked={detecting}
            onChange={(e) => setDetecting(e.target.checked)}
          />
          Detect objects
        </label>
      </div>
      {snapshot?.analysis && (
        <div className="detection-result" aria-live="polite">
          {snapshot.analysis.detections.length} objects
          {snapshot.analysis.detections.length > 0
            ? ": " +
              [
                ...new Set(snapshot.analysis.detections.map((d) => d.label)),
              ].join(", ")
            : ""}
          <span>{snapshot.analysis.inference_ms} ms</span>
        </div>
      )}
      {error && (
        <p role="alert" className="camera-error">
          {error}
        </p>
      )}
    </section>
  );
}
