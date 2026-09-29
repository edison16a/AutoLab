/**
 * Real world colours for the machine's parts. The app's UI keeps to one
 * accent, but the 3D model is a picture of real hardware, and a Raspberry Pi
 * only reads as a Raspberry Pi in its green solder mask with gold pins.
 * Values are picked from product photos and tuned for the studio lighting.
 */
import { DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from "three";

function standard(color: string, roughness: number, metalness = 0) {
  return new MeshStandardMaterial({ color, roughness, metalness });
}

/** Solder mask has a faint gloss over a matte base, which a clearcoat captures well. */
function solderMask(color: string) {
  return new MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.4 });
}

/** Powder coat: a satin colour coat with a soft gloss on top. */
function powderCoat(color: string) {
  return new MeshPhysicalMaterial({ color, roughness: 0.5, metalness: 0.1, clearcoat: 0.3, clearcoatRoughness: 0.35 });
}

/** A lit LED. Tone mapping is off so it stays saturated under bright studio light. */
function lit(color: string) {
  return new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.3, toneMapped: false });
}

/** Clear plastics and liquids: cheap transparency instead of real transmission (see materials.ts). */
function tinted(color: string, opacity: number, roughness: number) {
  return new MeshPhysicalMaterial({ color, roughness, transparent: true, opacity, depthWrite: false, side: DoubleSide, clearcoat: 0.5 });
}

export const COLOR_RECIPES = {
  // Boards
  pcbGreen: () => solderMask("#1d6a3b"),
  pcbDarkGreen: () => solderMask("#123f26"),
  pcbBlue: () => solderMask("#1d4f9e"),
  pcbRed: () => solderMask("#a82622"),
  pcbPurple: () => solderMask("#4a2c7c"),
  pcbBlack: () => solderMask("#18191b"),
  // Metals and finishes
  gold: () => standard("#d6a84e", 0.28, 1),
  copper: () => standard("#b87333", 0.32, 1),
  brass: () => standard("#c8a045", 0.3, 1),
  tin: () => standard("#d3d6da", 0.35, 1),
  blackAnodised: () => standard("#1f2023", 0.4, 0.6),
  // Bead blasted aluminium (stepper end caps, load cells): a bright satin silver, not a mirror.
  aluminiumBlasted: () => standard("#d4d7db", 0.5, 0.75),
  // Connector plastics
  connectorCream: () => standard("#eee4c8", 0.5),
  latchBrown: () => standard("#4b3122", 0.5),
  usbBlue: () => standard("#2566cf", 0.45),
  stiffenerBlue: () => standard("#2a5bb4", 0.5),
  labelWhite: () => standard("#f7f7f5", 0.6),
  // Pluggable screw terminals on printer mainboards are moulded in this leaf green.
  terminalGreen: () => standard("#2f8f4e", 0.5),
  // LEDs
  ledRed: () => lit("#ff3b30"),
  ledGreen: () => lit("#34c759"),
  ledAmber: () => lit("#ffb020"),
  ledRedOff: () => standard("#6b2320", 0.3),
  ledGreenOff: () => standard("#1f4a2a", 0.3),
  ledAmberOff: () => standard("#6a4a18", 0.3),
  // Ceramic chip capacitors are a dusty tan, which is what makes a board look populated up close.
  ceramicTan: () => standard("#b39a78", 0.62),
  // Multicoated lens glass: dark, glossy and tinted, so it reads as optics without real transmission.
  lensCoated: () =>
    new MeshPhysicalMaterial({ color: "#1b1a2a", roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.7, iridescenceIOR: 1.6 }),
  // Wires
  wireRed: () => standard("#c62828", 0.5),
  wireBlack: () => standard("#1b1b1d", 0.5),
  wireGreen: () => standard("#2e7d32", 0.5),
  wireBlue: () => standard("#1e63c4", 0.5),
  wireWhite: () => standard("#ededea", 0.5),
  wireYellow: () => standard("#f2b61f", 0.5),
  // Lab plastics and liquids
  capBlue: () => standard("#1f5fbf", 0.45),
  capRed: () => standard("#c9302c", 0.45),
  tipRackBlue: () => standard("#2d6ad6", 0.4),
  pipetteBlue: () => standard("#2a67cf", 0.35),
  // The dark slate handle of the team's P1000, as in their photo.
  pipetteNavy: () => standard("#262c38", 0.42),
  polystyrene: () => tinted("#f3f6fa", 0.32, 0.12),
  tubing: () => tinted("#eef3f6", 0.5, 0.25),
  mediaPink: () => tinted("#e2607f", 0.7, 0.15),
  wasteAmber: () => tinted("#d9a55a", 0.6, 0.2),
  // Natural HDPE is milky, so the liquid level still shows through it.
  hdpeNatural: () => tinted("#f2f1ea", 0.72, 0.5),
  // P1000 tips are moulded in a see through blue, so a loaded tip reads at a glance.
  tipBlue: () => tinted("#4f8fe6", 0.6, 0.25),
  // A thin walled HDPE bottle: milky, but the liquid inside still shows its colour.
  hdpeThin: () => tinted("#f3f2ec", 0.4, 0.45),
  // Printer parts
  bedTextured: () => standard("#26272a", 0.85, 0.1),
  printerRed: () => standard("#c8322b", 0.45),
  // Light grey PLA for the printed brackets and the pipette mount, matte like a fresh print.
  plaGrey: () => standard("#c3c5c8", 0.62),
  // Bed heater pads are orange red silicone.
  siliconeHeater: () => standard("#c4492c", 0.72),
  // Enclosure
  // Pink XPS insulation board: a matte, slightly waxy skin, the same colour right through.
  foamPink: () => standard("#f39bb0", 0.84),
  // High temperature silicone sponge, the usual orange red door seal on ovens and incubators.
  siliconeGasket: () => standard("#d4532f", 0.78),
  // Satin stainless for the humidity tray: brighter and softer than the polished steel of screws.
  stainless: () => standard("#c8cbcf", 0.34, 0.9),
  // Clean water with the faint blue it takes on in a steel pan.
  water: () => tinted("#6fbbe6", 0.5, 0.04),
  // The base in the Autolab blue, a shade deeper than the UI accent as powder coat reads lighter under light.
  powderBlue: () => powderCoat("#1b62d0"),
} satisfies Record<string, () => Material>;

export type ColorKey = keyof typeof COLOR_RECIPES;
