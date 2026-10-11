"""Switching Bluetooth on: rfkill first, and a clear message when BlueZ refuses."""

import asyncio

import pytest

from autolab_agent.provisioning import radio


@pytest.fixture
def calls(monkeypatch):
    """A fake rfkill. Returns the list of what ran, in order."""
    seen = []

    class Process:
        async def wait(self):
            return 0

    async def rfkill(*command, **kwargs):
        seen.append(command)
        return Process()

    monkeypatch.setattr(radio.asyncio, "create_subprocess_exec", rfkill)
    return seen


def test_rfkill_unblocks_bluetooth_before_power_on(calls):
    async def power_on():
        calls.append("Powered")

    asyncio.run(radio.switch_on(power_on))
    assert calls == [("rfkill", "unblock", "bluetooth"), "Powered"]


def test_missing_rfkill_does_not_stop_setup(monkeypatch):
    powered = []

    async def missing(*command, **kwargs):
        raise FileNotFoundError("rfkill")

    async def power_on():
        powered.append(True)

    monkeypatch.setattr(radio.asyncio, "create_subprocess_exec", missing)
    asyncio.run(radio.switch_on(power_on))
    assert powered == [True]


def test_busy_while_bluez_switches_on_by_itself_is_tried_again(calls, monkeypatch):
    # After an unblock BlueZ powers the adapter on itself, and answers Busy meanwhile.
    class DBusError(Exception):
        type = "org.bluez.Error.Busy"  # where dbus-next keeps the name

    async def power_on():
        calls.append("Powered")
        if calls.count("Powered") == 1:
            raise DBusError("")

    monkeypatch.setattr(radio, "POWER_RETRY", 0)
    asyncio.run(radio.switch_on(power_on))
    assert calls == [("rfkill", "unblock", "bluetooth"), "Powered", "Powered"]


def test_a_refused_power_on_says_what_to_try(calls, monkeypatch):
    class DBusError(Exception):
        type = "org.bluez.Error.Failed"

    async def power_on():
        calls.append("Powered")
        raise DBusError("Failed")

    monkeypatch.setattr(radio, "POWER_RETRY", 0)
    # A message in SystemExit prints as one line and exits with status 1.
    with pytest.raises(SystemExit) as ended:
        asyncio.run(radio.switch_on(power_on))
    assert calls.count("Powered") == radio.POWER_TRIES
    assert str(ended.value) == (
        "Bluetooth did not switch on (org.bluez.Error.Failed: Failed). Try sudo "
        "rfkill unblock bluetooth, then sudo systemctl restart bluetooth, or "
        "power the Pi off and on again."
    )
