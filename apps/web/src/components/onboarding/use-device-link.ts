"use client";
import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/cloud";
import { UUID_PATTERN, type DeviceStatus } from "@/model/types";
import { useAutolab } from "@/providers/autolab-context";

/**
 * Adds the new Autolab to this account and watches for proof it works: a
 * heartbeat and a detected camera from that exact device. A finished
 * animation or a sent form never counts as proof.
 */
export function useDeviceLink() {
  const { mode, gateway, addDevice, device, status } = useAutolab();
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  // Adding a device switches the selection, but the provider clears the old
  // device's status one render later. Remember the status that was on screen
  // at that moment so it can't pass for the new device's first heartbeat.
  const [stale, setStale] = useState<DeviceStatus | null>(null);
  // Bluetooth setup calls `follow` after a long wait, so read the newest values, not the ones from when it started.
  const latest = useRef({ selected: device?.id, status });
  latest.current = { selected: device?.id, status };

  /** Adds a device that needs no claim: demo and lab mode, or one this account already owns. */
  const follow = useCallback(
    async (id: string, name: string) => {
      const { selected, status: shown } = latest.current;
      await addDevice(id, name);
      setStale(selected === id ? null : shown);
      setWaitingFor(id);
    },
    [addDevice],
  );

  /**
   * Demo and lab mode take the Device ID as is. Cloud mode trades the six-digit
   * claim code for the device's ID once, through the gateway.
   */
  const attach = useCallback(
    async (deviceId: string, claimCode: string, name: string) => {
      let id = deviceId.trim();
      if (mode === "cloud") {
        const code = claimCode.trim();
        if (!/^\d{6}$/.test(code)) throw new Error("Enter the six-digit claim code from the Pi agent.");
        const claim = (await api(gateway, "/devices/claim", "POST", { code, name })) as { device_id?: string };
        id = claim.device_id ?? "";
      }
      if (!UUID_PATTERN.test(id)) throw new Error("Paste the full Device ID printed by the Pi agent.");
      await follow(id, name);
    },
    [mode, gateway, follow],
  );

  const stopWaiting = useCallback(() => setWaitingFor(null), []);

  const current = waitingFor !== null && device?.id === waitingFor && status !== stale;
  return {
    mode,
    gateway,
    attach,
    follow,
    waiting: waitingFor !== null,
    stopWaiting,
    /** The new device's heartbeat has arrived. */
    online: current && status.online,
    /** Heartbeat and camera both confirmed, so setup is done. */
    ready: current && status.online && status.camera_online,
  };
}
