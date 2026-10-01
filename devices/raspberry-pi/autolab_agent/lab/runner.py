"""The Pi's life in lab mode: report status, run the commands sent to it, and
stream preview frames while someone watches. All of it goes to Supabase."""

import asyncio
import base64
import logging
import time
import uuid
from datetime import datetime, timezone

from ..camera import Camera
from ..telemetry import AGENT_VERSION
from .api import Supabase
from .channel import DeviceChannel

log = logging.getLogger("agent")

STATUS_EVERY = 15
# Commands arrive at once through a "wake" on the channel. This catches any that slip past it.
POLL_EVERY = 3
# Screens give up on a command after 20 seconds, so an older one is expired, not run.
TOO_OLD = 30
# Screens repeat "watch" every few seconds while the live view is open.
WATCH_GRACE = 12
FRAME_EVERY = 0.5
MAX_RETRY = 30


class LabAgent:
    def __init__(self, api: Supabase, camera: Camera, device_id: str) -> None:
        self.api = api
        self.camera = camera
        self.device_id = device_id
        self.owner_id: str | None = None
        self.channel = DeviceChannel(api.session.url, api.session.key, device_id, self._token)
        self.wake = asyncio.Event()
        self.watched_at = 0.0

    async def _token(self) -> str:
        return (await self.api.headers())["Authorization"].removeprefix("Bearer ")

    async def run(self) -> None:
        await self.wait_for_link()
        tasks = [asyncio.create_task(job()) for job in (self.status, self.commands, self.listen, self.preview)]
        try:
            await asyncio.gather(*tasks)
        finally:
            for task in tasks:
                task.cancel()

    async def wait_for_link(self) -> None:
        """Until the owner links this login, the Autolab's row stays invisible to it."""
        told = False
        while True:
            try:
                device = await self.api.device(self.device_id)
                if device:
                    self.owner_id = device["owner_id"]
                    log.info("Linked to %s", device["name"])
                    return
            except Exception as exc:
                log.warning("Can't reach Supabase (%s)", exc)
            if not told:
                log.info("Waiting for this Autolab to be linked to an account")
                told = True
            await asyncio.sleep(5)

    async def status(self) -> None:
        while True:
            try:
                await self.api.report(self.device_id, {
                    "status": "online",
                    "camera_online": self.camera.online,
                    "simulated": self.camera.simulate,
                    "agent_version": AGENT_VERSION,
                })
            except Exception as exc:
                log.warning("Status report failed (%s)", exc)
            await asyncio.sleep(STATUS_EVERY)

    async def commands(self) -> None:
        while True:
            try:
                for action in await self.api.pending(self.device_id):
                    await self.run_command(action)
            except Exception as exc:
                log.warning("Checking for commands failed (%s)", exc)
            self.wake.clear()
            try:
                await asyncio.wait_for(self.wake.wait(), POLL_EVERY)
            except TimeoutError:
                pass

    async def run_command(self, action: dict) -> None:
        created = datetime.fromisoformat(action["created_at"].replace("Z", "+00:00"))
        if (datetime.now(timezone.utc) - created).total_seconds() > TOO_OLD:
            await self.api.move(action["id"], {"status": "expired", "error": "The Autolab got this too late."}, only_from="pending")
            return
        if not await self.api.move(action["id"], {"status": "running"}, only_from="pending"):
            return
        if action["kind"] != "capture_photo":
            await self.api.move(action["id"], {"status": "failed", "error": "The Autolab can't do that yet."})
            return
        try:
            image_id = await self.take_photo()
            await self.api.move(action["id"], {"status": "done", "image_id": image_id})
            log.info("Photo taken for a command")
        except Exception as exc:
            log.warning("Photo failed (%s)", exc)
            await self.api.move(action["id"], {"status": "failed", "error": str(exc)[:200] or "The photo failed."})

    async def take_photo(self) -> str:
        if not self.camera.online:
            raise RuntimeError(self.camera.error or "The camera isn't connected.")
        jpeg, width, height = await asyncio.to_thread(self.camera.capture, True)
        image_id = str(uuid.uuid4())
        path = f"{self.owner_id}/{self.device_id}/{image_id}.jpg"
        await self.api.upload(path, jpeg)
        await self.api.add_image({
            "id": image_id,
            "device_id": self.device_id,
            "owner_id": self.owner_id,
            "storage_path": path,
            "captured_at": datetime.now(timezone.utc).isoformat(),
            "width": width,
            "height": height,
            "source": "simulator" if self.camera.simulate else "pi",
            "bytes": len(jpeg),
        })
        return image_id

    def on_broadcast(self, event: str, _payload: dict) -> None:
        if event == "watch":
            self.watched_at = time.monotonic()
        elif event == "wake":
            self.wake.set()

    async def listen(self) -> None:
        delay = 1
        while True:
            started = time.monotonic()
            try:
                await self.channel.run(self.on_broadcast)
            except Exception as exc:
                log.warning("Live channel dropped (%s). Retrying in %ss", exc, delay)
            # A connection that held for a while earns a quick retry.
            delay = 1 if time.monotonic() - started > 60 else min(MAX_RETRY, delay * 2)
            await asyncio.sleep(delay)

    async def preview(self) -> None:
        while True:
            watched = time.monotonic() - self.watched_at < WATCH_GRACE
            if watched and self.channel.joined and self.camera.online:
                try:
                    jpeg, width, height = await asyncio.to_thread(self.camera.capture)
                    frame = {"id": str(time.time_ns()), "w": width, "h": height, "jpeg": base64.b64encode(jpeg).decode()}
                    await self.channel.send("frame", frame)
                except Exception as exc:
                    log.warning("Preview frame failed (%s)", exc)
            await asyncio.sleep(FRAME_EVERY)
