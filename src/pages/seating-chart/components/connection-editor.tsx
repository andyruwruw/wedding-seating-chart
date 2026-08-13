import { useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "../../../components/layout/panel";
import { Button } from "../../../components/form/button";
import { Select } from "../../../components/form/select";
import { Combobox } from "../../../components/form/combobox";
import { useAppStore } from "../../../store/use-app-store";
import {
  DEFAULT_MATCH_BOOST,
  KEEP_APART_VALUE,
  labelForValue,
  MATCH_BOOST_LEVELS,
  RELATIONSHIP_TIERS,
  tierIndexForLabel,
} from "../../../components/form/config/relationship-tiers";
import { TIER_OPTIONS } from "../config";
import { ALIGNMENT_INFO } from "../helpers/alignment";
import { AlignmentDialog } from "./alignment-dialog";
import { GroupConnect } from "./group-connect";
import { CloseIcon } from "../../../components/icons";

const DEFAULT_TIER_INDEX = Math.max(
  0,
  RELATIONSHIP_TIERS.findIndex((t) => t.label === "Friend"),
);

function indexForLabel(label: string): number {
  const i = tierIndexForLabel(label);
  return i >= 0 ? i : DEFAULT_TIER_INDEX;
}

type ConnTab = "connected" | "friends" | "groups";

interface ConnectionEditorProps {
  onBack: () => void;
}

export function ConnectionEditor({ onBack }: ConnectionEditorProps) {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const selectedGuestId = useAppStore((s) => s.selectedGuestId);
  const setConnection = useAppStore((s) => s.setConnection);
  const removeConnection = useAppStore((s) => s.removeConnection);
  const setConnectionPinned = useAppStore((s) => s.setConnectionPinned);
  const setConnectionMatchBoost = useAppStore((s) => s.setConnectionMatchBoost);
  const setGraphColorMode = useAppStore((s) => s.setGraphColorMode);

  const [activeTab, setActiveTab] = useState<ConnTab>("connected");
  const [targetId, setTargetId] = useState("");
  const [tierIndex, setTierIndex] = useState(DEFAULT_TIER_INDEX);
  const [addPinned, setAddPinned] = useState(false);
  const [addMatchBoost, setAddMatchBoost] = useState<number | undefined>(undefined);
  const [alignmentOpen, setAlignmentOpen] = useState(false);
  const addComboRef = useRef<HTMLDivElement>(null);

  // A plain vertical mouse wheel over a horizontally-scrolling strip
  // otherwise just scrolls the panel behind it — redirect that delta into
  // the tab strip's own horizontal scroll instead.
  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    el.scrollLeft += e.deltaY;
    e.preventDefault();
  };

  const selected = guests.find((g) => g.id === selectedGuestId) ?? null;
  const others = useMemo(
    () => guests.filter((g) => g.id !== selectedGuestId),
    [guests, selectedGuestId],
  );
  const nameOf = (id: string) => guests.find((g) => g.id === id)?.name ?? "?";

  const switchTab = (tab: ConnTab) => setActiveTab(tab);

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
          pinned: c.pinned ?? false,
          matchBoost: c.matchBoost,
        }))
        .sort((a, b) => a.value - b.value)
    : [];

  const addConnection = () => {
    if (!selected || !targetId) return;
    setConnection(selected.id, targetId, RELATIONSHIP_TIERS[tierIndex].label);
    if (addPinned) setConnectionPinned(selected.id, targetId, true);
    if (addMatchBoost) setConnectionMatchBoost(selected.id, targetId, addMatchBoost);
    setAddPinned(false);
    setAddMatchBoost(undefined);
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
    <Panel
      title={selected ? selected.name : "Connections"}
      subtitle="Connections"
      grow
      onBack={onBack}
      actions={
        selected && (
          <button
            type="button"
            className="alignment-trigger"
            onClick={() => setAlignmentOpen(true)}
            title="Set D&D alignment — colors the graph"
            style={
              selected.alignment
                ? {
                    color: ALIGNMENT_INFO[selected.alignment].color,
                    borderColor: `${ALIGNMENT_INFO[selected.alignment].color}66`,
                  }
                : undefined
            }
          >
            {selected.alignment ?? "Alignment"}
          </button>
        )
      }
    >
      {/* ── Tab bar ── */}
      <div className="conn-tabs" onWheel={handleTabsWheel}>
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
          className={`conn-tab${activeTab === "groups" ? " conn-tab-active" : ""}`}
          onClick={() => switchTab("groups")}
          title="Connect many guests at once"
        >
          Groups
        </button>
      </div>

      {selected && alignmentOpen && (
        <AlignmentDialog
          guestId={selected.id}
          guestName={selected.name}
          alignment={selected.alignment}
          onClose={() => setAlignmentOpen(false)}
        />
      )}

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
              {myConnections.map(({ otherId, value, label, pinned, matchBoost }) => (
                <div key={otherId} className="connection-row">
                  <div className="connection-row-head">
                    <span className="connection-row-name">{nameOf(otherId)}</span>
                    <Button
                      variant="danger"
                      small
                      onClick={() => removeConnection(selected.id, otherId)}
                      aria-label={`Remove connection to ${nameOf(otherId)}`}
                    >
                      <CloseIcon size={11} />
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
                  <div className="connection-row-extra">
                    <button
                      type="button"
                      className={`mini-toggle${pinned ? " mini-toggle-on" : ""}`}
                      onClick={() => setConnectionPinned(selected.id, otherId, !pinned)}
                      title="Force them to share a table, regardless of the relationship above — no effect on happiness/fomo."
                    >
                      📌 Must sit together
                    </button>
                    <button
                      type="button"
                      className={`mini-toggle${matchBoost ? " mini-toggle-on" : ""}`}
                      onClick={() =>
                        setConnectionMatchBoost(
                          selected.id,
                          otherId,
                          matchBoost ? undefined : DEFAULT_MATCH_BOOST,
                        )
                      }
                      title="Extra pull on top of the relationship above — boosts happiness if satisfied, but can never trigger the fomo penalty if not."
                    >
                      ✨ Predicted match
                    </button>
                    {matchBoost !== undefined && (
                      <Select
                        value={matchBoost}
                        onChange={(v) =>
                          setConnectionMatchBoost(selected.id, otherId, Number(v))
                        }
                        options={MATCH_BOOST_LEVELS.map((l) => ({
                          label: l.label,
                          value: l.value,
                        }))}
                        className="mini-toggle-select"
                      />
                    )}
                  </div>
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
                  <div className="connection-row-extra">
                    <button
                      type="button"
                      className={`mini-toggle${addPinned ? " mini-toggle-on" : ""}`}
                      onClick={() => setAddPinned((v) => !v)}
                      title="Force them to share a table, regardless of the relationship above — no effect on happiness/fomo."
                    >
                      📌 Must sit together
                    </button>
                    <button
                      type="button"
                      className={`mini-toggle${addMatchBoost ? " mini-toggle-on" : ""}`}
                      onClick={() =>
                        setAddMatchBoost((v) => (v ? undefined : DEFAULT_MATCH_BOOST))
                      }
                      title="Extra pull on top of the relationship above — boosts happiness if satisfied, but can never trigger the fomo penalty if not."
                    >
                      ✨ Predicted match
                    </button>
                    {addMatchBoost !== undefined && (
                      <Select
                        value={addMatchBoost}
                        onChange={(v) => setAddMatchBoost(Number(v))}
                        options={MATCH_BOOST_LEVELS.map((l) => ({
                          label: l.label,
                          value: l.value,
                        }))}
                        className="mini-toggle-select"
                      />
                    )}
                  </div>
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

      {/* ── Tab: Groups ── */}
      {activeTab === "groups" && <GroupConnect />}
    </Panel>
  );
}
