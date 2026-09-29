import type { Theme } from "@/hooks/use-theme";

/**
 * How the studio is lit in each theme. Light mode is a bright, soft studio
 * over a pale floor; dark mode is a near black studio where a stronger rim
 * light keeps graphite parts from sinking into the background. Values were
 * tuned by eye against the neutral material library.
 */
export interface StageLook {
  /** Tone mapping exposure. */
  exposure: number;
  /** Strength of the image based lighting built from the lightformers. */
  environment: number;
  /** Colour of the empty studio seen in reflections: the walls of the softbox room. */
  studio: string;
  key: number;
  fill: number;
  rim: number;
  /** Light bounced up from the studio floor. */
  floor: number;
  /** The one shadow casting light. */
  sun: number;
  ambient: number;
  /** Soft contact shadow right under the subject. */
  shadowOpacity: number;
  /** The key light's cast shadow on the floor, which grounds tall subjects. */
  castShadowOpacity: number;
}

export const STAGE_LOOKS: Record<Theme, StageLook> = {
  light: {
    exposure: 1,
    environment: 0.85,
    studio: "#8a8a8d",
    key: 2.4,
    fill: 1.1,
    rim: 1.2,
    floor: 0.9,
    sun: 1.5,
    ambient: 0.25,
    shadowOpacity: 0.5,
    castShadowOpacity: 0.1,
  },
  dark: {
    exposure: 0.92,
    environment: 0.7,
    studio: "#2a2a2d",
    key: 2.2,
    fill: 0.8,
    rim: 2.2,
    floor: 0.35,
    sun: 1.2,
    ambient: 0.12,
    shadowOpacity: 0.75,
    castShadowOpacity: 0.28,
  },
};
