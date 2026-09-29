"use client";
import { useAutolab } from "@/providers/autolab-context";
import type { DotState } from "@/components/ui/StatusDot";

/**
 * One line answer to "is my Autolab working?", used by the device menu and
 * the home screen so they always agree.
 */
export function useDeviceSummary(): { dot: DotState; label: string } {
  const { device, connection, status } = useAutolab();
  if (!device) return { dot: "offline", label: "No device" };
  if (connection !== "connected") return { dot: "idle", label: connection === "reconnecting" ? "Reconnecting" : "Connecting" };
  if (!status.online) return { dot: "offline", label: "Offline" };
  if (!status.camera_online) return { dot: "idle", label: "Camera not detected" };
  return { dot: "online", label: status.simulated ? "Simulator online" : "Online" };
}
