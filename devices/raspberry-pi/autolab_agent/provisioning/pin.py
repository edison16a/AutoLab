"""The setup PIN: the one on the machine's sticker, or a random one for this run.

A shipped Autolab has no screen, so a PIN printed in a terminal reaches
nobody. install.sh writes a fixed PIN to /etc/autolab/setup-pin for the
sticker instead.
"""

import logging
import re
import secrets
from pathlib import Path

log = logging.getLogger("setup")
PIN_FILE = Path("/etc/autolab/setup-pin")


def setup_pin(path: Path = PIN_FILE) -> tuple[str, bool]:
    """The PIN to use, and whether it came from the file."""
    fixed = read_pin_file(path)
    if fixed:
        return fixed, True
    return f"{secrets.randbelow(1000000):06d}", False


def read_pin_file(path: Path = PIN_FILE) -> str | None:
    """Six digits from the file, or None when it is missing or unusable."""
    try:
        with open(path, "rb") as source:
            raw = source.read(64)  # a real PIN file is a few bytes
    except FileNotFoundError:
        return None
    except OSError as exc:
        reason = type(exc).__name__
        log.warning("Cannot read %s (%s). Using a random PIN.", path, reason)
        return None
    text = raw.decode("ascii", errors="replace").strip()
    if re.fullmatch("[0-9]{6}", text):
        return text
    log.warning("%s does not hold six digits. Using a random PIN.", path)
    return None
