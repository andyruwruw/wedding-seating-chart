import { useMemo } from "react";
import { Panel } from "../../../components/layout/panel";
import { Button } from "../../../components/form/button";
import { NumberField } from "../../../components/form/number-field";
import { Checkbox } from "../../../components/form/checkbox";
import { Select } from "../../../components/form/select";
import { Slider } from "../../../components/form/slider";
import { useAppStore } from "../../../store/use-app-store";
import type { OptimizationEffort } from "../../../types";
import { tableColor } from "../config";
import { computeCapacities } from "../helpers/seating";
import {
  computeHappiness,
  HAPPINESS_COLORS,
  makeMultLookup,
} from "../helpers/happiness";
import { TableCard } from "./table-card";

const EFFORT_OPTIONS = [
  { label: "Quick", value: "quick" },
  { label: "Balanced", value: "balanced" },
  { label: "Thorough", value: "thorough" },
];

export function SeatingPanel() {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const config = useAppStore((s) => s.config);
  const result = useAppStore((s) => s.result);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const setConfig = useAppStore((s) => s.setConfig);
  const generate = useAppStore((s) => s.generate);
  const regenerate = useAppStore((s) => s.regenerate);

  const nameOf = (id: string) => guests.find((g) => g.id === id)?.name ?? "?";
  const canGenerate = guests.length > 0;

  const report = useMemo(
    () =>
      result
        ? computeHappiness(
            result.tables,
            connections,
            config.taper,
            config.fomo,
            makeMultLookup(guests),
            config.worstCaseScore,
          )
        : null,
    [result, connections, config.taper, config.fomo, config.worstCaseScore, guests],
  );
  const overall = report?.overall ?? 0;
  const overallTone =
    overall >= 85 ? "great" : overall >= 65 ? "good" : overall >= 45 ? "ok" : "bad";

  // Live plan preview: how many tables and how many seats sit empty / short.
  const plan = useMemo(() => {
    const n = guests.length;
    if (n === 0) return null;
    const caps = computeCapacities(n, config);
    const tables = caps.length;
    const physicalSeats = tables * Math.max(1, Math.floor(config.seatsPerTable));
    return { tables, physicalSeats, spare: physicalSeats - n };
  }, [guests.length, config]);

  return (
    <Panel
      title="Seating Chart"
      subtitle={result ? `${result.tables.length} tables` : undefined}
      grow
    >
      <div className="config-grid">
        <NumberField
          label="Seats per table"
          value={config.seatsPerTable}
          min={1}
          max={Math.max(1, guests.length)}
          onChange={(v) => setConfig({ seatsPerTable: v })}
        />
        <NumberField
          label="Number of tables"
          value={
            config.autoTables && plan ? plan.tables : config.tableCount
          }
          min={1}
          max={Math.max(1, guests.length)}
          disabled={config.autoTables}
          onChange={(v) => setConfig({ tableCount: v })}
        />
      </div>

      <Checkbox
        label="Auto-fit tables to everyone"
        hint="Use just enough tables to seat all guests."
        checked={config.autoTables}
        onChange={(v) => setConfig({ autoTables: v })}
      />
      <Checkbox
        label="Allow empty seats"
        hint="Fill tables to capacity; otherwise spread guests evenly."
        checked={config.allowEmptySeats}
        onChange={(v) => setConfig({ allowEmptySeats: v })}
      />
      <Checkbox
        label="Score by least-happy guest"
        hint="A table's score becomes its unhappiest guest, not the average."
        checked={config.worstCaseScore}
        onChange={(v) => setConfig({ worstCaseScore: v })}
      />

      <Select
        label="Optimization effort"
        value={config.effort}
        onChange={(v) => setConfig({ effort: v as OptimizationEffort })}
        options={EFFORT_OPTIONS}
      />

      <Slider
        label="Closeness weighting"
        value={config.taper}
        min={1}
        max={3}
        step={0.1}
        onChange={(v) => setConfig({ taper: v })}
        display={(v) => `${v.toFixed(1)}×`}
      />

      <Slider
        label="FOMO (left-out aversion)"
        value={config.fomo}
        min={0}
        max={2}
        step={0.1}
        onChange={(v) => setConfig({ fomo: v })}
        display={(v) => v.toFixed(1)}
      />

      <Slider
        label="Group cohesion"
        value={config.cohesion}
        min={0}
        max={3}
        step={0.1}
        onChange={(v) => setConfig({ cohesion: v })}
        display={(v) => v.toFixed(1)}
      />

      {plan && (
        <p className="plan-readout">
          {plan.tables} table{plan.tables === 1 ? "" : "s"} ×{" "}
          {config.seatsPerTable} seats = {plan.physicalSeats} for {guests.length}{" "}
          guest{guests.length === 1 ? "" : "s"}
          {plan.spare > 0 && ` · ${plan.spare} empty`}
          {plan.spare < 0 && (
            <span className="plan-warn"> · {-plan.spare} over capacity</span>
          )}
        </p>
      )}

      <div className="generate-row">
        <Button
          variant="primary"
          block
          disabled={!canGenerate || isGenerating}
          onClick={generate}
        >
          {isGenerating
            ? "Generating…"
            : result
              ? "Generate"
              : "Generate seating"}
        </Button>
        {result && (
          <Button
            onClick={regenerate}
            disabled={isGenerating}
            aria-label="Try a different arrangement"
          >
            ↻
          </Button>
        )}
      </div>

      {result && (
        <div className="overall-happy">
          <div className="overall-happy-head">
            <span>Overall happiness</span>
            <strong style={{ color: HAPPINESS_COLORS[overallTone] }}>
              {overall}
            </strong>
          </div>
          <div className="overall-bar">
            <div
              className="overall-bar-fill"
              style={{
                width: `${overall}%`,
                background: HAPPINESS_COLORS[overallTone],
              }}
            />
          </div>
        </div>
      )}

      {result && result.violations.length > 0 && (
        <div className="violations">
          <strong>{result.violations.length} warning(s)</strong>
          <ul>
            {result.violations.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {result && report && (
        <div className="tables-list">
          {result.tables.map((t, i) => (
            <TableCard
              key={t.id}
              index={i}
              color={tableColor(i)}
              guestNames={t.guestIds.map(nameOf)}
              happiness={report.table[i]}
            />
          ))}
        </div>
      )}

      {!result && (
        <p className="empty-hint">
          Set your table options and generate a plan. Closely-connected guests
          are seated together; partners stay together; “must not sit together”
          pairs are split.
        </p>
      )}
    </Panel>
  );
}
