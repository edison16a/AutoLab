"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";

interface StepFrameProps {
  title: string;
  /** One short line under the title. */
  lead?: ReactNode;
  children?: ReactNode;
  /** The step's buttons, pinned to the bottom of the panel. */
  actions: ReactNode;
  /** A problem with the last action, read out as soon as it appears. */
  message?: string;
}

/**
 * The layout every step shares: title, one line, the body, then actions at
 * the bottom. The title takes focus when the step appears, so keyboard and
 * screen reader users land at the top of the new step instead of on a
 * button that no longer exists.
 */
export function StepFrame({ title, lead, children, actions, message }: StepFrameProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="onboarding-step">
      <div className="onboarding-step__body">
        <h2 ref={heading} className="onboarding-step__title" tabIndex={-1}>
          {title}
        </h2>
        {lead ? <p className="onboarding-step__lead">{lead}</p> : null}
        {children}
      </div>
      <div className="onboarding-step__foot">
        {message ? (
          <p className="onboarding-message" role="alert">
            <CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>{message}</span>
          </p>
        ) : null}
        <div className="onboarding-step__actions">{actions}</div>
      </div>
    </div>
  );
}
