"use client";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type Tone = "online" | "offline" | "warning" | "error" | "busy";

export function StatusDot({ tone, pulse = false }: { tone: Tone; pulse?: boolean }) {
  return <span className={`status-dot tone-${tone} ${pulse ? "pulse" : ""}`} aria-hidden="true" />;
}

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`status-pill tone-${tone}`}>
      <StatusDot tone={tone} pulse={tone === "online"} />
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      <span className="empty-icon">
        <Icon size={compact ? 18 : 22} strokeWidth={1.6} />
      </span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? "on" : ""}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <i />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Brand mark: the blue A used for the favicon, sidebar and sign-in page. */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <path
        fill="#2684FF"
        fillRule="evenodd"
        d="M26 6h12l20 52H45l-5-13H24l-5 13H6L26 6Zm6 18.2L36.5 36h-9L32 24.2Z"
      />
    </svg>
  );
}
