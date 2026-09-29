/**
 * Turns binary messages from the device channel into app objects. The header
 * fields come from the gateway, which validates sizes and IDs before relaying.
 */
import { cloudEnabled } from "./cloud";
import type { Envelope } from "./protocol";
import type { Frame, Photo } from "@/model/types";

export function frameFromEnvelope({ header: h }: Envelope, url: string): Frame {
  return { id: String(h.frame_id), url, width: Number(h.width), height: Number(h.height) };
}

/** `simulated` comes from the device status at the moment the still arrives. */
export function photoFromCapture({ header: h, jpeg }: Envelope, deviceId: string, url: string, simulated: boolean): Photo {
  return {
    id: String(h.image_id),
    device_id: deviceId,
    url,
    width: Number(h.width),
    height: Number(h.height),
    captured_at: String(h.captured_at),
    bytes: jpeg.size,
    source: simulated ? "simulator" : "pi",
    cloud: cloudEnabled,
  };
}
