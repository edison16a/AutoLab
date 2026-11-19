# The 3D model

The web app draws the whole Autolab in 3D with Three.js, React Three Fiber and Drei. The Pi never renders anything. Every part is modelled in code from the design sketches and real part dimensions, in real world colours. It's a faithful picture of the machine, not manufacturing CAD or a wiring diagram.

## Where it shows up

- **Home** shows the whole machine running a demo loop (see below). Clicking a part opens it on the Hardware screen.
- **Hardware** is the full workspace. The machine stands still here so every part can be inspected, until you press **Live view**.
- The **Connect device** wizard reuses the same models to show where the camera ribbon goes, how the Pi is powered and, at the end, the assembled machine.

## What's on the machine

The model follows the system design sketch, the fluidics sketch and the enclosure plan:

- **The enclosure**: a black V-slot frame on the blue base, closed by clear acrylic panels on the back, left, right and roof and the gasketed front door. A **HEPA fan filter unit** sits in the roof and pushes filtered air down through the chamber in an even, laminar flow, so particles are swept away from the open plate.
- **The gantry**: the converted Ender-3 motion system, carrying the camera dock and the **dispense head**.
- **The dispense head** replaces the pipette. Its stainless nose takes a disposable tip for aspiration, and a blunt needle beside it is the end of the addition line. It has no motor or electronics; the pumps do the work.
- **The fluidics platform**, outside on the left so bleach fumes and motor heat stay out of the chamber, holds what the fluidics sketch calls the combined system:
  - **Pump 1 (addition)** and **pump 2 (aspiration)**: Simply Pumps PMST100 stepper peristaltic pumps, modelled from the maker's dimensional drawing. Each mounts through an aluminium panel as designed, round flange and four roller head in front, NEMA 17 behind, both tube fittings pointing down. On 1/16" ID tubing each moves 0.065 mL a revolution, up to 75 RPM.
  - Under each pump's motor, its selector valve: the **3-way valve** connects pump 1 to fresh media, cleaner or waste, and the **2-way valve** connects pump 2 to waste or cleaner.
  - Behind the motors, a Simply Pumps **SMC10** controller for each pump, wired as its quick start guide shows: 24 V and the motor's two coils on its screw terminals, and the Pico's enable, direction and speed lines on its I/O header. A 24 V supply sits on the bench behind the platform.
  - The **cleaner** bottle (70% ethanol) and the **waste bottle and bleach trap**, shared by both valves. The waste has a float switch, so the pumps stop before it's full.
  - The **Pico** and its driver board, which run all of the above.
- **Inside the chamber**: the heated platform with the 24-well plate, the wash station and the **tip disposal bin** with its stripper, the tip rack, and the **media bottle**, kept at 37 °C, whose line runs out to the 3-way valve.
- **The Pi platform** on the right with the Pi and the pH board, and the environment sensors and outputs around the chamber.

The fluid lines are clear Tygon with the liquid showing inside, coloured like the sketch's key: pink for fresh media, amber for spent media and waste, green for cleaner.

## Using the Hardware screen

1. Click a part in the model or in the list on the left. The camera flies in close to it, and the rest of the machine stays visible around it.
2. The panel on the right shows what the part is, how it connects and its live state.
3. **Inspect item** shows the part on its own, centred, so you can turn it over. **Back to machine** returns to it in place.
4. **Exploded view** moves the door, the panels and the roof with its HEPA unit out, and each part along the way it's mounted. **Live view** plays the Home demo here; press it again to pause, and it turns Exploded view off while it runs. **Connections** draws the links between parts. **Reset view** flies back to the whole machine.

Drag to orbit and right drag (or two fingers) to pan. The scroll wheel and trackpad pinch zoom toward the pointer, so whatever is under the cursor stays under it. `/hardware?part=<id>` opens with that part selected, which is how Home links in.

## What the Home demo does

Home runs a looping media change on three wells, the protocol from the fluidics sketch:

1. **Aspiration**, for each well: the head presses onto a fresh tip, lowers it into the well, and the aspiration pump runs with its valve open to waste, so the spent media goes up through the tip (it shows amber) and the well empties. The head lifts away from the plate, slides the nose into the stripper's slot over the disposal bin and lifts, and the tip drops into the bin.
2. The aspiration pump runs on over the wash station to clear its line (ten seconds on the machine, shortened in the demo).
3. **Addition**: the 3-way valve opens to media and the addition pump pushes fresh media out of the needle into each well in turn, from just above the plate. A thin pink stream falls into the well and the media bottle goes down.
4. The addition pump runs back with its valve open to waste, so the line doesn't drip.
5. The head parks, the camera's LED blinks for a picture, and the loop starts again with other wells.

