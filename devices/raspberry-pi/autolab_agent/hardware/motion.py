"""The gantry: a 3D printer board running Marlin, over USB serial.

Marlin answers "ok" when a command is queued, not when the move is done, so
every high level move here ends with M400 (wait for moves to finish). A pump
must never start while the head is still travelling.

Every position in Deck is a placeholder until it is measured on the machine.
"""

import logging
import time
from dataclasses import dataclass
from typing import Any

log = logging.getLogger("agent")

LONG_TIMEOUT = 120.0  # homing and M400 after a long move


class MotionError(RuntimeError):
    """Marlin reported an error, or didn't answer in time."""


@dataclass
class Deck:
    """Where things are, in mm in Marlin's coordinates, for the tip axis.

    MEASURE ON THE MACHINE: every number here is a placeholder. Jog the head
    to each point, read the position with M114 and copy it in.
    """

    safe_z: float = 60.0  # measure on the machine: clears tips, plate lid ridge and bin
    # Tip rack, A1 corner, row by row.
    tip_a1: tuple[float, float] = (20.0, 20.0)  # measure on the machine
    tip_pitch: float = 9.0
    tip_columns: int = 12
    tip_rows: int = 8
    tip_pick_z: float = 8.0  # measure on the machine: tip holder pressed into a tip
    # 24-well plate: 4 rows (A to D) by 6 columns, 19.3 mm pitch.
    plate_a1: tuple[float, float] = (120.0, 30.0)  # measure on the machine
    plate_pitch: float = 19.3
    plate_rows: int = 4
    plate_columns: int = 6
    aspirate_z: float = 12.0  # measure on the machine: tip in the media, clear of the cells
    # The dispense needle sits beside the tip. Needle position minus tip position.
    needle_offset: tuple[float, float] = (25.0, 0.0)  # measure on the machine
    dispense_z: float = 30.0  # measure on the machine: needle just above the well
    # Somewhere off the plate to wait and to suck the lines dry.
    away: tuple[float, float] = (220.0, 200.0)  # measure on the machine
    # Disposal bin with a passive stripper fork over it.
    bin_xy: tuple[float, float] = (250.0, 20.0)  # measure on the machine
    bin_z: float = 40.0  # measure on the machine: head over the bin opening
    strip_z: float = 25.0  # measure on the machine: tip collar just under the fork
    strip_dy: float = 15.0  # measure on the machine: slide into the fork along Y
    xy_feed: float = 3000.0  # mm/min
    z_feed: float = 600.0
    slow_z_feed: float = 300.0  # into media, gently

    def tip_xy(self, index: int) -> tuple[float, float]:
        if not 0 <= index < self.tip_rows * self.tip_columns:
            raise ValueError(f"Tip {index} is not in the rack")
        row, column = divmod(index, self.tip_columns)
        return self.tip_a1[0] + column * self.tip_pitch, self.tip_a1[1] + row * self.tip_pitch

    def well_xy(self, well: str) -> tuple[float, float]:
        row, column = parse_well(well, self.plate_rows, self.plate_columns)
        return self.plate_a1[0] + column * self.plate_pitch, self.plate_a1[1] + row * self.plate_pitch


def parse_well(well: str, rows: int = 4, columns: int = 6) -> tuple[int, int]:
    """'B3' is (1, 2): zero based row and column."""
    text = well.strip().upper()
    if len(text) < 2 or not text[0].isalpha() or not text[1:].isdigit():
        raise ValueError(f"{well!r} is not a well name like A1")
    row, column = ord(text[0]) - ord("A"), int(text[1:]) - 1
    if not (0 <= row < rows and 0 <= column < columns):
        raise ValueError(f"{well!r} is not on a {rows}x{columns} plate")
    return row, column


