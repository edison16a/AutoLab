import * as ort from "./ort.webgpu.bundle.min.mjs";

ort.env.wasm.wasmPaths = new URL("./", self.location.href).href;
ort.env.wasm.numThreads = 1;
ort.env.logLevel = "error";
let session, backend, initializing;
const labels =
  "person,bicycle,car,motorcycle,airplane,bus,train,truck,boat,traffic light,fire hydrant,stop sign,parking meter,bench,bird,cat,dog,horse,sheep,cow,elephant,bear,zebra,giraffe,backpack,umbrella,handbag,tie,suitcase,frisbee,skis,snowboard,sports ball,kite,baseball bat,baseball glove,skateboard,surfboard,tennis racket,bottle,wine glass,cup,fork,knife,spoon,bowl,banana,apple,sandwich,orange,broccoli,carrot,hot dog,pizza,donut,cake,chair,couch,potted plant,bed,dining table,toilet,tv,laptop,mouse,remote,keyboard,cell phone,microwave,oven,toaster,sink,refrigerator,book,clock,vase,scissors,teddy bear,hair drier,toothbrush".split(
    ",",
  );
async function initialize() {
  if (session) return;
  if (!initializing)
    initializing = (async () => {
      self.postMessage({ status: "Loading detector…" });
      const response = await fetch(
        new URL("./yolov10n.onnx", self.location.href),
      );
      if (!response.ok)
        throw new Error("Detector download failed. Reload and try again.");
      const bytes = await response.arrayBuffer();
      if (navigator.gpu) {
        try {
          session = await ort.InferenceSession.create(bytes, {
            executionProviders: ["webgpu"],
            graphOptimizationLevel: "all",
          });
          backend = "WebGPU";
        } catch (error) {
          console.warn("WebGPU initialization failed; trying CPU", error);
          /* CPU fallback uses the same model and preprocessing. */
        }
      }
      if (!session) {
        session = await ort.InferenceSession.create(bytes, {
          executionProviders: ["wasm"],
          graphOptimizationLevel: "all",
        });
        backend = "CPU";
      }
      self.postMessage({ status: "Ready", backend });
    })().catch((error) => {
      initializing = null;
      throw error;
    });
  await initializing;
}
async function detect(blob, threshold) {
  await initialize();
  const bitmap = await createImageBitmap(blob);
  const width = bitmap.width,
    height = bitmap.height,
    size = 640;
  const scale = Math.min(size / width, size / height);
  const dw = Math.round(width * scale),
    dh = Math.round(height * scale);
  const left = Math.floor((size - dw) / 2),
    top = Math.floor((size - dh) / 2);
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#727272";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap, left, top, dw, dh);
  bitmap.close();
  const rgba = ctx.getImageData(0, 0, size, size).data;
  const plane = size * size,
    input = new Float32Array(plane * 3);
  for (let i = 0; i < plane; i++) {
    input[i] = rgba[i * 4] / 255;
    input[plane + i] = rgba[i * 4 + 1] / 255;
    input[2 * plane + i] = rgba[i * 4 + 2] / 255;
  }
  const tensor = new ort.Tensor("float32", input, [1, 3, size, size]);
  const start = performance.now();
  let outputs;
  try {
    try {
      outputs = await session.run({ [session.inputNames[0]]: tensor });
    } catch (error) {
      if (backend !== "WebGPU") throw error;
      await session.release();
      session = null;
      initializing = null;
      const response = await fetch(
        new URL("./yolov10n.onnx", self.location.href),
      );
      if (!response.ok) throw error;
      session = await ort.InferenceSession.create(
        await response.arrayBuffer(),
        { executionProviders: ["wasm"] },
      );
      backend = "CPU";
      self.postMessage({ status: "Ready", backend });
      outputs = await session.run({ [session.inputNames[0]]: tensor });
    }
    const output = outputs[session.outputNames[0]];
    if (output.dims.at(-1) !== 6)
      throw new Error("Unexpected detector output shape");
    const data = output.data,
      detections = [];
    for (let i = 0; i < data.length; i += 6) {
      const score = Number(data[i + 4]),
        label = labels[Number(data[i + 5])];
      if (score < threshold || !label || !Number.isFinite(score)) continue;
      const bbox = [
        Math.max(0, Math.min(width, ((Number(data[i]) - left) * width) / dw)),
        Math.max(
          0,
          Math.min(height, ((Number(data[i + 1]) - top) * height) / dh),
        ),
        Math.max(
          0,
          Math.min(width, ((Number(data[i + 2]) - left) * width) / dw),
        ),
        Math.max(
          0,
          Math.min(height, ((Number(data[i + 3]) - top) * height) / dh),
        ),
      ];
      if (
        !bbox.every(Number.isFinite) ||
        bbox[2] <= bbox[0] ||
        bbox[3] <= bbox[1]
      )
        continue;
      detections.push({ label, confidence: score, bbox, polygon: [] });
    }
    return {
      model: "YOLOv10n",
      width,
      height,
      detections: detections.slice(0, 100),
      backend,
      inference_ms: Math.round(performance.now() - start),
    };
  } finally {
    tensor.dispose();
    if (outputs) Object.values(outputs).forEach((t) => t.dispose());
  }
}
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      const result =
        data.kind === "load"
          ? await initialize()
          : await detect(data.blob, data.threshold ?? 0.4);
      self.postMessage({ id: data.id, result });
    } catch (error) {
      self.postMessage({
        id: data.id,
        error:
          error instanceof Error ? error.message : "Object detection failed",
      });
    }
  });
};
