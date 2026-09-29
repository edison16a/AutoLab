"use client";
import "@/styles/hardware-stage.css";
import dynamic from "next/dynamic";

export type { MachineViewProps } from "./scene/machine-view-props";

/**
 * The whole Autolab in 3D, sized by its container: orbit, zoom, hover
 * labels, and `onSelect(partId)` when a part is clicked. The Hardware
 * screen drives it fully; Home can drop it in as is:
 *
 *   <MachineView onSelect={(id) => router.push(`/hardware?part=${id}`)} />
 *
 * three.js loads only when this mounts, and never on the server.
 */
export const MachineView = dynamic(() => import("./scene/MachineCanvas"), {
  ssr: false,
  loading: () => <div className="stage3d" aria-busy="true" />,
});
