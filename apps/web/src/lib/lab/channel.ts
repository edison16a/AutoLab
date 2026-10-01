/**
 * The Autolab's private Realtime channel, device:<id>. Only its owner and its
 * Pi can join. Screens send "watch" while the live view is open and "wake"
 * after sending a command; the Pi sends preview frames back.
 */
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../cloud";

export interface FrameMessage {
  id: string;
  w: number;
  h: number;
  /** The JPEG, base64 encoded, since Realtime messages are JSON. */
  jpeg: string;
}

export type ChannelState = "joining" | "joined" | "lost";

export function joinDeviceChannel(deviceId: string, onFrame: (frame: FrameMessage) => void, onState: (state: ChannelState) => void) {
  let channel: RealtimeChannel | null = null;
  let left = false;
  void (async () => {
    // Private channels check the login, so Realtime has to have the current one first.
    await supabase().realtime.setAuth();
    if (left) return;
    channel = supabase()
      .channel(`device:${deviceId}`, { config: { private: true, broadcast: { self: false } } })
      .on("broadcast", { event: "frame" }, ({ payload }) => onFrame(payload as FrameMessage))
      .subscribe((status) => {
        // supabase-js rejoins by itself after a drop, so anything but joined just means not right now.
        if (!left) onState(status === "SUBSCRIBED" ? "joined" : "lost");
      });
  })();
  return {
    send(event: "watch" | "wake") {
      void channel?.send({ type: "broadcast", event, payload: {} });
    },
    leave() {
      left = true;
      if (channel) void supabase().removeChannel(channel);
    },
  };
}

export function frameBlob(jpeg: string) {
  const bytes = Uint8Array.from(atob(jpeg), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: "image/jpeg" });
}