Z always lifts to a safe height before any X or Y travel. Travel is quick with eased starts and stops, and moves onto a tip or into liquid are slow. Lead screws, pulleys and motor shafts turn with their axes, the drag chain rolls, the cables and fluid lines bend across the moving joints, and the circulation and HEPA fans spin. The liquid really moves: while a pump runs, its rotor turns at the PMST100's 75 RPM, one way to push toward the head and the other to draw back, and the liquid in every line it's pumping through travels along at the speed 0.065 mL a revolution gives in a 1/16" bore, with the line glowing while it flows. Only the bottle line its valve has open moves; the valve's green light shows which. Each dose takes as long as it really would at that speed, so the wells empty and fill, the media bottle goes down and the waste comes up in step with the pumps, and the SMC10s' status lights show which pump is running.

The demo pauses when the model is scrolled out of view or the tab is hidden. On Home it's off entirely when the system asks for reduced motion. The Hardware screen runs it only when you press **Live view**, and then it plays whatever the motion setting, since you asked for it.

## Telling the truth about parts

The Raspberry Pi and its camera always report. Their state comes from the device itself: heartbeat, agent version, network and whether a camera was found. The simulator is labelled as a simulator everywhere. Every other part shows **Not installed** and no readings, rather than made up numbers, until its driver reports it.

The drivers for the fluidics, sensors, outputs and gantry are written (see [firmware](firmware.md)) and stay off until the Pi's `.env` turns them on. Then the Pi lists each part that really answered in its heartbeat, or in lab mode its status row, and the details panel picks it up with no app changes:

```json
{
  "type": "heartbeat",
  "camera_online": true,
  "components": [
    {
      "id": "sht85",
      "installed": true,
      "online": true,
      "status": "Online",
      "telemetry": { "temperature_c": 37.1, "humidity_percent": 91.4 },
      "lastUpdated": "2026-09-28T00:00:00Z"
    }
  ]
}
```

That's an example of the format only. Nothing in the app or the agent sends sample readings.

## How the code is organised

| Where | What's in it |
| --- | --- |
| `src/data/hardware-parts-*.ts` | The parts registry, by area: electronics, chamber, fluidics and motion. Each part has an id, a name, what it's for, how it connects, its model, where it sits, its exploded offset, its hit boxes and the camera angle it's framed from. |
| `src/data/hardware-connections.ts` | The links the Connections overlay draws: wiring and tubing. |
| `src/components/hardware` | The Hardware screen: the list, the details panel, the toolbar and `MachineView`, the one component every screen embeds. |
| `src/components/hardware/scene` | The canvas, the scene, each selectable part node, camera framing and the Connections overlay. |
| `src/components/three` | The shared 3D kit: the stage, lighting and shadows, materials and colours, primitives, camera controls and picking. |
| `src/components/three/models` | One model per part, with shared board details (chips, headers, connectors), the machine body, labware, the fluidics under `fluidics/` (the real parts' dimensions in `pump-spec.ts`, the moving liquid in `flow.ts`), and the wiring and tubing under `machine/wiring`. |
| `src/components/three/motion` | The demo. `script.ts` and `cycle.ts` write the loop as a robot program, `timeline.ts` turns a time into a machine pose (axes, pump rotors, open valve ports, liquid levels), and the moving parts read that pose each frame. |

To change where a part sits, edit its registry entry. The model, its hit boxes, the camera framing, the exploded view and the demo's reach all follow from it, and so do the ends of its fluid lines. The whole fluidics platform moves with `FLUIDICS` in `machine/layout.ts`. To swap a hand built model for a GLB file, keep the model's origin and scale and replace its body.

Materials live in `materials.ts` and their colours in `material-colors.ts`. The UI uses only the accent blue plus black and white, and the 3D models use real colours: a green Pi on a white platform, a black frame behind clear panels, a blue powder coated base with the team logo engraved in black, colour coded wiring and tinted fluid lines.

## Performance

- three.js loads only when a 3D view mounts, and never on the server.
- The canvas renders on demand. It draws while something moves and otherwise sits idle.
- Shadows are frozen until geometry moves. The demo redraws them five times a second instead of every frame.
- Repeated pieces (pins, screws, chain links, cable ties, diffuser holes) are instanced, and each wire and tube colour is one mesh.
- Only one full machine renders at a time. Home drops its canvas while the Connect device wizard draws its own.
- On a software renderer (no usable GPU, a virtual machine, headless CI) the view drops shadows and antialiasing and keeps the Home demo still, so the page stays responsive. Set `localStorage["autolab:render"] = "full"` to keep the full look, for example when taking screenshots.
- When WebGL is missing or lost, the view says so, and the parts list and device actions keep working.

## Checks

The end to end suite selects parts, inspects one, goes back, searches the list and checks the no-WebGL fallback, all with reduced motion on, so the demo stays still in tests. The Pi's Bluetooth radio pairing, NetworkManager activation, the real CSI camera and all of the fluidics hardware still need a check on the target machine.
