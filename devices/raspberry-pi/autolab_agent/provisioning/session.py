"""Framing and validation for setup requests. Pure logic, testable without a radio."""

import json
import secrets
import time

SETUP_WINDOW = 600
MAX_CHUNK = 512  # the most BlueZ hands over in one write
MAX_REQUEST = 2048
MAX_PEERS = 3
MAX_PIN_ATTEMPTS = 5


class ProvisioningSession:
    """One setup window: its PIN, its deadline and what each peer has sent so far.

    BLE writes arrive in small chunks and a request ends with a newline. Each
    peer gets its own buffer, so one phone cannot splice bytes into another's
    request. `status` is what the status characteristic serves.
    """

    def __init__(self, device_id: str, pin: str, ttl: float = SETUP_WINDOW) -> None:
        self.device_id = device_id
        self.pin = pin
        self.deadline = time.monotonic() + ttl
        self.buffers: dict[str, bytearray] = {}
        self.attempts = 0
        self.busy = False
        self.completed = False
        # Only the peer that sent the right PIN may read the claim code later.
        self.authorized_peer: str | None = None
        self.status: dict = {"state": "ready", "device_id": device_id}

    def receive(self, peer: str, chunk: bytes) -> tuple[str, str] | None:
        """Take one chunk. Returns (ssid, password) once a full valid request arrives.

        Raises ValueError with a message that is safe to show the phone.
        """
        self._check_open(peer, chunk)
        buffer = self.buffers.setdefault(peer, bytearray())
        buffer.extend(chunk)
        if len(buffer) > MAX_REQUEST:
            self.buffers.pop(peer, None)
            raise ValueError("Setup request too large")
        if not buffer.endswith(b"\n"):
            return None
        raw = bytes(buffer)
        self.buffers.pop(peer, None)
        ssid, password = self._parse(raw)
        self.busy = True
        self.authorized_peer = peer
        return ssid, password

    def _check_open(self, peer: str, chunk: bytes) -> None:
        if time.monotonic() > self.deadline:
            raise ValueError("Setup window expired. Restart provisioning on the Pi.")
        if self.busy or self.completed:
            raise ValueError("Setup already in progress or completed")
        # Counted across peers, so reconnecting does not reset the guesses.
        if self.attempts >= MAX_PIN_ATTEMPTS:
            raise ValueError("Too many failed PIN attempts. Restart provisioning.")
        if not isinstance(chunk, bytes) or len(chunk) > MAX_CHUNK:
            raise ValueError("Invalid BLE chunk")
        if peer not in self.buffers and len(self.buffers) >= MAX_PEERS:
            raise ValueError("Too many setup connections")

    def _parse(self, raw: bytes) -> tuple[str, str]:
        """Check the PIN before the network fields, so a wrong PIN learns nothing."""
        try:
            data = json.loads(raw)
        except (ValueError, UnicodeError):
            raise ValueError("Invalid setup request")
        if not isinstance(data, dict):
            raise ValueError("Expected setup object")
        if not secrets.compare_digest(str(data.get("pin", "")), self.pin):
            self.attempts += 1
            raise ValueError("Setup PIN is incorrect")
        ssid = data.get("ssid")
        password = data.get("password")
        # 802.11 SSIDs are 1 to 32 bytes. WPA passphrases are 8 to 63 characters.
        if (
            not isinstance(ssid, str)
            or not 1 <= len(ssid.encode("utf-8")) <= 32
            or "\x00" in ssid
        ):
            raise ValueError("SSID must be 1 to 32 UTF-8 bytes")
        if (
            not isinstance(password, str)
            or not 8 <= len(password) <= 63
            or "\x00" in password
        ):
            raise ValueError("WPA password must be 8 to 63 characters")
        return ssid, password
