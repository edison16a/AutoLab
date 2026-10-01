"""HTTP routes. All but /health and /lan need cloud mode, and most need an owner.

Route notes are comments, not docstrings, because FastAPI publishes route
docstrings in the OpenAPI schema.
"""

from fastapi import APIRouter, HTTPException, Query, Request

from . import state
from .cloud import digest
from .config import LAN_URLS, MODE
from .lan import lan_addresses
from .limits import rate
from .models import Claim, Registration, Rename
from .protocol import uid

router = APIRouter()


async def user(request: Request) -> str:
    """The signed-in user's id. Cloud routes answer 404 while cloud mode is off."""
    if not state.cloud:
        raise HTTPException(404, "Cloud mode is disabled")
    token = request.headers.get("authorization", "").removeprefix("Bearer ")
    return await state.cloud.user(token)


@router.get("/health")
async def health():
    return {"ok": True, "mode": MODE}


@router.get("/lan")
def lan(request: Request):
    # Open in every mode. The lab station's web app reads this computer's LAN
    # address here and hands it to a Pi over Bluetooth. A plain def, so FastAPI
    # runs the address lookups in a worker thread.
    if LAN_URLS:
        return {"urls": LAN_URLS}
    port = request.url.port or 8000
    return {"urls": [f"ws://{ip}:{port}" for ip in lan_addresses()]}


@router.post("/devices/register")
async def register(body: Registration, request: Request):
    # Called by the Pi itself, so the limit is per client address, not per user.
    if not state.cloud:
        raise HTTPException(404, "Cloud mode is disabled")
    rate(("register", request.client.host), 10)
    return await state.cloud.register(str(body.device_id), body.secret)


@router.post("/devices/claim")
async def claim(body: Claim, request: Request):
    # Six-digit codes are guessable in bulk, so claims get a tight per-user limit.
    owner = await user(request)
    rate(("claim", owner), 5)
    result = await state.cloud.call(
        "POST",
        "/rest/v1/rpc/claim_device",
        {"code_hash": digest(body.code), "new_owner": owner, "device_name": body.name},
    )
    if not result:
        raise HTTPException(400, "Code expired or already used")
    return {"device_id": result}


@router.get("/devices")
async def devices(request: Request):
    owner = await user(request)
    return await state.cloud.call(
        "GET", f"/rest/v1/devices?owner_id=eq.{owner}&order=created_at.desc"
    )


@router.patch("/devices/{device}")
async def rename(device: str, body: Rename, request: Request):
    device = uid(device)
    owner = await user(request)
    await state.cloud.owner(device, owner)
    return await state.cloud.call(
        "PATCH", f"/rest/v1/devices?id=eq.{device}", {"name": body.name}
    )


@router.get("/devices/{device}/images")
async def images(device: str, request: Request, offset: int = Query(0, ge=0)):
    # Check the mode first. state.cloud is None in demo mode, so reading it early crashed with a 500.
    owner = await user(request)
    return await state.cloud.images(uid(device), owner, offset)


@router.delete("/images/{image}")
async def delete(image: str, request: Request):
    image = uid(image)
    owner = await user(request)
    await state.cloud.delete_image(image, owner)
    return {"deleted": True}
