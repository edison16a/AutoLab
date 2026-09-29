"""Everything the gateway keeps in memory for the life of the process.

The gateway runs as one uvicorn worker on purpose. Rooms pair sockets in memory,
so a second worker would split a Pi from its viewers.

Read these through the module (state.cloud, not `from .state import cloud`) so
tests can swap them with monkeypatch.
"""

from collections import defaultdict, deque
from collections.abc import Hashable

from .cloud import Cloud
from .config import MODE
from .rooms import Room

cloud: Cloud | None = Cloud() if MODE == "cloud" else None

# Device id mapped to its room. Rooms are created on first join and dropped
# once the Pi, the worker and every viewer have left.
rooms: dict[str, Room] = {}

# Rate limit key mapped to the monotonic times of its recent hits.
limits: defaultdict[Hashable, deque[float]] = defaultdict(deque)
