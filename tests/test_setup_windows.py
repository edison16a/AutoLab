"""Setup on boot: one window after every start, more while the Pi is offline."""

import asyncio
import json
from types import SimpleNamespace

import pytest

from autolab_agent.provisioning import windows


@pytest.fixture
def args(tmp_path):
    credentials = tmp_path / "credentials.json"
    credentials.write_text(json.dumps({"device_id": "id", "secret": "s"}))
    return SimpleNamespace(credentials=str(credentials), on_boot=True)


def open_windows(args, monkeypatch, online, guesses=0):
    """Run open_setup with a fake radio. Returns the attempts each window began with."""
    answers = iter(online)
    started = []

    async def network_online():
        return next(answers)

    async def serve(_, session):
        started.append(session.attempts)
        session.attempts += guesses

    monkeypatch.setattr(windows, "network_online", network_online)
    asyncio.run(windows.open_setup(args, serve))
    return started


def test_started_by_hand_opens_one_window(args, monkeypatch):
    args.on_boot = False
    assert len(open_windows(args, monkeypatch, online=[False])) == 1


def test_online_at_boot_still_opens_one_window(args, monkeypatch):
    assert len(open_windows(args, monkeypatch, online=[True])) == 1


def test_offline_keeps_renewing_until_online(args, monkeypatch):
    assert len(open_windows(args, monkeypatch, online=[False, False, True])) == 3


def test_wrong_guesses_carry_over_and_end_the_renewals(args, monkeypatch):
    started = open_windows(args, monkeypatch, online=[False] * 9, guesses=2)
    assert started == [0, 2, 4]


@pytest.mark.parametrize(
    "answer, online",
    [
        (b"connected\n", True),
        (b"connected (site only)\n", True),
        (b"connected (local only)\n", True),
        (b"connecting\n", False),
        (b"disconnected\n", False),
        (b"asleep\n", False),
    ],
)
def test_nmcli_state(monkeypatch, answer, online):
    class Process:
        async def communicate(self):
            return answer, b""

    async def nmcli(*command, **kwargs):
        assert command[0] == "nmcli" and kwargs["env"]["LC_ALL"] == "C"
        return Process()

    monkeypatch.setattr(windows.asyncio, "create_subprocess_exec", nmcli)
    assert asyncio.run(windows.network_online()) is online


def test_missing_nmcli_counts_as_offline(monkeypatch):
    async def missing(*command, **kwargs):
        raise FileNotFoundError("nmcli")

    monkeypatch.setattr(windows.asyncio, "create_subprocess_exec", missing)
    assert asyncio.run(windows.network_online()) is False
