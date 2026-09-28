import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("onnxruntime-web"));
const root = new URL("../public/inference/", import.meta.url);
await mkdir(root, { recursive: true });
for (const file of [
  "ort.webgpu.bundle.min.mjs",
  "ort-wasm-simd-threaded.asyncify.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
]) {
  await copyFile(join(dist, file), new URL(file, root));
}
const hash = "a77dd863933f184a19e84361c64b788228a7c7dacc2c78939239a96ad3efca3b";
const target = new URL("yolov10n.onnx", root);
const valid = (bytes) =>
  createHash("sha256").update(bytes).digest("hex") === hash;
let exists = false;
try {
  exists = valid(await readFile(target));
} catch {}
if (!exists) {
  console.log("Downloading pinned YOLOv10n model (9.4 MB)…");
  const response = await fetch(
    "https://huggingface.co/onnx-community/yolov10n/resolve/57657320425ee34056408a57ad9d29c4d4815bd8/onnx/model.onnx",
    { signal: AbortSignal.timeout(120000) },
  );
  if (!response.ok)
    throw new Error(`Model download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!valid(bytes)) throw new Error("Model checksum mismatch");
  await writeFile(target, bytes);
}
console.log("Browser inference assets ready.");
