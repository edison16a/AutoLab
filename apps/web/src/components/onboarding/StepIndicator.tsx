"use client";
import { Check } from "lucide-react";
import { WIZARD_STEPS, type StepIndex } from "./wizard-steps";

/**
 * Numbered steps. The current one is the accent and carries its name; done
 * steps show a check, later ones stay grey. Every item says its state in
 * words for screen readers, so nothing depends on colour.
 */
export function StepIndicator({ step }: { step: StepIndex }) {
  return (
    <ol className="onboarding-progress" aria-label="Setup progress">
      {WIZARD_STEPS.map((item, index) => {
        const state = index < step ? "done" : index === step ? "current" : "todo";
        return (
          <li
            key={item.id}
            className={`onboarding-progress__item onboarding-progress__item--${state}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="onboarding-progress__mark" aria-hidden="true">
              {state === "done" ? <Check size={12} strokeWidth={2.4} /> : index + 1}
            </span>
            <span className={state === "current" ? "onboarding-progress__label" : "visually-hidden"}>
              {item.label}
              {state === "done" ? <span className="visually-hidden">, done</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
