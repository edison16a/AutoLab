"""Start lab mode: load or create the Pi's login, then run until stopped."""

import argparse
import asyncio
import logging

import httpx

from ..camera import Camera
from ..credentials import load_or_create
from ..hardware.station import Station
from . import session as auth
from .api import Supabase
from .runner import MAX_RETRY, LabAgent

log = logging.getLogger("agent")


def wanted(args: argparse.Namespace) -> bool:
    """Lab mode when Supabase settings were given or Bluetooth setup saved a login."""
    return bool(args.supabase_url and args.supabase_key) or auth.session_path(args.credentials).exists()


def setup_code(device_id: str, user_id: str) -> str:
    """What the manual setup form takes: which Autolab, and which login to link to it."""
    return f"{device_id}/{user_id}"


async def login(client: httpx.AsyncClient, args: argparse.Namespace) -> auth.Session:
    """The saved login, freshly refreshed. A new one when there is none, or the project changed."""
    saved = auth.load(args.credentials)
    url = (args.supabase_url or (saved.url if saved else "")).rstrip("/")
    key = args.supabase_key or (saved.key if saved else "")
    if saved and (saved.url, saved.key) == (url, key):
        session = await auth.refresh(client, saved)
    else:
        session = await auth.sign_in(client, url, key)
        log.info("Signed in to Supabase as a new Pi login")
    auth.save(args.credentials, session)
    return session


async def run_lab(args: argparse.Namespace) -> None:
    creds = load_or_create(args.credentials)
    camera = Camera(args.simulate)
    print(f"Device ID: {creds['device_id']}", flush=True)
    # None unless hardware is configured in .env.
    hardware = await asyncio.to_thread(Station.start)
    delay = 1
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            while True:
                try:
                    session = await login(client, args)
                    break
                except httpx.HTTPError as exc:
                    # No network yet, for example right after boot. Keep trying.
                    log.warning("Can't reach Supabase (%s). Retrying in %ss", type(exc).__name__, delay)
                    await asyncio.sleep(delay)
                    delay = min(MAX_RETRY, delay * 2)
            print(f"Setup code: {setup_code(creds['device_id'], session.user_id)}", flush=True)
            api = Supabase(client, session, lambda fresh: auth.save(args.credentials, fresh))
            await LabAgent(api, camera, creds["device_id"], hardware).run()
    finally:
        camera.close()
        if hardware:
            await asyncio.to_thread(hardware.close)
