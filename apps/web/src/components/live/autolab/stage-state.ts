import type { Connection, Device, DeviceStatus, Frame, Role } from "@/model/types";

/** What the Autolab stage shows, from most to least blocking. */
export type StageState = "no-device" | "remote" | "connecting" | "offline" | "no-camera" | "paused" | "waiting" | "live";

interface StageInputs {
  role: Role;
  device: Device | null;
  connection: Connection;
  status: DeviceStatus;
  preview: boolean;
  frame: Frame | null;
}

/**
 * Picks the one thing worth saying about the camera right now. The order
 * matters: there's no point asking someone to start the preview when the Pi
 * itself is offline.
 */
export function stageState({ role, device, connection, status, preview, frame }: StageInputs): StageState {
  if (!device) return "no-device";
  // Frames only reach the lab computer, so a remote screen explains that instead.
  if (role === "remote") return "remote";
  if (connection !== "connected") return "connecting";
  if (!status.online) return "offline";
  if (!status.camera_online) return "no-camera";
  if (!preview) return "paused";
  return frame ? "live" : "waiting";
}
