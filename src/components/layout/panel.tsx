import type { ReactNode } from "react";
import { BackIcon } from "../icons";
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
  /** When set, shows a back button before the title that calls this on click. */
  onBack?: () => void;
}

export function Panel({ title, label, subtitle, actions, children, grow, onBack }: PanelProps) {
  return (
    <section className={`panel ${grow ? "panel-grow" : ""}`}>
      <header className="panel-head">
        <div className="panel-head-left">
          {onBack && (
            <button type="button" className="panel-back-btn" onClick={onBack} aria-label="Back" title="Back">
              <BackIcon />
            </button>
          )}
          <div className="panel-titles">
            {label && <span className="panel-label">{label}</span>}
            <h2 className="panel-title">{title}</h2>
            {subtitle && <span className="panel-subtitle">{subtitle}</span>}
          </div>
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
