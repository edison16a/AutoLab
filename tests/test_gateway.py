"""Protocol and isolation tests against the real ASGI gateway."""

import io
import sys
import uuid
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services/gateway"))
import main
from autolab_gateway import state
from autolab_gateway.protocol import pack, unpack


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(state, "cloud", None)
    state.rooms.clear()
    state.limits.clear()
    with TestClient(main.app) as c:
        yield c


def opened(c, role, device):
    return c.websocket_connect(f"/ws/{role}/{device}")


def hello(ws, **kw):
    ws.send_json({"type": "hello", **kw})


def until(ws, kind):
    for _ in range(20):
        data = ws.receive_json()
        if data.get("type") == kind:
            return data
    raise AssertionError(f"No {kind} received")


def jpeg():
    out = io.BytesIO()
    Image.new("RGB", (64, 48), "blue").save(out, format="JPEG")
    return out.getvalue()


def test_capture_preview_worker_and_no_replay(client):
    device = str(uuid.uuid4())
    image = str(uuid.uuid4())
    with opened(client, "device", device) as pi:
        hello(pi, camera_online=True)
        until(pi, "ready")
        with opened(client, "client", device) as browser:
            hello(browser)
            assert until(browser, "status")["online"]
            until(browser, "ready")
            browser.send_json({"type": "start_preview"})
            until(pi, "start_preview")
            until(browser, "preview")
            pi.send_bytes(
                pack(
                    {"type": "frame", "frame_id": "1", "width": 64, "height": 48},
                    jpeg(),
                )
            )
            assert unpack(browser.receive_bytes())[0]["frame_id"] == "1"
            browser.send_json({"type": "capture_photo", "request_id": image})
            assert until(pi, "capture_photo")["request_id"] == image
            pi.send_bytes(pack({"type": "capture", "request_id": image}, jpeg()))
            h, _ = unpack(browser.receive_bytes())
            assert h["image_id"] == image
            assert h["width"] == 64
            with opened(client, "worker", device) as worker:
                hello(worker)
                until(worker, "ready")
                assert until(browser, "status")["worker_online"]
                browser.send_bytes(
                    pack({"type": "analyze", "image_id": image}, jpeg())
                )
                assert unpack(worker.receive_bytes())[0]["image_id"] == image
                worker.send_json(
                    {
                        "type": "analysis",
                        "image_id": image,
                        "detections": [],
                        "model": "test",
                    }
                )
                assert until(browser, "analysis")["image_id"] == image
                browser.send_json({"type": "live_ml", "enabled": True})
                pi.send_bytes(
                    pack(
                        {"type": "frame", "frame_id": "2", "width": 64, "height": 48},
                        jpeg(),
                    )
                )
                assert unpack(worker.receive_bytes())[0]["frame_id"] == "2"
        # A new browser has no server-side photo history.
        with opened(client, "client", device) as refreshed:
            hello(refreshed)
            assert until(refreshed, "status")["online"]
            until(refreshed, "ready")
            assert not state.rooms[device].pending
            assert not hasattr(state.rooms[device], "images")


def test_room_isolation_and_offline_error(client):
    with opened(client, "device", str(uuid.uuid4())) as pi:
        hello(pi, camera_online=True)
        until(pi, "ready")
        with opened(client, "client", str(uuid.uuid4())) as browser:
            hello(browser)
            assert not until(browser, "status")["online"]
            until(browser, "ready")
            browser.send_json(
                {"type": "capture_photo", "request_id": str(uuid.uuid4())}
            )
            assert until(browser, "error")["message"] == "Device is offline"


def test_origin_rejected(client):
    with pytest.raises(Exception):
        with client.websocket_connect(
            f"/ws/client/{uuid.uuid4()}",
            headers={"origin": "https://untrusted.example"},
        ):
            pass


