"use client";
import { useState, type FormEvent } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { api, cloudEnabled } from "@/lib/cloud";
import { errorText } from "@/lib/errors";
import { UUID_PATTERN } from "@/model/types";
import { useAutolab } from "@/providers/autolab-context";
import { Dialog } from "../ui/Dialog";

/**
 * Links an Autolab to this account. Demo mode takes the Device ID the Pi agent
 * prints. Cloud mode takes the six digit claim code, which the gateway trades
 * for the device ID once. The dialog only says "ready" after a real heartbeat
 * and a detected camera.
 */
export default function ConnectWizard({ onClose }: { onClose: () => void }) {
  const { gateway, addDevice, device, status } = useAutolab();
  const [name, setName] = useState("My Autolab");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const ready = waitingFor !== null && device?.id === waitingFor && status.online && status.camera_online;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let id = code.trim();
      if (cloudEnabled) {
        if (!/^\d{6}$/.test(id)) throw new Error("Enter the six digit code from the Pi agent.");
        id = (await api(gateway, "/devices/claim", "POST", { code: id, name })).device_id;
      } else if (!UUID_PATTERN.test(id)) throw new Error("Paste the full Device ID printed by the Pi agent.");
      addDevice(id, name);
      setWaitingFor(id);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (ready)
    return (
      <Dialog
        open
        title="Your Autolab is ready"
        onClose={onClose}
        actions={
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Open Autolab
          </button>
        }
      >
        <p className="row muted">
          <Check size={16} aria-hidden="true" /> Heartbeat received and camera detected.
        </p>
      </Dialog>
    );

  return (
    <Dialog open title="Connect device" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span className="field__label">Device name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        </label>
        <label className="field">
          <span className="field__label">{cloudEnabled ? "Six-digit claim code" : "Device ID"}</span>
          <input
            className="input mono"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode={cloudEnabled ? "numeric" : undefined}
            placeholder={cloudEnabled ? "123456" : "Printed by the Pi agent"}
            required
          />
        </label>
        {error ? <p role="alert" className="small">{error}</p> : null}
        {waitingFor ? <p className="small muted">Waiting for the Pi and its camera.</p> : null}
        <div className="dialog__actions">
          <button type="button" className="btn" onClick={onClose} aria-label="Close setup">
            Cancel
          </button>
          <button className="btn btn--primary" disabled={busy || waitingFor !== null}>
            {busy || waitingFor ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : null}
            Connect device
          </button>
        </div>
      </form>
    </Dialog>
  );
}
