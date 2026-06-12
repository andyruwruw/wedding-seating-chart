import { useMemo } from "react";
import { useAppStore } from "../../../store/use-app-store";
import { linkStyle } from "../../../components/graph/helpers";
import { tableColor } from "../config";
import {
  computeHappiness,
  HAPPINESS_COLORS,
  makeMultLookup,
  type GuestHappiness,
  type TableHappiness,
} from "../helpers/happiness";
import type { Connection } from "../../../types";

const SIZE = 272;
const CX = SIZE / 2;
const CY = 130;
const R = 82;

interface Seat {
  id: string;
  name: string;
  x: number;
  y: number;
  cos: number;
  color: string;
  score: number;
}

function TableCircle({
  index,
  guestIds,
  nameOf,
  connections,
  guestHappy,
  happiness,
}: {
  index: number;
  guestIds: string[];
  nameOf: (id: string) => string;
  connections: Connection[];
  guestHappy: Map<string, GuestHappiness>;
  happiness: TableHappiness;
}) {
  const color = tableColor(index);
  const toneColor = HAPPINESS_COLORS[happiness.tone];

  const seats: Seat[] = guestIds.map((id, i) => {
    const angle = (-90 + (360 * i) / guestIds.length) * (Math.PI / 180);
    const gh = guestHappy.get(id) ?? { score: 80, tone: "neutral" as const };
    return {
      id,
      name: nameOf(id),
      x: CX + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
      cos: Math.cos(angle),
      color: HAPPINESS_COLORS[gh.tone],
      score: gh.score,
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
          r={32}
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
        <text x={CX} y={CY + 13} textAnchor="middle" className="table-score-sub">
          happy
        </text>

        {/* seats + names, tinted by each guest's personal happiness */}
        {seats.map((s) => {
          const anchor = s.cos > 0.3 ? "start" : s.cos < -0.3 ? "end" : "middle";
          const lx = CX + (R + 13) * ((s.x - CX) / R);
          const ly = CY + (R + 13) * ((s.y - CY) / R);
          return (
            <g key={s.id}>
              <title>{`${s.name} · ${s.score} happy`}</title>
              <circle
                cx={s.x}
                cy={s.y}
                r={5}
                fill={s.color}
                style={{ stroke: "var(--bg-0)" }}
                strokeWidth={1.5}
              />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="seat-name"
                fill={s.color}
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
  const taper = useAppStore((s) => s.config.taper);
  const fomo = useAppStore((s) => s.config.fomo);
  const worstCase = useAppStore((s) => s.config.worstCaseScore);

  const nameOf = useMemo(() => {
    const map = new Map(guests.map((g) => [g.id, g.name] as const));
    return (id: string) => map.get(id) ?? "?";
  }, [guests]);

  const report = useMemo(
    () =>
      result
        ? computeHappiness(
            result.tables,
            connections,
            taper,
            fomo,
            makeMultLookup(guests),
            worstCase,
          )
        : null,
    [result, connections, taper, fomo, worstCase, guests],
  );

  if (!result || !report) {
    return (
      <div className="tables-empty">
        <p>Generate a seating chart to see the tables.</p>
      </div>
    );
  }

  return (
    <div className="tables-pane">
      <div className="tables-legend">
        <span className="section-label">Guests tinted by personal happiness</span>
        <span className="tl-key">
          <i className="tl-dot" style={{ background: HAPPINESS_COLORS.great }} />
          happy
        </span>
        <span className="tl-key">
          <i className="tl-dot" style={{ background: HAPPINESS_COLORS.ok }} />
          mixed
        </span>
        <span className="tl-key">
          <i className="tl-dot" style={{ background: HAPPINESS_COLORS.bad }} />
          unhappy
        </span>
      </div>

      <div className="tables-grid">
        {result.tables.map((t, i) => (
          <TableCircle
            key={t.id}
            index={i}
            guestIds={t.guestIds}
            nameOf={nameOf}
            connections={connections}
            guestHappy={report.guest}
            happiness={report.table[i]}
          />
        ))}
      </div>
    </div>
  );
}
