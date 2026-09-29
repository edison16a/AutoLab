"""Only report information observed on this host, not assumed hardware metrics."""

from pathlib import Path

AGENT_VERSION = "1.1.0"


def network_kind() -> str | None:
    """Name the interface that carries the default route, if one can be found."""
    try:
        for line in Path("/proc/net/route").read_text().splitlines()[1:]:
            fields = line.split()
            if len(fields) > 1 and fields[1] == "00000000":
                interface = fields[0]
                if (Path("/sys/class/net") / interface / "wireless").exists():
                    return "Wi-Fi"
                if interface.startswith(("eth", "en")):
                    return "Ethernet"
                return "Network interface: " + interface
    except OSError:
        pass
    return None


def metadata() -> dict[str, str]:
    """Sent with every hello and heartbeat. Unknown fields are left out, never guessed."""
    result = {"agent_version": AGENT_VERSION}
    network = network_kind()
    if network:
        result["network"] = network
    return result
