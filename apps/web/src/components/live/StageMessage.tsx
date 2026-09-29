import type { ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";

interface StageMessageProps {
  icon: LucideIcon;
  title: string;
  text?: string;
  /** Swap the icon for a spinner while something is on its way. */
  busy?: boolean;
  action?: ReactNode;
}

/**
 * Fills the stage when there's no picture to show. It's a status region, so
 * a screen reader hears "Autolab is offline" when the camera drops.
 */
export function StageMessage({ icon: Icon, title, text, busy, action }: StageMessageProps) {
  const Glyph = busy ? Loader2 : Icon;
  return (
    <div className="empty live-stage__message" role="status">
      <span className="empty__icon">
        <Glyph size={20} strokeWidth={1.8} className={busy ? "spin" : undefined} aria-hidden="true" />
      </span>
      <p className="empty__title">{title}</p>
      {text ? <p className="empty__text">{text}</p> : null}
      {action}
    </div>
  );
}
