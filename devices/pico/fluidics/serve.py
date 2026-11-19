"""The main loop: read characters, answer lines, run safety checks, send events.

It never blocks on input, so pumps, the watchdog and the waste switch are
checked every millisecond or two whether or not the host is talking.
"""

from . import protocol
from .hal import sleep_ms


def step(controller, reader, read_char, write):
    """One pass: drain waiting input, answer it, tick, and send any events."""
    while True:
        ch = read_char()
        if not ch:
            break
        line = reader.feed(ch)
        if line is None:
            continue
        if line is protocol.OVERFLOW:
            write(protocol.reply(None, False, error="line too long"))
            continue
        answer = protocol.handle_line(controller, line)
        if answer:
            write(answer)
    controller.tick()
    for event in controller.pop_events():
        write(protocol.encode(event))


def run(controller, read_char, write, pause_ms=1):
    reader = protocol.LineReader()
    while True:
        step(controller, reader, read_char, write)
        sleep_ms(pause_ms)
