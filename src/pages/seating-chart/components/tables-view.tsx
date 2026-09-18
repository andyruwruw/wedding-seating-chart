import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../../store/use-app-store";
import { linkStyle } from "../../../components/graph/helpers";
import { tableColor } from "../config";
import {
  computeHappiness,
  computeGuestDetails,
  HAPPINESS_COLORS,
  makeMultLookup,
  type GuestDetail,
  type GuestHappiness,
  type TableHappiness,
} from "../helpers/happiness";
import type { Connection } from "../../../types";
import { GuestTooltip } from "./guest-tooltip";
import { LockIcon, UnlockIcon } from "../../../components/icons";

const SIZE = 272;
const CX = SIZE / 2;
const CY = 130;
const R = 74;
const LABEL_R = R + 13;
const AVG_CHAR_PX = 5.1;
const LABEL_PAD = 4;

function fitLabel(name: string, maxWidth: number): string {
  const maxChars = Math.max(3, Math.floor(maxWidth / AVG_CHAR_PX));
  if (name.length <= maxChars) return name;
  return `${name.slice(0, maxChars - 1).trimEnd()}…`;
}

interface Seat {
  id: string | null;
  name: string;
  x: number;
  y: number;
  cos: number;
  color: string;
  score: number;
  empty: boolean;
}

