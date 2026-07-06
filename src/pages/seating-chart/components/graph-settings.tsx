import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/form/button";
import { Slider } from "../../../components/form/slider";
import { useAppStore } from "../../../store/use-app-store";

type SettingsTab = "layout" | "colors";

interface GraphSettingsDialogProps {
  onClose: () => void;
}

export function GraphSettingsDialog({ onClose }: GraphSettingsDialogProps) {
  const settings = useAppStore((s) => s.graphSettings);
  const setGraphSettings = useAppStore((s) => s.setGraphSettings);
  const resetGraphSettings = useAppStore((s) => s.resetGraphSettings);
  const graphColorMode = useAppStore((s) => s.graphColorMode);
  const setGraphColorMode = useAppStore((s) => s.setGraphColorMode);

  const [tab, setTab] = useState<SettingsTab>("layout");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape — no backdrop, so this is the only way out.
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="graph-settings-popover"
      ref={popoverRef}
      role="dialog"
      aria-label="Graph settings"
    >
      <div className="settings-tabs">
        <button
          className={`settings-tab ${tab === "layout" ? "settings-tab-active" : ""}`}
          onClick={() => setTab("layout")}
        >
          Layout
        </button>
        <button
          className={`settings-tab ${tab === "colors" ? "settings-tab-active" : ""}`}
          onClick={() => setTab("colors")}
        >
          Filter colors
        </button>
      </div>

      {tab === "layout" && (
        <div className="settings-pane">
          <Slider
            label="Center force"
            value={settings.centerForce}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setGraphSettings({ centerForce: v })}
            display={(v) => v.toFixed(2)}
          />
          <Slider
            label="Repel force"
            value={settings.repelForce}
            min={0}
            max={600}
            step={10}
            onChange={(v) => setGraphSettings({ repelForce: v })}
          />
          <Slider
            label="Link force"
            value={settings.linkForce}
            min={0}
            max={1.5}
            step={0.05}
            onChange={(v) => setGraphSettings({ linkForce: v })}
            display={(v) => v.toFixed(2)}
          />
          <Slider
            label="Link distance"
            value={settings.linkDistance}
            min={10}
            max={200}
            step={5}
            onChange={(v) => setGraphSettings({ linkDistance: v })}
          />
          <Button small variant="ghost" onClick={resetGraphSettings}>
            Reset to defaults
          </Button>
        </div>
      )}

      {tab === "colors" && (
        <div className="settings-pane">
          <p className="empty-hint">Color the graph's nodes by:</p>
          <div className="color-mode-row">
            <button
              className={`color-mode-btn ${graphColorMode === "table" ? "color-mode-btn-active" : ""}`}
              onClick={() => setGraphColorMode("table")}
            >
              Table
            </button>
            <button
              className={`color-mode-btn ${graphColorMode === "alignment" ? "color-mode-btn-active" : ""}`}
              onClick={() => setGraphColorMode("alignment")}
            >
              Alignment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
