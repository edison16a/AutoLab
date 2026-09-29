import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  /** One short line at most. */
  subtitle?: ReactNode;
  actions?: ReactNode;
}

/** Title row at the top of a page, with actions on the right. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
