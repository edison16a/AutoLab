"""Lab mode on the Pi: its own Supabase login, the calls it makes and how it runs commands."""

import argparse
import asyncio
import json
import stat
import time
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from autolab_agent.lab import session as auth
from autolab_agent.lab.api import Supabase
from autolab_agent.lab.channel import DeviceChannel
from autolab_agent.lab.runner import LabAgent
from autolab_agent.lab.start import setup_code, wanted

URL, KEY = "https://abc.supabase.co", "public-anon-key"
DEVICE, OWNER, PI = "d" * 8 + "-0000-0000-0000-000000000000", "owner-id", "pi-id"


def token_body(refresh="r2", access="a2"):
    return {"access_token": access, "refresh_token": refresh, "expires_in": 3600, "user": {"id": PI}}


def client_for(handler):
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


@pytest.fixture
def credentials(tmp_path):
    return tmp_path / "credentials.json"


def test_the_saved_login_keeps_only_long_lived_parts(credentials):
    auth.save(credentials, auth.Session(URL, KEY, PI, "r1", "secret-access", 99.0))
    path = credentials.parent / "supabase.json"
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert json.loads(path.read_text()) == {"url": URL, "key": KEY, "user_id": PI, "refresh_token": "r1"}
    assert auth.load(credentials) == auth.Session(URL, KEY, PI, "r1")


def test_a_broken_login_file_says_so(credentials):
    (credentials.parent / "supabase.json").write_text("{nope")
    with pytest.raises(auth.SignInError, match="unreadable"):
        auth.load(credentials)


def test_sign_in_reports_why_supabase_refused():
    async def go():
        handler = lambda request: httpx.Response(422, json={"msg": "Anonymous sign-ins are disabled"})
        async with client_for(handler) as client:
            await auth.sign_in(client, URL, KEY)

    with pytest.raises(auth.SignInError, match="Anonymous sign-ins are disabled"):
        asyncio.run(go())


def test_sign_in_is_anonymous_with_the_public_key():
    seen = {}

    def handler(request):
        seen.update(path=request.url.path, key=request.headers["apikey"], body=json.loads(request.content))
        return httpx.Response(200, json=token_body())

    async def go():
        async with client_for(handler) as client:
            return await auth.sign_in(client, URL, KEY)

    session = asyncio.run(go())
    assert seen == {"path": "/auth/v1/signup", "key": KEY, "body": {"data": {}}}
    assert (session.user_id, session.refresh_token, session.stale) == (PI, "r2", False)


def test_a_stale_token_is_refreshed_and_the_new_one_saved_at_once():
    saved = []

    def handler(request):
        if request.url.path == "/auth/v1/token":
            assert json.loads(request.content) == {"refresh_token": "r1"}
            return httpx.Response(200, json=token_body())
        assert request.headers["authorization"] == "Bearer a2"
        return httpx.Response(200, json=[])

    async def go():
        async with client_for(handler) as client:
            api = Supabase(client, auth.Session(URL, KEY, PI, "r1", "a1", time.time() - 1), saved.append)
            return await api.pending(DEVICE)

    assert asyncio.run(go()) == []
    assert [s.refresh_token for s in saved] == ["r2"]


def test_a_claim_only_takes_a_command_still_pending():
    def handler(request):
        assert request.url.params["status"] == "eq.pending"
        assert request.headers["prefer"] == "return=representation"
        return httpx.Response(200, json=[])

    async def go():
        async with client_for(handler) as client:
            api = Supabase(client, auth.Session(URL, KEY, PI, "r1", "a1", time.time() + 3600), lambda s: None)
            return await api.move("action-1", {"status": "running"}, only_from="pending")

    assert asyncio.run(go()) is False


def test_lab_mode_starts_from_settings_or_a_saved_login(credentials):
    args = argparse.Namespace(supabase_url="", supabase_key="", credentials=str(credentials))
    assert not wanted(args)
    auth.save(credentials, auth.Session(URL, KEY, PI, "r1"))
    assert wanted(args)
    assert setup_code(DEVICE, PI) == f"{DEVICE}/{PI}"


def test_the_channel_speaks_websockets_to_the_project():
    channel = DeviceChannel(URL, KEY, DEVICE, lambda: None)
    assert channel.socket_url == f"wss://abc.supabase.co/realtime/v1/websocket?apikey={KEY}&vsn=1.0.0"
    assert channel.topic == f"realtime:device:{DEVICE}"


class FakeApi:
    def __init__(self, claim=True):
        self.session = auth.Session(URL, KEY, PI, "r1", "a1", time.time() + 3600)
        self.claim = claim
        self.calls = []

    async def move(self, action_id, fields, only_from=None):
        self.calls.append(("move", action_id, fields, only_from))
        return self.claim if only_from else True

    async def upload(self, path, jpeg):
        self.calls.append(("upload", path, len(jpeg)))

    async def add_image(self, row):
        self.calls.append(("image", row))


class FakeCamera:
    simulate = True
    error = None

    def __init__(self, online=True):
        self.online = online

    def capture(self, still=False):
        return (b"\xff\xd8" + b"0" * 98, 4056, 3040) if still else (b"frame", 640, 480)


def command(kind="capture_photo", age=1):
    created = datetime.now(timezone.utc) - timedelta(seconds=age)
    return {"id": "action-1", "kind": kind, "created_at": created.isoformat()}


def run_command(api, camera, action):
    async def go():
        agent = LabAgent(api, camera, DEVICE)
        agent.owner_id = OWNER
        await agent.run_command(action)

    asyncio.run(go())
    return api.calls


def test_a_photo_command_files_the_still_under_the_owner():
    calls = run_command(FakeApi(), FakeCamera(), command())
    assert calls[0] == ("move", "action-1", {"status": "running"}, "pending")
    upload, image, done = calls[1:]
    image_id = image[1]["id"]
    assert upload == ("upload", f"{OWNER}/{DEVICE}/{image_id}.jpg", 100)
    assert image[1] | {"captured_at": None} == {
        "id": image_id, "device_id": DEVICE, "owner_id": OWNER, "storage_path": upload[1],
        "captured_at": None, "width": 4056, "height": 3040, "source": "simulator", "bytes": 100,
    }
    assert done == ("move", "action-1", {"status": "done", "image_id": image_id}, None)


def test_a_command_another_pi_took_is_left_alone():
    assert run_command(FakeApi(claim=False), FakeCamera(), command()) == [
        ("move", "action-1", {"status": "running"}, "pending")
    ]


def test_an_old_command_expires_instead_of_running():
    calls = run_command(FakeApi(), FakeCamera(), command(age=120))
    assert calls == [("move", "action-1", {"status": "expired", "error": "The Autolab got this too late."}, "pending")]


def test_without_a_camera_the_command_fails_with_the_reason():
    calls = run_command(FakeApi(), FakeCamera(online=False), command())
    assert calls[-1] == ("move", "action-1", {"status": "failed", "error": "The camera isn't connected."}, None)


def test_an_unknown_command_fails_politely():
    calls = run_command(FakeApi(), FakeCamera(), command(kind="start_preview"))
    assert calls[-1] == ("move", "action-1", {"status": "failed", "error": "The Autolab can't do that yet."}, None)


def test_screens_wake_the_pi_and_keep_the_preview_going():
    async def go():
        agent = LabAgent(FakeApi(), FakeCamera(), DEVICE)
        agent.on_broadcast("wake", {})
        agent.on_broadcast("watch", {})
        return agent.wake.is_set(), time.monotonic() - agent.watched_at

    woken, since_watch = asyncio.run(go())
    assert woken and since_watch < 1
