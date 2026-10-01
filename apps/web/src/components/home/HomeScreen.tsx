"use client";
import "@/styles/home.css";
import "@/styles/home-device.css";
import "@/styles/home-tiles.css";
import "@/styles/home-captures.css";
import "@/styles/home-actions.css";
import { labEnabled } from "@/lib/cloud";
import { useAutolab } from "@/providers/autolab-context";
import { ActionLog } from "./ActionLog";
import { ConnectCard } from "./ConnectCard";
import { DeviceCard } from "./DeviceCard";
import { HomeHeader } from "./HomeHeader";
import { MachinePanel } from "./MachinePanel";
import { NumberTiles } from "./NumberTiles";
import { RecentCaptures } from "./RecentCaptures";

/**
 * Home: the machine in 3D, how the device is doing, a few numbers and the
 * latest captures, plus lab mode's command log. Everything deeper lives on
 * its own screen, one click away.
 */
export function HomeScreen() {
  const { device } = useAutolab();

  return (
    <div className="page home">
      <HomeHeader />
      <div className="home-hero">
        <MachinePanel />
        <div className="home-side">
          {device ? <DeviceCard /> : <ConnectCard />}
          <NumberTiles />
        </div>
      </div>
      <RecentCaptures />
      {labEnabled ? <ActionLog /> : null}
    </div>
  );
}
