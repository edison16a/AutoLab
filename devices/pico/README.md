# Pico fluidics controller

MicroPython firmware for the Raspberry Pi Pico that runs the Autolab's fluidics: the addition and aspiration pumps, their pinch valves, the HEPA fan and the waste bottle's float switch. The Raspberry Pi talks to it over USB serial with one JSON object per line. The protocol, the safety rules and the media change routines are in [docs/firmware.md](../../docs/firmware.md).

| File | What it does |
| --- | --- |
| `main.py` | Runs at boot. Reads the USB serial port without blocking and runs the loop. |
| `fluidics/config.py` | Pins, flow limits, the watchdog time. Edit it here and copy it over. |
| `fluidics/hal.py` | The only file that touches hardware: pins and PWM. |
| `fluidics/controller.py` | Commands, interlocks, the watchdog, events. |
| `fluidics/pumps.py`, `valves.py`, `fan.py` | One part each. |
| `fluidics/protocol.py`, `serve.py` | JSON lines in and out, and the main loop. |
| `calibration.json` | Written on the Pico by the `calibrate` command. Not in the repository. |

## Parts

| Part | What it is |
| --- | --- |
| Pump, x2 | [Simply Pumps PMST100](https://simplypumps.com/product/pmst100-stepper-peristaltic-pump/) stepper peristaltic pump. Panel mount, 4 rollers, self-priming, reversible. NEMA 17 stepper at 3 A per phase. 75 rpm maximum recommended, 15 mL/min and 25 psi at most, 15 ft suction lift. |
| Tubing | 1/16" ID Tygon food grade. The PMST100 moves 0.065 mL (65 µL) per turn with it. Other sizes: 1/8" 0.20 mL, 3/32" 0.15 mL, 1/32" 0.02 mL per turn. |
| Controller, one per pump | [Simply Pumps SMC10](https://simplypumps.com/product/smc10-stepper-motor-controller/) stepper motor controller. 12 to 30 V DC in (the quick start guide says 6 to 30 V), up to 10 A adjustable phase current, 1/128 microstepping, 0 to 5 V analog speed input, enable and direction on digital inputs. It has no STEP/DIR or serial interface. |

At 75 rpm and 65 µL per turn a pump gives 81.25 µL/s. The firmware's limits are well under that: 30 µL/s for addition and 50 µL/s for aspiration.

## Wiring

All grounds are common: Pico, both SMC10s, the 24 V supply, the valve driver and the fan supply.

| Part | Signal | Pico pin | Notes |
| --- | --- | --- | --- |
| Addition pump (SMC10) | EN | GP2 | Through a transistor to the SMC10's Enable/Disable input |
| | DIR | GP3 | Through a transistor to its Forward/Reverse input |
| | SPEED | GP4 | 20 kHz PWM, PWM slice 2. Through the speed circuit to its speed input. |
| Aspiration pump (SMC10) | EN | GP6 | |
| | DIR | GP7 | |
| | SPEED | GP8 | PWM slice 4 |
| Addition valve | media | GP10 | Normally closed pinch valve. High opens it. |
| | cleaner | GP11 | |
| | waste | GP12 | |
| Aspiration valve | waste | GP13 | |
| | cleaner | GP14 | |
| HEPA fan | PWM | GP15 | 25 kHz |
| | tach | GP16 | 2 pulses per turn. Internal pull-up is on; a 10 kΩ to 3V3 gives cleaner edges. |
| Waste bottle | float switch | GP18 | Switch to GND. Internal pull-up. Low means full. |
| Status LED | | LED | On while a pump runs |

GP4 and GP8 are on different PWM slices, so each speed output is independent.

### SMC10 connections

From the wiring diagram in Simply Pumps' quick start guide. **Verify the header pins on the board before wiring**: with the SMC10 powered and nothing on the header, bottom-row pin 6 should read 5 V to GND.

| SMC10 | Use | Connect to |
| --- | --- | --- |
| Screw terminal: Supply GND | Power ground | 24 V supply 0 V, and the common ground |
| Screw terminal: 6–30 VDC In | Power | 24 V supply + |
| Screw terminals: A2, A1 | Motor coil A | The pump's motor (below) |
| Screw terminals: B1, B2 | Motor coil B | |
| Header top row, pin 1 | Enable/Disable input. The guide's switch closes it to GND. | EN transistor collector |
| Header top row, pin 3 | GND (a solid black pin) | Transistor emitters, common ground |
| Header bottom row, pin 3 | Forward/Reverse input. The guide's switch closes it to GND. | DIR transistor collector |
| Header bottom row, pin 4 | GND (a solid black pin), the speed pot's bottom end | Op-amp ground |
| Header bottom row, pin 5 | Speed input, the pot's wiper. 0 to 5 V. Verify on the board. | Op-amp output |
| Header bottom row, pin 6 | +5 V reference, the pot's top end. Verify on the board. | Op-amp supply |

Motor wires, as the guide gives them for Simply Pumps' motors. Check them against the motor in hand: its label or datasheet, or a meter (the two wires of one coil read a few ohms between them).

| SMC10 | 4-wire motor | 8-wire motor |
| --- | --- | --- |
| A2 | Green | Orange/White + Black |
| A1 | Black | Black/White + Orange |
| B1 | Red | Yellow/White + Red |
| B2 | Blue | Red/White + Yellow |

Set each SMC10's phase current to 3 A or below: the PMST100's motor is rated 3 A per phase. A peristaltic pump at these speeds needs little torque, so start lower (around 2 A) and raise it only if the pump stalls.

### EN and DIR

Each signal goes through an NPN transistor or one ULN2003 channel that pulls the SMC10 input to GND, the same as the guide's switch. Pico high closes the input to GND.

- NPN (2N3904 or similar): 1 kΩ from the Pico pin to the base, 10 kΩ from base to GND, emitter to GND, collector to the SMC10 input.
- ULN2003: Pico pin to an input, the matching output to the SMC10 input, the ULN2003's GND to the common ground. Leave COM unconnected; there's no coil.

The base pull-down (the ULN2003 has one inside) keeps the input open while the Pico boots or is unplugged. If an open EN input turns out to mean enabled, an unplugged Pico leaves the SMC10 enabled; the 1 MΩ in the speed circuit still holds its speed input at 0 V.

Which state means "enabled" and which direction is "forward" isn't known yet. `config.py` has two settings per pump:

- `enable_level`: the Pico level that enables the SMC10. Default 1 (input closed to GND).
- `to_head_level`: the DIR level for `to_head`. Default 0 (input open).

Check both on the bench (below) before tubing goes on.

### Speed circuit

The SMC10's speed input takes 0 to 5 V. The Pico makes it from PWM:

```
            10 kΩ
 GP4 ────/\/\/\────┬─────────┬──────── op-amp +IN
                   │         │
                 1 µF      1 MΩ
                   │         │
 GND ──────────────┴─────────┘

 op-amp OUT ──┬──────────────────────── SMC10 bottom pin 5 (speed)
              └── 10 kΩ ──┬── op-amp -IN
                          └── 20 kΩ ── GND
 op-amp V+ ─────────────────────────── SMC10 bottom pin 6 (+5 V)
 op-amp V- ─────────────────────────── SMC10 bottom pin 4 (GND)
```

The aspiration pump's circuit is the same, from GP8 to its own SMC10.

- **RC filter**: 10 kΩ and 1 µF. The corner is 16 Hz, so the 20 kHz ripple is a few mV. It settles in about 50 ms, which is why runs under 0.1 s are refused.
- **1 MΩ to GND** holds the input at 0 V when the Pico is off or in reset. It costs about 1% of the full scale, which calibration covers.
- **Op-amp**: non-inverting, gain 1 + 10k/20k = 1.5. Use a rail-to-rail input and output part that runs from 5 V, such as an MCP6001. Power it from that SMC10's own 5 V, one op-amp per controller, so its output can't go above what the SMC10 expects.
- Full duty gives 3.3 V × 1.5 = 4.95 V. The firmware uses `SPEED_FULL_SCALE_V` in `config.py` (`PICO_V × SPEED_OPAMP_GAIN`) to turn volts into duty.
- **Without the op-amp**, run the filter straight into pin 5 and set `SPEED_OPAMP_GAIN = 1.0`. The input then gets 0 to 3.3 V, and the pump tops out at 3.3 / 5 of `rpm_at_5v` (49.5 rpm at the placeholder 75).

The SMC10 itself has to be programmed to read pin 5 as a speed, 0 V stopped and 5 V at `rpm_at_5v`, and to take EN and DIR from the header. Simply Pumps offers custom programming. Ask them for exactly that, 0 to 5 V linear to 0 to 75 rpm, and for the ramp it uses. Whatever 5 V turns out to mean goes in `rpm_at_5v`.

### Power

One 24 V supply feeds both SMC10s. Size it for both motors at full current: 2 × 3 A, so 6 A, such as a 24 V 150 W supply. A chopper drive draws less than that in practice, but the margin is cheap. Fuse each SMC10's feed. The Pico runs from the Pi's USB. Only the op-amps use the SMC10s' 5 V.

### Other parts

- **Pinch valves** draw far more than a GPIO can give. Drive each through a logic level MOSFET or a ULN2803 channel, with a flyback diode across the coil.
- **Fan PWM**: 4-pin fans pull their PWM wire up inside, often to 5 V. Feed it through an open-drain transistor stage rather than straight from the GPIO. An NPN or N-MOSFET stage inverts the signal, so set `FAN["invert"] = True` in `config.py`. A fan with its PWM wire floating runs flat out.
- **Float switch**: with a switch that closes when full, a broken wire reads "not full". A switch that opens when full fails safe: wire it to GND the same way and set `WASTE["full_when"] = 1`.

## Flashing

1. Hold BOOTSEL, plug the Pico into a computer, and copy the MicroPython UF2 for the Pico from https://micropython.org/download/RPI_PICO/ onto the drive that appears. It reboots into MicroPython.
2. Copy the firmware over, from this folder:

   ```bash
   pip install mpremote
   mpremote cp -r fluidics : + cp main.py : + reset
   ```

   Or in Thonny: pick the MicroPython (Raspberry Pi Pico) interpreter, then in the Files pane select `main.py` and the `fluidics` folder and choose **Upload to /**.
3. Plug the Pico into the Raspberry Pi. It shows up as `/dev/ttyACM0` (or the next free number) with USB vendor id 2E8A, which is how the Pi finds it when `AUTOLAB_PICO_PORT=auto`.

Copying never touches `calibration.json`, so calibration survives updates. Connecting with Thonny or `mpremote` stops `main.py` (it sends Ctrl-C); the firmware closes every valve and stops both pumps on the way out. Unplug and replug, or `mpremote reset`, to start it again.

To talk to it by hand, open the port with any serial terminal (`python -m serial.tools.miniterm /dev/ttyACM0`) and type one request per line:

```json
{"id": 1, "cmd": "hello"}
{"id": 2, "cmd": "status"}
```

## Checking enable and direction

Do this before tubing goes on.

1. **Enable.** With the Pico running and idle, the SMC10 should be disabled: the motor shaft turns freely by hand. If it is stiff (the coils are powered), or the pump turns, set `"enable_level": 0` for that pump in `config.py` and copy it over.
2. **Speed.** Run a pump and measure bottom-row pin 5 against pin 4 with a meter while it runs. It should match the `speed_v` that `fluidics pump` prints when the run starts: 1.85 V at 30 µL/s.

   ```bash
   cd devices/raspberry-pi && source .venv/bin/activate
   sudo systemctl stop autolab-agent       # it holds the serial port
   python -m autolab_agent.main fluidics valve addition media
   python -m autolab_agent.main fluidics pump addition to_head --seconds 4 --flow 30
   ```

3. **Direction.** Fit the tubing, put the head over a beaker and run the same pump again. Liquid should move from the media bottle toward the needle. If it moves back toward the bottle, flip `"to_head_level"` for that pump in `config.py` and copy the file over again. Close the valve after: `fluidics valve addition closed`. Do the same for the aspiration pump with the cleaner bottle (`fluidics valve aspiration cleaner`, then `pump aspiration to_head`).

## Setting the speed scale

`rpm_at_5v` (placeholder 75) is how fast the SMC10 runs with 5 V on its speed input. If Simply Pumps tell you the figure, set it. Otherwise measure it: put a tape flag on the pump's rotor, run 60 s at a known flow with the tip over a beaker, and count the turns.

```bash
python -m autolab_agent.main fluidics valve aspiration cleaner
python -m autolab_agent.main fluidics pump aspiration to_head --seconds 60 --flow 50
python -m autolab_agent.main fluidics valve aspiration closed
```

`fluidics pump` prints the `speed_v` it asks for, 3.08 V here. If the rotor made 44 turns, `rpm_at_5v` is 44 × 5 / 3.08 = 71.4:

```bash
python -m autolab_agent.main fluidics calibrate aspiration --rpm-at-5v 71.4
```

Weighing (below) covers what's left, so this step is optional, but it keeps the 75 rpm limit honest.

## Calibrating a pump

`ul_per_rev` in `config.py` is Simply Pumps' figure for 1/16" tubing, 65 µL per turn. Every pump needs calibrating, and again after a tubing change. Use water at room temperature: 1 mg is 1 µL.

1. Fill the line so no air is left in it. For the addition pump: `fluidics prime --pump addition --volume-ul 2000` with the needle over a beaker. For the aspiration pump, fill the cleaner bottle with water and run `fluidics prime --pump aspiration --volume-ul 2000`.
2. Tare a tube on a balance, hold it under the needle or tip, and pump a known volume at the flow you will use:

   ```bash
   python -m autolab_agent.main fluidics valve addition media
   python -m autolab_agent.main fluidics pump addition to_head --volume-ul 1000 --flow 30
   python -m autolab_agent.main fluidics valve addition closed
   ```

3. Weigh it, and tell the Pico what it asked for and what came out:

   ```bash
   python -m autolab_agent.main fluidics calibrate addition --commanded-ul 1000 --measured-ul 962
   ```

   The Pico works out the new µL per turn (65 × 962 / 1000 = 62.5), saves it to `calibration.json` and uses it straight away. `fluidics calibrate addition --ul-per-rev 62.5` sets it directly.
4. Repeat until a run lands within 1 to 2% of what was asked. `fluidics status` shows each pump's `ul_per_rev`, `rpm_at_5v` and whether it is calibrated.

A run is timed, so the start and stop (the speed filter and the SMC10's ramp) take a little off each one. Calibrate at the volume and flow the routines use. Peristaltic pumps pulse and can deliver a little differently at other flows or in reverse, so check aspiration in the from_head direction too if its volume matters.

A `calibration.json` from the old STEP/DIR firmware holds steps per µL. The new firmware ignores it, so calibrate again after updating.

## What's still unverified

- The SMC10 header pin reading: pin 5 the speed input, pin 6 the +5 V reference, top pin 3 and bottom pin 4 GND.
- EN and DIR polarity, and that the SMC10's inputs have their own pull-ups (the guide's switches suggest so).
- How the SMC10 maps 0 to 5 V to speed, and whether it needs programming from Simply Pumps before it does.
- That the SMC10's 5 V can power an op-amp.
- 65 µL per turn, and how back pressure and tubing wear change it.

See also [docs/firmware.md](../../docs/firmware.md#whats-still-unverified).
