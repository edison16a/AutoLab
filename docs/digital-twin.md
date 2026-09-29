# The 3D model

The web app draws the whole Autolab in 3D with Three.js, React Three Fiber and Drei. The Pi never renders anything. Every part is modelled in code from the design sketches and real part dimensions, in real world colours. It's a faithful picture of the machine, not manufacturing CAD or a wiring diagram.

## Where it shows up

- **Home** shows the whole machine running a demo loop (see below). Clicking a part opens it on the Hardware screen.
- **Hardware** is the full workspace. The machine stands still here so every part can be inspected.
- The **Connect device** wizard reuses the same models to show where the camera ribbon goes, how the Pi is powered and, at the end, the assembled machine.

## Using the Hardware screen

1. Click a part in the model or in the list on the left. The camera flies in close to it, and the rest of the machine stays visible around it.
2. The panel on the right shows what the part is, how it connects and its live state.
3. **Inspect item** shows the part on its own, centred, so you can turn it over. **Back to machine** returns to it in place.
4. **Exploded view** opens the enclosure and moves each part out along the way it's mounted. **Connections** draws the links between parts. **Reset view** flies back to the whole machine.

Drag to orbit and right drag (or two fingers) to pan. The scroll wheel and trackpad pinch zoom toward the pointer, so whatever is under the cursor stays under it. `/hardware?part=<id>` opens with that part selected, which is how Home links in.

## What the Home demo does

Home runs a looping media change, the same one the real machine is built for:

1. The tool travels to the tip rack, lowers slowly and presses onto a tip.
2. It visits three wells, draws off spent media (the tip fills amber) and empties it into the tip chute, then ejects that tip.
3. It takes a fresh tip, draws warm media from the reservoir (the tip fills pink) and gives each well its share back.
4. It parks, the camera's LED blinks for a picture, and the loop starts again with other wells.

Z always lifts to a safe height before any X or Y travel. Travel is quick with eased starts and stops, and moves onto a tip or into liquid are slow. Lead screws, pulleys and motor shafts turn with their axes, the drag chain rolls, the cables bend across the moving joints and the circulation fan spins.

The demo pauses when the model is scrolled out of view or the tab is hidden, and it's off entirely when the system asks for reduced motion. The Hardware screen never runs it.

## Telling the truth about parts

Only the Raspberry Pi and its camera are wired into the software today. Their state comes from the device itself: heartbeat, agent version, network and whether a camera was found. The simulator is labelled as a simulator everywhere. Every other part shows **Not installed** and no readings, rather than made up numbers.

When a driver for another part exists, the Pi can report it in its heartbeat and the details panel picks it up with no app changes:

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
| `src/data/hardware-parts-*.ts` | The parts registry. Each part has an id, a name, what it's for, how it connects, its model, where it sits, its exploded offset, its hit boxes and the camera angle it's framed from. |
| `src/data/hardware-connections.ts` | The links the Connections overlay draws. |
| `src/components/hardware` | The Hardware screen: the list, the details panel, the toolbar and `MachineView`, the one component every screen embeds. |
| `src/components/hardware/scene` | The canvas, the scene, each selectable part node, camera framing and the Connections overlay. |
| `src/components/three` | The shared 3D kit: the stage, lighting and shadows, materials and colours, primitives, camera controls and picking. |
| `src/components/three/models` | One model per part, with shared board details (chips, headers, connectors), the machine body, labware, and the wiring under `machine/wiring`. |
| `src/components/three/motion` | The demo. `script.ts` and `cycle.ts` write the loop as a robot program, `timeline.ts` turns a time into a machine pose, and the moving parts read that pose each frame. |

To change where a part sits, edit its registry entry. The model, its hit boxes, the camera framing, the exploded view and the demo's reach all follow from it. To swap a hand built model for a GLB file, keep the model's origin and scale and replace its body.

Materials live in `materials.ts` and their colours in `material-colors.ts`. The UI uses only the accent blue plus black and white, and the 3D models use real colours: a green Pi on a white platform, pink foam walls, a blue powder coated base with the team logo engraved in white, and colour coded wiring.

## Performance

- three.js loads only when a 3D view mounts, and never on the server.
- The canvas renders on demand. It draws while something moves and otherwise sits idle.
- Shadows are frozen until geometry moves. The demo redraws them five times a second instead of every frame.
- Repeated pieces (pins, screws, chain links, cable ties) are instanced, and each wire colour is one mesh.
- Only one full machine renders at a time. Home drops its canvas while the Connect device wizard draws its own.
- On a software renderer (no usable GPU, a virtual machine, headless CI) the view drops shadows and antialiasing and keeps the Home demo still, so the page stays responsive. Set `localStorage["autolab:render"] = "full"` to keep the full look, for example when taking screenshots.
- When WebGL is missing or lost, the view says so, and the parts list and device actions keep working.

## Checks

The end to end suite selects parts, inspects one, goes back, searches the list and checks the no-WebGL fallback, all with reduced motion on, so the demo stays still in tests. The Pi's Bluetooth radio pairing, NetworkManager activation and the real CSI camera still need a check on the target Raspberry Pi.
