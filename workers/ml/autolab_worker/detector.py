"""Object detection on one JPEG, with a YOLO model or a clearly labeled simulator."""

import io

from PIL import Image


class Detector:
    """Turns JPEG bytes into the analysis fields the gateway forwards to viewers.

    Coordinates are in pixels of the decoded image: bbox is [x1, y1, x2, y2]
    and polygon is a list of [x, y] points.
    """

    def __init__(self, model_name: str, simulate: bool) -> None:
        self.model_name = model_name
        self.model = None
        if not simulate:
            # Imported here so --simulate works without ultralytics installed.
            from ultralytics import YOLO

            self.model = YOLO(model_name)

    def __call__(self, data: bytes) -> dict:
        """Blocking, so the worker runs it in a thread."""
        with Image.open(io.BytesIO(data)) as source:
            im = source.convert("RGB")
        w, h = im.size
        if self.model is None:
            return simulated(w, h)
        result = self.model.predict(im, verbose=False)[0]
        detections = []
        for i, box in enumerate(result.boxes):
            detections.append(
                {
                    "label": result.names[int(box.cls[0])],
                    "confidence": float(box.conf[0]),
                    "bbox": box.xyxy[0].tolist(),
                    # Detection-only models have no masks, so polygons stay empty.
                    "polygon": result.masks.xy[i].tolist()
                    if result.masks is not None
                    else [],
                }
            )
        return {"model": self.model_name, "width": w, "height": h, "detections": detections}


def simulated(w: int, h: int) -> dict:
    """One fixed region, named so nobody mistakes it for a real model's output."""
    return {
        "model": "simulator (not ML)",
        "width": w,
        "height": h,
        "detections": [
            {
                "label": "simulated region",
                "confidence": 1.0,
                "bbox": [w * 0.2, h * 0.2, w * 0.6, h * 0.65],
                "polygon": [
                    [w * 0.2, h * 0.2],
                    [w * 0.6, h * 0.25],
                    [w * 0.55, h * 0.65],
                    [w * 0.2, h * 0.6],
                ],
            }
        ],
    }
