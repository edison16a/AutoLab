"use client";
import { useId, useState, type FormEvent } from "react";
import { LoaderCircle, Wifi } from "lucide-react";
import type { ProvisionStatus } from "@/lib/provisioning/bluetooth";
import { PasswordField } from "../../ui/PasswordField";
import { Switch } from "../../ui/Switch";
import type { WifiDetails } from "../use-connect-flow";
import { DeviceNameField, ProvisionState, WaitingRow } from "./DeviceParts";
import { StepFrame } from "./StepFrame";

interface WifiFormProps {
  busy: boolean;
  waiting: boolean;
  message: string;
  state: ProvisionStatus["state"] | null;
  /** The Wi-Fi the Pi is already on, or null when it's offline or too old to say. */
  currentWifi: string | null;
  onSubmit: (details: WifiDetails) => Promise<void>;
  onManual: () => void;
  onStop: () => void;
}

/**
 * Step 4 over Bluetooth: the Wi-Fi name, password and the PIN the Pi shows
 * go straight to the Pi and are never stored or sent anywhere else. The
 * PIN is cleared after each attempt; the password stays, so a mistyped PIN
 * doesn't mean typing the password again. A Pi that's already online can
 * keep its Wi-Fi, which is the default: joining a new network drops the
 * current one, and a phone hotspot may not let the Pi back on.
 */
export function WifiForm({ busy, waiting, message, state, currentWifi, onSubmit, onManual, onStop }: WifiFormProps) {
  const [name, setName] = useState("My Autolab");
  const [keep, setKeep] = useState(true);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const hint = useId();
  const locked = busy || waiting;
  const keeping = currentWifi !== null && keep;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(keeping ? { name, ssid: "", password: "", pin } : { name, ssid, password, pin });
    setPin("");
  }

  return (
    <form className="onboarding-form" onSubmit={submit}>
      <StepFrame
        title={keeping ? "Connect your Autolab" : "Join Wi-Fi"}
        lead="Sent to the Pi over Bluetooth. Nothing is saved."
        message={message}
        actions={
          <>
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={locked}>
              {busy ? (
                <LoaderCircle size={18} strokeWidth={1.8} className="spin" aria-hidden="true" />
              ) : (
                <Wifi size={18} strokeWidth={1.8} aria-hidden="true" />
              )}
              {keeping ? "Connect device" : "Connect Wi-Fi"}
            </button>
            <button type="button" className="btn btn--lg btn--block" onClick={onManual} disabled={busy}>
              Use manual setup instead
            </button>
          </>
        }
      >
        <div className="onboarding-fields">
          <DeviceNameField value={name} onChange={setName} disabled={locked} />
          {currentWifi !== null ? (
            <label className="onboarding-keep">
              <Wifi size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="onboarding-keep__text">
                <span className="onboarding-keep__label">Keep this Wi-Fi</span>
                <span id={hint} className="onboarding-keep__hint">
                  This Autolab is already on {currentWifi}.
                </span>
              </span>
              <Switch label="Keep this Wi-Fi" describedBy={hint} checked={keep} onChange={setKeep} disabled={locked} />
            </label>
          ) : null}
          {keeping ? null : (
            <>
              {/* Wi-Fi names are case sensitive, so phones must not capitalize or correct them. */}
              <label className="field">
                <span className="field__label">Wi-Fi name</span>
                <input
                  className="input"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  maxLength={32}
                  required
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={locked}
                />
              </label>
              <PasswordField
                label="Wi-Fi password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={63}
                required
                autoComplete="new-password"
                disabled={locked}
              />
            </>
          )}
          <PasswordField
            label="Setup PIN shown on the Pi"
            noun="PIN"
            className="mono"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="off"
            disabled={locked}
          />
        </div>
        <ProvisionState state={state} />
        {waiting ? <WaitingRow onStop={onStop} /> : null}
      </StepFrame>
    </form>
  );
}
