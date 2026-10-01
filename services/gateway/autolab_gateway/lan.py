"""The gateway's own LAN addresses, so the lab station can hand one to a Pi.

In lab mode the Pi joins the lab Wi-Fi and dials the gateway on the lab
computer. The browser on that computer cannot see its own IP, so the gateway
works it out here with the standard library alone.
"""

import ipaddress
import socket
import struct
import sys

# A documentation address (TEST-NET-1). Connecting a UDP socket sends nothing.
# It only makes the OS pick the source address the default route would use.
_PROBE = ("192.0.2.1", 9)
# Bridges for containers and VMs. A Pi on the Wi-Fi cannot reach them.
_VIRTUAL = ("lo", "docker", "br-", "veth", "virbr")
_SIOCGIFADDR = 0x8915  # Linux only


def lan_addresses() -> list[str]:
    """Best guess first: the default route's address, then any others found.

    Each lookup fails quietly, so an offline computer gets a short or empty list.
    """
    found = [*_default_route(), *_hostname_addresses(), *_interface_addresses()]
    return list(dict.fromkeys(ip for ip in found if _usable(ip)))


def _default_route() -> list[str]:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(_PROBE)
            return [probe.getsockname()[0]]
    except OSError:
        return []


def _hostname_addresses() -> list[str]:
    """What the computer's own name resolves to. On Windows that is every adapter."""
    try:
        return socket.gethostbyname_ex(socket.gethostname())[2]
    except OSError:
        return []


def _interface_addresses() -> list[str]:
    """Each interface's IPv4 address, straight from the kernel.

    Linux usually maps its own name to 127.0.1.1, so the name lookup finds nothing there.
    """
    if not sys.platform.startswith("linux"):
        return []
    import fcntl  # imported here because Windows has no fcntl

    found = []
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            for _, name in socket.if_nameindex():
                if name.startswith(_VIRTUAL):
                    continue
                request = struct.pack("256s", name.encode()[:15])
                try:
                    reply = fcntl.ioctl(s.fileno(), _SIOCGIFADDR, request)
                except OSError:
                    continue  # this interface has no IPv4 address
                found.append(socket.inet_ntoa(reply[20:24]))
    except OSError:
        pass
    return found


def _usable(ip: str) -> bool:
    try:
        address = ipaddress.IPv4Address(ip)
    except ValueError:
        return False
    return not (address.is_loopback or address.is_unspecified or address.is_multicast)
