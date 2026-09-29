import type { Analysis } from "./detection";
import type { AutolabComponentState } from "@/components/autolab-3d/state/useAutolab3DState";

export type { Analysis, Detection } from "./detection";

/** Where an image came from. `pi` is a physical CSI camera, `simulator` the labeled agent simulator. */
export type PhotoSource = "pi" | "simulator" | "computer" | "upload";

export type Photo = {
  id: string;
  device_id: string | null;
  url: string;
  width: number;
  height: number;
  captured_at: string;
  source: PhotoSource;
  bytes?: number;
  analysis?: Analysis;
  analyzed_at?: string;
  /** Stored in Supabase (cloud mode). Local photos live in this browser only. */
  cloud?: boolean;
};

export type Device = { id: string; name: string };

export type Frame = {
  id: string;
  url: string;
  width: number;
  height: number;
  analysis?: Analysis;
};

export type DeviceStatus = {
  online: boolean;
  camera_online: boolean;
  worker_online: boolean;
  simulated: boolean;
  last_seen: string | null;
  agent_version?: string;
  network?: string;
  components?: AutolabComponentState[];
};

export type Connection = "idle" | "connecting" | "connected" | "reconnecting";

export type ActivityKind = "info" | "success" | "error";
export type Activity = { id: string; text: string; time: string; kind: ActivityKind };

export type Toast = { id: string; text: string; kind: ActivityKind };

export const offlineStatus: DeviceStatus = {
  online: false,
  camera_online: false,
  worker_online: false,
  simulated: false,
  last_seen: null,
};

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
