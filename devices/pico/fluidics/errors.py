"""The one error the controller raises for a refused command."""


class FluidicsError(Exception):
    """A command was refused. The message goes back to the host as is."""
