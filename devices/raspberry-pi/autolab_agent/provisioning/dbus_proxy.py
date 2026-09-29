"""One helper for talking to system services over D-Bus."""


async def proxy(bus, destination: str, path: str, interface: str):
    """An interface on a remote object, built from its live introspection."""
    introspection = await bus.introspect(destination, path)
    return bus.get_proxy_object(destination, path, introspection).get_interface(
        interface
    )
