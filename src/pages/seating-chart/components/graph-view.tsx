import { useMemo } from "react";
import {
  ForceGraph,
  type GraphLink,
  type GraphNode,
} from "../../../components/graph/force-graph";
import { useAppStore } from "../../../store/use-app-store";
import { tableColor, UNASSIGNED_COLOR } from "../config";

export function GraphView() {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const result = useAppStore((s) => s.result);
  const selectedGuestId = useAppStore((s) => s.selectedGuestId);
  const selectGuest = useAppStore((s) => s.selectGuest);
  const graphSettings = useAppStore((s) => s.graphSettings);

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
        const idx = tableOfGuest.get(g.id);
        return {
          id: g.id,
          name: g.name,
          color: idx === undefined ? UNASSIGNED_COLOR : tableColor(idx),
        };
      }),
    [guests, tableOfGuest],
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

  return (
    <div className="graph-view">
      {guests.length === 0 ? (
        <div className="graph-empty">
          <h1 className="graph-empty-title">Wedding Seating Chart</h1>
          <p>
            Add guests on the left, link the people who know each other, then
            generate a best-effort seating plan on the right.
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
        <div className="graph-legend">
          <span className="legend-item">
            <i className="legend-line legend-close" /> Close
          </span>
          <span className="legend-item">
            <i className="legend-line legend-far" /> Distant
          </span>
          <span className="legend-item">
            <i className="legend-line legend-apart" /> Keep apart
          </span>
        </div>
      )}
    </div>
  );
}
