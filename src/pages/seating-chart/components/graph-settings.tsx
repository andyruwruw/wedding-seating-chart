import { Panel } from "../../../components/layout/panel";
import { Button } from "../../../components/form/button";
import { Slider } from "../../../components/form/slider";
import { useAppStore } from "../../../store/use-app-store";

export function GraphSettings() {
  const settings = useAppStore((s) => s.graphSettings);
  const setGraphSettings = useAppStore((s) => s.setGraphSettings);
  const resetGraphSettings = useAppStore((s) => s.resetGraphSettings);

  return (
    <Panel
      title="Graph"
      subtitle="layout forces"
      grow
      actions={
        <Button small variant="ghost" onClick={resetGraphSettings}>
          Reset
        </Button>
      }
    >
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

      <p className="empty-hint">
        Tune how the graph arranges itself. <strong>Center</strong> pulls
        everything inward, <strong>repel</strong> pushes nodes apart,{" "}
        <strong>link force</strong> &amp; <strong>distance</strong> control how
        tightly connected guests cluster.
      </p>
    </Panel>
  );
}
