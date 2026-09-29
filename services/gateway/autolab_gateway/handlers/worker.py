"""The ML worker: saved-image analyses and best-effort live detections."""

from typing import Any

from .. import state
from ..connection import Connection
from ..protocol import error_event, uid


async def join(conn: Connection, hello: dict) -> None:
    conn.room.worker = conn.peer


async def leave(conn: Connection) -> None:
    """Analyses in flight can never finish now, so their viewers hear it right away."""
    room = conn.room
    room.worker = None
    for rid, (target, _) in list(room.analysis.items()):
        target.emit(error_event("ML worker disconnected", image_id=rid))
    room.analysis.clear()


async def on_binary(conn: Connection, kind: Any, header: dict, jpeg: bytes) -> None:
    raise ValueError("Unsupported binary message")


async def on_text(conn: Connection, kind: Any, data: dict) -> None:
    """Results with an image_id answer a saved analysis. The rest are live results."""
    if kind not in ("analysis", "error"):
        return
    if data.get("image_id"):
        await _deliver_saved(conn, kind, data)
    else:
        _deliver_live(conn, data)


async def _deliver_saved(conn: Connection, kind: str, data: dict) -> None:
    """Only answers to a pending request are accepted, and only its viewer sees them."""
    rid = uid(data["image_id"])
    entry = conn.room.analysis.pop(rid, None)
    if not entry:
        return
    if state.cloud and kind == "analysis":
        await state.cloud.call(
            "POST",
            "/rest/v1/image_analysis",
            {
                "image_id": rid,
                "model_name": str(data.get("model", ""))[:100],
                "result_json": data,
            },
        )
        await state.cloud.call(
            "PATCH",
            f"/rest/v1/images?id=eq.{rid}",
            {"analysis_status": "completed"},
        )
    entry[0].emit(data)


def _deliver_live(conn: Connection, data: dict) -> None:
    """Live results are never stored. They go to viewers who turned live ML on."""
    conn.peer.live_busy = False
    for viewer in conn.room.clients:
        if viewer.ml:
            viewer.emit(data)
