interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name, since the switch usually sits next to plain text. */
  label: string;
  disabled?: boolean;
}

/** An on/off switch exposed to assistive tech as role="switch". */
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}
