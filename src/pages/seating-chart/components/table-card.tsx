import { HAPPINESS_COLORS, type TableHappiness } from "../helpers/happiness";

interface TableCardProps {
  index: number;
  color: string;
  guestNames: string[];
  happiness: TableHappiness;
}

export function TableCard({
  index,
  color,
  guestNames,
  happiness,
}: TableCardProps) {
  const toneColor = HAPPINESS_COLORS[happiness.tone];
  return (
    <div className="table-card" style={{ borderLeftColor: color }}>
      <div className="table-card-head">
        <span className="table-dot" style={{ background: color }} />
        <span className="table-card-title">Table {index + 1}</span>
        <span
          className="happy-badge"
          style={{ color: toneColor, borderColor: toneColor }}
        >
          {happiness.label} · {happiness.score}
        </span>
        <span className="table-card-count">{guestNames.length}</span>
      </div>
      <div className="table-card-guests">
        {guestNames.map((n) => (
          <span key={n} className="table-guest">
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}
