"""How the agent and the provisioning service address the gateway."""

import ipaddress
import re
from urllib.parse import urlsplit

# Plain ws:// may only go to these. None of them is reachable from the internet.
LOCAL_NETWORKS = [
    ipaddress.IPv4Network(network)
    for network in (
        "127.0.0.0/8",
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "169.254.0.0/16",
    )
]
GATEWAY_LIMIT = 200
# Scheme, host and an optional port. No room for a path, a query or a login.
_HANDED_OVER = re.compile(r"wss?://([A-Za-z0-9.-]+)(?::([0-9]{1,5}))?/?")


def http_base(gateway: str) -> str:
    """The gateway's HTTP origin. Registration and health checks are plain HTTP."""
    return gateway.replace("wss://", "https://").replace("ws://", "http://").rstrip("/")


def device_socket_url(gateway: str, device_id: str) -> str:
    return f"{gateway.rstrip('/')}/ws/device/{device_id}"


def allowed_gateway(gateway: str) -> bool:
    """Unencrypted ws:// stays on this machine or the lab's own network.

    The hello carries the device secret, so it must not cross the internet in
    the clear. In lab mode the gateway runs on a computer on the same LAN.
    """
    try:
        parts = urlsplit(gateway)
        host = parts.hostname or ""
    except ValueError:
        return False
    if parts.scheme == "wss":
        return bool(host)
    return parts.scheme == "ws" and local_host(host)


def local_host(host: str) -> bool:
    """localhost, an mDNS name ending in .local, or a private IPv4 address."""
    if host == "localhost" or host.endswith(".local"):
        return True
    try:
        address = ipaddress.IPv4Address(host)
    except ValueError:
        return False
    return any(address in network for network in LOCAL_NETWORKS)


def valid_gateway(gateway: object) -> bool:
    """The strict form a lab station may hand over in a Bluetooth request.

    Anything this accepts also passes allowed_gateway, so the agent never
    refuses an address that setup saved for it.
    """
    if not isinstance(gateway, str) or len(gateway) > GATEWAY_LIMIT:
        return False
    match = _HANDED_OVER.fullmatch(gateway)
    if not match:
        return False
    host, port = match.groups()
    if port is not None and not 0 < int(port) <= 65535:
        return False
    for label in host.split("."):
        if not 0 < len(label) <= 63 or "-" in (label[0], label[-1]):
            return False
    return allowed_gateway(gateway)
