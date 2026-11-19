# Firmware and hardware drivers

The pipette (stepper plunger, AS5600, load cell, HX711, home switch) is gone. Media changes now use two peristaltic pumps and pinch valves, run by a Raspberry Pi Pico. Each pump is a Simply Pumps PMST100 stepper peristaltic pump with 1/16" ID Tygon food grade tubing, driven by its own Simply Pumps SMC10 stepper motor controller. This page covers the Pico firmware, the Pi's drivers for it and for the rest of the machine, the media change routines and the safety rules. Pico wiring, flashing and calibration are in [devices/pico/README.md](../devices/pico/README.md).

Nothing here has run on the real machine yet. See [What's still unverified](#whats-still-unverified).

## How it fits together

```
                 USB serial, JSON lines            EN/DIR/SPEED
 Raspberry Pi 4 ───────────────────────── Pico ──────────────── 2 x SMC10 → 2 x PMST100 pumps
   │  autolab_agent/hardware                 ├── GPIO ────────── 5 pinch valves (via MOSFETs)
   │                                         ├── PWM + tach ──── HEPA fan filter unit
   │                                         └── input ───────── waste float switch
   │
   ├── I2C bus 1 ──── SHT85 (0x44), K33 ICB CO2 (0x68), EZO-pH (0x63)
   ├── GPIO ───────── heater (17), circulation fan (27), CO2 valve (22), via MOSFETs
   └── USB serial ─── printer mainboard running Marlin → X, Y, Z
```

The Pi runs the routines. It moves the gantry with G-code, then asks the Pico to set a valve and run a pump, and waits for the Pico to say the run is done. The Pico keeps the fluidics safe on its own: it refuses unsafe commands and stops everything if the Pi goes quiet.

| Where | What it is |
| --- | --- |
| `devices/pico` | The Pico firmware (MicroPython). `fluidics/hal.py` is the only file that touches hardware, so the rest runs in tests under CPython. |
| `autolab_agent/hardware/pico.py` | Serial client for the Pico: requests and replies, events, keepalive pings, finding the Pico by USB vendor id. |
| `autolab_agent/hardware/environment.py` | SHT85, K33 and EZO-pH drivers, the heater, fan and CO2 valve outputs, and the control loop. |
| `autolab_agent/hardware/motion.py` | Marlin client, deck positions and the head moves the routines use. |
| `autolab_agent/hardware/media_change.py` | Aspiration, addition and cleaning, as step lists that can be printed or run. |
| `autolab_agent/hardware/components.py` | The heartbeat's `components` list. |
| `autolab_agent/hardware/station.py` | Opens whatever is configured and checks it every 5 seconds in one background thread. |
| `autolab_agent/hardware/cli.py` | The `fluidics` and `media-change` bench commands. |

## Turning it on

Hardware support is off unless `.env` asks for it. With none of these set, the agent opens no serial port, touches no I2C or GPIO, and sends no `components`, exactly as before.

| Variable | Meaning |
| --- | --- |
| `AUTOLAB_PICO_PORT` | `auto` finds the Pico by USB vendor id 2E8A, or give a port such as `/dev/ttyACM0` |
| `AUTOLAB_MARLIN_PORT` | The printer board's port. `/dev/serial/by-id/...` stays the same across reboots. |
| `AUTOLAB_MARLIN_BAUD` | Default 115200 |
| `AUTOLAB_I2C_BUS` | `1` reads the SHT85, K33 and EZO-pH |
| `AUTOLAB_ENV_OUTPUTS` | `1` lets the Pi drive the heater, circulation fan and CO2 valve. They start off. |
| `AUTOLAB_ENV_CONTROL` | `1` runs the heater and CO2 loop. Needs the outputs and the sensors. |
| `AUTOLAB_TARGET_C`, `AUTOLAB_TARGET_CO2` | Default 37.0 °C and 5.0% |

`install.sh` installs `python3-gpiozero` and `python3-lgpio` from apt, turns I2C on and adds the agent's user to the `dialout`, `i2c` and `gpio` groups. `pyserial` and `smbus2` come from `requirements.txt`. All three libraries are imported only when hardware is configured, so the agent and the tests run without them.

The agent holds the serial ports while it runs. Stop it (`sudo systemctl stop autolab-agent`) before using the bench commands.

## Wiring on the Pi

| Part | Connection | Notes |
| --- | --- | --- |
| SHT85 | I2C bus 1, address 0x44 | Temperature and humidity |
| Senseair K33 ICB | I2C bus 1, address 0x68 | CO2. Keep the bus at the Pi's default 100 kHz or slower. |
| Atlas EZO-pH | I2C bus 1, address 0x63 | The board ships in UART mode. Switch it to I2C first (short PGND to TX at power up). |
| Heater | BCM 17 | High turns the MOSFET on |
| Circulation fan | BCM 27 | |
| CO2 solenoid valve | BCM 22 | |
| Pico | USB | |
| Marlin board | USB | |

The Pico's own wiring is in [devices/pico/README.md](../devices/pico/README.md#wiring).

## Pico protocol

One JSON object per line, each way, over the Pico's USB serial port. A request has an `id` (any number or string) and a `cmd`. The reply has the same `id`, `"ok": true` and the command's fields, or `"ok": false` and an `error` string that says why in plain words. A line that isn't valid JSON gets `{"id": null, "ok": false, "error": "bad JSON"}`. Lines are limited to 512 characters.

```json
{"id": 7, "cmd": "pump", "pump": "addition", "direction": "to_head", "volume_ul": 500, "flow_ul_s": 20}
{"id": 7, "ok": true, "pump": "addition", "direction": "to_head", "rpm": 18.46, "speed_v": 1.231, "flow_ul_s": 20, "volume_ul": 500.0, "seconds": 25.0}
```

| Command | Fields | Reply |
| --- | --- | --- |
| `hello` | | `firmware`, `version`, `pumps` (each with `valve`, `controller`, `max_flow_ul_s`, `max_rpm`, `ul_per_rev`, `rpm_at_5v`, `speed_full_scale_v`, `calibrated`), `valves` (each with its ports), `fan`, `waste_sensor`, `watchdog_s` |
| `status` | | `pumps` (each `running`, `direction`, `enabled`, `speed_v`, and while running `rpm`, `flow_ul_s`, `remaining_s`, `remaining_ul`), `valves` (each its open port or `closed`), `fan` (`duty`, `rpm`), `waste_full`, `uptime_s` |
| `ping` | | `pong: true`. Feeds the watchdog. |
| `pump` | `pump`, `direction` (`to_head` or `from_head`), one of `volume_ul` or `seconds`, optional `flow_ul_s` (default: the pump's max) | `rpm`, `speed_v`, `flow_ul_s`, `volume_ul`, `seconds`. Returns at once; `pump_done` follows. |
| `stop` | optional `pump` (default: both) | `stopped`: the pumps that were running |
| `valve` | `valve`, `port` (a port name or `closed`) | `valve`, `port` |
| `fan` | `duty` from 0 to 1 | `duty`, `rpm` |
| `calibrate` | `pump`, and `ul_per_rev`, or `commanded_ul` and `measured_ul`; optional `rpm_at_5v` (either can be given alone) | `pump`, `ul_per_rev`, `rpm_at_5v`, `calibrated`. Saved to `calibration.json` on the Pico. |

A pump's `rpm` and `speed_v` are what the Pico asks the SMC10 for, worked out from the calibration. Nothing measures the motor. The fan's `rpm` is measured: it is `null` until the tach has been counted for a second, and when no tach is configured.

Events are lines the Pico sends on its own. They have `event` and no `id`.

| Event | When |
| --- | --- |
| `ready` | The firmware started (also after a reset: any run in progress has ended) |
| `pump_done` | A run's time is up. `pump`, `direction`, `volume_ul` (flow × time), `seconds`. |
| `pump_stopped` | A run was cut short. `reason` is `stop`, `waste_full`, `watchdog`, `error` or `halted`, and `volume_ul` estimates what went out. |
| `waste_full`, `waste_ok` | The float switch changed. Full shows at once; clear needs a second of steady readings, since sloshing bounces the float. |
| `watchdog` | No command for 5 s while a pump ran. Pumps stopped, valves closed. |

Pumps are named for the line, not the motor. `to_head` pushes liquid from the selected bottle toward the gantry head. `from_head` pulls it from the head back into the selected bottle. Each pump has a `to_head_level` in `config.py`, the DIR level for `to_head`, to flip for a motor that turns the other way.

## How a pump runs

The SMC10 makes the steps, not the Pico. The Pico gives it three signals:

- **EN**: enabled only while the pump runs.
- **DIR**: forward or reverse. It changes only while the pump is stopped.
- **SPEED**: a voltage from 0 to 5 V on the SMC10's speed input, where a speed potentiometer's wiper would go. The Pico makes it with 20 kHz PWM, an RC filter and an op-amp with a gain of 1.5.

The speed model:

- rpm = speed_v / 5 V × `rpm_at_5v`. `rpm_at_5v` is how the SMC10 is programmed to map its input. The placeholder is 75.
- flow in µL/s = rpm / 60 × `ul_per_rev`. The PMST100 moves 65 µL per turn with 1/16" ID tubing.
- PWM duty = speed_v / `speed_full_scale_v`. With the op-amp that is 3.3 V × 1.5 = 4.95 V. Without it, 3.3 V.

A volume is a timed run: seconds = volume / flow. To start, the Pico sets the speed, then DIR, then enables the SMC10. To stop, it disables the SMC10, then sets the speed to 0. The loop checks every millisecond or two whether the time is up, along with commands, the watchdog and the waste switch.

At the default flows, addition (30 µL/s) runs at 27.7 rpm with 1.85 V on the speed input, and aspiration (50 µL/s) at 46.2 rpm with 3.08 V. The PMST100 tops out at 75 rpm, which is 81.25 µL/s on 1/16" tubing. With the op-amp, full duty gives 4.95 V, so with `rpm_at_5v` at 75 the Pico can ask for up to 74.25 rpm (80.4 µL/s). Without the op-amp, 3.3 V gives 49.5 rpm (53.6 µL/s).

## Safety rules

The Pico keeps these whatever the Pi asks:

- **All valves close and both SMC10s are disabled, at zero speed, at boot**, and again when the firmware is stopped from Thonny or mpremote. An unexpected error inside a command stops both pumps and closes every valve.
- **At most one port per valve is open.** Opening one drives the others closed first.
- **No pump runs against a shut line.** Its valve must have a port open, and the valve can't change while the pump runs.
- **`from_head` only into waste.** It pushes into whichever bottle is selected, so anything else would contaminate the media or the cleaner.
- **`to_head` never from waste.** It would draw bleach and old media back toward the cells.
- **Nothing into a full waste bottle.** `from_head` is refused while the float switch reads full, and a run already going is stopped the moment it trips. Dispensing fresh media is still allowed.
- **Watchdog.** If no command or ping arrives for 5 s while a pump runs, both pumps stop and every valve closes. The Pi's client pings every second while a pump runs.
- **Flow cap.** Flow above a pump's `max_flow_ul_s` is refused, not quietly lowered. The defaults are 30 µL/s for addition and 50 µL/s for aspiration, to keep shear on the neurons low. A single run is limited to 600 s, and runs under 0.1 s are refused.
- **Speed cap.** A flow that needs more than 75 rpm (the PMST100's maximum recommended speed) is refused. So is one that needs more than 5 V on the SMC10's speed input, or more than the speed output can make.
- **Direction only changes while stopped.** A pump that is running refuses a new run until it is stopped.

On the Pi:

- Every routine checks the waste bottle before it starts, and stops pumps and closes valves if any step fails.
- Every head move ends with `M400`, so a pump never starts while the head is still travelling.
- The control loop turns the heater off when there is no temperature reading or it reads 39 °C or more, and never doses CO2 without a reading or above 8%.

The heater loop runs on the Pi every 5 seconds. Software is not a thermal fuse: fit a thermal cutoff on the heated platform that works without the Pi.

## Media change routines

`media_change.py` builds each routine as a list of steps, then runs them. `--dry-run` prints the list and moves nothing.

```bash
python -m autolab_agent.main media-change aspirate --wells A1-A6 --seconds 20 --dry-run
python -m autolab_agent.main media-change add --wells A1-A6 --volume-ul 500 --prime-ul 300
python -m autolab_agent.main media-change clean --volume-ul 1000 --dwell 60
```

Wells are `A1-A6`, `A1,B2,C3` or a whole row like `B`. The plate is a 24-well, 4 rows by 6 columns at 19.3 mm. Without `--flow`, the addition pump runs at 30 µL/s and the aspiration pump at 50 µL/s. A flow above 81.25 µL/s (the PMST100 at 75 rpm on 1/16" tubing) is refused before anything moves; the Pico still refuses anything above a pump's own max.

**Aspiration**, for each well:

1. Pick up a fresh tip, move over the well and lower into it.
2. Aspiration valve to waste, aspiration pump `from_head` for the set seconds.
3. Move the head away from the plate.
4. Eject the tip into the disposal bin (a passive stripper fork, so just a move).

Then move away from the plate and run 10 s of suction (`from_head` into waste) to clear the line, and close the valve. Each well gets its own tip, so nothing carries over between wells. `--first-tip` says which rack position is next.

**Addition**:

1. Addition valve to media.
2. For each well: needle over the well, addition pump `to_head` for the volume.
3. Valve to waste, 10 s of suction (`from_head`) so the needle doesn't drip, valve closed, head away.

The suction at the end leaves the line empty, so the first well of the next run would get air. `--prime-ul` refills the line over the bin first; set it to the line's volume once that is measured.

**Cleaning**, over the disposal bin, for the aspiration line and then the addition line: valve to cleaner, pump `to_head` to push disinfectant out through the tip or needle, an optional `--dwell`, then valve to waste and 10 s `from_head` to pull the spent disinfectant into waste. The head moves away at the end.

## Gantry

`motion.py` sends one G-code line at a time and waits for Marlin's `ok`. `busy:` lines keep it waiting, and `Error:`, `!!` or an unknown command raise. The deck positions are in the `Deck` dataclass, and **every one is a placeholder: measure on the machine**. Jog the head to each point, read it with `M114` and copy it in: the tip rack's A1 and pitch, the plate's A1, the aspiration depth, the needle's offset from the tip axis, the dispense height, the disposal bin and stripper fork, the away position and the safe Z. Opening Marlin's port resets most boards, so the client waits 2 s before talking.

## Heartbeat components

When hardware is configured, the heartbeat carries `components` in the format in [digital-twin.md](digital-twin.md#telling-the-truth-about-parts). A part is listed only once it has really answered:

| Id | Listed when | Telemetry |
| --- | --- | --- |
| `pico` | The Pico replied to `hello` and `status` | `firmware` |
| `addition_pump`, `aspiration_pump` | The Pico lists the pump | `running`, `direction` and `remaining_s` while running, `rpm`, `flow_ul_s`, `ul_per_rev`, `calibrated` |
| `addition_controller`, `aspiration_controller` | The Pico lists that pump. They are its SMC10s. | `enabled`, `speed_v`, `rpm_at_5v` |
| `addition_valve`, `aspiration_valve` | The Pico lists the valve | `port` |
| `hepa_filter` | The Pico has a fan configured. Online only while the tach shows it spinning. | `duty`, `rpm` |
| `waste_container` | The Pico has a waste switch | `full` |
| `sht85` | A reading passed both CRCs | `temperature_c`, `humidity_percent` |
| `co2_sensor` | A reading passed its checksum | `co2_percent` |
| `ph_sensor` | The EZO-pH returned a reading | `ph` |
| `heated_platform`, `circulation_fan`, `co2_valve` | `AUTOLAB_ENV_OUTPUTS=1` and the GPIO opened | `on`, `automatic` |
| `printer_controller` | Marlin answered `M115` and keeps answering `M105` | `firmware` |

A part that answered before and then stops is listed as offline, "Not responding", with no readings. The Pico can't tell whether an SMC10, a motor or a valve is physically plugged in (EN, DIR, SPEED and the pinch valves give no feedback), and a GPIO output can't sense its load, so those parts mean "configured and the controller answers", not "seen working".

In lab mode the Pi adds `components` to its status report, and the Hardware screen reads it from the `devices` row. The column comes from `supabase/migrations/003_components.sql`; run it once in the SQL Editor. Until then the Pi notices the refusal, reports its status without the list and stops trying, and the site reads the row without it.

## What's still unverified

None of this has run on the real hardware. In particular:

- The firmware compiles with MicroPython's `mpy-cross` and its logic passes the tests under CPython, but it hasn't run on a Pico. The speed PWM, the tach interrupt and the non-blocking USB read need a check on the board. Measure the speed input with a multimeter against `speed_v` in `fluidics status`.
- The SMC10 header pins. The reading of the quick start guide's diagram (pin 5 the speed input, pin 6 the +5 V reference) needs checking on the board.
- EN and DIR polarity: whether a closed input means enabled, and which way is forward. `enable_level` and `to_head_level` in `config.py` are set to a guess.
- How the SMC10 maps its analog input to speed (`rpm_at_5v`, whether it is linear, any dead band near 0 V, its ramp), and whether it needs its own programming from Simply Pumps first.
- Pump calibration (65 µL per turn is Simply Pumps' figure for 1/16" tubing), each pump's direction, the line volumes and a sensible `--prime-ul`.
- How much a timed run loses to the speed filter and the SMC10's ramp at start and stop. Calibrate at the volume and flow the routines use.
- The K33 ICB scale. The driver assumes 1 count is 10 ppm (5% reads 5000), which suits the high range model; check it against calibration gas or the sensor's documentation. Its wake-up retry and timing are from Senseair's I2C notes, not from this sensor.
- SHT85 and EZO-pH reads on the real bus, and the EZO-pH has no temperature compensation set yet.
- Every deck position, feed rate and the stripper fork move.
- Whether the fan's PWM input needs the inverting stage, the HEPA fan's real tach rate, and the float switch's polarity.
- The heater and CO2 loop settings (hysteresis, pulse length, mixing gap) against the enclosure's real behaviour.
