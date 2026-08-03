import { useMemo } from "react";
import "../../components/form/form.css";
import "./landing.css";
import { tableColor } from "../seating-chart/config";
import { GraphNode } from "../../components/graph/graph-node";
import { useForceLayout, type ForceLayoutLink } from "../../components/graph/use-force-layout";
import type { GraphSettings } from "../../types";

type RelLink = ForceLayoutLink & { kind: "close" | "apart" };
interface RelNode {
  id: string;
  r: number;
}

const REL_CENTER = { x: 140, y: 105 };
const REL_MAX_RADIUS = 88;
// Tuned for this graphic's small SVG canvas — same knobs and layout forces
// as the real graph's GraphSettings, just scaled for a handful of nodes
// instead of a full guest list.
const REL_SETTINGS: GraphSettings = {
  centerForce: 0.022,
  repelForce: 4200,
  linkForce: 0.07,
  linkDistance: 55,
};

// A denser hub: one well-connected pair pulling five others in, plus a
// couple sitting off on their own "keep apart" line.
const HERO_NODES: RelNode[] = [
  { id: "h0", r: 8 },
  { id: "h1", r: 12 },
  { id: "h2", r: 9 },
  { id: "h3", r: 11 },
  { id: "h4", r: 7 },
  { id: "h5", r: 8 },
  { id: "h6", r: 7 },
  { id: "h7", r: 9 },
];
const HERO_LINKS: RelLink[] = [
  { source: "h0", target: "h1", kind: "close" },
  { source: "h1", target: "h2", kind: "close" },
  { source: "h1", target: "h3", kind: "close" },
  { source: "h3", target: "h4", kind: "close" },
  { source: "h2", target: "h5", kind: "close" },
  { source: "h3", target: "h7", kind: "close" },
  { source: "h0", target: "h6", kind: "apart", keepApart: true },
];

// A longer chain of two loose clusters bridged together, with two separate
// "keep apart" pairs — a different silhouette from the hero's hub shape.
const MAP_NODES: RelNode[] = [
  { id: "m0", r: 8 },
  { id: "m1", r: 10 },
  { id: "m2", r: 7 },
  { id: "m3", r: 9 },
  { id: "m4", r: 8 },
  { id: "m5", r: 11 },
  { id: "m6", r: 7 },
  { id: "m7", r: 8 },
  { id: "m8", r: 6 },
];
const MAP_LINKS: RelLink[] = [
  { source: "m0", target: "m1", kind: "close" },
  { source: "m1", target: "m2", kind: "close" },
  { source: "m2", target: "m3", kind: "close" },
  { source: "m3", target: "m4", kind: "close" },
  { source: "m4", target: "m5", kind: "close" },
  { source: "m5", target: "m6", kind: "close" },
  { source: "m5", target: "m7", kind: "close" },
  { source: "m0", target: "m8", kind: "apart", keepApart: true },
  { source: "m2", target: "m6", kind: "apart", keepApart: true },
];

function RelationshipGraphic({ nodes, links }: { nodes: RelNode[]; links: RelLink[] }) {
  const nodeIndex = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);
  const positions = useForceLayout(nodes, links, REL_SETTINGS, REL_CENTER, REL_MAX_RADIUS);
  return (
    <svg viewBox="0 0 280 210" role="presentation" className="section-graphic-svg">
      {links.map((link, i) => {
        const a = positions[nodeIndex.get(link.source)!];
        const b = positions[nodeIndex.get(link.target)!];
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className={`rel-edge rel-edge-${link.kind}`}
          />
        );
      })}
      {positions.map((p, i) => (
        <GraphNode key={i} cx={p.x} cy={p.y} r={nodes[i].r} fill={tableColor(i)} />
      ))}
    </svg>
  );
}

function HeroGraphic() {
  return <RelationshipGraphic nodes={HERO_NODES} links={HERO_LINKS} />;
}

function MapGraphic() {
  return <RelationshipGraphic nodes={MAP_NODES} links={MAP_LINKS} />;
}

function seatRing(cx: number, cy: number, r: number, colorStart: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      color: tableColor(colorStart + i),
    };
  });
}

const RING1 = seatRing(88, 100, 46, 0, 5);
const RING2 = seatRing(216, 118, 36, 5, 4);
// Which seats get a chord drawn between them, like the real table view's
// relationship lines — indices are local to each ring's own seat array.
const RING_ZAPS: [number, number][] = [
  [0, 2],
  [1, 3],
];

function TableRing({
  seats,
  cx,
  cy,
  r,
  spinClass,
}: {
  seats: { x: number; y: number; color: string }[];
  cx: number;
  cy: number;
  r: number;
  spinClass: string;
}) {
  return (
    <g className={spinClass} style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <circle cx={cx} cy={cy} r={r} className="table-ring" />
      {RING_ZAPS.filter(([a, b]) => a < seats.length && b < seats.length).map(([a, b], i) => (
        <line
          key={i}
          x1={seats[a].x}
          y1={seats[a].y}
          x2={seats[b].x}
          y2={seats[b].y}
          className="zap-line"
          style={{ animationDelay: `${-i * 0.6}s` }}
        />
      ))}
      {seats.map((s, i) => (
        <GraphNode key={i} cx={s.x} cy={s.y} r={7} fill={s.color} />
      ))}
    </g>
  );
}