class Marlin:
    """Send one G-code line, wait for its "ok"."""

    def __init__(self, port: str, baud: int = 115200, connection: Any = None, timeout: float = 10.0) -> None:
        self.port = port
        self.baud = baud
        self.timeout = timeout
        self.firmware: str | None = None
        self._serial = connection

    def open(self, boot_wait: float = 2.0) -> "Marlin":
        if self._serial is None:
            import serial

            # Opening the port resets most boards, so give Marlin time to boot.
            self._serial = serial.Serial(self.port, self.baud, timeout=0.2, write_timeout=2, exclusive=True)
            time.sleep(boot_wait)
            self._serial.reset_input_buffer()
        reply = self.send("M115")
        info = next((line for line in reply if line.startswith("FIRMWARE_NAME:")), "")
        self.firmware = info.removeprefix("FIRMWARE_NAME:").split(" SOURCE_CODE_URL")[0].strip() or None
        self.send("G21")  # millimetres
        self.send("G90")  # absolute positions
        return self

    def close(self) -> None:
        if self._serial is not None:
            self._serial.close()
            self._serial = None

    def send(self, line: str, timeout: float | None = None) -> list[str]:
        """The lines Marlin sent before "ok". Raises MotionError on an error or silence."""
        if self._serial is None:
            raise MotionError("Marlin isn't connected")
        self._serial.write((line.strip() + "\n").encode())
        limit = self.timeout if timeout is None else timeout
        deadline = time.monotonic() + limit
        lines: list[str] = []
        while time.monotonic() < deadline:
            raw = self._serial.readline()
            if not raw:
                continue
            text = raw.decode(errors="replace").strip()
            if text == "ok" or text.startswith("ok "):
                return lines
            if text.startswith(("echo:busy", "busy:")):
                # Marlin is working on it (homing, long moves). Keep waiting.
                deadline = time.monotonic() + limit
                continue
            if text.startswith(("Error:", "!!")) or "Unknown command" in text:
                raise MotionError(f"Marlin: {text} (after {line!r})")
            lines.append(text)
        raise MotionError(f"Marlin did not answer {line!r}")

    def home(self) -> None:
        self.send("G28", LONG_TIMEOUT)

    def move(
        self, x: float | None = None, y: float | None = None, z: float | None = None,
        feed: float | None = None, rapid: bool = False,
    ) -> None:
        words = ["G0" if rapid else "G1"]
        for axis, value in (("X", x), ("Y", y), ("Z", z)):
            if value is not None:
                words.append(f"{axis}{value:.2f}")
        if feed is not None:
            words.append(f"F{feed:.0f}")
        self.send(" ".join(words))

    def wait(self) -> None:
        self.send("M400", LONG_TIMEOUT)


class Gantry:
    """The head moves the media change routines need. Each returns once the head has stopped."""

    def __init__(self, marlin: Marlin, deck: Deck | None = None) -> None:
        self.marlin = marlin
        self.deck = deck or Deck()

    def _lift(self) -> None:
        self.marlin.move(z=self.deck.safe_z, feed=self.deck.z_feed)

    def _travel(self, x: float, y: float) -> None:
        self._lift()
        self.marlin.move(x=x, y=y, feed=self.deck.xy_feed)

    def home(self) -> None:
        self.marlin.home()
        self.marlin.wait()

    def pick_tip(self, index: int) -> None:
        d = self.deck
        self._travel(*d.tip_xy(index))
        self.marlin.move(z=d.tip_pick_z, feed=d.slow_z_feed)
        self._lift()
        self.marlin.wait()

    def tip_into_well(self, well: str) -> None:
        d = self.deck
        self._travel(*d.well_xy(well))
        self.marlin.move(z=d.aspirate_z, feed=d.slow_z_feed)
        self.marlin.wait()

    def needle_over_well(self, well: str) -> None:
        d = self.deck
        x, y = d.well_xy(well)
        self._travel(x - d.needle_offset[0], y - d.needle_offset[1])
        self.marlin.move(z=d.dispense_z, feed=d.z_feed)
        self.marlin.wait()

    def away_from_plate(self) -> None:
        self._travel(*self.deck.away)
        self.marlin.wait()

    def over_bin(self) -> None:
        d = self.deck
        self._travel(*d.bin_xy)
        self.marlin.move(z=d.bin_z, feed=d.z_feed)
        self.marlin.wait()

    def eject_tip(self) -> None:
        """Slide the tip collar under the fork over the bin, then lift so the fork strips it."""
        d = self.deck
        x, y = d.bin_xy
        self._travel(x, y)
        self.marlin.move(z=d.strip_z, feed=d.z_feed)
        self.marlin.move(y=y + d.strip_dy, feed=d.xy_feed / 2)
        self.marlin.move(z=d.safe_z, feed=d.z_feed)
        self.marlin.move(y=y, feed=d.xy_feed)
        self.marlin.wait()
