/** The nine D&D alignments on the classic 3×3 law/moral grid. */
export type DndAlignment =
  | "LG" | "NG" | "CG"
  | "LN" | "TN" | "CN"
  | "LE" | "NE" | "CE";

/** A wedding guest / invitee. */
export interface Guest {
  id: string;
  name: string;
  /** Personal FOMO multiplier on the global setting (1 = normal). */
  fomo?: number;
  /** Optional D&D alignment for fun compatibility hints at mixed tables. */
  alignment?: DndAlignment;
}

/**
 * A weighted relationship between two guests.
 * `value` is the relationship-tier weight: lower = closer (1 = best friend).
 * The special value `KEEP_APART_VALUE` (-1) marks a hard "must not sit together"
 * constraint rather than a closeness number.
 * `label` is the exact tier label the user picked — preserved so export keeps the
 * original wording even when several labels share a weight (e.g. Close friend = 2).
 */
export interface Connection {
  source: string; // Guest id
  target: string; // Guest id
  value: number;
  label: string;
  /** Forces the pair to share a table, on top of whatever `label` relationship is set — no effect on happiness/fomo scoring. */
  pinned?: boolean;
  /** Extra affinity pull (a tier value, lower = stronger) stacked on top of the relationship — counts toward happiness but can never trigger the fomo penalty. */
  matchBoost?: number;
}

/** Tunable d3-force parameters for the relationship graph layout. */
export interface GraphSettings {
  /** Pull toward the canvas center (0–1). */
  centerForce: number;
  /** Node-to-node repulsion magnitude (applied as a negative charge). */
  repelForce: number;
  /** How rigidly links pull connected nodes together (0–1.5). */
  linkForce: number;
  /** Resting length of links, in graph units. */
  linkDistance: number;
}

/** How hard the optimiser works (trades runtime for a better arrangement). */
export type OptimizationEffort = "quick" | "balanced" | "thorough";

export interface SeatingConfig {
  /** Physical seats available at each table. */
  seatsPerTable: number;
  /** Number of tables (ignored when `autoTables` is on). */
  tableCount: number;
  /** Derive the table count to exactly fit everyone at `seatsPerTable`. */
  autoTables: boolean;
  /**
   * true  → fill tables to capacity (the last table may have empty seats).
   * false → spread guests evenly across tables (minimise empty seats / table).
   */
  allowEmptySeats: boolean;
  effort: OptimizationEffort;
  /**
   * How sharply closeness is weighted: each tier is `taper`× the next one.
   * Higher = strongly favour the closest ties; 1 = treat all ties equally.
   */
  taper: number;
  /**
   * Left-out aversion. 0 = only reward seating friends together; higher = also
   * penalise leaving someone out of a gathering of their people.
   */
  fomo: number;
  /**
   * Score a table (and the overall) by its least-happy guest instead of the
   * average — surfaces who's worst-off rather than letting happy guests mask them.
   */
  worstCaseScore: boolean;
  /**
   * How hard to keep friend-groups together. Rewards each guest for the share of
   * their friends at their table, so cliques resist being split. 0 = off.
   */
  cohesion: number;
  /**
   * How much D&D alignment compatibility influences seating of disconnected guests.
   * 0 = ignored; higher values increasingly prefer compatible strangers together.
   */
  alignmentWeight: number;
  /**
   * Invert the objective: actively seat enemies together, split friends apart.
   * For maximum chaos — diagnostic or entertainment use only.
   */
  worstBehavior: boolean;
}

/** One table in a generated seating chart. */
export interface SeatingTable {
  id: string;
  guestIds: string[];
  /** Locked tables keep this exact guest list across every regeneration. */
  locked?: boolean;
}

export interface SeatingResult {
  tables: SeatingTable[];
  /** Total intra-table affinity — higher is better. */
  score: number;
  /** Human-readable problems the solver could not avoid. */
  violations: string[];
  /** Seed used to produce this result (for reproducibility / regenerate). */
  seed: number;
}

/** Serialisable snapshot used for JSON import/export. */
export interface ProjectSnapshot {
  guests: Guest[];
  connections: Connection[];
  /** Locked table groups (by guest id), when the source carries them. */
  lockedTables?: SeatingTable[];
}
