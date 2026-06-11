import { useState } from "react";
import { Panel } from "../../../components/layout/panel";
import { Button } from "../../../components/form/button";
import { TextField } from "../../../components/form/text-field";
import { useAppStore } from "../../../store/use-app-store";
import { tableColor } from "../config";
import { ImportDialog } from "./import-dialog";
import { ExportDialog } from "./export-dialog";

export function GuestPanel() {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const result = useAppStore((s) => s.result);
  const selectedGuestId = useAppStore((s) => s.selectedGuestId);
  const addGuest = useAppStore((s) => s.addGuest);
  const removeGuest = useAppStore((s) => s.removeGuest);
  const selectGuest = useAppStore((s) => s.selectGuest);
  const clearAll = useAppStore((s) => s.clearAll);

  const [name, setName] = useState("");
  const [dialog, setDialog] = useState<"import" | "export" | null>(null);

  // Map a guest -> its assigned table index, to show a color dot in the list.
  const tableOfGuest = new Map<string, number>();
  result?.tables.forEach((t, i) =>
    t.guestIds.forEach((id) => tableOfGuest.set(id, i)),
  );

  const connectionCount = (id: string) =>
    connections.filter((c) => c.source === id || c.target === id).length;

  const submit = () => {
    if (addGuest(name)) setName("");
  };

  return (
    <Panel
      title="Guests"
      subtitle={`${guests.length}`}
      grow
      actions={
        guests.length > 0 && (
          <Button
            small
            variant="ghost"
            onClick={() => {
              if (confirm("Remove all guests and connections?")) clearAll();
            }}
          >
            Clear
          </Button>
        )
      }
    >
      <form
        className="add-guest"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <TextField
          placeholder="Add a guest…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Add
        </Button>
      </form>

      <div className="guest-list">
        {guests.length === 0 && (
          <p className="empty-hint">
            Add your invitees, then select a guest to link them to others.
          </p>
        )}
        {guests.map((g) => {
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
                ✕
              </Button>
            </div>
          );
        })}
      </div>

      <div className="io-row">
        <Button small onClick={() => setDialog("import")}>
          ⬆ Import
        </Button>
        <Button
          small
          onClick={() => setDialog("export")}
          disabled={guests.length === 0}
        >
          ⬇ Export
        </Button>
      </div>

      {dialog === "import" && <ImportDialog onClose={() => setDialog(null)} />}
      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} />}
    </Panel>
  );
}
