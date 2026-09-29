"""Sliding one-minute rate limits, kept in memory with the rest of the state."""

import time
from collections.abc import Hashable

from fastapi import HTTPException

from . import state

WINDOW = 60


def rate(key: Hashable, count: int = 30) -> None:
    """Allow `count` hits per key per minute, then answer 429."""
    t = time.monotonic()
    hits = state.limits[key]
    while hits and hits[0] < t - WINDOW:
        hits.popleft()
    if len(hits) >= count:
        raise HTTPException(429, "Too many requests. Try again in a minute.")
    hits.append(t)


def prune(t: float) -> None:
    """Forget idle keys. Many are one-offs, like a closed peer's id or a client IP."""
    for key in list(state.limits):
        if not state.limits[key] or state.limits[key][-1] < t - WINDOW:
            del state.limits[key]
