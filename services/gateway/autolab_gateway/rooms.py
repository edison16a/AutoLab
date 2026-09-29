"""A room holds everything attached to one device id: the Pi, its worker and viewers."""

from dataclasses import dataclass, field
from typing import Any

from .peers import Peer

# Request id mapped to the peer waiting for the answer and its monotonic deadline.
PendingMap = dict[str, tuple[Peer, float]]


@dataclass
class Room:
    """Live state only. Photos are never kept here, so a refresh shows no history."""

    device: Peer | None = None
    worker: Peer | None = None
    clients: set[Peer] = field(default_factory=set)
    camera: bool = False
    simulated: bool = False
    pending: PendingMap = field(default_factory=dict)  # captures
    analysis: PendingMap = field(default_factory=dict)  # saved image analyses
    last_live: float = 0  # when the worker last got a live frame
    heartbeat_at: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)
    components: list[dict] = field(default_factory=list)

    def status(self) -> dict:
        """What viewers see. Camera and components are only trusted while the Pi is here."""
        return {
            "type": "status",
            "online": self.device is not None,
            "camera_online": self.camera if self.device else False,
            "worker_online": self.worker is not None,
            "simulated": self.simulated,
            "last_seen": self.heartbeat_at,
            **self.metadata,
            "components": self.components if self.device else [],
        }

    def broadcast(self, data: Any) -> None:
        for peer in self.clients:
            peer.emit(data)

    def sync_preview(self) -> None:
        """The Pi streams only while at least one viewer asked for preview."""
        if self.device:
            self.device.emit(
                {
                    "type": "start_preview"
                    if any(p.preview for p in self.clients)
                    else "stop_preview"
                }
            )
