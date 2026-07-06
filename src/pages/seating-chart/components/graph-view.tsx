import { useMemo, useState } from "react";
import {
  ForceGraph,
  type GraphLink,
  type GraphNode,
} from "../../../components/graph/force-graph";
import { useAppStore } from "../../../store/use-app-store";
import { tableColor, UNASSIGNED_COLOR } from "../config";
import { ALIGNMENT_INFO, ALIGNMENT_ORDER } from "../helpers/alignment";
import { GraphSettingsDialog } from "./graph-settings";

const ALIGNMENT_NO_SET_COLOR = "#3a3a4a";

export function GraphView() {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const result = useAppStore((s) => s.result);
  const selectedGuestId = useAppStore((s) => s.selectedGuestId);
  const selectGuest = useAppStore((s) => s.selectGuest);
  const graphSettings = useAppStore((s) => s.graphSettings);
  const graphColorMode = useAppStore((s) => s.graphColorMode);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Guest -> table index (for node coloring once a chart exists).
  const tableOfGuest = useMemo(() => {
    const map = new Map<string, number>();
    result?.tables.forEach((t, i) =>
      t.guestIds.forEach((id) => map.set(id, i)),
    );
    return map;
  }, [result]);

  const nodes: GraphNode[] = useMemo(
    () =>
      guests.map((g) => {
        let color: string;
        if (graphColorMode === "alignment") {
          color = g.alignment
            ? ALIGNMENT_INFO[g.alignment].color
            : ALIGNMENT_NO_SET_COLOR;
        } else {
          const idx = tableOfGuest.get(g.id);
          color = idx === undefined ? UNASSIGNED_COLOR : tableColor(idx);
        }
        return { id: g.id, name: g.name, color };
      }),
    [guests, tableOfGuest, graphColorMode],
  );

  const links: GraphLink[] = useMemo(
    () =>
      connections.map((c) => ({
        source: c.source,
        target: c.target,
        value: c.value,
      })),
    [connections],
  );

  // Which alignments are actually in use (for a compact legend).
  const usedAlignments = useMemo(() => {
    if (graphColorMode !== "alignment") return [];
    const used = new Set(guests.map((g) => g.alignment).filter(Boolean));
    return ALIGNMENT_ORDER.filter((al) => used.has(al));
  }, [guests, graphColorMode]);

  const hasUnset =
    graphColorMode === "alignment" && guests.some((g) => !g.alignment);

  return (
    <div className="graph-view">
      {guests.length === 0 ? (
        <div className="graph-empty">
          <h1 className="graph-empty-title">Wedding Seating Chart</h1>
          <p>
            Add guests on the right, link the people who know each other, then
            generate a best-effort seating plan from the Seating tab.
          </p>
        </div>
      ) : (
        <ForceGraph
          nodes={nodes}
          links={links}
          selectedId={selectedGuestId}
          onSelect={selectGuest}
          settings={graphSettings}
        />
      )}

      {guests.length > 0 && (
        <button
          type="button"
          className="graph-settings-btn"
          title="Graph settings"
          aria-label="Graph settings"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setSettingsOpen((v) => !v)}
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            {Array.from({ length: 8 }).map((_, i) => (
              <rect
                key={i}
                x="8.8"
                y="2.5"
                width="2.4"
                height="3.2"
                rx="0.6"
                transform={`rotate(${i * 45} 10 10)`}
              />
            ))}
            <path
              fillRule="evenodd"
              d="M10 16.2a6.2 6.2 0 1 0 0-12.4 6.2 6.2 0 0 0 0 12.4Zm0-2.4a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6Z"
            />
          </svg>
        </button>
      )}

      {settingsOpen && (
        <GraphSettingsDialog onClose={() => setSettingsOpen(false)} />
      )}

      {guests.length > 0 && graphColorMode === "table" && (
        <div className="graph-legend">
          <span className="legend-item">
            <i className="legend-line legend-close" /> Close
          </span>
          <span className="legend-item">
            <i className="legend-line legend-far" /> Distant
          </span>
          <span className="legend-item">
            <i className="legend-line legend-maybe" /> Maybe
          </span>
          <span className="legend-item">
            <i className="legend-line legend-apart" /> Keep apart
          </span>
        </div>
      )}

      {guests.length > 0 && graphColorMode === "alignment" && (
        <div className="graph-legend graph-legend-alignment">
          {usedAlignments.map((al) => (
            <span key={al} className="legend-item">
              <i
                className="legend-dot"
                style={{ background: ALIGNMENT_INFO[al].color }}
              />
              {al}
            </span>
          ))}
          {hasUnset && (
            <span className="legend-item">
              <i
                className="legend-dot"
                style={{ background: ALIGNMENT_NO_SET_COLOR }}
              />
              None
            </span>
          )}
        </div>
      )}
    </div>
  );
}
