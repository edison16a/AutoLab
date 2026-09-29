import { useId, type ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  /** A button on the right of the title, like "Connect device". */
  action?: ReactNode;
  children: ReactNode;
}

/** A titled group of settings. Screen readers get it as a named region. */
export function SettingsSection({ title, action, children }: SettingsSectionProps) {
  const headingId = useId();
  return (
    <section className="settings__section" aria-labelledby={headingId}>
      <div className="settings__head">
        <h2 id={headingId}>{title}</h2>
        {action}
      </div>
      <div className="settings__card">{children}</div>
    </section>
  );
}

interface SettingsRowProps {
  label: ReactNode;
  /** One short line under the label. */
  hint?: ReactNode;
  /** The control or value on the right. */
  children?: ReactNode;
}

/** One line in a settings card: what it is on the left, the control on the right. */
export function SettingsRow({ label, hint, children }: SettingsRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row__text">
        <span className="settings-row__label">{label}</span>
        {hint ? <span className="settings-row__hint">{hint}</span> : null}
      </div>
      {children ? <div className="settings-row__control">{children}</div> : null}
    </div>
  );
}
