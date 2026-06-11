import { useEffect, useMemo, useState } from "react";
import { Panel } from "../../../components/layout/panel";
import { Button } from "../../../components/form/button";
import { Select } from "../../../components/form/select";
import { Combobox } from "../../../components/form/combobox";
import { useAppStore } from "../../../store/use-app-store";
import {
  KEEP_APART_VALUE,
  labelForValue,
  RELATIONSHIP_TIERS,
  tierIndexForLabel,
} from "../../../components/form/config/relationship-tiers";
import { TIER_OPTIONS } from "../config";

const DEFAULT_TIER_INDEX = Math.max(
  0,
  RELATIONSHIP_TIERS.findIndex((t) => t.label === "Friend"),
);

/** Tier index for a stored connection label (falls back gracefully). */
function indexForLabel(label: string): number {
  const i = tierIndexForLabel(label);
  return i >= 0 ? i : DEFAULT_TIER_INDEX;
}

export function ConnectionEditor() {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const selectedGuestId = useAppStore((s) => s.selectedGuestId);
  const setConnection = useAppStore((s) => s.setConnection);
  const removeConnection = useAppStore((s) => s.removeConnection);

  const [targetId, setTargetId] = useState("");
  const [tierIndex, setTierIndex] = useState(DEFAULT_TIER_INDEX);

  const selected = guests.find((g) => g.id === selectedGuestId) ?? null;
  const others = useMemo(
    () => guests.filter((g) => g.id !== selectedGuestId),
    [guests, selectedGuestId],
  );
  const nameOf = (id: string) => guests.find((g) => g.id === id)?.name ?? "?";

  // Keep the target pointed at a valid guest.
  useEffect(() => {
    if (others.length === 0) {
      setTargetId("");
    } else if (!others.some((g) => g.id === targetId)) {
      setTargetId(others[0].id);
    }
  }, [others, targetId]);

  // People exactly two hops away (friends of friends), ranked by mutual count.
  const twoAway = useMemo(() => {
    if (!selected) return [];
    const positiveNeighbors = (id: string) =>
      connections
        .filter(
          (c) =>
            c.value !== KEEP_APART_VALUE &&
            (c.source === id || c.target === id),
        )
        .map((c) => (c.source === id ? c.target : c.source));

    const alreadyConnected = new Set(
      connections
        .filter((c) => c.source === selected.id || c.target === selected.id)
        .map((c) => (c.source === selected.id ? c.target : c.source)),
    );

    const counts = new Map<string, number>();
    for (const neighbor of positiveNeighbors(selected.id)) {
      for (const candidate of positiveNeighbors(neighbor)) {
        if (candidate === selected.id || alreadyConnected.has(candidate)) continue;
        counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([id, mutuals]) => ({ id, mutuals }))
      .sort((a, b) => b.mutuals - a.mutuals)
      .slice(0, 10);
  }, [selected, connections]);

  if (!selected) {
    return (
      <Panel title="Connections" grow>
        <p className="empty-hint">
          Select a guest in the Guests tab to add or edit their relationships.
        </p>
      </Panel>
    );
  }

  const myConnections = connections
    .filter((c) => c.source === selected.id || c.target === selected.id)
    .map((c) => ({
      otherId: c.source === selected.id ? c.target : c.source,
      value: c.value,
      label: c.label ?? labelForValue(c.value),
    }))
    .sort((a, b) => a.value - b.value);

  const addConnection = () => {
    if (!targetId) return;
    setConnection(selected.id, targetId, RELATIONSHIP_TIERS[tierIndex].label);
  };

  // Load an existing connection back into the top form for editing.
  const loadIntoForm = (otherId: string, label: string) => {
    setTargetId(otherId);
    setTierIndex(indexForLabel(label));
  };

  return (
    <Panel title="Connections" subtitle={selected.name} grow>
      {others.length === 0 ? (
        <p className="empty-hint">Add more guests to create connections.</p>
      ) : (
        <div className="add-connection">
          <Combobox
            label="Connect to"
            value={targetId}
            onChange={setTargetId}
            options={others.map((g) => ({ label: g.name, value: g.id }))}
            placeholder="Search guests…"
          />
          <Select
            label="Closeness"
            value={tierIndex}
            onChange={(v) => setTierIndex(Number(v))}
            options={TIER_OPTIONS}
          />
          <Button variant="primary" block onClick={addConnection} disabled={!targetId}>
            Link
          </Button>
        </div>
      )}

      <div className="connection-list">
        <span className="section-label">
          Connected to · {myConnections.length}
        </span>
        {myConnections.length === 0 && (
          <p className="empty-hint">No connections yet.</p>
        )}
        {myConnections.map(({ otherId, value, label }) => (
          <div key={otherId} className="connection-row">
            <button
              className="connection-name-btn"
              onClick={() => loadIntoForm(otherId, label)}
              title="Edit in the form above"
            >
              {nameOf(otherId)}
            </button>
            <Select
              value={indexForLabel(label)}
              onChange={(v) =>
                setConnection(
                  selected.id,
                  otherId,
                  RELATIONSHIP_TIERS[Number(v)].label,
                )
              }
              options={TIER_OPTIONS}
              className={`tier-select ${value === KEEP_APART_VALUE ? "tier-select-danger" : ""}`}
            />
            <Button
              variant="danger"
              small
              onClick={() => removeConnection(selected.id, otherId)}
              aria-label={`Remove connection to ${nameOf(otherId)}`}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      {twoAway.length > 0 && (
        <div className="two-away">
          <span className="section-label">Friends of friends · tap to fill</span>
          <div className="two-away-list">
            {twoAway.map(({ id, mutuals }) => (
              <button
                key={id}
                className="two-away-chip"
                onClick={() => setTargetId(id)}
                title={`${mutuals} mutual connection${mutuals > 1 ? "s" : ""}`}
              >
                {nameOf(id)}
                <span className="chip-count">{mutuals}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
