"""How the agent and the provisioning service address the gateway."""

import ipaddress
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
