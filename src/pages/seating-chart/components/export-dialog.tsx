import { Modal } from "../../../components/layout/modal";
import { useAppStore } from "../../../store/use-app-store";
import { snapshotToCsv } from "../helpers/csv";
import { snapshotToJson } from "../helpers/json";
import { downloadText } from "../helpers";

interface ExportDialogProps {
  onClose: () => void;
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const guests = useAppStore((s) => s.guests);
  const connections = useAppStore((s) => s.connections);
  const empty = guests.length === 0;

  const exportCsv = () => {
    downloadText("seating-chart.csv", snapshotToCsv(guests, connections), "text/csv");
    onClose();
  };

  const exportJson = () => {
    downloadText(
      "seating-chart.json",
      snapshotToJson({ guests, connections }),
      "application/json",
    );
    onClose();
  };

  return (
    <Modal
      title="Export"
      subtitle={`${guests.length} guests · ${connections.length} connections`}
      onClose={onClose}
    >
      <div className="choice-list">
        <button className="choice-card" onClick={exportCsv} disabled={empty}>
          <div className="choice-card-title">
            <span>CSV spreadsheet</span>
            <span className="choice-tag">.csv</span>
          </div>
          <p>
            An edge list of relationships (Source, Target, Relationship). Opens in
            Excel or Google Sheets, and can be re-imported here.
          </p>
        </button>

        <button className="choice-card" onClick={exportJson} disabled={empty}>
          <div className="choice-card-title">
            <span>JSON backup</span>
            <span className="choice-tag">.json</span>
          </div>
          <p>
            The complete project — every guest and connection — for a perfect
            round-trip restore.
          </p>
        </button>
      </div>

      {empty && (
        <p className="empty-hint">Add some guests before exporting.</p>
      )}
    </Modal>
  );
}
