"""Bluetooth setup in lab mode gives the Pi a fresh Supabase login and restarts the agent."""

import asyncio
import json

import httpx

from autolab_agent.lab import session as auth
from autolab_agent.provisioning import lab_login


def test_setup_saves_a_fresh_login_for_the_agent(tmp_path, monkeypatch):
    restarted = []

    async def restart():
        restarted.append(True)

    def handler(request):
        assert request.url.path == "/auth/v1/signup"
        body = {"access_token": "a", "refresh_token": "r", "expires_in": 3600, "user": {"id": "pi-login"}}
        return httpx.Response(200, json=body)

    real = httpx.AsyncClient
    monkeypatch.setattr(lab_login, "restart_agent", restart)
    monkeypatch.setattr(lab_login.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(handler), **kw))
    credentials = tmp_path / "credentials.json"
    user = asyncio.run(lab_login.sign_in_pi(str(credentials), "https://abc.supabase.co", "public-key"))
    assert user == "pi-login" and restarted == [True]
    assert json.loads((tmp_path / "supabase.json").read_text())["refresh_token"] == "r"
    assert auth.load(credentials).user_id == "pi-login"
