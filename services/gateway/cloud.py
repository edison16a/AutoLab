"""Server-only Supabase adapter. Service key never leaves the gateway."""

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import HTTPException


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def now():
    return datetime.now(timezone.utc).isoformat()


class Cloud:
    def __init__(self):
        self.url = os.environ["SUPABASE_URL"].rstrip("/")
        self.key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    async def call(self, method, path, body=None, raw=None):
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

    async def user(self, token):
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                self.url + "/auth/v1/user",
                headers={"apikey": self.key, "Authorization": f"Bearer {token}"},
            )
        if r.status_code != 200:
            raise HTTPException(401, "Invalid or expired session")
        return r.json()["id"]

    async def owner(self, device, uid):
        rows = await self.call(
            "GET", f"/rest/v1/devices?id=eq.{device}&owner_id=eq.{uid}"
        )
        if not rows:
            raise HTTPException(403, "Device is not owned by this account")
        return rows[0]

    async def device(self, device, secret):
        rows = await self.call(
            "GET",
            f"/rest/v1/device_credentials?device_id=eq.{device}&revoked_at=is.null",
        )
        if not rows or not secrets.compare_digest(
            rows[0]["secret_hash"], digest(secret)
        ):
            raise HTTPException(401, "Invalid device credential")

    async def register(self, device, secret):
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

    async def save(self, device, image_id, jpeg, meta):
        rows = await self.call("GET", f"/rest/v1/devices?id=eq.{device}")
        owner = rows[0]["owner_id"] if rows else None
        if not owner:
            raise HTTPException(409, "Claim device before capturing")
        path = f"{owner}/{device}/originals/{image_id}.jpg"
        await self.call("POST", f"/storage/v1/object/autolab-images/{path}", raw=jpeg)
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
            await self.call(
                "DELETE", "/storage/v1/object/autolab-images", {"prefixes": [path]}
            )
            raise

    async def images(self, device, uid, offset=0):
        await self.owner(device, uid)
        rows = await self.call(
            "GET",
            f"/rest/v1/images?device_id=eq.{device}&select=*,image_analysis(*)&order=captured_at.desc&limit=25&offset={offset}",
        )
        for row in rows:
            signed = await self.call(
                "POST",
                f"/storage/v1/object/sign/autolab-images/{row['storage_path']}",
                {"expiresIn": 3600},
            )
            row["url"] = self.url + "/storage/v1" + signed["signedURL"]
        return rows

    async def delete_image(self, image, uid):
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
        await self.call(
            "DELETE", "/storage/v1/object/autolab-images", {"prefixes": paths}
        )
        await self.call("DELETE", f"/rest/v1/images?id=eq.{image}")
