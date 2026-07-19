import type { Theme } from "../../store/use-theme-store";
import "./theme-toggle.css";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
  /** Extra class controlling placement — "theme-toggle-fixed" or "theme-toggle-inline". */
  className?: string;
}

export function ThemeToggle({ theme, onToggle, className = "theme-toggle-fixed" }: ThemeToggleProps) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={onToggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2.5a1 1 0 0 1 1 1v1.4a1 1 0 1 1-2 0V3.5a1 1 0 0 1 1-1Zm0 12.6a1 1 0 0 1 1 1v1.4a1 1 0 1 1-2 0v-1.4a1 1 0 0 1 1-1ZM2.5 10a1 1 0 0 1 1-1h1.4a1 1 0 1 1 0 2H3.5a1 1 0 0 1-1-1Zm12.6 0a1 1 0 0 1 1-1h1.4a1 1 0 1 1 0 2h-1.4a1 1 0 0 1-1-1ZM4.75 4.75a1 1 0 0 1 1.41 0l1 1a1 1 0 0 1-1.41 1.41l-1-1a1 1 0 0 1 0-1.41Zm8.09 8.09a1 1 0 0 1 1.41 0l1 1a1 1 0 0 1-1.41 1.41l-1-1a1 1 0 0 1 0-1.41Zm1-8.09a1 1 0 0 1 0 1.41l-1 1a1 1 0 1 1-1.41-1.41l1-1a1 1 0 0 1 1.41 0ZM6.16 12.84a1 1 0 0 1 0 1.41l-1 1a1 1 0 1 1-1.41-1.41l1-1a1 1 0 0 1 1.41 0ZM10 6.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.3 12.9a7.4 7.4 0 0 1-9.2-9.2A1 1 0 0 0 6.7 2.1a8.8 8.8 0 1 0 11.2 11.2 1 1 0 0 0-.6-1.4 1 1 0 0 0-1 0Z" />
        </svg>
      )}
    </button>
  );
}
