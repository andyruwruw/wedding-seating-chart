import { useRef, useState } from "react";
import { Modal } from "../../../components/layout/modal";
import { Button } from "../../../components/form/button";
import { useAppStore } from "../../../store/use-app-store";
import { csvToSnapshot, namesToSnapshot, CSV_TEMPLATE } from "../helpers/csv";
import { jsonToSnapshot } from "../helpers/json";
import { downloadText, readFileAsText } from "../helpers";
import {
  RELATIONSHIP_TIERS,
  KEEP_APART_VALUE,
} from "../../../components/form/config/relationship-tiers";

interface ImportDialogProps {
  onClose: () => void;
}

export function ImportDialog({ onClose }: ImportDialogProps) {
  const loadSnapshot = useAppStore((s) => s.loadSnapshot);
  const relInput = useRef<HTMLInputElement>(null);
  const namesInput = useRef<HTMLInputElement>(null);
  const [pastedNames, setPastedNames] = useState("");

  const importRelationships = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const snapshot = file.name.toLowerCase().endsWith(".json")
        ? jsonToSnapshot(text)
        : csvToSnapshot(text);
      loadSnapshot(snapshot, false); // full replace
      onClose();
    } catch (err) {
      alert(`Could not import: ${(err as Error).message}`);
    }
  };

  const importNamesFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      loadSnapshot(namesToSnapshot(text), true); // merge into existing
      onClose();
    } catch (err) {
      alert(`Could not import: ${(err as Error).message}`);
    }
  };

  const addPastedNames = () => {
    const snapshot = namesToSnapshot(pastedNames);
    if (snapshot.guests.length === 0) return;
    loadSnapshot(snapshot, true); // merge
    onClose();
  };

  const downloadTemplate = () =>
    downloadText("seating-template.csv", CSV_TEMPLATE, "text/csv");

  return (
    <Modal
      title="Import guests"
      subtitle="Bring in a full relationship file, or just a list of names."
      onClose={onClose}
    >
      {/* ---- Relationships ---- */}
      <section className="import-section">
        <h3 className="import-heading">Relationship file</h3>
        <p className="import-note">
          A CSV exported from this app (or a spreadsheet) with three columns. Each
          row links two guests; the relationship sets how close they are. Leave
          Target &amp; Relationship blank for a guest with no connections yet.
        </p>

        <table className="example-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Target</th>
              <th>Relationship</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Alice</td>
              <td>Bob</td>
              <td>Partner / Spouse</td>
            </tr>
            <tr>
              <td>Alice</td>
              <td>Carol</td>
              <td>Close friend</td>
            </tr>
            <tr>
              <td>Erin</td>
              <td>Frank</td>
              <td>🚫 Must not sit together</td>
            </tr>
            <tr>
              <td>Grace</td>
              <td className="muted">—</td>
              <td className="muted">—</td>
            </tr>
          </tbody>
        </table>

        <div className="tier-legend">
          <span className="section-label">Relationship options (lower = closer)</span>
          <div className="tier-legend-list">
            {RELATIONSHIP_TIERS.map((t) => (
              <span
                key={t.label}
                className={`tier-legend-chip ${
                  t.value === KEEP_APART_VALUE ? "tier-legend-chip-danger" : ""
                }`}
              >
                {t.label}
                {t.value !== KEEP_APART_VALUE && (
                  <span className="tier-legend-num">{t.value}</span>
                )}
              </span>
            ))}
          </div>
        </div>

        <p className="import-note import-fine">
          Type any of these labels in the Relationship column (case-insensitive).
          Unknown labels default to Acquaintance. Importing a relationship file
          replaces the current list. JSON backups work here too.
        </p>

        <div className="import-actions">
          <Button onClick={downloadTemplate}>⬇ Download template</Button>
          <Button variant="primary" onClick={() => relInput.current?.click()}>
            ⬆ Upload relationships
          </Button>
        </div>
      </section>

      <div className="import-divider">
        <span>or</span>
      </div>

      {/* ---- Just names ---- */}
      <section className="import-section">
        <h3 className="import-heading">Just a list of names</h3>
        <p className="import-note">
          One name per line. Creates guests with no connections — you can link
          them afterwards. These are added to your current list.
        </p>

        <textarea
          className="names-textarea"
          placeholder={"Alice\nBob\nCarol\nDave"}
          value={pastedNames}
          onChange={(e) => setPastedNames(e.target.value)}
          rows={4}
        />

        <div className="import-actions">
          <Button onClick={() => namesInput.current?.click()}>
            ⬆ Upload names file
          </Button>
          <Button
            variant="primary"
            onClick={addPastedNames}
            disabled={!pastedNames.trim()}
          >
            Add names
          </Button>
        </div>
      </section>

      <input
        ref={relInput}
        type="file"
        accept=".csv,.json,text/csv,application/json"
        hidden
        onChange={(e) => {
          importRelationships(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={namesInput}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        hidden
        onChange={(e) => {
          importNamesFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </Modal>
  );
}
