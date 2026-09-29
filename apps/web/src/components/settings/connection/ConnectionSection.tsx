"use client";
import { RotateCw } from "lucide-react";
import type { Connection } from "@/model/types";
import { useAutolab } from "@/providers/autolab-context";
import { StatusDot, type DotState } from "../../ui/StatusDot";
import { SettingsRow, SettingsSection } from "../SettingsSection";
import { GatewayForm } from "./GatewayForm";

/** How the browser's socket to the gateway is doing, in a dot and a word. */
const STATE: Record<Connection, { dot: DotState; label: string }> = {
  connected: { dot: "online", label: "Connected" },
  connecting: { dot: "idle", label: "Connecting" },
  reconnecting: { dot: "idle", label: "Reconnecting" },
  idle: { dot: "offline", label: "Not connected" },
};

/** The gateway address and whether this browser is talking to it. */
export function ConnectionSection() {
  const { device, connection, reconnect } = useAutolab();
  // With no device there's nothing to connect for, so say that instead of "Not connected".
  const state = device ? STATE[connection] : { dot: "offline" as const, label: "No device" };

  return (
    <SettingsSection title="Connection">
      <SettingsRow label="Status">
        <span className="settings-status" role="status">
          <StatusDot state={state.dot} />
          {state.label}
        </span>
        {device && connection !== "connected" ? (
          <button type="button" className="btn btn--sm" onClick={reconnect}>
            <RotateCw size={16} strokeWidth={1.8} aria-hidden="true" />
            Retry
          </button>
        ) : null}
      </SettingsRow>
      <GatewayForm />
    </SettingsSection>
  );
}
