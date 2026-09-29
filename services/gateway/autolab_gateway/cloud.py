"""Server-only Supabase adapter.

The service role key lives here and never leaves the gateway. The browser, the Pi
and the ML worker reach Supabase only through these methods, so every query that
could touch another account's data is scoped by owner in one place.
"""

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import HTTPException

BUCKET = "autolab-images"


def digest(value: str) -> str:
    """Device secrets and claim codes are stored hashed, so a leaked table grants nothing."""
    return hashlib.sha256(value.encode()).hexdigest()


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Cloud:
    """Thin REST client for PostgREST, Storage and Auth with the service role key."""

    def __init__(self) -> None:
        # Fail at startup, not on the first request, when cloud mode is misconfigured.
        self.url = os.environ["SUPABASE_URL"].rstrip("/")
        self.key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    async def call(
        self, method: str, path: str, body: Any = None, raw: bytes | None = None
    ) -> Any:
        """Upstream errors become a generic 502 so table names and SQL never reach callers."""
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Prefer": "return=representation",
        }
        if raw is not None:
            headers["Content-Type"] = "image/jpeg"
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.request(
                method, self.url + path, headers=headers, json=body, content=raw
            )
        if not r.is_success:
            raise HTTPException(502, "Cloud storage/database operation failed")
        return r.json() if r.content else None

    async def user(self, token: str) -> str:
        """Resolve a browser or worker access token to its user id, or reject it."""
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                self.url + "/auth/v1/user",
                headers={"apikey": self.key, "Authorization": f"Bearer {token}"},
            )
        if r.status_code != 200:
            raise HTTPException(401, "Invalid or expired session")
        return r.json()["id"]

    async def owner(self, device: str, uid: str) -> dict:
        rows = await self.call(
            "GET", f"/rest/v1/devices?id=eq.{device}&owner_id=eq.{uid}"
        )
        if not rows:
            raise HTTPException(403, "Device is not owned by this account")
        return rows[0]

    async def device(self, device: str, secret: str) -> None:
        """Check a Pi's secret in constant time. Revoked credentials never match."""
        rows = await self.call(
            "GET",
            f"/rest/v1/device_credentials?device_id=eq.{device}&revoked_at=is.null",
        )
        if not rows or not secrets.compare_digest(
            rows[0]["secret_hash"], digest(secret)
        ):
            raise HTTPException(401, "Invalid device credential")

    async def register(self, device: str, secret: str) -> dict:
        """Create the device on first contact and issue a fresh claim code.

        A known device must prove its secret first, so nobody can mint claim codes
        for someone else's Pi. Claimed devices get no code, which keeps ownership
        from moving to whoever sees the terminal next.
        """
        rows = await self.call("GET", f"/rest/v1/devices?id=eq.{device}")
        if rows:
            await self.device(device, secret)
            if rows[0]["owner_id"]:
                return {"claimed": True}
        else:
            await self.call(
                "POST", "/rest/v1/devices", {"id": device, "name": "My Autolab"}
            )
            await self.call(
                "POST",
                "/rest/v1/device_credentials",
                {"device_id": device, "secret_hash": digest(secret)},
            )
        code = f"{secrets.randbelow(1000000):06d}"
        # Only the newest code works. Older ones are deleted, not left to expire.
        await self.call("DELETE", f"/rest/v1/device_claims?device_id=eq.{device}")
        await self.call(
            "POST",
            "/rest/v1/device_claims",
            {
                "device_id": device,
                "claim_code_hash": digest(code),
                "expires_at": (
                    datetime.now(timezone.utc) + timedelta(minutes=10)
                ).isoformat(),
            },
        )
        return {"code": code, "expires_in": 600}

    async def save(self, device: str, image_id: str, jpeg: bytes, meta: dict) -> None:
        """Upload the original, then record it. A failed insert removes the upload."""
        rows = await self.call("GET", f"/rest/v1/devices?id=eq.{device}")
        owner = rows[0]["owner_id"] if rows else None
        if not owner:
            raise HTTPException(409, "Claim device before capturing")
        path = f"{owner}/{device}/originals/{image_id}.jpg"
        await self.call("POST", f"/storage/v1/object/{BUCKET}/{path}", raw=jpeg)
        try:
            await self.call(
                "POST",
                "/rest/v1/images",
                {
                    "id": image_id,
                    "device_id": device,
                    "owner_id": owner,
                    "storage_path": path,
                    "width": meta["width"],
                    "height": meta["height"],
                },
            )
        except Exception:
            # Without the row nothing could ever find or delete this object.
            await self.call(
                "DELETE", f"/storage/v1/object/{BUCKET}", {"prefixes": [path]}
            )
            raise

    async def images(self, device: str, uid: str, offset: int = 0) -> list:
        """One page of the owner's images, each with a signed URL valid for an hour."""
        await self.owner(device, uid)
        rows = await self.call(
            "GET",
            f"/rest/v1/images?device_id=eq.{device}&select=*,image_analysis(*)&order=captured_at.desc&limit=25&offset={offset}",
        )
        for row in rows:
            signed = await self.call(
                "POST",
                f"/storage/v1/object/sign/{BUCKET}/{row['storage_path']}",
                {"expiresIn": 3600},
            )
            row["url"] = self.url + "/storage/v1" + signed["signedURL"]
        return rows

    async def delete_image(self, image: str, uid: str) -> None:
        """Remove the original and any analysis overlays before the row itself."""
        rows = await self.call(
            "GET", f"/rest/v1/images?id=eq.{image}&owner_id=eq.{uid}"
        )
        if not rows:
            raise HTTPException(404, "Image not found")
        analyses = await self.call(
            "GET", f"/rest/v1/image_analysis?image_id=eq.{image}"
        )
        paths = [rows[0]["storage_path"]] + [
            a["overlay_storage_path"] for a in analyses if a.get("overlay_storage_path")
        ]
        await self.call("DELETE", f"/storage/v1/object/{BUCKET}", {"prefixes": paths})
        await self.call("DELETE", f"/rest/v1/images?id=eq.{image}")
