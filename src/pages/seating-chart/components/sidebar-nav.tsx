import type { ReactNode } from "react";
import { ThemeToggle } from "../../../components/layout/theme-toggle";
import { useThemeStore } from "../../../store/use-theme-store";
import "./sidebar-nav.css";

export type NavTab = "guests" | "connections" | "seating" | "google";

interface NavItem {
  id: NavTab;
  label: string;
  icon: ReactNode;
}

const ICON_PROPS = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "guests",
    label: "Guests",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="10" cy="6.5" r="3.2" />
        <path d="M3.5 16.5c0-3.4 2.9-5.7 6.5-5.7s6.5 2.3 6.5 5.7" />
      </svg>
    ),
  },
  {
    id: "connections",
    label: "Connections",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="5.5" cy="6" r="2.3" />
        <circle cx="14.5" cy="14" r="2.3" />
        <path d="M7.3 7.7l5.4 4.6" />
      </svg>
    ),
  },
  {
    id: "seating",
    label: "Seating",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="10" cy="10" r="4" />
        <circle cx="10" cy="3.3" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="10" cy="16.7" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="3.3" cy="10" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="16.7" cy="10" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "google",
    label: "Google Sync",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M17 10.2c0-.6-.05-1.1-.15-1.6H10v3.1h3.9a3.4 3.4 0 0 1-1.45 2.2v1.8h2.35c1.37-1.26 2.2-3.1 2.2-5.5z" />
        <path d="M10 17.5c1.95 0 3.6-.65 4.8-1.75l-2.35-1.8c-.65.44-1.5.7-2.45.7-1.9 0-3.5-1.28-4.07-3H3.5v1.85A7.5 7.5 0 0 0 10 17.5z" />
        <path d="M5.93 11.65a4.5 4.5 0 0 1 0-2.9V6.9H3.5a7.5 7.5 0 0 0 0 6.6l2.43-1.85z" />
        <path d="M10 6.25c1.06 0 2 .37 2.75 1.08l2.06-2.06A7.1 7.1 0 0 0 10 3.5a7.5 7.5 0 0 0-6.5 3.4l2.43 1.85c.57-1.72 2.17-3 4.07-3z" />
      </svg>
    ),
  },
];

interface SidebarNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

export function SidebarNav({ active, onChange }: SidebarNavProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <nav className="sidebar-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          aria-label={item.label}
          className={`sidebar-nav-item ${active === item.id ? "sidebar-nav-item-active" : ""}`}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          <span className="sidebar-nav-label">{item.label}</span>
        </button>
      ))}
      <ThemeToggle theme={theme} onToggle={toggleTheme} className="theme-toggle-inline" />
    </nav>
  );
}
