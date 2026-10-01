"""The few Supabase calls the Pi makes, all as its own login.

Row level security decides what each one may touch: the Pi's own Autolab,
the commands sent to it, and its owner's photo folder for that Autolab.
"""

from collections.abc import Callable
from typing import Any

import httpx

from . import session as auth
from .session import Session

BUCKET = "autolab-images"


class SupabaseError(RuntimeError):
    pass


class Supabase:
    def __init__(self, client: httpx.AsyncClient, session: Session, on_refresh: Callable[[Session], None]) -> None:
        self.client = client
        self.session = session
        # Supabase replaces the refresh token each time, so the new one must be saved at once.
        self.on_refresh = on_refresh

    async def headers(self) -> dict[str, str]:
        if self.session.stale:
            self.session = await auth.refresh(self.client, self.session)
            self.on_refresh(self.session)
        return self.session.headers()

    async def _call(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        headers = {**(await self.headers()), **kwargs.pop("headers", {})}
        response = await self.client.request(method, f"{self.session.url}{path}", headers=headers, **kwargs)
        if response.status_code >= 400:
            try:
                detail = response.json().get("message")
            except ValueError:
                detail = None
            raise SupabaseError(detail or f"{method} {path.split('?')[0]} answered {response.status_code}")
        return response

    async def device(self, device_id: str) -> dict | None:
        """This Pi's Autolab, or None until its owner links it."""
        rows = (await self._call("GET", "/rest/v1/devices", params={"id": f"eq.{device_id}", "select": "id,owner_id,name"})).json()
        return rows[0] if rows else None

    async def report(self, device_id: str, fields: dict) -> None:
        await self._call("PATCH", "/rest/v1/devices", params={"id": f"eq.{device_id}"}, json=fields)

    async def pending(self, device_id: str) -> list[dict]:
        params = {"device_id": f"eq.{device_id}", "status": "eq.pending", "order": "created_at", "select": "id,kind,created_at"}
        return (await self._call("GET", "/rest/v1/actions", params=params)).json()

    async def move(self, action_id: str, fields: dict, only_from: str | None = None) -> bool:
        """Updates a command. With only_from, only if it is still in that state, so two Pis can't both take it."""
        params = {"id": f"eq.{action_id}", "select": "id"}
        if only_from:
            params["status"] = f"eq.{only_from}"
        headers = {"Prefer": "return=representation"}
        return bool((await self._call("PATCH", "/rest/v1/actions", params=params, json=fields, headers=headers)).json())

    async def upload(self, path: str, jpeg: bytes) -> None:
        await self._call("POST", f"/storage/v1/object/{BUCKET}/{path}", content=jpeg, headers={"Content-Type": "image/jpeg"})

    async def add_image(self, row: dict) -> None:
        # The Pi may file photos but not read them back, so ask for nothing in return.
        await self._call("POST", "/rest/v1/images", json=row, headers={"Prefer": "return=minimal"})
