import type { ReactNode } from "react";
import "./panel.css";

interface PanelProps {
  title: string;
  /** Muted label rendered before the title — use to show a category or context. */
  label?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** When true the body scrolls and the panel flexes to fill its column. */
  grow?: boolean;
}

export function Panel({ title, label, subtitle, actions, children, grow }: PanelProps) {
  return (
    <section className={`panel ${grow ? "panel-grow" : ""}`}>
      <header className="panel-head">
        <div className="panel-titles">
          {label && <span className="panel-label">{label}</span>}
          <h2 className="panel-title">{title}</h2>
          {subtitle && <span className="panel-subtitle">{subtitle}</span>}
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
