import { useEffect, useMemo, useRef, useState } from "react";
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
import { ALIGNMENT_INFO } from "../helpers/alignment";
import { GroupConnect } from "./group-connect";
import type { DndAlignment } from "../../../types";

const DEFAULT_TIER_INDEX = Math.max(
  0,
  RELATIONSHIP_TIERS.findIndex((t) => t.label === "Friend"),
);

function indexForLabel(label: string): number {
  const i = tierIndexForLabel(label);
  return i >= 0 ? i : DEFAULT_TIER_INDEX;
}

type ConnTab = "connected" | "friends" | "alignment" | "groups";

const LAW_LABELS = ["Lawful", "Neutral", "Chaotic"];
const MORAL_LABELS = ["Good", "Neutral", "Evil"];

const GRID: DndAlignment[][] = [
  ["LG", "NG", "CG"],
  ["LN", "TN", "CN"],
  ["LE", "NE", "CE"],
];

export function ConnectionEditor() {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const selectedGuestId = useAppStore((s) => s.selectedGuestId);
  const setConnection = useAppStore((s) => s.setConnection);
  const removeConnection = useAppStore((s) => s.removeConnection);
  const setGuestAlignment = useAppStore((s) => s.setGuestAlignment);
  const setGraphColorMode = useAppStore((s) => s.setGraphColorMode);

  const [activeTab, setActiveTab] = useState<ConnTab>("connected");
  const [targetId, setTargetId] = useState("");
  const [tierIndex, setTierIndex] = useState(DEFAULT_TIER_INDEX);
  const addComboRef = useRef<HTMLDivElement>(null);

  const selected = guests.find((g) => g.id === selectedGuestId) ?? null;
  const others = useMemo(
    () => guests.filter((g) => g.id !== selectedGuestId),
    [guests, selectedGuestId],
  );
  const nameOf = (id: string) => guests.find((g) => g.id === id)?.name ?? "?";

  const switchTab = (tab: ConnTab) => {
    setActiveTab(tab);
    setGraphColorMode(tab === "alignment" ? "alignment" : "table");
  };

  useEffect(() => {
    setActiveTab("connected");
    setGraphColorMode("table");
  }, [selectedGuestId, setGraphColorMode]);

  useEffect(() => {
    return () => setGraphColorMode("table");
  }, [setGraphColorMode]);

  useEffect(() => {
    if (others.length === 0) {
      setTargetId("");
    } else if (!others.some((g) => g.id === targetId)) {
      setTargetId(others[0].id);
    }
  }, [others, targetId]);

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

  const myConnections = selected
    ? connections
        .filter((c) => c.source === selected.id || c.target === selected.id)
        .map((c) => ({
          otherId: c.source === selected.id ? c.target : c.source,
          value: c.value,
          label: c.label ?? labelForValue(c.value),
        }))
        .sort((a, b) => a.value - b.value)
    : [];

  const addConnection = () => {
    if (!selected || !targetId) return;
    setConnection(selected.id, targetId, RELATIONSHIP_TIERS[tierIndex].label);
  };

  const pickSuggestion = (id: string) => {
    setTargetId(id);
    switchTab("connected");
    // Scroll the add form into view after tab switch
    setTimeout(() => {
      addComboRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  };

  return (
    <Panel title={selected ? selected.name : "Connections"} subtitle="Connections" grow>
      {/* ── Tab bar ── */}
      <div className="conn-tabs">
        <button
          className={`conn-tab${activeTab === "connected" ? " conn-tab-active" : ""}`}
          onClick={() => switchTab("connected")}
        >
          Connected
          {myConnections.length > 0 && (
            <span className="conn-tab-count">{myConnections.length}</span>
          )}
        </button>
        <button
          className={`conn-tab${activeTab === "friends" ? " conn-tab-active" : ""}`}
          onClick={() => switchTab("friends")}
        >
          Suggested
          {twoAway.length > 0 && (
            <span className="conn-tab-count">{twoAway.length}</span>
          )}
        </button>
        <button
          className={`conn-tab${activeTab === "alignment" ? " conn-tab-active" : ""}`}
          onClick={() => switchTab("alignment")}
          title="Set D&D alignment — colors the graph"
        >
          Alignment
          {selected?.alignment && (
            <span
              className="conn-tab-count"
              style={{
                background: `${ALIGNMENT_INFO[selected.alignment].color}33`,
                color: ALIGNMENT_INFO[selected.alignment].color,
              }}
            >
              {selected.alignment}
            </span>
          )}
        </button>
        <button
          className={`conn-tab${activeTab === "groups" ? " conn-tab-active" : ""}`}
          onClick={() => switchTab("groups")}
          title="Connect many guests at once"
        >
          Groups
        </button>
      </div>

      {/* ── Tab: Connected ── */}
      {activeTab === "connected" && (
        !selected ? (
          <p className="empty-hint">
            Select a guest in the Guests tab to add or edit their relationships.
          </p>
        ) : (
          <>
            <div className="connection-list">
              {myConnections.length === 0 && (
                <p className="empty-hint">No connections yet — add one below.</p>
              )}
              {myConnections.map(({ otherId, value, label }) => (
                <div key={otherId} className="connection-row">
                  <div className="connection-row-head">
                    <span className="connection-row-name">{nameOf(otherId)}</span>
                    <Button
                      variant="danger"
                      small
                      onClick={() => removeConnection(selected.id, otherId)}
                      aria-label={`Remove connection to ${nameOf(otherId)}`}
                    >
                      ✕
                    </Button>
                  </div>
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
                </div>
              ))}
            </div>

            {/* ── Inline add form ── */}
            {others.length > 0 && (
              <>
                <div className="conn-add-sep" />
                <div className="conn-add-inline" ref={addComboRef}>
                  <Combobox
                    label="Add connection"
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
                    Add
                  </Button>
                </div>
              </>
            )}
          </>
        )
      )}

      {/* ── Tab: Friends of Friends ── */}
      {activeTab === "friends" && (
        !selected ? (
          <p className="empty-hint">
            Select a guest in the Guests tab to see suggestions.
          </p>
        ) : twoAway.length === 0 ? (
          <p className="empty-hint">
            No suggestions yet — connect more guests to find mutual friends.
          </p>
        ) : (
          <div className="two-away-list">
            {twoAway.map(({ id, mutuals }) => (
              <button
                key={id}
                className="two-away-chip"
                onClick={() => pickSuggestion(id)}
                title={`${mutuals} mutual — pre-fills the add form`}
              >
                {nameOf(id)}
                <span className="chip-count">{mutuals}</span>
              </button>
            ))}
          </div>
        )
      )}

      {/* ── Tab: Alignment ── */}
      {activeTab === "alignment" && (
        !selected ? (
          <p className="empty-hint">
            Select a guest in the Guests tab to set their alignment.
          </p>
        ) : (
          <div className="alignment-tab">
            <p className="alignment-tab-hint">
              Pick {selected.name}'s D&D alignment. The graph is now colored by alignment.
            </p>

            <div className="alignment-grid-wrap">
              <div />
              {LAW_LABELS.map((l) => (
                <span key={l} className="alignment-axis-label">{l}</span>
              ))}
              {GRID.map((row, ri) => (
                <>
                  <span key={`row-${ri}`} className="alignment-axis-label alignment-axis-row">
                    {MORAL_LABELS[ri]}
                  </span>
                  {row.map((al) => {
                    const info = ALIGNMENT_INFO[al];
                    const isActive = selected.alignment === al;
                    return (
                      <button
                        key={al}
                        className={`alignment-cell${isActive ? " alignment-cell-active" : ""}`}
                        style={{ "--al-color": info.color } as React.CSSProperties}
                        onClick={() =>
                          setGuestAlignment(selected.id, isActive ? undefined : al)
                        }
                        title={info.label}
                      >
                        <span className="alignment-cell-code">{al}</span>
                        <span className="alignment-cell-name">
                          {info.label.split(" ").slice(1).join(" ")}
                        </span>
                      </button>
                    );
                  })}
                </>
              ))}
            </div>

            {selected.alignment ? (
              <div className="alignment-current">
                <span
                  className="alignment-current-badge"
                  style={{
                    color: ALIGNMENT_INFO[selected.alignment].color,
                    borderColor: `${ALIGNMENT_INFO[selected.alignment].color}66`,
                  }}
                >
                  {selected.alignment} · {ALIGNMENT_INFO[selected.alignment].label}
                </span>
                <button
                  className="alignment-clear"
                  onClick={() => setGuestAlignment(selected.id, undefined)}
                >
                  Clear
                </button>
              </div>
            ) : (
              <p className="empty-hint" style={{ textAlign: "center" }}>No alignment set</p>
            )}
          </div>
        )
      )}

      {/* ── Tab: Groups ── */}
      {activeTab === "groups" && <GroupConnect />}
    </Panel>
  );
}
