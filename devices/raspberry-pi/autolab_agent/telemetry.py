"""Only report information observed on this host, not assumed hardware metrics."""

from pathlib import Path

AGENT_VERSION = "1.1.0"


def network_kind():
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


def metadata():
    result = {"agent_version": AGENT_VERSION}
    network = network_kind()
    if network:
        result["network"] = network
    return result
