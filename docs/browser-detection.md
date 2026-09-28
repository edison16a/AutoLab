# Browser object detection

The default web app uses ONNX Runtime Web and YOLOv10n for actual COCO object detection. Open Live camera to use the Pi stream or select Computer camera. Computer camera also accepts image uploads. Captured images can be analyzed from Image library. No Python ML worker is needed for these actions in the default account-free mode. When cloud mode is explicitly enabled, saved cloud captures retain the authenticated Python-worker path for durable analysis records. Webcam captures and browser live detection remain local.

Inference runs in a dedicated module worker. It first tries WebGPU and falls back to single-threaded WebAssembly, both at session creation and on a GPU execution failure. Each live loop waits for the previous result, skips intervening frames and stops scheduling work when disabled. The overlay is drawn on the exact image analyzed, rather than applying stale boxes to a newer frame. Stopping the computer camera or leaving its view releases its media tracks. Uploads and images are kept in tab memory.

Preprocessing letterboxes RGB images to 640 by 640, normalizes pixels to 0–1 and packs a float32 NCHW tensor. The model's end-to-end output consists of x1, y1, x2, y2, score and COCO class. Results below 0.4 confidence are discarded; padding is removed and coordinates are clamped to the original image. The app does not synthesize detections or segmentation polygons. This general-object detector does not measure cells or identify biological features.

`npm run dev` and `npm run build` prepare the runtime assets from the installed npm package and download a pinned 9.4 MB model with SHA-256 verification. These files are then served by the same origin under `/inference/`. User images do not go to the model host. The initial build requires access to Hugging Face. The generated binaries are ignored by Git. A missing or corrupt model fails the build instead of silently deploying a broken detector.

Source model: https://huggingface.co/onnx-community/yolov10n/tree/57657320425ee34056408a57ad9d29c4d4815bd8

Model SHA-256: `a77dd863933f184a19e84361c64b788228a7c7dacc2c78939239a96ad3efca3b`

The YOLOv10 model is distributed under AGPL-3.0. Its architecture and training source are at https://github.com/THU-MIG/yolov10. ONNX Runtime is MIT licensed: https://github.com/microsoft/onnxruntime. See the public inference notice for attribution. The optional Python worker remains in the repository for custom models and existing integrations.

The browser integration test runs without a Python ML worker. It tests inference on a captured Pi simulator image and confirms actual car/person/bicycle detections on a checksum-verified street photograph, plus computer camera start/stop, hover stability, navigation, and memory reset. Browser GPU performance depends on the device; the headless test also exercises CPU inference.
