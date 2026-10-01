"""Join a WPA network through NetworkManager, falling back to the old one on failure."""

import asyncio

from dbus_next import Variant

from .dbus_proxy import proxy

NM = "org.freedesktop.NetworkManager"
NM_PATH = "/org/freedesktop/NetworkManager"
PROPERTIES = "org.freedesktop.DBus.Properties"
DEVICE_TYPE_WIFI = 2
STATE_ACTIVATED = 2
STATE_DEACTIVATED = 4
ACTIVATION_TIMEOUT = 45
PROFILE = "Autolab Wi-Fi"


async def connect_wifi(bus, ssid: str, password: str) -> None:
    """Add and activate an "Autolab Wi-Fi" profile, or undo it and raise.

    A failed attempt must not leave the Pi offline, so the new profile is
    deleted and the previous connection, if any, is brought back.
    """
    manager = await proxy(bus, NM, NM_PATH, NM)
    device, previous = await _wifi_device(bus, manager)
    connection, active = await manager.call_add_and_activate_connection(
        _settings(ssid, password), device, "/"
    )
    try:
        await _wait_until_active(bus, active)
    except Exception:
        try:
            saved = await proxy(bus, NM, connection, NM + ".Settings.Connection")
            await saved.call_delete()
            if previous != "/":
                await manager.call_activate_connection(previous, device, "/")
        except Exception:
            pass
        raise
    try:
        await _forget_older_profiles(bus, connection)
    except Exception:
        pass  # tidying up must never fail a setup that worked


async def _forget_older_profiles(bus, keep: str) -> None:
    """Every setup adds a profile, and a lab may set up again at each power cycle.

    Only once the new one works are the older Autolab profiles deleted.
    """
    settings = await proxy(bus, NM, NM_PATH + "/Settings", NM + ".Settings")
    for path in await settings.call_list_connections():
        if path == keep:
            continue
        saved = await proxy(bus, NM, path, NM + ".Settings.Connection")
        config = await saved.call_get_settings()
        name = config.get("connection", {}).get("id")
        if name is not None and name.value == PROFILE:
            await saved.call_delete()


async def _wifi_device(bus, manager) -> tuple[str, str]:
    """The first Wi-Fi adapter and the connection it is using now ("/" for none)."""
    for path in await manager.call_get_devices():
        props = await proxy(bus, NM, path, PROPERTIES)
        if (await props.call_get(NM + ".Device", "DeviceType")).value != DEVICE_TYPE_WIFI:
            continue
        previous = "/"
        active = (await props.call_get(NM + ".Device", "ActiveConnection")).value
        if active != "/":
            ap = await proxy(bus, NM, active, PROPERTIES)
            previous = (
                await ap.call_get(NM + ".Connection.Active", "Connection")
            ).value
        return path, previous
    raise RuntimeError("No Wi-Fi adapter managed by NetworkManager")


def _settings(ssid: str, password: str) -> dict:
    return {
        "connection": {
            "id": Variant("s", PROFILE),
            "type": Variant("s", "802-11-wireless"),
            "autoconnect": Variant("b", True),
        },
        "802-11-wireless": {
            "ssid": Variant("ay", ssid.encode()),
            "mode": Variant("s", "infrastructure"),
            "security": Variant("s", "802-11-wireless-security"),
        },
        "802-11-wireless-security": {
            "key-mgmt": Variant("s", "wpa-psk"),
            "psk": Variant("s", password),
        },
        "ipv4": {"method": Variant("s", "auto")},
        "ipv6": {"method": Variant("s", "auto")},
    }


async def _wait_until_active(bus, active: str) -> None:
    props = await proxy(bus, NM, active, PROPERTIES)
    for _ in range(ACTIVATION_TIMEOUT):
        state = (await props.call_get(NM + ".Connection.Active", "State")).value
        if state == STATE_ACTIVATED:
            return
        if state == STATE_DEACTIVATED:
            raise RuntimeError("Wi-Fi activation failed")
        await asyncio.sleep(1)
    raise RuntimeError("Wi-Fi activation timed out")
