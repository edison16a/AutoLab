# Autolab digital twin

The browser renders the machine with Three.js, React Three Fiber and Drei. The Pi does not render 3D. The model is a simplified conceptual layout based on the supplied Autolab frame, enclosed culture area, fixed plate, moving pipette carriage, reservoirs, and electronic subsystems. It is not dimensionally accurate CAD or a wiring diagram.

## Workspace

Connect a device to see the digital twin prominently on Overview. Open Components for `/autolab/{deviceId}/components`. The persistent workspace layout keeps captured images and the WebSocket alive while moving between these routes. Refresh still clears demo images. A device UUID in a direct components URL selects that device; cloud mode still verifies its ownership at the gateway.

- Orbit with drag, zoom with the wheel or pinch, pan with right-drag or two fingers.
- Click a modeled part or its searchable list row to select and focus it.
- Reset view returns to the full machine.
- Exploded view separates electronic components; connection lines identify physical or planned links.
- Select the camera to start live view beside the machine or take a photo.
- Select the Pi to view device ID, real heartbeat, reported network interface and agent version.

The physical context includes the printer frame, enclosure, camera mount, pipette, well plate, media and waste containers. Electronics have unique IDs. Sixteen selectable nodes cover the supplied list, counting X, Y and Z endstops individually and including the FPC cable and pH probe.

## Data truthfulness

Only Pi and camera functionality is connected by default. Unknown sensors show Not installed and no values. The FPC link is inferred only when a real camera is detected, and is marked unused for the simulator. Pi memory is a hardware specification, not a measured RAM-use value. Network type appears only if the agent can identify its current default-route interface. A labeled simulator remains labeled in the twin.

The gateway's `status` event includes `last_seen`, optional `agent_version` and `network`, and optional validated `components`. Last seen reflects the actual last device message, not a browser rendering timestamp. A future device heartbeat can report a component like:

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
      "telemetry": {"temperature_c": 37.1, "humidity_percent": 91.4},
      "lastUpdated": "2026-09-28T00:00:00Z"
    }
  ]
}
```

This is a protocol example only. No such sample readings are injected by the app or agent. New sensor drivers must acquire and validate real measurements before sending them. These values then appear automatically in the component details panel.

## Files and replacement points

- `registry/componentRegistry.ts`: IDs, names, purpose, positions, bounds and planned links.
- `state/useAutolab3DState.ts`: the single mapping from the existing device channel to all components.
- `models/*Model.tsx`: reusable, recognizable procedural models. Replace a module's implementation with a GLTF/GLB loader while retaining its local origin and scale.
- `AutolabModel.tsx`: selection, hover, highlight and exploded positioning.
- `SceneCamera.tsx`: focus transitions, OrbitControls and view limits.
- `DigitalTwin.tsx`: shared scene/list selection and the details panel.
- `onboarding/`: assembly animations and connection wizard.

The models share basic geometry and materials. Heavy scene code is dynamically imported, rendering is demand-based, device-pixel ratio is capped at 1.5, shadows use a 1024 map, and there is no postprocessing stack or external font/HDR download. Animation invalidates frames only while moving. Tutorial animations respect reduced motion and can be replayed. Unsupported WebGL or a lost context displays text guidance while the searchable component list and device actions remain usable.

## Onboarding

The wizard shows camera-ribbon installation while powered off, USB-C wall power, optional Bluetooth discovery, network setup, then the full machine. A completed animation is never treated as hardware verification. Ready requires a heartbeat and detected camera for the selected device. Manual setup remains available without Bluetooth.

The USB-C illustration is a power connection. It does not connect the Pi to the user's computer. Read [Bluetooth provisioning](bluetooth-provisioning.md) before using the optional Bluetooth path.

## Validation boundary

Browser checks cover the manual wizard, component selection and filtering, future-sensor empty states, reported agent version, route/session continuity, capture and analysis, small-screen overflow and refresh reset. Protocol tests cover real metadata forwarding and provisioning validation. Physical Bluetooth radio pairing, NetworkManager activation and CSI hardware still need a smoke test on the target Raspberry Pi.
