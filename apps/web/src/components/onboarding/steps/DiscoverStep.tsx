"use client";
import { Bluetooth, ChevronRight, Info, LoaderCircle } from "lucide-react";
import { StepFrame } from "./StepFrame";

interface DiscoverStepProps {
  /** Null while the browser hasn't been checked yet. */
  supported: boolean | null;
  busy: boolean;
  message: string;
  onFind: () => void;
  onManual: () => void;
}

/** What the Pi runs so the browser can find it. It prints the setup PIN. */
const SERVICE_COMMAND = "cd AutoLab/devices/raspberry-pi\nsudo .venv/bin/python -m autolab_agent.provisioning";

/**
 * Step 3: find the Pi over Bluetooth. This is the main way in. Manual
 * Wi-Fi setup stays one click away for browsers without Web Bluetooth and
 * for networks the Pi can't join on its own.
 */
export function DiscoverStep({ supported, busy, message, onFind, onManual }: DiscoverStepProps) {
  return (
    <StepFrame
      title="Find your Autolab"
      lead="Send your Wi-Fi details to the Pi over Bluetooth."
      message={message}
      actions={
        <>
          <button
            type="button"
            className="btn btn--primary btn--lg btn--block"
            onClick={onFind}
            disabled={supported !== true || busy}
          >
            {busy ? (
              <LoaderCircle size={18} strokeWidth={1.8} className="spin" aria-hidden="true" />
            ) : (
              <Bluetooth size={18} strokeWidth={1.8} aria-hidden="true" />
            )}
            Find Autolab
          </button>
          <button type="button" className="btn btn--lg btn--block" onClick={onManual} disabled={busy}>
            Use manual Wi-Fi setup
          </button>
        </>
      }
    >
      <ol className="onboarding-list">
        <li>Start the setup service on the Pi. It shows a six-digit PIN.</li>
        <li>Select Find Autolab, then pick your Autolab.</li>
      </ol>
      <details className="onboarding-details">
        <summary>
          <ChevronRight className="onboarding-details__chevron" size={16} strokeWidth={1.8} aria-hidden="true" />
          Setup service command
        </summary>
        <pre className="onboarding-code">{SERVICE_COMMAND}</pre>
      </details>
      {supported === false ? (
        <p className="onboarding-note">
          <Info size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>Bluetooth needs Chrome or Edge on HTTPS. Use manual setup below.</span>
        </p>
      ) : null}
    </StepFrame>
  );
}
