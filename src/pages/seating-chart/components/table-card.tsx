import { useRef, useState } from "react";
import {
  HAPPINESS_COLORS,
  type GuestDetail,
  type TableHappiness,
} from "../helpers/happiness";
import {
  ALIGNMENT_INFO,
  ALIGNMENT_ORDER,
  type TableAlignmentSummary,
} from "../helpers/alignment";
import { GuestTooltip } from "./guest-tooltip";

interface TableCardProps {
  index: number;
  color: string;
  guests: { id: string; name: string }[];
  happiness: TableHappiness;
  guestDetails?: Map<string, GuestDetail> | null;
  alignmentSummary?: TableAlignmentSummary | null;
  showHarmony?: boolean;
  locked?: boolean;
  onToggleLock?: () => void;
}

export function TableCard({
  index,
  color,
  guests,
  happiness,
  guestDetails,
  alignmentSummary,
  showHarmony = false,
  locked = false,
  onToggleLock,
}: TableCardProps) {
  const toneColor = HAPPINESS_COLORS[happiness.tone];

  const [tooltipState, setTooltipState] = useState<{
    guestId: string;
    anchorRect: DOMRect;
  } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = (guestId: string, e: React.MouseEvent) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setTooltipState({ guestId, anchorRect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
  };

  const hideTooltip = () => {
    hideTimer.current = setTimeout(() => setTooltipState(null), 120);
  };

  const alignEntries =
    alignmentSummary && alignmentSummary.total > 0
      ? ALIGNMENT_ORDER.filter((al) => alignmentSummary.counts[al])
          .map((al) => ({
            al,
            count: alignmentSummary.counts[al]!,
            color: ALIGNMENT_INFO[al].color,
            label: ALIGNMENT_INFO[al].label,
          }))
          .sort((a, b) => b.count - a.count)
      : null;

  const harmony =
    showHarmony && alignmentSummary?.strangerHarmony != null
      ? Math.round(alignmentSummary.strangerHarmony * 100)
      : null;

  const tooltipGuest = tooltipState ? guests.find((g) => g.id === tooltipState.guestId) : null;
  const tooltipDetail = tooltipState ? guestDetails?.get(tooltipState.guestId) : null;

  return (
    <div
      className={`table-card ${locked ? "table-card-locked" : ""}`}
      style={{ borderLeftColor: locked ? "var(--accent)" : color }}
    >
      <div className="table-card-head">
        <span className="table-dot" style={{ background: color }} />
        <span className="table-card-title">Table {index + 1}</span>
        <span
          className="happy-badge"
          style={{ color: toneColor, borderColor: toneColor }}
        >
          {happiness.label} · {happiness.score}
        </span>
        <span className="table-card-count">{guests.length}</span>
        {onToggleLock && (
          <button
            type="button"
            className={`table-lock-btn ${locked ? "table-lock-btn-active" : ""}`}
            onClick={onToggleLock}
            title={locked ? "Unlock table" : "Lock table — keep it fixed across regenerations"}
            aria-label={locked ? "Unlock table" : "Lock table"}
            aria-pressed={locked}
          >
            {locked ? "🔒" : "🔓"}
          </button>
        )}
      </div>

      <div className="table-card-guests">
        {guests.map(({ id, name }) => {
          const detail = guestDetails?.get(id);
          const nameColor = detail ? HAPPINESS_COLORS[detail.tone] : undefined;
          return (
            <span
              key={id}
              className="table-guest"
              style={{ color: nameColor }}
              onMouseEnter={(e) => showTooltip(id, e)}
              onMouseLeave={hideTooltip}
            >
              {name}
            </span>
          );
        })}
      </div>

      {alignEntries && (
        <div className="table-alignment-row">
          {alignEntries.map(({ al, count, color: c, label }) => (
            <span
              key={al}
              className="table-align-badge"
              title={label}
              style={{ color: c, borderColor: `${c}55`, background: `${c}18` }}
            >
              {al}
              {count > 1 && <span className="table-align-count">×{count}</span>}
            </span>
          ))}
          {harmony != null && (
            <span
              className="table-align-harmony"
              title="Average alignment compatibility between disconnected guests"
            >
              ⚔ {harmony}%
            </span>
          )}
        </div>
      )}

      {tooltipState && tooltipGuest && (
        <GuestTooltip
          name={tooltipGuest.name}
          detail={tooltipDetail ?? null}
          anchorRect={tooltipState.anchorRect}
        />
      )}
    </div>
  );
}