function TablesGraphic() {
  return (
    <svg viewBox="0 0 280 210" role="presentation" className="section-graphic-svg">
      <TableRing seats={RING1} cx={88} cy={100} r={46} spinClass="table-spin-cw" />
      <TableRing seats={RING2} cx={216} cy={118} r={36} spinClass="table-spin-ccw" />
    </svg>
  );
}

function HappinessGraphic() {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = 0.86;
  return (
    <svg viewBox="0 0 200 200" role="presentation" className="section-graphic-svg">
      <circle cx="100" cy="100" r={r} className="happiness-ring-bg" />
      <circle
        cx="100"
        cy="100"
        r={r}
        className="happiness-ring-fill"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 100 100)"
      />
      <text x="100" y="97" textAnchor="middle" className="happiness-ring-score">
        92
      </text>
      <text x="100" y="113" textAnchor="middle" className="happiness-ring-label">
        HAPPY
      </text>
    </svg>
  );
}

const SYNC_SEATS = seatRing(222, 90, 26, 0, 5);

function SyncGraphic() {
  return (
    <svg viewBox="0 0 280 180" role="presentation" className="section-graphic-svg">
      <rect x="14" y="20" width="88" height="140" rx="10" className="sync-panel" />
      <line x1="14" y1="52" x2="102" y2="52" className="sync-panel-line" />
      <line x1="14" y1="84" x2="102" y2="84" className="sync-panel-line" />
      <line x1="14" y1="116" x2="102" y2="116" className="sync-panel-line" />
      <line x1="42" y1="20" x2="42" y2="160" className="sync-panel-line" />
      <line x1="72" y1="20" x2="72" y2="160" className="sync-panel-line" />

      <g className="sync-arrow-icon" transform="translate(122 72) scale(1.8)">
        <path d="M3.5 10a6.5 6.5 0 0 1 11-4.6M16.5 10a6.5 6.5 0 0 1-11 4.6" />
        <path d="M14.8 3.4v3.2h-3.2M5.2 16.6v-3.2h3.2" />
      </g>

      <rect x="178" y="20" width="88" height="140" rx="10" className="sync-panel sync-panel-accent" />
      <circle cx="222" cy="90" r="26" className="table-ring" />
      {SYNC_SEATS.map((s, i) => (
        <GraphNode key={i} cx={s.x} cy={s.y} r={6} fill={s.color} />
      ))}
    </svg>
  );
}

const SECTIONS = [
  {
    title: "Map who knows who",
    body: "Add every guest, then draw connections between the people who know each other — best friends, rivals, plus-ones, the works.",
    Graphic: MapGraphic,
  },
  {
    title: "Auto-generate a seating plan",
    body: "One click builds a best-effort table layout that keeps close relationships together and pulls conflicts apart.",
    Graphic: TablesGraphic,
  },
  {
    title: "See happiness at a glance",
    body: "Every table gets a happiness score, with hover tooltips explaining exactly why a guest landed where they did.",
    Graphic: HappinessGraphic,
  },
  {
    title: "Sync with Google Sheets",
    body: "Optionally keep your guest list and chart live-synced to a shared spreadsheet your whole planning team can see.",
    Graphic: SyncGraphic,
  },
];

interface LandingProps {
  onStart: () => void;
}

export function Landing({ onStart }: LandingProps) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <span className="landing-brand">
            <span className="landing-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="4" />
                <circle cx="10" cy="3" r="1.4" fill="white" stroke="none" />
                <circle cx="10" cy="17" r="1.4" fill="white" stroke="none" />
                <circle cx="3" cy="10" r="1.4" fill="white" stroke="none" />
                <circle cx="17" cy="10" r="1.4" fill="white" stroke="none" />
              </svg>
            </span>
            Seating Chart
          </span>
          <button className="btn btn-outline" onClick={onStart}>
            Get Started
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-graphic" aria-hidden="true">
          <HeroGraphic />
        </div>

        <h1 className="landing-title">Seat everyone without a feud.</h1>
        <p className="landing-subtitle">
          Map your wedding guests' relationships on a force graph, then
          generate a happiness-aware seating chart that keeps the right
          people close — and the wrong people apart.
        </p>
        <div className="landing-cta-row">
          <button className="btn btn-primary btn-block" onClick={onStart}>
            Start planning
          </button>
        </div>
      </section>

      <div className="landing-sections">
        {SECTIONS.map((s, i) => (
          <section
            className={`landing-section ${i % 2 === 1 ? "landing-section-reverse" : ""}`}
            key={s.title}
          >
            <div className="landing-section-graphic" aria-hidden="true">
              <s.Graphic />
            </div>
            <div className="landing-section-text">
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </div>
          </section>
        ))}
      </div>

      <footer className="landing-footer">
        <span>Wedding Seating Chart</span>
        <a
          href="https://github.com/andyruwruw/wedding-seating-chart"
          target="_blank"
          rel="noreferrer"
        >
          View on GitHub
        </a>
      </footer>
    </div>
  );
}