def test_cloud_ownership_checked(client, monkeypatch):
    class FakeCloud:
        async def user(self, token):
            if token != "valid":
                raise HTTPException(401, "Invalid or expired session")
            return "owner-a"

        async def owner(self, device, owner):
            raise HTTPException(403, "Device is not owned by this account")

    monkeypatch.setattr(state, "cloud", FakeCloud())
    for token, message in [
        ("bad", "Invalid or expired session"),
        ("valid", "Device is not owned by this account"),
    ]:
        with opened(client, "client", str(uuid.uuid4())) as ws:
            hello(ws, token=token)
            assert until(ws, "error")["message"] == message
    assert not state.rooms


def test_invalid_packets_and_cloud_disabled(client):
    with pytest.raises(ValueError):
        unpack(b"abcd")
    assert client.get("/devices").status_code == 404
    assert client.get("/health").json()["mode"] == "demo"


def test_cloud_capture_rolls_back_orphan_upload():
    import asyncio
    from autolab_gateway.cloud import Cloud

    calls = []
    c = Cloud.__new__(Cloud)

    async def call(method, path, body=None, raw=None):
        calls.append((method, path, body))
        if path.startswith("/rest/v1/devices"):
            return [{"owner_id": "owner"}]
        if path == "/rest/v1/images":
            raise HTTPException(502, "Database unavailable")
        return {}

    c.call = call
    with pytest.raises(HTTPException):
        asyncio.run(c.save("device", "image", jpeg(), {"width": 64, "height": 48}))
    assert calls[-1] == (
        "DELETE",
        "/storage/v1/object/autolab-images",
        {"prefixes": ["owner/device/originals/image.jpg"]},
    )


def test_cloud_delete_requires_owner_and_removes_associated_objects():
    import asyncio
    from autolab_gateway.cloud import Cloud

    calls = []
    c = Cloud.__new__(Cloud)

    async def call(method, path, body=None, raw=None):
        calls.append((method, path, body))
        if method == "GET" and path.startswith("/rest/v1/images?"):
            assert "&owner_id=eq.owner" in path
            return [{"storage_path": "owner/device/originals/image.jpg"}]
        if path.startswith("/rest/v1/image_analysis?"):
            return [{"overlay_storage_path": "owner/device/overlays/overlay.jpg"}]
        return {}

    c.call = call
    asyncio.run(c.delete_image("image", "owner"))
    assert calls[-2][2]["prefixes"] == [
        "owner/device/originals/image.jpg",
        "owner/device/overlays/overlay.jpg",
    ]
    assert calls[-1][:2] == ("DELETE", "/rest/v1/images?id=eq.image")


def test_cloud_device_rejects_wrong_or_revoked_secret():
    import asyncio
    from autolab_gateway.cloud import Cloud, digest

    c = Cloud.__new__(Cloud)

    async def call(method, path, body=None, raw=None):
        assert "revoked_at=is.null" in path
        return [{"secret_hash": digest("correct-secret")}]

    c.call = call
    with pytest.raises(HTTPException):
        asyncio.run(c.device("device", "wrong-secret"))
    asyncio.run(c.device("device", "correct-secret"))


def test_reported_metadata_and_sensor_state_without_synthetic_values(client):
    device = str(uuid.uuid4())
    with opened(client, "device", device) as pi:
        hello(pi, camera_online=True, agent_version="1.1.0", network="ethernet")
        until(pi, "ready")
        with opened(client, "client", device) as browser:
            hello(browser)
            initial = until(browser, "status")
            until(browser, "ready")
            assert initial["agent_version"] == "1.1.0"
            assert initial["network"] == "ethernet"
            assert initial["last_seen"]
            assert initial["components"] == []
            report = {
                "id": "sht85", "installed": True, "online": True,
                "status": "Online", "telemetry": {"temperature_c": 22.5},
                "lastUpdated": "2026-09-28T00:00:00Z",
            }
            pi.send_json({"type": "heartbeat", "camera_online": True, "components": [report]})
            updated = until(browser, "status")
            assert updated["components"] == [report]
            assert updated["last_seen"] >= initial["last_seen"]
