"use client";
import { useState, type FormEvent } from "react";
import { ChevronRight, LoaderCircle } from "lucide-react";
import { DeviceNameField, WaitingRow } from "./DeviceParts";
import { StepFrame } from "./StepFrame";

interface ManualFormProps {
  mode: "demo" | "cloud";
  gateway: string;
  busy: boolean;
  waiting: boolean;
  message: string;
  onSubmit: (idOrCode: string, name: string) => Promise<void>;
  onStop: () => void;
}

/** How to start the Pi agent against this app's gateway. It prints the ID or claim code. */
function agentCommand(gateway: string) {
  return `cd AutoLab/devices/raspberry-pi\nsource .venv/bin/activate\npython -m autolab_agent.main --gateway ${gateway}`;
}

/**
 * Step 4 without Bluetooth: the person set up Wi-Fi on the Pi themselves
 * (Raspberry Pi Imager or SSH) and pastes what the Pi agent printed. Demo
 * mode wants the Device ID; cloud mode wants the six-digit claim code.
 */
export function ManualForm({ mode, gateway, busy, waiting, message, onSubmit, onStop }: ManualFormProps) {
  const [name, setName] = useState("My Autolab");
  const [value, setValue] = useState("");
  const locked = busy || waiting;
  const cloud = mode === "cloud";

  function submit(event: FormEvent) {
    event.preventDefault();
    void onSubmit(value, name);
  }

  return (
    <form className="onboarding-form" onSubmit={submit}>
      <StepFrame
        title="Add your Autolab"
        lead={cloud ? "Enter the claim code the Pi agent shows." : "Paste the Device ID the Pi agent shows."}
        message={message}
        actions={
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={locked}>
            {/* While waiting, the waiting row carries the spinner. */}
            {busy ? <LoaderCircle size={18} strokeWidth={1.8} className="spin" aria-hidden="true" /> : null}
            Connect device
          </button>
        }
      >
        <div className="onboarding-fields">
          <DeviceNameField value={name} onChange={setName} disabled={locked} />
          {cloud ? (
            <label className="field">
              <span className="field__label">Six-digit claim code</span>
              <input
                className="input mono"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                autoComplete="off"
                required
                disabled={locked}
              />
            </label>
          ) : (
            <label className="field">
              <span className="field__label">Device ID</span>
              <input
                className="input mono"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Printed by the Pi agent"
                autoComplete="off"
                spellCheck={false}
                required
                disabled={locked}
              />
            </label>
          )}
        </div>
        <details className="onboarding-details">
          <summary>
            <ChevronRight className="onboarding-details__chevron" size={16} strokeWidth={1.8} aria-hidden="true" />
            Pi agent command
          </summary>
          <pre className="onboarding-code">{agentCommand(gateway)}</pre>
          <p className="onboarding-details__text">Set up Wi-Fi first with Raspberry Pi Imager, or over SSH with sudo nmtui.</p>
        </details>
        {waiting ? <WaitingRow onStop={onStop} /> : null}
      </StepFrame>
    </form>
  );
}
