import { useMemo, useState } from "react";
import { Panel } from "../../../components/layout/panel";
import { Button } from "../../../components/form/button";
import { TextField } from "../../../components/form/text-field";
import { Select } from "../../../components/form/select";
import { Checkbox } from "../../../components/form/checkbox";
import { useAppStore } from "../../../store/use-app-store";
import { RELATIONSHIP_TIERS } from "../../../components/form/config/relationship-tiers";
import { TIER_OPTIONS } from "../config";

const DEFAULT_TIER_INDEX = Math.max(
  0,
  RELATIONSHIP_TIERS.findIndex((t) => t.label === "Friend"),
);

export function GroupConnect() {
  const guests = useAppStore((s) => s.guests);
  const addGroupConnections = useAppStore((s) => s.addGroupConnections);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tierIndex, setTierIndex] = useState(DEFAULT_TIER_INDEX);
  const [overwrite, setOverwrite] = useState(false);
  const [search, setSearch] = useState("");
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? guests.filter((g) => g.name.toLowerCase().includes(q)) : guests;
  }, [guests, search]);

  const selectedCount = selected.size;
  const pairCount = (selectedCount * (selectedCount - 1)) / 2;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setLastAdded(null);
  };

  const selectAllFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((g) => next.add(g.id));
      return next;
    });

  const clear = () => {
    setSelected(new Set());
    setLastAdded(null);
  };

  const connect = () => {
    const added = addGroupConnections(
      [...selected],
      RELATIONSHIP_TIERS[tierIndex].label,
      overwrite,
    );
    setLastAdded(added);
  };

  if (guests.length === 0) {
    return (
      <Panel title="Groups" grow>
        <p className="empty-hint">
          Add some guests first, then come back to connect a whole group at once.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Groups" subtitle="connect many at once" grow>
      <p className="empty-hint">
        Pick a group and a closeness — everyone in it gets linked to everyone
        else (a clique).
      </p>

      <TextField
        placeholder="Search guests…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="group-toolbar">
        <span className="section-label">{selectedCount} selected</span>
        <div className="group-toolbar-actions">
          <Button small onClick={selectAllFiltered}>
            Select all
          </Button>
          <Button small onClick={clear} disabled={selectedCount === 0}>
            Clear
          </Button>
        </div>
      </div>

      <div className="group-list">
        {filtered.length === 0 && (
          <p className="empty-hint">No guests match “{search}”.</p>
        )}
        {filtered.map((g) => (
          <Checkbox
            key={g.id}
            label={g.name}
            checked={selected.has(g.id)}
            onChange={() => toggle(g.id)}
          />
        ))}
      </div>

      <Select
        label="Closeness"
        value={tierIndex}
        onChange={(v) => setTierIndex(Number(v))}
        options={TIER_OPTIONS}
      />

      <Checkbox
        label="Overwrite existing connections"
        hint="Off keeps any pair that's already linked (e.g. partners) as-is."
        checked={overwrite}
        onChange={setOverwrite}
      />

      <Button
        variant="primary"
        block
        disabled={selectedCount < 2}
        onClick={connect}
      >
        {selectedCount < 2
          ? "Select 2+ people"
          : `Connect ${selectedCount} people · ${pairCount} link${pairCount === 1 ? "" : "s"}`}
      </Button>

      {lastAdded !== null && (
        <p className="group-result">
          {lastAdded === 0
            ? "Nothing to add — those pairs were already connected."
            : `Added ${lastAdded} connection${lastAdded === 1 ? "" : "s"}.`}
        </p>
      )}
    </Panel>
  );
}
