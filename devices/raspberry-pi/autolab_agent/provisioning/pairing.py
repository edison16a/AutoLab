"""The BlueZ pairing agent used while the setup window is open.

It registers as NoInputNoOutput, so pairing needs no confirmation on the Pi.
The setup PIN inside each request is what proves the phone's user is present.
Annotations are D-Bus signatures read by dbus-next, not Python type hints.
"""

import time

from dbus_next import DBusError
from dbus_next.service import ServiceInterface, method

from .gatt import SERVICE_UUID
from .session import ProvisioningSession


class PairingAgent(ServiceInterface):
    def __init__(self, session: ProvisioningSession) -> None:
        super().__init__("org.bluez.Agent1")
        self.session = session

    @method()
    def Release(self):
        pass

    @method()
    def RequestAuthorization(self, device: "o"):
        if time.monotonic() > self.session.deadline:
            raise DBusError("org.bluez.Error.Rejected", "Setup expired")

    @method()
    def AuthorizeService(self, device: "o", uuid: "s"):
        """Paired phones may use the setup service and nothing else on this Pi."""
        if uuid.lower() != SERVICE_UUID:
            raise DBusError("org.bluez.Error.Rejected", "Only Autolab setup is allowed")

    @method()
    def Cancel(self):
        pass
