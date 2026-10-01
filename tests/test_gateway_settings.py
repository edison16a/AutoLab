"""gateway.json: written by Bluetooth setup as root, read by the agent as the user."""

import asyncio
import json
import os
import stat

import pytest

from autolab_agent import settings
from autolab_agent.provisioning import repoint

LAN = "ws://192.168.1.20:8000"


@pytest.fixture
def credentials(tmp_path):
    folder = tmp_path / "autolab"
    folder.mkdir()
    return folder / "credentials.json"


def test_saved_gateway_sits_beside_the_credentials(credentials):
    settings.save_gateway(credentials, LAN)
    path = credentials.parent / "gateway.json"
    assert json.loads(path.read_text()) == {"gateway": LAN}
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert settings.load_gateway(credentials) == LAN


@pytest.mark.skipif(os.geteuid() != 0, reason="only root can hand a file to another user")
def test_root_hands_the_file_to_the_folder_owner(credentials):
    os.chown(credentials.parent, 1000, 1000)
    settings.save_gateway(credentials, LAN)
    saved = (credentials.parent / "gateway.json").stat()
    assert (saved.st_uid, saved.st_gid) == (1000, 1000)


def test_a_planted_symlink_is_never_followed(credentials, tmp_path):
    victim = tmp_path / "victim"
    victim.write_text("keep me")
    (credentials.parent / "gateway.tmp").symlink_to(victim)
    settings.save_gateway(credentials, LAN)
    assert victim.read_text() == "keep me"
    assert settings.load_gateway(credentials) == LAN


@pytest.mark.parametrize(
    "content",
    ["not json", "[]", '{"gateway": "ws://example.com:8000"}', '{"gateway": 5}'],
)
def test_a_broken_file_is_ignored(credentials, content):
    (credentials.parent / "gateway.json").write_text(content)
    assert settings.load_gateway(credentials) is None


def test_repoint_restarts_the_agent_only_when_the_gateway_changes(
    credentials, monkeypatch
):
    restarts = []

    async def restart():
        restarts.append(True)

    monkeypatch.setattr(repoint, "restart_agent", restart)
    asyncio.run(repoint.repoint_agent(str(credentials), LAN))
    asyncio.run(repoint.repoint_agent(str(credentials), LAN))
    assert settings.load_gateway(credentials) == LAN
    assert len(restarts) == 1


def test_missing_agent_unit_does_not_fail_setup(monkeypatch, caplog):
    async def no_systemctl(*args, **kwargs):
        raise FileNotFoundError("systemctl")

    monkeypatch.setattr(repoint.asyncio, "create_subprocess_exec", no_systemctl)
    asyncio.run(repoint.restart_agent())
    assert "Could not restart autolab-agent" in caplog.text
