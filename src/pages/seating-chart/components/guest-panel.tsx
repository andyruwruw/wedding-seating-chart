import { useMemo, useState } from "react";
import { Panel } from "../../../components/layout/panel";
import { Button } from "../../../components/form/button";
import { useAppStore } from "../../../store/use-app-store";
import { tableColor, fomoLevel, nextFomoMult, FOMO_LEVELS } from "../config";
import { ImportDialog } from "./import-dialog";
import { ExportDialog } from "./export-dialog";
import { makeSampleSnapshot } from "../helpers/sample-data";
import { pushAllToSheet } from "../helpers/google-sync";
import { isConfigured } from "../../../lib/google/gis";
import { CloseIcon, ExportIcon, FomoIcon, ImportIcon, SparkleIcon } from "../../../components/icons";

export function GuestPanel() {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const result = useAppStore((s) => s.result);
  const selectedGuestId = useAppStore((s) => s.selectedGuestId);
  const addGuest = useAppStore((s) => s.addGuest);
  const removeGuest = useAppStore((s) => s.removeGuest);
  const selectGuest = useAppStore((s) => s.selectGuest);
  const setGuestFomo = useAppStore((s) => s.setGuestFomo);
  const clearAll = useAppStore((s) => s.clearAll);
  const loadSnapshot = useAppStore((s) => s.loadSnapshot);
  const google = useAppStore((s) => s.google);

  const loadSample = () => {
    if (
      guests.length > 0 &&
      !confirm("Replace the current guests and connections with sample data?")
    ) {
      return;
    }
    loadSnapshot(makeSampleSnapshot(), false);
  };

  const [name, setName] = useState("");
  const [dialog, setDialog] = useState<"import" | "export" | null>(null);

  const query = name.toLowerCase().trim();
  const filteredGuests = useMemo(() => {
    if (!query) return guests;
    return guests.filter((g) => g.name.toLowerCase().includes(query));
  }, [guests, query]);

  const submit = () => {
    if (addGuest(name)) setName("");
  };

  // Table assignment map for colored dots.
  const tableOfGuest = new Map<string, number>();
  result?.tables.forEach((t, i) =>
    t.guestIds.forEach((id) => tableOfGuest.set(id, i)),
  );

  const connectionCount = (id: string) =>
    connections.filter((c) => c.source === id || c.target === id).length;

  return (
    <Panel
      title="Guests"
      subtitle={`${guests.length}`}
      grow
      actions={
        <>
          {isConfigured() && google.spreadsheetId && (
            <button
              type="button"
              className="sync-icon-btn"
              title={google.status === "syncing" ? "Syncing…" : "Sync to Google Sheets"}
              aria-label="Sync to Google Sheets"
              disabled={google.status === "syncing"}
              onClick={() => pushAllToSheet()}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={google.status === "syncing" ? "sync-icon-spin" : ""}
              >
                <path d="M4 10a6 6 0 0 1 10.2-4.2M16 10a6 6 0 0 1-10.2 4.2" />
                <path d="M14.2 3.6v2.6h-2.6M5.8 16.4v-2.6h2.6" />
              </svg>
            </button>
          )}
          {guests.length > 0 && (
            <Button
              small
              variant="ghost"
              onClick={() => {
                if (confirm("Remove all guests and connections?")) clearAll();
              }}
            >
              Clear
            </Button>
          )}
        </>
      }
    >
      <form
        className="add-guest"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="add-guest-input-wrap">
          <input
            className="input"
            placeholder="Search or add"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Add
        </Button>
      </form>

      <div className="guest-list">
        {guests.length === 0 && (
          <div className="guest-empty">
            <p className="empty-hint">
              Add your invitees, then select a guest to link them to others.
            </p>
            <p className="empty-hint">Or start from a ready-made example:</p>
            <Button variant="primary" block onClick={loadSample}>
              <SparkleIcon /> Load sample data
            </Button>
          </div>
        )}
        {guests.length > 0 && filteredGuests.length === 0 && (
          <p className="empty-hint">No guests match “{name.trim()}”.</p>
        )}
        {filteredGuests.map((g) => {
          const tableIdx = tableOfGuest.get(g.id);
          const isSelected = g.id === selectedGuestId;
          return (
            <div
              key={g.id}
              className={`guest-row ${isSelected ? "guest-row-selected" : ""}`}
              onClick={() => selectGuest(isSelected ? null : g.id)}
            >
              <span
                className="guest-dot"
                style={{
                  background:
                    tableIdx === undefined ? "var(--text-2)" : tableColor(tableIdx),
                }}
              />
              <span className="guest-name">{g.name}</span>
              <button
                className="fomo-chip"
                title={`FOMO: ${fomoLevel(g.fomo).label} — click to change`}
                onClick={(e) => {
                  e.stopPropagation();
                  setGuestFomo(g.id, nextFomoMult(g.fomo));
                }}
              >
                <FomoIcon level={FOMO_LEVELS.indexOf(fomoLevel(g.fomo))} />
              </button>
              <span className="guest-meta">{connectionCount(g.id)}</span>
              <Button
                variant="danger"
                small
                onClick={(e) => {
                  e.stopPropagation();
                  removeGuest(g.id);
                }}
                aria-label={`Remove ${g.name}`}
              >
                <CloseIcon size={11} />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="io-row">
        <Button small onClick={() => setDialog("import")}>
          <ImportIcon /> Import
        </Button>
        <Button
          small
          onClick={() => setDialog("export")}
          disabled={guests.length === 0}
        >
          <ExportIcon /> Export
        </Button>
        <Button small onClick={loadSample}>
          <SparkleIcon /> Sample
        </Button>
      </div>

      {dialog === "import" && <ImportDialog onClose={() => setDialog(null)} />}
      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} />}
    </Panel>
  );
}
