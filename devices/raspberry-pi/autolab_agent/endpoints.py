"""How the agent and the provisioning service address the gateway."""


def http_base(gateway: str) -> str:
    """The gateway's HTTP origin. Registration and health checks are plain HTTP."""
    return gateway.replace("wss://", "https://").replace("ws://", "http://").rstrip("/")


def device_socket_url(gateway: str, device_id: str) -> str:
    return f"{gateway.rstrip('/')}/ws/device/{device_id}"


def allowed_gateway(gateway: str) -> bool:
    """Unencrypted ws:// is only for this machine. The hello carries the device secret."""
    return gateway.startswith(("ws://localhost:", "ws://127.0.0.1:", "wss://"))
