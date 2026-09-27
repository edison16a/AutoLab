"""Optional local inference worker. Generic vision demo, not biological analysis."""

import argparse
import asyncio
import io
import json
import os
import struct

import httpx
from dotenv import load_dotenv
from PIL import Image
from websockets.asyncio.client import connect

load_dotenv()


async def run(args):
    if args.simulate:
        model = None
    else:
        from ultralytics import YOLO

        model = YOLO(args.model)

    def infer(data):
        im = Image.open(io.BytesIO(data)).convert("RGB")
        w, h = im.size
        if model is None:
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
        result = model.predict(im, verbose=False)[0]
        detections = []
        for i, box in enumerate(result.boxes):
            detections.append(
                {
                    "label": result.names[int(box.cls[0])],
                    "confidence": float(box.conf[0]),
                    "bbox": box.xyxy[0].tolist(),
                    "polygon": result.masks.xy[i].tolist()
                    if result.masks is not None
                    else [],
                }
            )
        return {"model": args.model, "width": w, "height": h, "detections": detections}

    delay = 1
    while True:
        try:
            token = os.getenv("AUTOLAB_ACCESS_TOKEN", "")
            if args.mode == "cloud" and os.getenv("AUTOLAB_EMAIL"):
                async with httpx.AsyncClient(timeout=20) as client:
                    r = await client.post(
                        os.environ["SUPABASE_URL"]
                        + "/auth/v1/token?grant_type=password",
                        headers={"apikey": os.environ["SUPABASE_ANON_KEY"]},
                        json={
                            "email": os.environ["AUTOLAB_EMAIL"],
                            "password": os.environ["AUTOLAB_PASSWORD"],
                        },
                    )
                    r.raise_for_status()
                    token = r.json()["access_token"]
            async with connect(
                f"{args.gateway.rstrip('/')}/ws/worker/{args.device}",
                max_size=16 * 1024 * 1024,
                max_queue=2,
                ping_interval=10,
            ) as ws:
                await ws.send(json.dumps({"type": "hello", "token": token}))
                delay = 1
                async for raw in ws:
                    if isinstance(raw, str):
                        event = json.loads(raw)
                        if event.get("type") == "error":
                            raise RuntimeError(event.get("message"))
                        continue
                    n = struct.unpack("!I", raw[:4])[0]
                    h = json.loads(raw[4 : n + 4])
                    try:
                        result = await asyncio.to_thread(infer, raw[n + 4 :])
                        result.update(
                            type="analysis",
                            image_id=h.get("image_id"),
                            frame_id=h.get("frame_id"),
                        )
                    except Exception as exc:
                        result = {
                            "type": "error",
                            "image_id": h.get("image_id"),
                            "message": str(exc)[:200],
                        }
                    await ws.send(json.dumps(result))
        except Exception as exc:
            print(f"Worker disconnected: {exc}. Retrying in {delay}s", flush=True)
        await asyncio.sleep(delay)
        delay = min(delay * 2, 30)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument(
        "--gateway", default=os.getenv("AUTOLAB_GATEWAY", "ws://localhost:8000")
    )
    p.add_argument("--device", required=True)
    p.add_argument("--model", default="yolo11n-seg.pt")
    p.add_argument("--simulate", action="store_true")
    p.add_argument(
        "--mode", choices=["demo", "cloud"], default=os.getenv("AUTOLAB_MODE", "demo")
    )
    args = p.parse_args()
    if not args.gateway.startswith(("ws://localhost:", "ws://127.0.0.1:", "wss://")):
        p.error("Use WSS for remote gateways")
    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        pass
