"""The gateway a lab station handed over, saved as gateway.json beside the credentials.

Bluetooth setup runs as root and writes it. The camera agent runs as the
normal user and reads it each time it starts.
"""

import contextlib
import json
import logging
import os
from pathlib import Path

from .endpoints import valid_gateway

log = logging.getLogger("agent")
DEFAULT_GATEWAY = "ws://localhost:8000"


def settings_path(credentials_path: str | Path) -> Path:
    return Path(credentials_path).expanduser().parent / "gateway.json"


def resolve_gateway(flag: str | None, credentials_path: str | Path) -> str:
    """The --gateway flag first, then the saved file, then AUTOLAB_GATEWAY.

    The saved file beats .env because it is the newer choice. A lab station
    handed it over during setup, long after .env was written.
    """
    return (
        flag
        or load_gateway(credentials_path)
        or os.getenv("AUTOLAB_GATEWAY")
        or DEFAULT_GATEWAY
    )


def load_gateway(credentials_path: str | Path) -> str | None:
    """The saved gateway, or None when there is none or it does not look right."""
    path = settings_path(credentials_path)
    try:
        gateway = json.loads(path.read_text()).get("gateway")
    except FileNotFoundError:
        return None
    except (OSError, ValueError, AttributeError) as exc:
        log.warning("Ignoring %s (%s)", path, type(exc).__name__)
        return None
    if not valid_gateway(gateway):
        log.warning("Ignoring %s. It does not hold a valid gateway.", path)
        return None
    return gateway


def save_gateway(credentials_path: str | Path, gateway: str) -> None:
    """Replace the file atomically, readable by the folder's owner only.

    Root writes here into a folder the normal user owns. So the temp file is
    made fresh and never through a symlink, and it is handed to that user
    before it takes the real name.
    """
    path = settings_path(credentials_path)
    folder = path.parent.stat()
    temp = path.with_suffix(".tmp")
    with contextlib.suppress(FileNotFoundError):
        temp.unlink()
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
    with os.fdopen(os.open(temp, flags, 0o600), "w") as output:
        if os.geteuid() == 0:
            os.fchown(output.fileno(), folder.st_uid, folder.st_gid)
        json.dump({"gateway": gateway}, output)
    os.replace(temp, path)
