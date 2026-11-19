"""A selector valve built from normally closed pinch valves on a common line.

At most one port is open. Opening a port closes the others first, and with
every pinch valve unpowered the line is shut.
"""

from .errors import FluidicsError

CLOSED = "closed"


class Valve:
    def __init__(self, name, hal, ports):
        self.name = name
        self.ports = {}
        for port, pin in ports.items():
            if pin is not None:
                self.ports[port] = hal.output(pin, 0)
        self.port = None

    def names(self):
        return sorted(self.ports)

    def set(self, port):
        """Open one port, or close all with "closed"."""
        if port != CLOSED and port not in self.ports:
            raise FluidicsError(
                "the %s valve has no port %r (ports: %s)"
                % (self.name, port, ", ".join(self.names()))
            )
        for output in self.ports.values():
            output.value(0)
        self.port = None
        if port != CLOSED:
            self.ports[port].value(1)
            self.port = port

    def close(self):
        self.set(CLOSED)

    def state(self):
        return self.port or CLOSED
