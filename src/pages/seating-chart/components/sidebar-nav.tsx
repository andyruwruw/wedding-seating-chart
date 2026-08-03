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
    label: "Connect",
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
    label: "Sync",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3.5 10a6.5 6.5 0 0 1 11-4.6M16.5 10a6.5 6.5 0 0 1-11 4.6" />
        <path d="M14.8 3.4v3.2h-3.2M5.2 16.6v-3.2h3.2" />
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
