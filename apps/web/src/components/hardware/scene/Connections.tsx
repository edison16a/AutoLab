"use client";
import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { SceneLabel } from "@/components/three/interaction/SceneLabel";
import { accentColor, readCssColor } from "@/components/three/tokens";
import type { Vec3 } from "@/components/three/types";
import { useTheme } from "@/hooks/use-theme";
import { PART_CONNECTIONS } from "@/data/hardware-connections";
import { partById, partCenter, type PartConnection } from "@/data/hardware-parts";

interface ConnectionsProps {
  selected: string | null;
  exploded: boolean;
  /** Live links (camera to Pi, Pi to gateway) are drawn solid in the accent only while they carry data. */
  cameraLive: boolean;
  piLive: boolean;
}

/** Where the gateway line ends: up and to the right of the Pi platform. */
const GATEWAY: Vec3 = [4.7, 2.4, -0.3];
const SAMPLES = 16;
/**
 * Links are a diagram over the model, so they draw on top of it: otherwise
 * the real cables and the foam walls swallow them. Transparent puts them in
 * the pass after every solid part.
 */
const OVERLAY = { transparent: true, depthTest: false } as const;
/** Half a label's height, so the gateway name sits on the line's end instead of above it. */
const ON_POINT = -12;

/**
 * A gentle arc between two points, lifted in the middle so lines clear the
 * parts between them. With no lift it rises and levels off into the higher end.
 */
function arc(a: Vec3, b: Vec3, lifted = true): Vec3[] {
  const lift = lifted ? 0.25 + Math.hypot(b[0] - a[0], b[2] - a[2]) * 0.12 : 0;
  const mid: Vec3 = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + lift, (a[2] + b[2]) / 2];
  return Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const t = i / SAMPLES;
    const u = 1 - t;
    return [0, 1, 2].map((k) => u * u * a[k] + 2 * u * t * mid[k] + t * t * b[k]) as Vec3;
  });
}

function isLive(link: PartConnection, cameraLive: boolean) {
  return link.live && (link.from !== "camera" || cameraLive);
}

/**
 * The wiring overlay. Planned links are dashed grey lines; links that carry
 * data now are solid accent. Links of the selected part are drawn heavier
 * and named.
 */
export function Connections({ selected, exploded, cameraLive, piLive }: ConnectionsProps) {
  const { theme } = useTheme();
  // Colours come from the CSS tokens. `theme` isn't read inside; it's the signal to read them again.
  const colors = useMemo(
    () => ({ theme, accent: accentColor(), planned: readCssColor("--text-muted", "#6b6b73"), strong: readCssColor("--text", "#0a0a0b") }),
    [theme],
  );
  const paths = useMemo(
    () =>
      PART_CONNECTIONS.map((link) => ({
        link,
        points: arc(partCenter(partById[link.from], exploded), partCenter(partById[link.to], exploded)),
      })),
    [exploded],
  );
  const pi = partCenter(partById.raspberry_pi, exploded);

  return (
    <group>
      {paths.map(({ link, points }) => {
        const live = isLive(link, cameraLive);
        const emphasized = link.from === selected || link.to === selected;
        return (
          <group key={`${link.from}-${link.to}`}>
            <Line
              points={points}
              color={live ? colors.accent : emphasized ? colors.strong : colors.planned}
              lineWidth={emphasized ? 3 : 2}
              dashed={!live}
              dashSize={0.12}
              gapSize={0.08}
              {...OVERLAY}
            />
            {emphasized ? <SceneLabel text={link.label} position={points[SAMPLES / 2]} tone="quiet" offset={4} /> : null}
          </group>
        );
      })}
      <Line
        // Unlifted, so it meets the label from the side instead of hooking down into it.
        points={arc(pi, GATEWAY, false)}
        color={piLive ? colors.accent : colors.planned}
        lineWidth={2}
        dashed={!piLive}
        dashSize={0.12}
        gapSize={0.08}
        {...OVERLAY}
      />
      <SceneLabel text={piLive ? "Gateway, connected" : "Gateway, not connected"} position={GATEWAY} tone="quiet" offset={ON_POINT} />
    </group>
  );
}
