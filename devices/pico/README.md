# Pico fluidics controller

MicroPython firmware for the Raspberry Pi Pico that runs the Autolab's fluidics: the addition and aspiration pumps, their pinch valves, the HEPA fan and the waste bottle's float switch. The Raspberry Pi talks to it over USB serial with one JSON object per line. The protocol, the safety rules and the media change routines are in [docs/firmware.md](../../docs/firmware.md).

| File | What it does |
| --- | --- |
| `main.py` | Runs at boot. Reads the USB serial port without blocking and runs the loop. |
| `fluidics/config.py` | Pins, flow limits, the watchdog time. Edit it here and copy it over. |
| `fluidics/hal.py` | The only file that touches hardware: pins, PWM, and the PIO program that makes STEP pulses. |
| `fluidics/controller.py` | Commands, interlocks, the watchdog, events. |
| `fluidics/pumps.py`, `valves.py`, `fan.py` | One part each. |
| `fluidics/protocol.py`, `serve.py` | JSON lines in and out, and the main loop. |
| `calibration.json` | Written on the Pico by the `calibrate` command. Not in the repository. |

## Wiring

All grounds are common: Pico, both TMC2209 boards, the valve driver and the fan supply.

| Part | Signal | Pico pin | Notes |
| --- | --- | --- | --- |
| Addition pump (TMC2209) | STEP | GP2 | |
| | DIR | GP3 | |
| | EN | GP4 | Active low. The firmware holds it high (off) except during a run. |
| Aspiration pump (TMC2209) | STEP | GP6 | |
| | DIR | GP7 | |
| | EN | GP8 | Active low |
| Addition valve | media | GP10 | Normally closed pinch valve. High opens it. |
| | cleaner | GP11 | |
| | waste | GP12 | |
| Aspiration valve | waste | GP13 | |
| | cleaner | GP14 | |
| HEPA fan | PWM | GP15 | 25 kHz |
| | tach | GP16 | 2 pulses per turn. Internal pull-up is on; a 10 kΩ to 3V3 gives cleaner edges. |
| Waste bottle | float switch | GP18 | Switch to GND. Internal pull-up. Low means full. |
| Status LED | | LED | On while a pump runs |

Things to get right on the bench:

- **TMC2209**: STEP/DIR (standalone) mode. VIO to the Pico's 3V3, VM from the pump supply. MS1 and MS2 both high give 1/16 microstepping, which the placeholder calibration assumes; whatever you pick, calibration covers it. Set the motor current with the driver's potentiometer before the first run.
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

## Checking direction

Before calibrating, make sure each pump turns the way its name says. With the head over a beaker:

```bash
cd devices/raspberry-pi && source .venv/bin/activate
sudo systemctl stop autolab-agent       # it holds the serial port
python -m autolab_agent.main fluidics valve addition media
python -m autolab_agent.main fluidics pump addition to_head --seconds 3 --flow 10
python -m autolab_agent.main fluidics valve addition closed
```

Liquid should move from the media bottle toward the needle. If it moves back toward the bottle, set `"invert": True` for that pump in `config.py` and copy the file over again. Do the same for the aspiration pump with the cleaner bottle (`fluidics valve aspiration cleaner`, then `pump aspiration to_head`).

## Calibrating a pump

`steps_per_ul` in `config.py` is a placeholder (16 steps per µL). Every pump needs calibrating, and again after a tubing change. Use water at room temperature: 1 mg is 1 µL.

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

   The Pico works out the new steps per µL from the current one, saves it to `calibration.json` and uses it straight away. `fluidics calibrate addition --steps-per-ul 16.6` sets it directly.
4. Repeat until a run lands within 1 to 2% of what was asked. `fluidics status` shows each pump's steps per µL and whether it is calibrated.

Peristaltic pumps pulse and can deliver a little differently at other flows or in reverse. Calibrate at the flow the routines use, and check aspiration in the from_head direction too if its volume matters.
