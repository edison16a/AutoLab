"""Single-process, bounded-memory imaging gateway. No image history in demo mode."""

import asyncio
import io
import json
import logging
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager, suppress

from autolab_gateway.cloud import Cloud, digest
from autolab_gateway.config import MODE, ORIGINS
from autolab_gateway.peers import Peer
from autolab_gateway.protocol import now, pack, uid, unpack
from autolab_gateway.rooms import Room
from fastapi import (
    FastAPI,
    HTTPException,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel, Field, ConfigDict

cloud = Cloud() if MODE == "cloud" else None
log = logging.getLogger("autolab")


class ComponentReport(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    id: str = Field(pattern=r"^[a-z0-9_]{1,50}$")
    installed: bool
    online: bool = False
    status: str = Field(max_length=80)
    telemetry: dict[str, str | float | bool] | None = None
    lastUpdated: str | None = None


def device_metadata(data):
    return {
        key: str(data[key])[:80]
        for key in ("agent_version", "network")
        if data.get(key)
    }


rooms = {}
limits = defaultdict(deque)


def rate(key, count=30):
    t = time.monotonic()
    q = limits[key]
    while q and q[0] < t - 60:
        q.popleft()
    if len(q) >= count:
        raise HTTPException(429, "Too many requests. Try again in a minute.")
    q.append(t)


async def sweep():
    while True:
        await asyncio.sleep(5)
        t = time.monotonic()
        for key in list(limits):
            if not limits[key] or limits[key][-1] < t - 60:
                del limits[key]
        for room in list(rooms.values()):
            if room.device and t - room.device.last_seen > 35:
                with suppress(Exception):
                    await room.device.ws.close(code=1001)
            if room.worker and room.worker.live_busy and t - room.last_live > 120:
                with suppress(Exception):
                    await room.worker.ws.close(code=1013)
            if cloud:
                for peer in list(room.clients) + ([room.worker] if room.worker else []):
                    if t - peer.checked_at > 300:
                        peer.checked_at = t
                        try:
                            await cloud.user(peer.auth_token)
                        except HTTPException:
                            with suppress(Exception):
                                await peer.ws.close(code=1008)
            for pending in (room.pending, room.analysis):
                for rid, (peer, deadline) in list(pending.items()):
                    if t > deadline:
                        peer.emit(
                            {
                                "type": "error",
                                "request_id": rid,
                                "message": "Request timed out",
                            }
                        )
                        pending.pop(rid, None)


@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(sweep())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="Autolab gateway", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


async def user(request):
    if not cloud:
        raise HTTPException(404, "Cloud mode is disabled")
    token = request.headers.get("authorization", "").removeprefix("Bearer ")
    return await cloud.user(token)


@app.get("/health")
async def health():
    return {"ok": True, "mode": MODE}


class Registration(BaseModel):
    device_id: uuid.UUID
    secret: str = Field(min_length=32, max_length=256)


@app.post("/devices/register")
async def register(body: Registration, request: Request):
    if not cloud:
        raise HTTPException(404, "Cloud mode is disabled")
    rate(("register", request.client.host), 10)
    return await cloud.register(str(body.device_id), body.secret)


class Claim(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")
    name: str = Field(min_length=1, max_length=80)


@app.post("/devices/claim")
async def claim(body: Claim, request: Request):
    owner = await user(request)
    rate(("claim", owner), 5)
    result = await cloud.call(
        "POST",
        "/rest/v1/rpc/claim_device",
        {"code_hash": digest(body.code), "new_owner": owner, "device_name": body.name},
    )
    if not result:
        raise HTTPException(400, "Code expired or already used")
    return {"device_id": result}


@app.get("/devices")
async def devices(request: Request):
    owner = await user(request)
    return await cloud.call(
        "GET", f"/rest/v1/devices?owner_id=eq.{owner}&order=created_at.desc"
    )


class Rename(BaseModel):
    name: str = Field(min_length=1, max_length=80)


@app.patch("/devices/{device}")
async def rename(device: str, body: Rename, request: Request):
    device = uid(device)
    owner = await user(request)
    await cloud.owner(device, owner)
    return await cloud.call(
        "PATCH", f"/rest/v1/devices?id=eq.{device}", {"name": body.name}
    )


@app.get("/devices/{device}/images")
async def images(device: str, request: Request, offset: int = Query(0, ge=0)):
    return await cloud.images(uid(device), await user(request), offset)


@app.delete("/images/{image}")
async def delete(image: str, request: Request):
    image = uid(image)
    owner = await user(request)
    await cloud.delete_image(image, owner)
    return {"deleted": True}


@app.websocket("/ws/{role}/{device_id}")
async def socket(ws: WebSocket, role: str, device_id: str):
    if role not in ("device", "client", "worker"):
        await ws.close(code=1008)
        return
    try:
        device_id = uid(device_id)
    except HTTPException:
        await ws.close(code=1008)
        return
    if ws.headers.get("origin") and ws.headers["origin"] not in ORIGINS:
        await ws.close(code=1008)
        return
    await ws.accept()
    peer = None
    room = None
    sender = None
    try:
        hello = await asyncio.wait_for(ws.receive_json(), 10)
        if hello.get("type") != "hello":
            raise ValueError("Expected hello")
        owner = None
        if cloud:
            if role == "device":
                await cloud.device(device_id, str(hello.get("secret", "")))
            else:
                owner = await cloud.user(str(hello.get("token", "")))
                await cloud.owner(device_id, owner)
        if len(rooms) >= 200 and device_id not in rooms:
            raise ValueError("Gateway at capacity")
        room = rooms.setdefault(device_id, Room())
        if role == "device" and room.device:
            raise ValueError("Device already connected")
        if role == "worker" and room.worker:
            raise ValueError("Worker already connected")
        if role == "client" and len(room.clients) >= 10:
            raise ValueError("Too many viewers")
        peer = Peer(ws, role, owner, auth_token=str(hello.get("token", "")))
        sender = asyncio.create_task(peer.send())
        if role == "device":
            room.device = peer
            room.camera = bool(hello.get("camera_online"))
            room.simulated = bool(hello.get("simulated"))
            room.heartbeat_at = now()
            room.metadata = device_metadata(hello)
            room.sync_preview()
            if cloud:
                await cloud.call(
                    "PATCH",
                    f"/rest/v1/devices?id=eq.{device_id}",
                    {
                        "status": "online",
                        "camera_online": room.camera,
                        "last_seen_at": now(),
                    },
                )
        elif role == "worker":
            room.worker = peer
        else:
            room.clients.add(peer)
        room.broadcast(room.status())
        peer.emit({"type": "ready", "mode": MODE})

        async def receive_loop():
            while True:
                message = await ws.receive()
                if message["type"] == "websocket.disconnect":
                    break
                peer.last_seen = time.monotonic()
                if message.get("bytes") is not None:
                    h, jpeg = unpack(message["bytes"])
                    kind = h.get("type")
                    if role == "device" and kind == "frame":
                        h = {
                            "type": "frame",
                            "frame_id": str(h.get("frame_id", ""))[:64],
                            "width": int(h["width"]),
                            "height": int(h["height"]),
                        }
                        packet = pack(h, jpeg)
                        for viewer in room.clients:
                            if viewer.preview:
                                viewer.emit(packet)
                        if (
                            room.worker
                            and not room.worker.live_busy
                            and any(p.ml and p.preview for p in room.clients)
                            and time.monotonic() - room.last_live > 0.8
                        ):
                            room.last_live = time.monotonic()
                            room.worker.live_busy = True
                            room.worker.emit(packet)
                    elif role == "device" and kind == "capture":
                        rid = uid(h.get("request_id"))
                        entry = room.pending.pop(rid, None)
                        if not entry:
                            continue
                        target, _ = entry
                        try:
                            with Image.open(io.BytesIO(jpeg)) as im:
                                w, height = im.size
                                im.verify()
                            h = {
                                "type": "capture",
                                "request_id": rid,
                                "image_id": rid,
                                "width": w,
                                "height": height,
                                "captured_at": now(),
                            }
                            if cloud:
                                await cloud.save(device_id, rid, jpeg, h)
                            if target in room.clients:
                                target.emit(pack(h, jpeg))
                            if cloud:
                                await cloud.call(
                                    "PATCH",
                                    f"/rest/v1/commands?id=eq.{rid}",
                                    {"status": "completed", "completed_at": now()},
                                )
                        except Exception:
                            log.exception("Capture persistence failed")
                            target.emit(
                                {
                                    "type": "error",
                                    "request_id": rid,
                                    "message": "Capture could not be saved",
                                }
                            )
                    elif role == "client" and kind == "analyze":
                        rate(("analysis", id(peer)), 10)
                        if not room.worker:
                            peer.emit(
                                {
                                    "type": "error",
                                    "message": "Connect an ML worker first",
                                }
                            )
                            continue
                        rid = uid(h.get("image_id"))
                        if cloud:
                            rows = await cloud.call(
                                "GET",
                                f"/rest/v1/images?id=eq.{rid}&device_id=eq.{device_id}&owner_id=eq.{owner}",
                            )
                            if not rows:
                                raise ValueError("Image not owned by this account")
                        if len(room.analysis) >= 8:
                            raise ValueError("Analysis queue is full")
                        room.analysis[rid] = (peer, time.monotonic() + 120)
                        room.worker.emit(
                            pack({"type": "analyze", "image_id": rid}, jpeg)
                        )
                    else:
                        raise ValueError("Unsupported binary message")
                    continue
                raw = message.get("text", "")
                if len(raw) > 1024 * 1024:
                    raise ValueError("Message too large")
                data = json.loads(raw)
                kind = data.get("type")
                if role == "client":
                    rate(("command", id(peer)), 60)
                    if kind in ("start_preview", "stop_preview"):
                        peer.preview = kind == "start_preview"
                        room.sync_preview()
                        peer.emit({"type": "preview", "active": peer.preview})
                    elif kind == "live_ml":
                        peer.ml = bool(data.get("enabled"))
                    elif kind in ("capture_photo", "camera_status", "ping"):
                        if not room.device:
                            peer.emit({"type": "error", "message": "Device is offline"})
                            continue
                        rid = uid(data.get("request_id"))
                        if kind == "capture_photo":
                            if len(room.pending) >= 3:
                                peer.emit(
                                    {
                                        "type": "error",
                                        "request_id": rid,
                                        "message": "Camera is busy",
                                    }
                                )
                                continue
                            if rid in room.pending:
                                raise ValueError("Duplicate request")
                            if cloud:
                                await cloud.call(
                                    "POST",
                                    "/rest/v1/commands",
                                    {
                                        "id": rid,
                                        "device_id": device_id,
                                        "user_id": owner,
                                        "command": kind,
                                        "status": "pending",
                                    },
                                )
                            room.pending[rid] = (peer, time.monotonic() + 60)
                        room.device.emit({"type": kind, "request_id": rid})
                    else:
                        raise ValueError("Unsupported command")
                elif role == "device":
                    if kind in ("heartbeat", "camera_status"):
                        room.camera = bool(data.get("camera_online"))
                        room.heartbeat_at = now()
                        room.metadata.update(device_metadata(data))
                        if "components" in data:
                            room.components = [
                                ComponentReport.model_validate(c).model_dump()
                                for c in data["components"][:32]
                            ]
                        room.broadcast(room.status())
                        if cloud:
                            await cloud.call(
                                "PATCH",
                                f"/rest/v1/devices?id=eq.{device_id}",
                                {"last_seen_at": now(), "camera_online": room.camera},
                            )
                    elif kind == "error":
                        rid = str(data.get("request_id", ""))
                        entry = room.pending.pop(rid, None)
                        if entry:
                            entry[0].emit(
                                {
                                    "type": "error",
                                    "request_id": rid,
                                    "message": str(data.get("message", "Device error"))[
                                        :300
                                    ],
                                }
                            )
                        else:
                            room.broadcast(
                                {
                                    "type": "error",
                                    "message": str(data.get("message", "Device error"))[
                                        :300
                                    ],
                                }
                            )
                    elif kind == "pong":
                        room.broadcast({"type": "pong"})
                elif role == "worker":
                    if kind in ("analysis", "error"):
                        if data.get("image_id"):
                            rid = uid(data["image_id"])
                            entry = room.analysis.pop(rid, None)
                            if not entry:
                                continue
                            if cloud and kind == "analysis":
                                await cloud.call(
                                    "POST",
                                    "/rest/v1/image_analysis",
                                    {
                                        "image_id": rid,
                                        "model_name": str(data.get("model", ""))[:100],
                                        "result_json": data,
                                    },
                                )
                                await cloud.call(
                                    "PATCH",
                                    f"/rest/v1/images?id=eq.{rid}",
                                    {"analysis_status": "completed"},
                                )
                            entry[0].emit(data)
                        else:
                            room.worker.live_busy = False
                            for viewer in room.clients:
                                if viewer.ml:
                                    viewer.emit(data)

        receiver = asyncio.create_task(receive_loop())
        done, _ = await asyncio.wait(
            [receiver, sender], return_when=asyncio.FIRST_COMPLETED
        )
        for task in done:
            task.result()
    except (WebSocketDisconnect, RuntimeError):
        pass
    except Exception as exc:
        log.info("Connection ended: %s", type(exc).__name__)
        with suppress(Exception):
            await ws.send_json(
                {
                    "type": "error",
                    "message": exc.detail
                    if isinstance(exc, HTTPException)
                    else str(exc)[:200],
                }
            )
    finally:
        if "receiver" in locals():
            receiver.cancel()
            with suppress(asyncio.CancelledError, Exception):
                await receiver
        if sender:
            sender.cancel()
            with suppress(asyncio.CancelledError, Exception):
                await sender
        if room and peer:
            room.clients.discard(peer)
            for pending in (room.pending, room.analysis):
                for rid, (target, _) in list(pending.items()):
                    if target is peer:
                        pending.pop(rid, None)
            if room.device is peer:
                room.device = None
                room.camera = False
                for rid, (target, _) in list(room.pending.items()):
                    target.emit(
                        {
                            "type": "error",
                            "request_id": rid,
                            "message": "Device disconnected",
                        }
                    )
                room.pending.clear()
                if cloud:
                    with suppress(Exception):
                        await cloud.call(
                            "PATCH",
                            f"/rest/v1/devices?id=eq.{device_id}",
                            {"status": "offline", "camera_online": False},
                        )
            if room.worker is peer:
                room.worker = None
                for rid, (target, _) in list(room.analysis.items()):
                    target.emit(
                        {
                            "type": "error",
                            "image_id": rid,
                            "message": "ML worker disconnected",
                        }
                    )
                room.analysis.clear()
            room.sync_preview()
            room.broadcast(room.status())
            if not room.device and not room.worker and not room.clients:
                rooms.pop(device_id, None)
        with suppress(Exception):
            await ws.close()
