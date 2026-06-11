import type { Connection } from "../../../types";
import {
  affinityForValue,
  KEEP_APART_VALUE,
} from "../../../components/form/config/relationship-tiers";

export type HappinessTone = "great" | "good" | "ok" | "bad" | "neutral";

export interface TableHappiness {
  /** 0–100 heuristic: how well this table's seating satisfies its guests. */
  score: number;
  label: string;
  tone: HappinessTone;
  /** Connected (non-conflict) pairs actually seated together. */
  closeTies: number;
  /** Co-seated "must not sit together" pairs. */
  conflicts: number;
}

export const HAPPINESS_COLORS: Record<HappinessTone, string> = {
  great: "#4ad6a0",
  good: "#6ee7b7",
  ok: "#f7c948",
  bad: "#ff5d6c",
  neutral: "#717b8c",
};

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
 * Heuristic "happiness" for one table.
 *
 * Idea: compare the closeness actually realised at the table against the best
 * each guest could hope for at a table of this size (their strongest k−1 ties).
 * That keeps the score fair regardless of table size, and unconnected guests
 * (who have no preference) neither help nor hurt. Co-seated "keep apart" pairs
 * apply a heavy penalty.
 */
export function tableHappiness(
  guestIds: string[],
  connections: Connection[],
): TableHappiness {
  const members = new Set(guestIds);
  const k = guestIds.length;

  if (k <= 1) {
    return { score: 80, label: "Neutral", tone: "neutral", closeTies: 0, conflicts: 0 };
  }

  // Per-member affinities of ALL their positive ties (used for the ideal ceiling).
  const memberAffinities = new Map<string, number[]>();
  const push = (id: string, aff: number) => {
    const list = memberAffinities.get(id);
    if (list) list.push(aff);
    else memberAffinities.set(id, [aff]);
  };

  let realized = 0;
  let closeTies = 0;
  let conflicts = 0;

  for (const c of connections) {
    const sIn = members.has(c.source);
    const tIn = members.has(c.target);
    if (!sIn && !tIn) continue;

    if (c.value === KEEP_APART_VALUE) {
      if (sIn && tIn) conflicts++;
      continue;
    }

    const aff = affinityForValue(c.value);
    if (sIn) push(c.source, aff);
    if (tIn) push(c.target, aff);
    if (sIn && tIn) {
      realized += aff;
      closeTies++;
    }
  }

  // Best achievable: each guest seated with their strongest (k−1) ties.
  let ideal = 0;
  for (const affs of memberAffinities.values()) {
    affs.sort((a, b) => b - a);
    for (let i = 0; i < Math.min(k - 1, affs.length); i++) ideal += affs[i];
  }
  ideal /= 2; // each pair was counted from both endpoints

  let score: number;
  if (ideal <= 0) {
    // Nobody at this table has any known preference.
    score = 80;
  } else {
    score = (realized / ideal) * 100;
  }
  score -= conflicts * 40;
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (ideal <= 0 && conflicts === 0) {
    return { score, label: "Neutral", tone: "neutral", closeTies, conflicts };
  }

  const { tone, label } = classify(score, conflicts);
  return { score, label, tone, closeTies, conflicts };
}

/** Size-weighted average happiness across all tables. */
export function overallHappiness(
  tables: { guestIds: string[] }[],
  connections: Connection[],
): number {
  let weighted = 0;
  let total = 0;
  for (const t of tables) {
    const h = tableHappiness(t.guestIds, connections);
    weighted += h.score * t.guestIds.length;
    total += t.guestIds.length;
  }
  return total === 0 ? 0 : Math.round(weighted / total);
}
