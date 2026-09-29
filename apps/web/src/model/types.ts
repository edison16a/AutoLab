/**
 * Shapes shared across the app. Anything that crosses a feature boundary
 * (the device channel, the photo library, the screens) is described here so
 * features never import each other's internals just to get a type.
 */
import type { Analysis } from "@/lib/detection";

export type { Analysis, Detection } from "@/lib/detection";

/**
 * Where an image came from. `simulator` is kept apart from `pi` so the app
 * never passes synthetic frames off as a real camera.
 */
export type PhotoSource = "pi" | "simulator" | "computer" | "upload";

/** One image in the library, whether it lives in this browser or in Supabase. */
export interface Photo {
  id: string;
  /** Null for computer camera shots and uploads, which have no Autolab. */
  device_id: string | null;
  /** A blob URL for local images, or a signed Supabase URL in cloud mode. */
  url: string;
  width: number;
  height: number;
  captured_at: string;
  source: PhotoSource;
  /** Known for local images. Cloud rows don't report a size. */
  bytes?: number;
  analysis?: Analysis;
  analyzed_at?: string;
  /** True when the image is stored in Supabase rather than this browser. */
  cloud?: boolean;
}

/** An Autolab the signed in user can connect to. */
export interface Device {
  id: string;
  name: string;
}

/** One live preview frame. Frames are never stored, only shown. */
export interface Frame {
  id: string;
  url: string;
  width: number;
  height: number;
  analysis?: Analysis;
}

/**
 * A part the Pi agent reports on through its heartbeat. Today only the Pi and
 * camera report; sensors will use the same shape once they have drivers.
 */
export interface ComponentReport {
  id: string;
  installed: boolean;
  online?: boolean;
  status: string;
  telemetry?: Record<string, string | number | boolean>;
  lastUpdated?: string;
}

/** What the gateway last told us about the selected device. */
export interface DeviceStatus {
  online: boolean;
  camera_online: boolean;
  worker_online: boolean;
  simulated: boolean;
  last_seen: string | null;
  agent_version?: string;
  network?: string;
  components?: ComponentReport[];
}

/** State of this browser's WebSocket to the gateway. */
export type Connection = "idle" | "connecting" | "connected" | "reconnecting";

/** Toasts and activity entries share these kinds. */
export type NoticeKind = "info" | "success" | "error";

export interface Notice {
  id: string;
  text: string;
  kind: NoticeKind;
  /** ISO time the notice was raised. */
  time: string;
}

/** Status before the gateway has said anything, or after it goes quiet. */
export const OFFLINE_STATUS: DeviceStatus = {
  online: false,
  camera_online: false,
  worker_online: false,
  simulated: false,
  last_seen: null,
};

/** Device IDs are UUIDs printed by the Pi agent. */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
