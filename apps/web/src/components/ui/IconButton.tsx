import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Shown as a tooltip and read by screen readers, since there's no visible text. */
  label: string;
  active?: boolean;
  small?: boolean;
}

/** Square button with one icon. The label doubles as the tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, active, small, className = "", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`icon-btn ${small ? "icon-btn--sm" : ""} ${active ? "icon-btn--active" : ""} ${className}`}
      title={label}
      aria-label={label}
      {...rest}
    >
      <Icon size={small ? 16 : 18} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
});
