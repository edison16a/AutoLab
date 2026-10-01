"""Opt-in Bluetooth Wi-Fi setup for Raspberry Pi OS, open for 10 minutes at a time.

Run only during physical setup. BlueZ serves one GATT service. Writes need
encrypted ATT, which needs OS pairing, and every request must carry the setup
PIN. That is the one on the machine's sticker, or one printed in the Pi's
terminal. NetworkManager stores the Wi-Fi secret. The device secret and the
gateway's service key never travel over Bluetooth.

Only the session logic is imported here. The BlueZ parts need dbus-next, which
only the Pi's provisioning install has, so they load when the service starts.
"""

from .session import ProvisioningSession

__all__ = ["ProvisioningSession"]
