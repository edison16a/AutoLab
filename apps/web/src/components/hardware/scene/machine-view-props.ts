/** Props for MachineView. Everything is optional; with none it's a browsable model of the machine. */
export interface MachineViewProps {
  /** Part id to outline and focus. */
  selected?: string | null;
  /** Controlled hover, for syncing with a list. Leave out to let the view track its own. */
  hovered?: string | null;
  onHover?: (id: string | null) => void;
  /** A part was clicked (not dragged across). */
  onSelect?: (id: string) => void;
  /** Show only the selected part, centred on the plain stage. */
  inspecting?: boolean;
  exploded?: boolean;
  connections?: boolean;
  /**
   * Bump to fly the camera to what the other props describe: the selected
   * part, the inspected part, or the whole machine when nothing is selected.
   */
  flight?: number;
  /** Pixels on the right covered by a floating panel, so framing centres on the rest. */
  insetRight?: number;
  /**
   * Share of the view the whole machine fills when nothing is selected. Home
   * sets it higher than the Hardware default, since nothing floats over it.
   */
  overviewFill?: number;
  /**
   * Runs the looping pipetting demo and spins the fan. Home turns it on; the
   * Hardware screen leaves it off so every part stays still to inspect.
   * Ignored when the person prefers reduced motion.
   */
  demo?: boolean;
  className?: string;
}
