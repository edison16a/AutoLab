/**
 * The Autolab 3D kit: one place to build any 3D view in the app.
 *
 * Units and axes: 1 scene unit is about 81 mm on the real machine. Y is up,
 * the floor is y = 0, +X is to the right of the enclosure and +Z comes out
 * of the front door. Rotations are radians, XYZ order.
 *
 * Stage
 *   <Stage label className? cameraPosition? fov? shadowRadius? onPointerMissed?>
 *   The canvas. Renders on demand, dpr 1 to 1.75, neutral tone mapping, a
 *   softbox studio built from lightformers, frozen shadows (call
 *   useShadowRefresh() while geometry moves), a transparent background so
 *   CSS decides the backdrop, and the text "3D view is unavailable in this
 *   browser." when WebGL is missing or lost. Light and dark follow useTheme().
 *
 * Camera
 *   <FocusControls focus focusKey minDistance? maxDistance? bounds? insetRight?>
 *   Orbit, pan and zoom plus eased flights. Change focusKey to fly to focus
 *   ({ target, radius, direction, fill }); dragging stops a flight.
 *
 * Interaction
 *   <HitBox size center? onOver? onOut? onPick?>  steady invisible pick volume
 *   <Highlight target variant="selected" | "hover" | null>  accent silhouette
 *   <SceneLabel text position? tone="plain" | "accent" | "quiet">  HTML pill
 *
 * Materials (getMaterial(key), shared, never dispose them yourself)
 *   plasticWhite plasticGrey plasticBlack graphite pcbGraphite pcbWhite
 *   ribbon aluminium steel rubber acrylic glass liquid silkscreen ledOff
 *   ledOn accent. The accent is only for lit LEDs, emphasised connectors
 *   and selection.
 *
 * Primitives (from ./primitives; all take position, rotation and material)
 *   Block      size, radius?
 *   Cylinder   radius, height, taper?, low?
 *   Ring       radius, thin?
 *   Sphere     radius
 *   Repeat     items, shape or geometry, scale?, order? (one instanced draw)
 *   Board      size, inset?, holes?
 *   Tube       points, radius
 *   TextDecal  text, width, height, ink
 *   Pins       count, length
 *   Chip       size
 *   Bolt       radius
 *
 * Models (from ./models)
 *   PART_MODELS maps a part's model key to its component; each takes
 *   { live } to light its LED. PrinterFrameModel draws the fixed machine.
 */
export { Stage, type StageProps } from "./Stage";
export { STAGE_UNAVAILABLE } from "./stage/StageFallback";
export { useShadowRefresh } from "./stage/StageShadows";
export { FocusControls, type FocusControlsProps } from "./camera/FocusControls";
export { eyeFor, fitDistance, type CameraFocus } from "./camera/focus-math";
export { HitBox, type HitBoxProps } from "./interaction/HitBox";
export { Highlight, type HighlightProps } from "./interaction/Highlight";
export { SceneLabel, type SceneLabelProps } from "./interaction/SceneLabel";
export { getMaterial, type MaterialKey } from "./materials";
export { accentColor, readCssColor } from "./tokens";
export type { Placement, Vec3 } from "./types";
export * from "./primitives";
