"use client";
import "@/styles/onboarding.css";
import "@/styles/onboarding-stage.css";
import "@/styles/onboarding-steps.css";
import "@/styles/onboarding-forms.css";
import { useLayoutEffect, useRef } from "react";
import { ArrowLeft, X } from "lucide-react";
import { StepContent } from "./StepContent";
import { StepIndicator } from "./StepIndicator";
import { useConnectFlow } from "./use-connect-flow";
import { useModalFocus } from "./use-modal-focus";
import { WizardStage } from "./WizardStage";
import { STEP } from "./wizard-steps";

/**
 * Connect an Autolab: seat the camera, power the Pi, find it over
 * Bluetooth (or set it up by hand), then wait for proof it works. A 3D
 * illustration of each step sits on the left, the step itself on the
 * right. Escape closes it, and focus stays inside while it's open.
 */
export default function ConnectWizard({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const flow = useConnectFlow();
  useModalFocus(dialog, onClose);

  // A new step starts at its top, even if the last one was scrolled to its button on a phone.
  useLayoutEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [flow.step, flow.path]);

  const canGoBack = flow.step > STEP.camera && flow.step < STEP.ready && !flow.busy && !flow.waiting;

  return (
    <div className="onboarding">
      <div ref={dialog} className="onboarding__dialog" role="dialog" aria-modal="true" aria-label="Connect device" tabIndex={-1}>
        <WizardStage step={flow.step} wifi={flow.wifiLinked} gateway={flow.gatewayLinked} />
        <div ref={panel} className="onboarding__panel">
          <div className="onboarding__head">
            <StepIndicator step={flow.step} />
            <button type="button" className="icon-btn" aria-label="Close setup" title="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <StepContent key={`${flow.step}:${flow.path}`} flow={flow} onClose={onClose} />
          {canGoBack ? (
            <button type="button" className="btn btn--ghost btn--sm onboarding__back" onClick={flow.back}>
              <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
              Back
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
