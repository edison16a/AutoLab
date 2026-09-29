"use client";
import { useEffect, useRef, useState } from "react";
import { useDeviceSummary } from "@/hooks/use-device-summary";
import { errorText } from "@/lib/errors";
import { shortId } from "@/lib/format";
import type { Device } from "@/model/types";
import { useAutolab } from "@/providers/autolab-context";
import { StatusDot } from "../../ui/StatusDot";
import { CopyIdButton } from "./CopyIdButton";
import { RenameForm } from "./RenameForm";

interface DeviceRowProps {
  device: Device;
  /** Only the selected device has a live connection, so only it gets a status. */
  selected: boolean;
  /** Demo only. Cloud devices stay claimed by the account. */
  onForget?: () => void;
}

/** One Autolab: its name, short ID and the actions that change it. */
export function DeviceRow({ device, selected, onForget }: DeviceRowProps) {
  const { renameDevice, notify } = useAutolab();
  const summary = useDeviceSummary();
  const [editing, setEditing] = useState(false);
  const renameButton = useRef<HTMLButtonElement>(null);
  // Set when the editor closes, so focus lands back on Rename instead of the page.
  const refocus = useRef(false);

  useEffect(() => {
    if (editing || !refocus.current) return;
    refocus.current = false;
    renameButton.current?.focus();
  }, [editing]);

  function close() {
    refocus.current = true;
    setEditing(false);
  }

  async function save(name: string) {
    try {
      await renameDevice(device.id, name);
      close();
    } catch (error) {
      notify(errorText(error), "error");
      throw error;
    }
  }

  return (
    <div className="settings-row settings-device">
      <span className="settings-device__dot">{selected ? <StatusDot state={summary.dot} /> : null}</span>
      {editing ? (
        <RenameForm name={device.name} onSave={save} onCancel={close} />
      ) : (
        <>
          <div className="settings-device__text">
            <span className="settings-device__name">
              <span className="settings-device__label">{device.name}</span>
              {selected ? <span className="settings-row__hint">{summary.label}</span> : null}
            </span>
            <span className="settings-device__id">
              <span className="mono" title={device.id}>
                {shortId(device.id)}
              </span>
              <CopyIdButton id={device.id} />
            </span>
          </div>
          <div className="settings-row__control">
            <button ref={renameButton} type="button" className="btn btn--sm" onClick={() => setEditing(true)}>
              Rename
            </button>
            {onForget ? (
              <button type="button" className="btn btn--sm" onClick={onForget}>
                Forget
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
