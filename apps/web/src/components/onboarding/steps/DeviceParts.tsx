"use client";
import { Bluetooth, LoaderCircle, Wifi } from "lucide-react";
import type { ProvisionStatus } from "@/lib/provisioning/bluetooth";

/** The Device name field both setup paths share. */
export function DeviceNameField({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  return (
    <label className="field">
      <span className="field__label">Device name</span>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} maxLength={80} required disabled={disabled} />
    </label>
  );
}

/**
 * Shown after the device is added and before its first heartbeat with a
 * camera. Stopping lets the person fix the Pi and try again.
 */
export function WaitingRow({ onStop }: { onStop: () => void }) {
  return (
    <div className="onboarding-waiting">
      <LoaderCircle size={16} strokeWidth={1.8} className="spin" aria-hidden="true" />
      <span className="grow" role="status">
        Waiting for the Pi and its camera
      </span>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onStop}>
        Stop waiting
      </button>
    </div>
  );
}

const STATE_TEXT: Record<ProvisionStatus["state"], string> = {
  ready: "Connected over Bluetooth",
  connecting: "Joining Wi-Fi",
  wifi_connected: "On Wi-Fi, reaching the gateway",
  gateway_connected: "Gateway reached",
  error: "Wi-Fi setup failed",
};

/** What the Pi last said over Bluetooth, in words. */
export function ProvisionState({ state }: { state: ProvisionStatus["state"] | null }) {
  if (!state) return null;
  const onWifi = state === "wifi_connected" || state === "gateway_connected";
  const Icon = onWifi ? Wifi : Bluetooth;
  return (
    <p className={`onboarding-state${onWifi ? " onboarding-state--on" : ""}`} role="status">
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
      {STATE_TEXT[state]}
    </p>
  );
}