function TableCircle({
  index,
  tableId,
  guestIds,
  capacity,
  nameOf,
  connections,
  guestHappy,
  happiness,
  guestDetails,
  locked,
  onToggleLock,
  swapSelectedId,
  onSeatClick,
}: {
  index: number;
  tableId: string;
  guestIds: string[];
  capacity: number;
  nameOf: (id: string) => string;
  connections: Connection[];
  guestHappy: Map<string, GuestHappiness>;
  happiness: TableHappiness;
  guestDetails: Map<string, GuestDetail>;
  locked?: boolean;
  onToggleLock?: () => void;
  swapSelectedId: string | null;
  onSeatClick: (guestId: string | null, tableId: string) => void;
}) {
  const color = tableColor(index);
  const toneColor = HAPPINESS_COLORS[happiness.tone];

  const [tooltipState, setTooltipState] = useState<{
    guestId: string;
    anchorRect: DOMRect;
  } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = (guestId: string, e: React.MouseEvent<SVGElement>) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const rect = (e.currentTarget as SVGGraphicsElement).getBoundingClientRect();
    setTooltipState({ guestId, anchorRect: rect });
  };

  const hideTooltip = () => {
    hideTimer.current = setTimeout(() => setTooltipState(null), 120);
  };

  const slotCount = Math.max(guestIds.length, capacity);
  const seats: Seat[] = Array.from({ length: slotCount }, (_, i) => {
    const angle = (-90 + (360 * i) / slotCount) * (Math.PI / 180);
    const x = CX + R * Math.cos(angle);
    const y = CY + R * Math.sin(angle);
    const cos = Math.cos(angle);
    const id = guestIds[i];
    if (id === undefined) {
      return { id: null, name: "", x, y, cos, color: "var(--text-2)", score: 0, empty: true };
    }
    const gh = guestHappy.get(id) ?? { score: 80, tone: "neutral" as const };
    return {
      id,
      name: nameOf(id),
      x,
      y,
      cos,
      color: HAPPINESS_COLORS[gh.tone],
      score: gh.score,
      empty: false,
    };
  });
  const seatById = new Map(
    seats.filter((s): s is Seat & { id: string } => s.id !== null).map((s) => [s.id, s] as const),
  );

  const member = new Set(guestIds);
  const chords = connections
    .filter((c) => member.has(c.source) && member.has(c.target))
    .map((c) => {
      const a = seatById.get(c.source)!;
      const b = seatById.get(c.target)!;
      return { a, b, ...linkStyle(c.value) };
    });

  const tooltipGuest = tooltipState ? seats.find((s) => s.id === tooltipState.guestId) : null;
  const tooltipDetail = tooltipState ? (guestDetails.get(tooltipState.guestId) ?? null) : null;
  const emptyCount = Math.max(0, capacity - guestIds.length);

  return (
    <div className={`table-tile ${locked ? "table-tile-locked" : ""}`}>
      <div className="table-tile-head">
        <span className="table-dot" style={{ background: color }} />
        <span className="table-tile-title">Table {index + 1}</span>
        <span className="table-tile-count">
          {guestIds.length}/{capacity} seats
          {emptyCount > 0 ? ` · ${emptyCount} empty` : ""}
        </span>
        <span
          className="happy-badge"
          style={{ color: toneColor, borderColor: toneColor }}
        >
          {happiness.label} · {happiness.score}
        </span>
        {onToggleLock && (
          <button
            type="button"
            className={`table-lock-btn ${locked ? "table-lock-btn-active" : ""}`}
            onClick={onToggleLock}
            title={locked ? "Unlock table" : "Lock table — keep it fixed across regenerations"}
            aria-label={locked ? "Unlock table" : "Lock table"}
            aria-pressed={locked}
          >
            {locked ? <LockIcon size={12} /> : <UnlockIcon size={12} />}
          </button>
        )}
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE - 6}`}
        className="table-svg"
        role="img"
        aria-label={`Table ${index + 1}, ${happiness.label}`}
      >
        <circle cx={CX} cy={CY} r={R} fill={`${color}14`} stroke={color} strokeWidth={1.5} />

        {chords.map((c, i) => (
          <line
            key={i}
            x1={c.a.x} y1={c.a.y}
            x2={c.b.x} y2={c.b.y}
            stroke={c.color}
            strokeWidth={c.width}
            strokeDasharray={c.dashed ? "3 3" : undefined}
          />
        ))}

        <circle cx={CX} cy={CY} r={32} style={{ fill: "var(--bg-1)", stroke: "var(--border)" }} />
        <text x={CX} y={CY - 4} textAnchor="middle" className="table-score" fill={toneColor}>
          {happiness.score}
        </text>
        <text x={CX} y={CY + 13} textAnchor="middle" className="table-score-sub">
          happy
        </text>

        {seats.map((s, i) => {
          const anchor = s.cos > 0.3 ? "start" : s.cos < -0.3 ? "end" : "middle";
          const lx = CX + LABEL_R * ((s.x - CX) / R);
          const ly = CY + LABEL_R * ((s.y - CY) / R);
          const maxWidth =
            anchor === "start"
              ? SIZE - lx - LABEL_PAD
              : anchor === "end"
                ? lx - LABEL_PAD
                : 2 * Math.min(lx, SIZE - lx) - LABEL_PAD;
          const label = s.empty ? (swapSelectedId ? "move here" : "") : fitLabel(s.name, maxWidth);
          const selected = !s.empty && s.id === swapSelectedId;
          const dropTarget = s.empty && swapSelectedId !== null;
          return (
            <g
              key={s.id ?? `empty-${i}`}
              className={`seat-group${selected ? " seat-group-selected" : ""}${s.empty ? " seat-group-empty" : ""}${dropTarget ? " seat-group-drop" : ""}`}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => !s.empty && showTooltip(s.id!, e)}
              onMouseLeave={hideTooltip}
              onClick={() => onSeatClick(s.id, tableId)}
            >
              {selected && (
                <circle
                  cx={s.x} cy={s.y} r={9}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1.5}
                  className="seat-select-ring"
                />
              )}
              <circle
                cx={s.x} cy={s.y} r={5}
                fill={s.empty ? "none" : s.color}
                style={{ stroke: s.empty ? "var(--text-2)" : "var(--bg-0)" }}
                strokeWidth={1.5}
                strokeDasharray={s.empty ? "2 2" : undefined}
              />
              {/* Invisible larger hit area so the hover/click is easy to trigger */}
              <circle cx={s.x} cy={s.y} r={12} fill="transparent" />
              <text
                x={lx} y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                className={`seat-name${s.empty ? " seat-name-empty" : ""}`}
                fill={s.empty ? "var(--text-2)" : s.color}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {tooltipState && tooltipGuest && (
        <GuestTooltip
          name={tooltipGuest.name}
          detail={tooltipDetail}
          anchorRect={tooltipState.anchorRect}
        />
      )}
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
  const toggleTableLock = useAppStore((s) => s.toggleTableLock);
  const swapGuests = useAppStore((s) => s.swapGuests);
  const moveGuestToTable = useAppStore((s) => s.moveGuestToTable);
  const selectGuest = useAppStore((s) => s.selectGuest);
  const capacity = useAppStore((s) => s.config.seatsPerTable);

  const [swapSelectedId, setSwapSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!swapSelectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSwapSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swapSelectedId]);

  const nameOf = useMemo(() => {
    const map = new Map(guests.map((g) => [g.id, g.name] as const));
    return (id: string) => map.get(id) ?? "?";
  }, [guests]);

  const handleSeatClick = (id: string | null, tableId: string) => {
    if (id) selectGuest(id);
    if (swapSelectedId === null) {
      if (id) setSwapSelectedId(id); // empty seats can't start a selection
    } else if (swapSelectedId === id) {
      setSwapSelectedId(null); // clicking the same seat again undoes the selection
    } else if (id === null) {
      moveGuestToTable(swapSelectedId, tableId);
      setSwapSelectedId(null);
    } else {
      swapGuests(swapSelectedId, id);
      setSwapSelectedId(null);
    }
  };

  const report = useMemo(
    () =>
      result
        ? computeHappiness(result.tables, connections, taper, fomo, makeMultLookup(guests), worstCase)
        : null,
    [result, connections, taper, fomo, worstCase, guests],
  );

  const guestDetails = useMemo(
    () => result && report ? computeGuestDetails(result.tables, connections, report, guests) : null,
    [result, connections, report, guests],
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
      <div className="tables-scroll">
        <div className="tables-content">
          <div className="tables-legend">
            <span className="section-label">
              {swapSelectedId
                ? `Moving ${nameOf(swapSelectedId)} — click another guest to swap, an empty seat to move them, or click them again to cancel`
                : "Hover a name to see why, click to select a guest and swap or move seats"}
            </span>
            {swapSelectedId ? (
              <button
                type="button"
                className="swap-cancel-btn"
                onClick={() => setSwapSelectedId(null)}
              >
                Cancel swap
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>

          <div className="tables-grid">
            {result.tables.map((t, i) => (
              <TableCircle
                key={t.id}
                index={i}
                tableId={t.id}
                guestIds={t.guestIds}
                capacity={capacity}
                nameOf={nameOf}
                connections={connections}
                guestHappy={report.guest}
                happiness={report.table[i]}
                guestDetails={guestDetails ?? new Map()}
                locked={t.locked}
                onToggleLock={() => toggleTableLock(t.id)}
                swapSelectedId={swapSelectedId}
                onSeatClick={handleSeatClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
