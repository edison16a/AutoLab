"""The BlueZ GATT objects: one setup service with a command and a status characteristic.

dbus-next reads each D-Bus signature from the annotations ("s", "ay", "a{sv}"),
so those strings are wire types, not Python type hints.
"""

import json
from collections.abc import Awaitable, Callable

from dbus_next import DBusError, PropertyAccess, Variant
from dbus_next.service import ServiceInterface, dbus_property, method

from .session import ProvisioningSession

SERVICE_UUID = "f7a10000-76b8-4f58-9b31-879c4e198a10"
COMMAND_UUID = "f7a10001-76b8-4f58-9b31-879c4e198a10"
STATUS_UUID = "f7a10002-76b8-4f58-9b31-879c4e198a10"
ROOT = "/com/autolab/setup"
SERVICE_PATH = ROOT + "/service"
KINDS = ("command", "status")


def _uuid(kind: str) -> str:
    return COMMAND_UUID if kind == "command" else STATUS_UUID


def _flags(kind: str) -> list[str]:
    """Both characteristics need an encrypted link, which BlueZ gets by pairing."""
    return ["write", "encrypt-write"] if kind == "command" else ["read", "encrypt-read"]


class Service(ServiceInterface):
    def __init__(self) -> None:
        super().__init__("org.bluez.GattService1")

    @dbus_property(access=PropertyAccess.READ)
    def UUID(self) -> "s":
        return SERVICE_UUID

    @dbus_property(access=PropertyAccess.READ)
    def Primary(self) -> "b":
        return True


class Characteristic(ServiceInterface):
    """The write-only command or the read-only status characteristic.

    `on_request` gets (ssid, password) once a full request with the right PIN
    has arrived. `on_read` asks NetworkManager again before status is read,
    so it says whether the Pi is online and on which Wi-Fi right now.
    """

    def __init__(
        self,
        kind: str,
        session: ProvisioningSession,
        on_request: Callable[[str, str], None],
        on_read: Callable[[], Awaitable[None]],
    ) -> None:
        super().__init__("org.bluez.GattCharacteristic1")
        self.kind = kind
        self.session = session
        self.on_request = on_request
        self.on_read = on_read

    @dbus_property(access=PropertyAccess.READ)
    def UUID(self) -> "s":
        return _uuid(self.kind)

    @dbus_property(access=PropertyAccess.READ)
    def Service(self) -> "o":
        return SERVICE_PATH

    @dbus_property(access=PropertyAccess.READ)
    def Flags(self) -> "as":
        return _flags(self.kind)

    @method()
    async def ReadValue(self, options: "a{sv}") -> "ay":
        if self.kind != "status":
            raise DBusError("org.bluez.Error.NotPermitted", "Write-only characteristic")
        # Long reads arrive in pieces, each asking from an offset. Only the
        # first piece checks the network, so the pieces still fit together.
        offset = options.get("offset", Variant("q", 0)).value
        if not offset:
            await self.on_read()
        data = self.session.report()
        # Anyone nearby can read status. Only the phone that knew the PIN sees the code.
        peer = options.get("device", Variant("o", "/")).value
        if peer != self.session.authorized_peer:
            data.pop("claim_code", None)
        return json.dumps(data).encode()[offset:]

    @method()
    def WriteValue(self, value: "ay", options: "a{sv}"):
        if self.kind != "command":
            raise DBusError("org.bluez.Error.NotPermitted", "Read-only characteristic")
        # Requests are framed by the session, so only appends make sense.
        if options.get("offset", Variant("q", 0)).value:
            raise DBusError("org.bluez.Error.InvalidOffset", "Use sequential chunks")
        peer = options.get("device", Variant("o", "/")).value
        try:
            result = self.session.receive(peer, bytes(value))
        except ValueError as exc:
            raise DBusError("org.bluez.Error.Failed", str(exc))
        if result:
            self.on_request(*result)


class Application(ServiceInterface):
    """What BlueZ reads to learn the service tree when the app is registered."""

    def __init__(self) -> None:
        super().__init__("org.freedesktop.DBus.ObjectManager")

    @method()
    def GetManagedObjects(self) -> "a{oa{sa{sv}}}":
        return {
            SERVICE_PATH: {
                "org.bluez.GattService1": {
                    "UUID": Variant("s", SERVICE_UUID),
                    "Primary": Variant("b", True),
                }
            },
            **{
                SERVICE_PATH + "/" + kind: {
                    "org.bluez.GattCharacteristic1": {
                        "UUID": Variant("s", _uuid(kind)),
                        "Service": Variant("o", SERVICE_PATH),
                        "Flags": Variant("as", _flags(kind)),
                    }
                }
                for kind in KINDS
            },
        }


class Advertisement(ServiceInterface):
    """Advertises the setup service under a name that ends with the device id prefix."""

    def __init__(self, device_id: str) -> None:
        super().__init__("org.bluez.LEAdvertisement1")
        self.device_id = device_id

    @dbus_property(access=PropertyAccess.READ)
    def Type(self) -> "s":
        return "peripheral"

    @dbus_property(access=PropertyAccess.READ)
    def ServiceUUIDs(self) -> "as":
        return [SERVICE_UUID]

    @dbus_property(access=PropertyAccess.READ)
    def LocalName(self) -> "s":
        return "Autolab-" + self.device_id[:4]

    @method()
    def Release(self):
        pass
