"use client";
import { SceneLabel } from "@/components/three";
import { CLOUD_POSITION, GATEWAY_LINE, ROUTER_POSITION, WIFI_LINE } from "./bench-layout";
import { DrawLine } from "./DrawLine";
import { CloudShape, RouterShape } from "./NetworkShapes";

interface NetworkLinksProps {
  /** Discover shows the Pi reaching the router; Device adds the router reaching the gateway. */
  reach: "router" | "gateway";
  /** Draw the newest line in. False shows every line whole. */
  play: boolean;
  /** Confirmed links turn the accent: the Pi is on Wi-Fi, and it reached the gateway. */
  wifi: boolean;
  gateway: boolean;
}

/**
 * The network half of the bench: a router, the gateway as a cloud, and
 * plain lines between them. Only the link this step is about draws in,
 * and a line stays grey until the Pi actually reports that link.
 */
export function NetworkLinks({ reach, play, wifi, gateway }: NetworkLinksProps) {
  const toGateway = reach === "gateway";
  return (
    <group>
      <group position={ROUTER_POSITION}>
        <RouterShape linked={wifi} />
        {toGateway ? null : <SceneLabel text="Wi-Fi router" position={[0, 0.74, -0.2]} tone={wifi ? "accent" : "plain"} />}
      </group>
      <DrawLine points={WIFI_LINE} on={wifi} play={play && !toGateway} />
      {toGateway ? (
        <>
          <group position={CLOUD_POSITION}>
            <CloudShape />
            <SceneLabel text="Gateway" position={[0, 0.44, 0]} tone={gateway ? "accent" : "plain"} />
          </group>
          <DrawLine points={GATEWAY_LINE} on={gateway} play={play} />
        </>
      ) : null}
    </group>
  );
}
