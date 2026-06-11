import { useMemo } from "react";
import { useAppStore } from "../../../store/use-app-store";
import { linkStyle } from "../../../components/graph/helpers";
import { tableColor } from "../config";
import {
  HAPPINESS_COLORS,
  tableHappiness,
  type TableHappiness,
} from "../helpers/happiness";
import type { Connection } from "../../../types";

const SIZE = 248;
const CX = SIZE / 2;
const CY = 116;
const R = 70;

interface Seat {
  id: string;
  name: string;
  x: number;
  y: number;
  cos: number;
}

function TableCircle({
  index,
  guestIds,
  nameOf,
  connections,
  happiness,
}: {
  index: number;
  guestIds: string[];
  nameOf: (id: string) => string;
  connections: Connection[];
  happiness: TableHappiness;
}) {
  const color = tableColor(index);
  const toneColor = HAPPINESS_COLORS[happiness.tone];

  const seats: Seat[] = guestIds.map((id, i) => {
    const angle = (-90 + (360 * i) / guestIds.length) * (Math.PI / 180);
    return {
      id,
      name: nameOf(id),
      x: CX + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
      cos: Math.cos(angle),
    };
  });
  const seatById = new Map(seats.map((s) => [s.id, s] as const));

  // Chords between co-seated, connected guests.
  const member = new Set(guestIds);
  const chords = connections
    .filter((c) => member.has(c.source) && member.has(c.target))
    .map((c) => {
      const a = seatById.get(c.source)!;
      const b = seatById.get(c.target)!;
      return { a, b, ...linkStyle(c.value) };
    });

  return (
    <div className="table-tile">
      <div className="table-tile-head">
        <span className="table-dot" style={{ background: color }} />
        <span className="table-tile-title">Table {index + 1}</span>
        <span className="table-tile-count">{guestIds.length} seats</span>
        <span
          className="happy-badge"
          style={{ color: toneColor, borderColor: toneColor }}
        >
          {happiness.label} · {happiness.score}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE - 6}`}
        className="table-svg"
        role="img"
        aria-label={`Table ${index + 1}, ${happiness.label}`}
      >
        {/* table surface */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill={`${color}14`}
          stroke={color}
          strokeWidth={1.5}
        />

        {/* relationship chords */}
        {chords.map((c, i) => (
          <line
            key={i}
            x1={c.a.x}
            y1={c.a.y}
            x2={c.b.x}
            y2={c.b.y}
            stroke={c.color}
            strokeWidth={c.width}
            strokeDasharray={c.dashed ? "3 3" : undefined}
          />
        ))}

        {/* center happiness disc */}
        <circle
          cx={CX}
          cy={CY}
          r={30}
          style={{ fill: "var(--bg-1)", stroke: "var(--border)" }}
        />
        <text
          x={CX}
          y={CY - 4}
          textAnchor="middle"
          className="table-score"
          fill={toneColor}
        >
          {happiness.score}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" className="table-score-sub">
          happy
        </text>

        {/* seats + names */}
        {seats.map((s) => {
          const anchor = s.cos > 0.3 ? "start" : s.cos < -0.3 ? "end" : "middle";
          const lx = CX + (R + 12) * ((s.x - CX) / R);
          const ly = CY + (R + 12) * ((s.y - CY) / R);
          return (
            <g key={s.id}>
              <circle
                cx={s.x}
                cy={s.y}
                r={4.5}
                fill={color}
                style={{ stroke: "var(--bg-0)" }}
                strokeWidth={1.5}
              />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="seat-name"
              >
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function TablesView() {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const result = useAppStore((s) => s.result);

  const nameOf = useMemo(() => {
    const map = new Map(guests.map((g) => [g.id, g.name] as const));
    return (id: string) => map.get(id) ?? "?";
  }, [guests]);

  if (!result) {
    return (
      <div className="tables-empty">
        <p>Generate a seating chart to see the tables.</p>
      </div>
    );
  }

  return (
    <div className="tables-grid">
      {result.tables.map((t, i) => (
        <TableCircle
          key={t.id}
          index={i}
          guestIds={t.guestIds}
          nameOf={nameOf}
          connections={connections}
          happiness={tableHappiness(t.guestIds, connections)}
        />
      ))}
    </div>
  );
}
