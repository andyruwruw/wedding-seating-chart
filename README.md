# Wedding Seating Chart

A dark-mode, Obsidian-style graph app for planning wedding seating. Enter your
invite list, draw weighted "closeness" connections between guests, and generate a
best-effort seating chart that keeps close people together and "must not sit
together" pairs apart.

## Run

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
```

## How it works

- **Guests** — add invitees in the left panel; select one to edit their connections.
- **Connections** — link two guests and pick a closeness tier. Tiers are named
  (e.g. *Best friend*, *Sibling*, *Acquaintance*) but map to numeric weights —
  **lower = closer**. Several labels can share a weight. There's a special
  **🚫 Must not sit together** tier that the solver treats as a hard constraint.
- **Graph** — a force-directed view of the relationships. Closer ties render
  thicker and brighter; keep-apart ties are dashed red. Drag nodes to pin them.
- **Seating** — choose *seats per table* or *number of tables*, then **Generate**.
  The solver greedily clusters by affinity, then hill-climbs pairwise swaps to
  improve the result. **↻** re-rolls a different arrangement. Generated tables
  tint their guests' nodes in the graph.

## Import / Export

- **JSON** — full project snapshot (`guests` + `connections`).
- **CSV** — edge list `Source,Target,Relationship` using guest names and tier
  labels. Importing auto-creates guests; standalone guests appear as `Name,,`.

## Live sync to Google Sheets (optional)

The right-hand **Google Sheets** panel can mirror your plan to a spreadsheet,
updating live as you edit. It's a no-backend, in-browser OAuth flow — your data
goes straight from the browser to your own Google account.

1. Create a Google OAuth Client ID (see `.env.example` for the step-by-step).
2. Copy `.env.example` to `.env.local`, paste in your `VITE_GOOGLE_CLIENT_ID`,
   and restart the dev server.
3. In the app: **Connect Google** → **Create new spreadsheet** (or paste an
   existing Sheet URL/ID to attach it).

It writes three tabs — **Seating** (tables, seats, happiness), **Guests**, and
**Connections** — and re-syncs ~1.5s after any change while *Live sync* is on.
Without a Client ID, the panel just shows setup instructions; everything else in
the app works unchanged.

## Structure

```
src/
├── components/    # reusable: form/, graph/, layout/
├── pages/seating-chart/   # the page, its components, config, helpers (solver, csv, json)
├── store/         # zustand global state
└── types/
```

Edit the relationship tiers in
`src/components/form/config/relationship-tiers.ts` — everything else (dropdowns,
graph styling, solver weights) derives from that list.
