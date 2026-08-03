import { Fragment, useEffect } from "react";
import { Modal } from "../../../components/layout/modal";
import { useAppStore } from "../../../store/use-app-store";
import { ALIGNMENT_INFO } from "../helpers/alignment";
import type { DndAlignment } from "../../../types";

const LAW_LABELS = ["Lawful", "Neutral", "Chaotic"];
const MORAL_LABELS = ["Good", "Neutral", "Evil"];

const GRID: DndAlignment[][] = [
  ["LG", "NG", "CG"],
  ["LN", "TN", "CN"],
  ["LE", "NE", "CE"],
];

interface AlignmentDialogProps {
  guestId: string;
  guestName: string;
  alignment: DndAlignment | undefined;
  onClose: () => void;
}

export function AlignmentDialog({ guestId, guestName, alignment, onClose }: AlignmentDialogProps) {
  const setGuestAlignment = useAppStore((s) => s.setGuestAlignment);
  const setGraphColorMode = useAppStore((s) => s.setGraphColorMode);

  // Color the graph by alignment while this is open, so the pick is legible
  // against everyone else's alignment; revert once it closes.
  useEffect(() => {
    setGraphColorMode("alignment");
    return () => setGraphColorMode("table");
  }, [setGraphColorMode]);

  return (
    <Modal title={`${guestName}'s alignment`} onClose={onClose}>
      <div className="alignment-tab">
        <p className="alignment-tab-hint">
          Pick {guestName}'s D&D alignment — it's used to suggest table harmony for guests with no
          direct connection.
        </p>

        <div className="alignment-grid-wrap">
          <div />
          {LAW_LABELS.map((l) => (
            <span key={l} className="alignment-axis-label">{l}</span>
          ))}
          {GRID.map((row, ri) => (
            <Fragment key={`row-${ri}`}>
              <span className="alignment-axis-label alignment-axis-row">
                {MORAL_LABELS[ri]}
              </span>
              {row.map((al) => {
                const info = ALIGNMENT_INFO[al];
                const isActive = alignment === al;
                return (
                  <button
                    key={al}
                    className={`alignment-cell${isActive ? " alignment-cell-active" : ""}`}
                    style={{ "--al-color": info.color } as React.CSSProperties}
                    onClick={() => setGuestAlignment(guestId, isActive ? undefined : al)}
                    title={info.label}
                  >
                    <span className="alignment-cell-code">{al}</span>
                    <span className="alignment-cell-name">
                      {info.label.split(" ").slice(1).join(" ")}
                    </span>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>

        {alignment ? (
          <div className="alignment-current">
            <span
              className="alignment-current-badge"
              style={{
                color: ALIGNMENT_INFO[alignment].color,
                borderColor: `${ALIGNMENT_INFO[alignment].color}66`,
              }}
            >
              {alignment} · {ALIGNMENT_INFO[alignment].label}
            </span>
            <button className="alignment-clear" onClick={() => setGuestAlignment(guestId, undefined)}>
              Clear
            </button>
          </div>
        ) : (
          <p className="empty-hint" style={{ textAlign: "center" }}>No alignment set</p>
        )}
      </div>
    </Modal>
  );
}
