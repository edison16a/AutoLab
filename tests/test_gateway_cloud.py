"""The Supabase adapter's ownership, rollback and credential checks."""

import asyncio

import pytest
from fastapi import HTTPException

from autolab_gateway.cloud import Cloud, digest
from gateway_support import jpeg


def test_cloud_capture_rolls_back_orphan_upload():
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
    c = Cloud.__new__(Cloud)

    async def call(method, path, body=None, raw=None):
        assert "revoked_at=is.null" in path
        return [{"secret_hash": digest("correct-secret")}]

    c.call = call
    with pytest.raises(HTTPException):
        asyncio.run(c.device("device", "wrong-secret"))
    asyncio.run(c.device("device", "correct-secret"))
