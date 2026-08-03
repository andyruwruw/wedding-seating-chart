import { createPortal } from "react-dom";
import {
  HAPPINESS_COLORS,
  TONE_LABEL,
  type GuestDetail,
} from "../helpers/happiness";
import { WarningIcon } from "../../../components/icons";

interface GuestTooltipProps {
  name: string;
  detail: GuestDetail | null;
  anchorRect: DOMRect;
}

export function GuestTooltip({ name, detail, anchorRect }: GuestTooltipProps) {
  const W = 230;
  const left = Math.min(Math.max(8, anchorRect.left), window.innerWidth - W - 8);
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const top = spaceBelow >= 160 ? anchorRect.bottom + 6 : anchorRect.top - 6;
  const transform = spaceBelow >= 160 ? undefined : "translateY(-100%)";

  const toneColor = detail ? HAPPINESS_COLORS[detail.tone] : undefined;
  const hasFriendsHere = (detail?.friendsHere.length ?? 0) > 0;
  const hasFriendsElsewhere = (detail?.friendsElsewhere.size ?? 0) > 0;
  const hasConflicts = (detail?.conflicts.length ?? 0) > 0;

  return createPortal(
    <div className="guest-tooltip" style={{ left, top, width: W, transform }}>
      <div className="guest-tooltip-head">
        <span className="guest-tooltip-name">{name}</span>
        {detail && (
          <span className="guest-tooltip-score" style={{ color: toneColor }}>
            {detail.score} · {TONE_LABEL[detail.tone]}
          </span>
        )}
      </div>

      {hasConflicts && detail && (
        <div className="guest-tooltip-section">
          <span className="guest-tooltip-label guest-tooltip-conflict-label">
            <WarningIcon size={10} /> Conflict at this table
          </span>
          {detail.conflicts.map((c) => (
            <div key={c.name} className="guest-tooltip-row guest-tooltip-conflict-row">
              {c.name}
            </div>
          ))}
        </div>
      )}

      {hasFriendsHere && detail && (
        <div className="guest-tooltip-section">
          <span className="guest-tooltip-label">Here with</span>
          {detail.friendsHere.map((f) => (
            <div key={f.name} className="guest-tooltip-row">
              <strong>{f.name}</strong>
              <em> · {f.label}</em>
            </div>
          ))}
        </div>
      )}

      {hasFriendsElsewhere && detail && (
        <div className="guest-tooltip-section">
          <span className="guest-tooltip-label">Friends elsewhere</span>
          {[...detail.friendsElsewhere.entries()]
            .sort(([a], [b]) => a - b)
            .map(([tableNum, friends]) => (
              <div key={tableNum} className="guest-tooltip-row">
                <em>Table {tableNum + 1} — </em>
                {friends.map((f, i) => (
                  <span key={f.name}>
                    {i > 0 && ", "}
                    <strong>{f.name}</strong>
                  </span>
                ))}
              </div>
            ))}
        </div>
      )}

      {detail && !hasFriendsHere && !hasFriendsElsewhere && !hasConflicts && (
        <div className="guest-tooltip-section">
          <span className="guest-tooltip-empty">No connections — enjoying the party!</span>
        </div>
      )}
    </div>,
    document.body,
  );
}
