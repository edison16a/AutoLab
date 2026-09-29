"use client";
import { useCallback, useState } from "react";
import { Plus, Router } from "lucide-react";
import type { Device } from "@/model/types";
import { useAutolab } from "@/providers/autolab-context";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { EmptyState } from "../../ui/EmptyState";
import { SettingsSection } from "../SettingsSection";
import { DeviceRow } from "./DeviceRow";

/** Every Autolab linked to this account, with rename, forget and connect. */
export function DevicesSection() {
  const { devices, device, mode, openConnect, forgetDevice } = useAutolab();
  const [forgetting, setForgetting] = useState<Device | null>(null);
  // The dialog's effect depends on onCancel, so it has to be stable while it's open.
  const cancel = useCallback(() => setForgetting(null), []);

  function forget() {
    if (forgetting) forgetDevice(forgetting.id);
    setForgetting(null);
  }

  const connect = (
    <button type="button" className="btn btn--sm" onClick={openConnect}>
      <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
      Connect device
    </button>
  );

  return (
    <SettingsSection title="Devices" action={devices.length ? connect : undefined}>
      {devices.length ? (
        devices.map((d) => (
          <DeviceRow
            key={d.id}
            device={d}
            selected={d.id === device?.id}
            onForget={mode === "demo" ? () => setForgetting(d) : undefined}
          />
        ))
      ) : (
        <EmptyState
          compact
          icon={Router}
          title="No devices"
          action={
            <button type="button" className="btn btn--primary" onClick={openConnect}>
              <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
              Connect device
            </button>
          }
        />
      )}
      <ConfirmDialog
        open={forgetting !== null}
        title="Forget this device?"
        message={`${forgetting?.name ?? "It"} is removed from this browser. Its images stay in your library.`}
        confirmLabel="Forget"
        onConfirm={forget}
        onCancel={cancel}
      />
    </SettingsSection>
  );
}
