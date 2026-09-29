"use client";
import { useState, type FormEvent } from "react";
import { LoaderCircle, Wifi } from "lucide-react";
import type { ProvisionStatus } from "@/lib/provisioning/bluetooth";
import type { WifiDetails } from "../use-connect-flow";
import { DeviceNameField, ProvisionState, WaitingRow } from "./DeviceParts";
import { StepFrame } from "./StepFrame";

interface WifiFormProps {
  busy: boolean;
  waiting: boolean;
  message: string;
  state: ProvisionStatus["state"] | null;
  onSubmit: (details: WifiDetails) => Promise<void>;
  onManual: () => void;
  onStop: () => void;
}

/**
 * Step 4 over Bluetooth: the Wi-Fi name, password and the PIN the Pi shows
 * go straight to the Pi. The password and PIN are cleared once sent, and
 * none of it is stored or sent anywhere else.
 */
export function WifiForm({ busy, waiting, message, state, onSubmit, onManual, onStop }: WifiFormProps) {
  const [name, setName] = useState("My Autolab");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const locked = busy || waiting;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ name, ssid, password, pin });
    setPassword("");
    setPin("");
  }

  return (
    <form className="onboarding-form" onSubmit={submit}>
      <StepFrame
        title="Join Wi-Fi"
        lead="Sent to the Pi over Bluetooth. Nothing is saved."
        message={message}
        actions={
          <>
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={locked}>
              {locked ? (
                <LoaderCircle size={18} strokeWidth={1.8} className="spin" aria-hidden="true" />
              ) : (
                <Wifi size={18} strokeWidth={1.8} aria-hidden="true" />
              )}
              Connect Wi-Fi
            </button>
            <button type="button" className="btn btn--lg btn--block" onClick={onManual} disabled={busy}>
              Use manual setup instead
            </button>
          </>
        }
      >
        <div className="onboarding-fields">
          <DeviceNameField value={name} onChange={setName} disabled={locked} />
          <label className="field">
            <span className="field__label">Wi-Fi name</span>
            <input className="input" value={ssid} onChange={(e) => setSsid(e.target.value)} maxLength={32} required autoComplete="off" disabled={locked} />
          </label>
          <label className="field">
            <span className="field__label">Wi-Fi password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={63}
              required
              autoComplete="new-password"
              disabled={locked}
            />
          </label>
          <label className="field">
            <span className="field__label">Setup PIN shown on the Pi</span>
            <input
              className="input mono"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="off"
              disabled={locked}
            />
          </label>
        </div>
        <ProvisionState state={state} />
        {waiting ? <WaitingRow onStop={onStop} /> : null}
      </StepFrame>
    </form>
  );
}
