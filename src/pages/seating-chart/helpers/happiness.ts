import type { Connection } from "../../../types";
import {
  affinityForValue,
  KEEP_APART_VALUE,
} from "../../../components/form/config/relationship-tiers";

export type HappinessTone = "great" | "good" | "ok" | "bad" | "neutral";

export interface TableHappiness {
  score: number;
  label: string;
  tone: HappinessTone;
  /** Co-seated "must not sit together" pairs at this table. */
  conflicts: number;
}

export interface GuestHappiness {
  score: number;
  tone: HappinessTone;
}

export interface HappinessReport {
  /** guestId → personal happiness. */
  guest: Map<string, GuestHappiness>;
  /** Per-table aggregate, parallel to the input tables. */
  table: TableHappiness[];
  /** Average happiness across all seated guests. */
  overall: number;
}

export const HAPPINESS_COLORS: Record<HappinessTone, string> = {
  great: "#4ad6a0",
  good: "#6ee7b7",
  ok: "#f7c948",
  bad: "#ff5d6c",
  neutral: "#717b8c",
};

/** Score for a guest with no relationships at all — they have no preference. */
const NEUTRAL_SCORE = 80;

/** Looks up a guest's personal FOMO multiplier (1 = normal). */
export type MultLookup = (guestId: string) => number;

export function makeMultLookup(
  guests: { id: string; fomo?: number }[],
): MultLookup {
  const personal = new Map(guests.map((g) => [g.id, g.fomo ?? 1] as const));
  return (id) => personal.get(id) ?? 1;
}

/**
 * Personal FOMO scales a guest's "shortfall" (1 − base happiness): a clingy
 * guest (mult > 1) feels imperfect seating more keenly, a chill guest (mult < 1)
 * shrugs it off. Returns a shortfall in [0, ∞) — the optimiser penalises a big
 * shortfall hard, so clingy guests are protected and chill guests yield first.
 */
export function personalShortfall(baseFelt: number, mult: number): number {
  return mult * (1 - baseFelt);
}

function classify(score: number, conflicts: number): {
  tone: HappinessTone;
  label: string;
} {
  if (conflicts > 0) return { tone: "bad", label: "Tense" };
  if (score >= 85) return { tone: "great", label: "Delighted" };
  if (score >= 65) return { tone: "good", label: "Happy" };
  if (score >= 45) return { tone: "ok", label: "Okay" };
  return { tone: "bad", label: "Strained" };
}

/**
 * The felt-happiness curve (0..1) for one person, given:
 *  - withMe   = weight of their friends seated at their own table
 *  - leftOut  = weight of the single biggest cluster of their friends sitting
 *               together at some OTHER table (the gathering they're missing)
 *  - totalW   = total weight of all their friendships
 *  - fomo     = how much being left out matters (0 = ignore it)
 *
 * At fomo 0 this is just "how much of my world is here". As fomo rises, missing
 * a big gathering drives the score down — but it never punishes someone who is
 * actually surrounded by their people (withRatio 1 always scores 1). Because
 * `leftOut` is the *largest single* other cluster, a group split across two
 * tables hurts less than the whole group gathering without you.
 */
export function feltScore(
  withMe: number,
  leftOut: number,
  totalW: number,
  fomo: number,
): number {
  const withRatio = withMe / totalW;
  const excludedRatio = leftOut / totalW;
  return (withRatio + fomo * (1 - excludedRatio)) / (1 + fomo);
}

interface GuestSocial {
  /** Friend weight summed per table index. */
  w: number[];
  /** Conflict-partner count per table index. */
  conf: number[];
  /** Total friend weight (sum of w). */
  total: number;
}

/**
 * Compute felt happiness for every guest, table, and the whole plan in one pass.
 * `taper` shapes closeness weights; `fomo` controls left-out aversion.
 */
export function computeHappiness(
  tables: { guestIds: string[] }[],
  connections: Connection[],
  taper: number,
  globalFomo: number,
  multOf: MultLookup,
  worstCase = false,
): HappinessReport {
  const t = tables.length;
  const tableOf = new Map<string, number>();
  tables.forEach((tbl, i) => tbl.guestIds.forEach((id) => tableOf.set(id, i)));

  const social = new Map<string, GuestSocial>();
  const ensure = (id: string): GuestSocial => {
    let s = social.get(id);
    if (!s) {
      s = { w: new Array(t).fill(0), conf: new Array(t).fill(0), total: 0 };
      social.set(id, s);
    }
    return s;
  };

  for (const c of connections) {
    const ta = tableOf.get(c.source);
    const tb = tableOf.get(c.target);
    if (ta === undefined || tb === undefined) continue;
    if (c.value === KEEP_APART_VALUE) {
      ensure(c.source).conf[tb] += 1;
      ensure(c.target).conf[ta] += 1;
    } else {
      const aff = affinityForValue(c.value, taper);
      const es = ensure(c.source);
      es.w[tb] += aff;
      es.total += aff;
      const et = ensure(c.target);
      et.w[ta] += aff;
      et.total += aff;
    }
  }

  const guest = new Map<string, GuestHappiness>();
  const guestScore = (id: string, tp: number): GuestHappiness => {
    const s = social.get(id);
    const conflictHere = s ? s.conf[tp] : 0;
    let score: number;
    if (!s || s.total <= 0) {
      score = NEUTRAL_SCORE;
    } else {
      const withMe = s.w[tp];
      let leftOut = 0;
      for (let i = 0; i < t; i++) {
        if (i !== tp && s.w[i] > leftOut) leftOut = s.w[i];
      }
      const base = feltScore(withMe, leftOut, s.total, globalFomo);
      const shortfall = personalShortfall(base, multOf(id));
      score = Math.round(100 * Math.max(0, 1 - Math.min(1, shortfall)));
    }
    if (conflictHere > 0) {
      return { score: Math.min(score, 15), tone: "bad" };
    }
    if (!s || s.total <= 0) return { score, tone: "neutral" };
    return { score, tone: classify(score, 0).tone };
  };

  const table: TableHappiness[] = tables.map((tbl, i) => {
    let sum = 0;
    let min = Infinity;
    let conflicts = 0;
    for (const id of tbl.guestIds) {
      const gh = guestScore(id, i);
      guest.set(id, gh);
      sum += gh.score;
      if (gh.score < min) min = gh.score;
      const s = social.get(id);
      if (s) conflicts += s.conf[i];
    }
    conflicts = Math.round(conflicts / 2); // each conflict counted from both sides
    const score = tbl.guestIds.length
      ? worstCase
        ? min
        : Math.round(sum / tbl.guestIds.length)
      : NEUTRAL_SCORE;
    const { tone, label } = classify(score, conflicts);
    return { score, label, tone, conflicts };
  });

  let total = 0;
  let count = 0;
  let overallMin = Infinity;
  for (const gh of guest.values()) {
    total += gh.score;
    count++;
    if (gh.score < overallMin) overallMin = gh.score;
  }
  const overall = count
    ? worstCase
      ? overallMin
      : Math.round(total / count)
    : 0;

  return { guest, table, overall };
}
