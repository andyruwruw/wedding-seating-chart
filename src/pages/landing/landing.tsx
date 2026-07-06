import "../../components/form/form.css";
import "./landing.css";
import { tableColor } from "../seating-chart/config";

const FEATURES = [
  {
    title: "Map who knows who",
    body: "Add every guest, then draw connections between the people who know each other — best friends, rivals, plus-ones, the works.",
  },
  {
    title: "Auto-generate a seating plan",
    body: "One click builds a best-effort table layout that keeps close relationships together and pulls conflicts apart.",
  },
  {
    title: "See happiness at a glance",
    body: "Every table gets a happiness score, with hover tooltips explaining exactly why a guest landed where they did.",
  },
  {
    title: "Sync with Google Sheets",
    body: "Optionally keep your guest list and chart live-synced to a shared spreadsheet your whole planning team can see.",
  },
];

interface LandingProps {
  onStart: () => void;
}

export function Landing({ onStart }: LandingProps) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="landing-brand">Seating Chart</span>
        <button className="btn btn-ghost btn-sm" onClick={onStart}>
          Open planner
        </button>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-graphic" aria-hidden="true">
          <svg viewBox="0 0 320 240" role="presentation">
            <line x1="70" y1="60" x2="160" y2="120" className="hero-edge hero-edge-close" />
            <line x1="160" y1="120" x2="250" y2="70" className="hero-edge hero-edge-close" />
            <line x1="160" y1="120" x2="140" y2="200" className="hero-edge hero-edge-far" />
            <line x1="140" y1="200" x2="230" y2="190" className="hero-edge hero-edge-maybe" />
            <line x1="70" y1="60" x2="230" y2="190" className="hero-edge hero-edge-apart" />
            {[
              { cx: 70, cy: 60, r: 9 },
              { cx: 160, cy: 120, r: 12 },
              { cx: 250, cy: 70, r: 8 },
              { cx: 140, cy: 200, r: 8 },
              { cx: 230, cy: 190, r: 9 },
            ].map((n, i) => (
              <circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill={tableColor(i)} />
            ))}
          </svg>
        </div>

        <h1 className="landing-title">
          Seat every guest without starting a family feud.
        </h1>
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
        <p className="landing-hint">
          Free, private, and runs entirely in your browser.
        </p>
      </section>

      <section className="landing-features">
        {FEATURES.map((f) => (
          <div className="landing-feature" key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

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
