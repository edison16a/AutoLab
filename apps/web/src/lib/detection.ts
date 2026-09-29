export type Detection = {
  label: string;
  confidence: number;
  bbox: number[];
  polygon: number[][];
};
export type Analysis = {
  model: string;
  width: number;
  height: number;
  detections: Detection[];
  frame_id?: string;
  backend?: string;
  inference_ms?: number;
};
type Pending = {
  resolve: (result: Analysis) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
let worker: Worker | undefined;
let serial = 0;
const pending = new Map<number, Pending>();
const listeners = new Set<(status: string) => void>();
let status = "Not loaded";
export function watchDetector(listener: (status: string) => void) {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
}
function report(next: string) {
  status = next;
  listeners.forEach((listener) => listener(next));
}
export function disposeDetector() {
  worker?.terminate();
  worker = undefined;
  pending.forEach((p) => {
    clearTimeout(p.timer);
    p.reject(new Error("Detector stopped"));
  });
  pending.clear();
  report("Not loaded");
}
export function detectObjects(blob: Blob): Promise<Analysis> {
  if (!worker) {
    worker = new Worker("/inference/worker.js", { type: "module" });
    worker.onmessage = ({ data }) => {
      if (data.status) {
        report(
          data.status === "Ready" ? `Ready (${data.backend})` : data.status,
        );
        return;
      }
      const p = pending.get(data.id);
      if (!p) return;
      clearTimeout(p.timer);
      pending.delete(data.id);
      if (data.error) {
        report("Could not run detector");
        p.reject(new Error(data.error));
      } else p.resolve(data.result);
    };
    worker.onerror = () => {
      disposeDetector();
      report("Could not load detector");
    };
  }
  // Live callers await each result. Bound additional still-image requests.
  if (pending.size >= 3)
    return Promise.reject(new Error("Detector is busy. Try again shortly."));
  const id = ++serial;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      disposeDetector();
      report("Detector timed out. Try again.");
    }, 120000);
    pending.set(id, { resolve, reject, timer });
    worker!.postMessage({ id, kind: "detect", blob, threshold: 0.4 });
  });
}
