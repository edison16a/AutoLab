"""Switch the Bluetooth adapter on, even on an image that starts with it blocked.

A fresh Raspberry Pi OS image can have Bluetooth soft blocked by rfkill. BlueZ
then refuses to power the adapter on with a bare "Failed", and the block lasts
through every restart of the setup service.
"""

import asyncio

POWER_FAILURE = (
    "Bluetooth did not switch on ({}). Try sudo rfkill unblock bluetooth, then "
    "sudo systemctl restart bluetooth, or power the Pi off and on again."
)
POWER_TRIES = 5
POWER_RETRY = 1  # seconds between tries


async def switch_on(power_on) -> None:
    """Unblock Bluetooth, then await `power_on()`. If BlueZ still refuses, end setup.

    BlueZ switches the adapter on by itself at boot and once it sees the
    unblock, and answers Busy until that is done. So a refusal is tried
    again for a few seconds. After that the exit is non zero, and systemd
    starts setup again 10 seconds later.
    """
    await unblock_bluetooth()
    for attempt in range(1, POWER_TRIES + 1):
        try:
            await power_on()
            return
        except Exception as exc:
            if attempt == POWER_TRIES:
                # dbus-next keeps the BlueZ error name in `type`, like org.bluez.Error.Failed.
                name = getattr(exc, "type", type(exc).__name__)
                raise SystemExit(POWER_FAILURE.format(f"{name}: {exc}"))
        await asyncio.sleep(POWER_RETRY)


async def unblock_bluetooth() -> None:
    """Run rfkill unblock bluetooth, which works since setup runs as root.

    Best effort: without rfkill, or when it fails, setting Powered says why.
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "rfkill",
            "unblock",
            "bluetooth",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(process.wait(), 10)
    except (OSError, TimeoutError):
        pass
