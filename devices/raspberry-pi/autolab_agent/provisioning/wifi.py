"""Join a WPA network through NetworkManager, falling back to the old one on failure.

Also tells whether the Pi is online and which Wi-Fi it is on now.
"""

import asyncio

from dbus_next import Variant

from .dbus_proxy import proxy

NM = "org.freedesktop.NetworkManager"
NM_PATH = "/org/freedesktop/NetworkManager"
PROPERTIES = "org.freedesktop.DBus.Properties"
WIRELESS = NM + ".Device.Wireless"
DEVICE_TYPE_WIFI = 2
DEVICE_UNAVAILABLE = 20  # what rfkill, or no Wi-Fi country on Raspberry Pi OS, leaves
DEVICE_ACTIVATED = 100
STATE_ACTIVATED = 2
STATE_DEACTIVATED = 4
CONNECTED_LOCAL = 50  # the lowest of NetworkManager's connected states
ACTIVATION_TIMEOUT = 45
SCAN_TIMEOUT = 15  # NetworkManager may hold a scan back 8 seconds while connected
PROFILE = "Autolab Wi-Fi"


class WifiOff(RuntimeError):
    """The Wi-Fi adapter can't be used, usually because no Wi-Fi country is set."""


class NotInRange(RuntimeError):
    """The Pi can't see that network, so joining it would only drop the one it is on."""


async def connect_wifi(bus, ssid: str, password: str) -> None:
    """Add and activate an "Autolab Wi-Fi" profile, or undo it and raise.

    A failed attempt must not leave the Pi offline, so the new profile is
    deleted and the previous connection, if any, is brought back. That may
    not work: a phone hotspot may not let the Pi back on. NetworkManager
    drops the current Wi-Fi as soon as a join starts, even for a network it
    can't see, so a Pi on Wi-Fi only tries a network in its scan list.
    """
    manager = await proxy(bus, NM, NM_PATH, NM)
    device, previous = await _wifi_device(bus, manager)
    props = await proxy(bus, NM, device, PROPERTIES)
    if (await props.call_get(NM + ".Device", "State")).value == DEVICE_UNAVAILABLE:
        raise WifiOff("The Wi-Fi adapter is unavailable")
    seen = await _in_range(bus, device, ssid)
    if not seen and previous != "/":
        raise NotInRange("The network is not in the scan list")
    connection, active = await manager.call_add_and_activate_connection(
        _settings(ssid, password, hidden=not seen), device, "/"
    )
    try:
        await _wait_until_active(bus, active)
    except (Exception, asyncio.CancelledError):
        # A window that closes mid join cancels this, and must undo it too.
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


async def is_online(bus) -> bool:
    """Whether NetworkManager reports a connection, even one without internet.

    This is the test windows.network_online makes.
    """
    nm = await proxy(bus, NM, NM_PATH, PROPERTIES)
    return (await nm.call_get(NM, "State")).value >= CONNECTED_LOCAL


async def current_ssid(bus) -> str | None:
    """The SSID of the Wi-Fi the Pi is on now, or None for none.

    Wi-Fi that is still joining has none yet.
    """
    manager = await proxy(bus, NM, NM_PATH, NM)
    try:
        device, connection = await _wifi_device(bus, manager)
    except RuntimeError:
        return None  # no Wi-Fi adapter, so a cable if anything
    props = await proxy(bus, NM, device, PROPERTIES)
    state = (await props.call_get(NM + ".Device", "State")).value
    if connection == "/" or state != DEVICE_ACTIVATED:
        return None
    saved = await proxy(bus, NM, connection, NM + ".Settings.Connection")
    ssid = (await saved.call_get_settings()).get("802-11-wireless", {}).get("ssid")
    return bytes(ssid.value).decode(errors="replace") if ssid else None


async def _in_range(bus, device: str, ssid: str) -> bool:
    """Whether the adapter sees `ssid`, after a fresh scan if one finishes in time.

    NetworkManager stops scanning by itself while connected, so its list
    can be old. A network that hides its name never shows up here.
    """
    wireless = await proxy(bus, NM, device, WIRELESS)
    props = await proxy(bus, NM, device, PROPERTIES)
    try:
        last = (await props.call_get(WIRELESS, "LastScan")).value
        await wireless.call_request_scan({})
        for _ in range(SCAN_TIMEOUT):
            await asyncio.sleep(1)
            if (await props.call_get(WIRELESS, "LastScan")).value != last:
                break
    except Exception:
        pass  # without a new scan, the list it has will do
    wanted = ssid.encode()
    for path in await wireless.call_get_all_access_points():
        try:
            ap = await proxy(bus, NM, path, PROPERTIES)
            name = (await ap.call_get(NM + ".AccessPoint", "Ssid")).value
        except Exception:
            continue  # gone since the list was made
        if bytes(name) == wanted:
            return True
    return False


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


def _settings(ssid: str, password: str, hidden: bool) -> dict:
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
            # A network that hides its name is only found again after a
            # restart when NetworkManager knows to ask for it by name.
            "hidden": Variant("b", hidden),
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
