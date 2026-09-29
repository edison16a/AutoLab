import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text?: string;
  /** Usually one button or link that gets the person unstuck. */
  action?: ReactNode;
  compact?: boolean;
}

/** What a panel shows when there's nothing in it yet. */
export function EmptyState({ icon: Icon, title, text, action, compact }: EmptyStateProps) {
  return (
    <div className={`empty ${compact ? "empty--compact" : ""}`}>
      <span className="empty__icon">
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="empty__title">{title}</p>
      {text ? <p className="empty__text">{text}</p> : null}
      {action}
    </div>
  );
}
