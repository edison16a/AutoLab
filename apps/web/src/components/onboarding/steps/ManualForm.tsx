"use client";
import { useState, type FormEvent } from "react";
import { ChevronRight, LoaderCircle } from "lucide-react";
import { supabaseSettings, type AppMode } from "@/lib/cloud";
import { DeviceNameField, WaitingRow } from "./DeviceParts";
import { StepFrame } from "./StepFrame";

interface ManualFormProps {
  mode: AppMode;
  gateway: string;
  busy: boolean;
  waiting: boolean;
  message: string;
  onSubmit: (idOrCode: string, name: string) => Promise<void>;
  onStop: () => void;
}

/**
 * How to start the Pi agent by hand. It prints the ID, claim code or setup
 * code. Lab mode points it at Supabase with the public key, which is safe to show.
 */
function agentCommand(mode: AppMode, gateway: string) {
  const start = "cd AutoLab/devices/raspberry-pi\nsource .venv/bin/activate\npython -m autolab_agent.main";
  if (mode !== "lab") return `${start} --gateway ${gateway}`;
  const { url, key } = supabaseSettings();
  return `${start} \\\n  --supabase-url ${url} \\\n  --supabase-key ${key}`;
}

const LEAD: Record<AppMode, string> = {
  demo: "Paste the Device ID the Pi agent shows.",
  lab: "Paste the setup code the Pi agent shows.",
  cloud: "Enter the claim code the Pi agent shows.",
};

/**
 * Step 4 without Bluetooth: the person set up Wi-Fi on the Pi themselves
 * (Raspberry Pi Imager or SSH) and pastes what the Pi agent printed. Demo
 * mode wants the Device ID, lab mode the setup code and cloud mode the
 * six-digit claim code.
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
        lead={LEAD[mode]}
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
              <span className="field__label">{mode === "lab" ? "Setup code" : "Device ID"}</span>
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
          <pre className="onboarding-code">{agentCommand(mode, gateway)}</pre>
          <p className="onboarding-details__text">Set up Wi-Fi first with Raspberry Pi Imager, or over SSH with sudo nmtui.</p>
        </details>
        {waiting ? <WaitingRow onStop={onStop} /> : null}
      </StepFrame>
    </form>
  );
}
