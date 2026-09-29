# Browser object detection

The web app runs YOLOv10n with ONNX Runtime Web for real COCO object detection. On **Live**, turn on **Detect objects** for the Pi stream, or switch to **Computer camera** to use a webcam or upload a photo. Any saved image can be analyzed from its page in **Data**. None of this needs the Python ML worker. In cloud mode, when a worker is connected to the device, saved cloud images go to the worker instead so the result is stored in Supabase. Webcam shots and live detection always stay in the browser.

Inference runs in a dedicated module worker. It first tries WebGPU and falls back to single-threaded WebAssembly, both at session creation and on a GPU execution failure. Each live loop waits for the previous result, skips intervening frames and stops scheduling work when disabled. The overlay is drawn on the exact image analyzed, rather than applying stale boxes to a newer frame. Stopping the computer camera or leaving its view releases its media tracks. In demo mode, uploads and captures are saved in the browser's IndexedDB with their analyses.

Preprocessing letterboxes RGB images to 640 by 640, normalizes pixels to the 0 to 1 range and packs a float32 NCHW tensor. The model's end-to-end output consists of x1, y1, x2, y2, score and COCO class. Results below 0.4 confidence are dropped, the padding is removed and coordinates are clamped to the original image. The app does not synthesize detections or segmentation polygons. This general-object detector does not measure cells or identify biological features.

`npm run dev` and `npm run build` prepare the runtime assets from the installed npm package and download a pinned 9.4 MB model with SHA-256 verification. These files are then served by the same origin under `/inference/`. User images do not go to the model host. The initial build requires access to Hugging Face. The generated binaries are ignored by Git. A missing or corrupt model fails the build instead of silently deploying a broken detector.

Source model: https://huggingface.co/onnx-community/yolov10n/tree/57657320425ee34056408a57ad9d29c4d4815bd8

Model SHA-256: `a77dd863933f184a19e84361c64b788228a7c7dacc2c78939239a96ad3efca3b`

The YOLOv10 model is distributed under AGPL-3.0. Its architecture and training source are at https://github.com/THU-MIG/yolov10. ONNX Runtime is MIT licensed: https://github.com/microsoft/onnxruntime. See the public inference notice for attribution. The optional Python worker remains in the repository for custom models and existing integrations.

The browser end to end suite runs without a Python ML worker. It analyzes a capture from the Pi simulator and checks for real car, person or bicycle detections on a checksum-verified street photo, along with the webcam starting and stopping. GPU speed depends on the device; the headless test runs on the CPU backend.
