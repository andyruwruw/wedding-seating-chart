import type {
  Connection,
  Guest,
  SeatingConfig,
  SeatingResult,
  SeatingTable,
} from "../../../types";
import {
  affinityForValue,
  KEEP_APART_VALUE,
  KEEP_TOGETHER_LABELS,
} from "../../../components/form/config/relationship-tiers";

/** Penalty applied to the score for each co-seated "must not sit together" pair. */
const CONFLICT_PENALTY = 10_000;

/** Deterministic PRNG so a given seed always reproduces the same chart. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function orderedKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Decide each table's seat count (i.e. how many guests it holds).
 *
 * - `autoTables` derives the table count to fit everyone at `seatsPerTable`.
 * - `allowEmptySeats` fills tables to capacity (last table partial); otherwise
 *   guests are spread evenly so no table is more empty than another.
 * - If there genuinely aren't enough seats, the overflow is spread across tables.
 */
export function computeCapacities(n: number, config: SeatingConfig): number[] {
  if (n <= 0) return [];
  const seats = Math.max(1, Math.floor(config.seatsPerTable));
  const tableCount = config.autoTables
    ? Math.max(1, Math.ceil(n / seats))
    : Math.min(Math.max(1, Math.floor(config.tableCount)), n);

  if (config.allowEmptySeats) {
    // Fill tables to `seats` in order; the last used table holds the remainder.
    const caps: number[] = [];
    let placed = 0;
    for (let i = 0; i < tableCount && placed < n; i++) {
      const take = Math.min(seats, n - placed);
      caps.push(take);
      placed += take;
    }
    if (caps.length === 0) caps.push(n);
    // Not enough tables × seats for everyone — spread the overflow.
    for (let i = 0; placed < n; i++, placed++) caps[i % caps.length] += 1;
    return caps;
  }

  // Balanced: even spread across all tables, minimising empty seats per table.
  const base = Math.floor(n / tableCount);
  const remainder = n % tableCount;
  return Array.from({ length: tableCount }, (_, i) =>
    i < remainder ? base + 1 : base,
  );
}

const EFFORT_ITERATIONS: Record<SeatingConfig["effort"], number> = {
  quick: 10,
  balanced: 30,
  thorough: 80,
};

interface Affinities {
  /** affinity[a][b] = closeness pull between two guest ids (0 if none/keep-apart). */
  get: (a: string, b: string) => number;
  conflict: (a: string, b: string) => boolean;
}

function buildAffinities(connections: Connection[]): Affinities {
  const aff = new Map<string, number>();
  const conflicts = new Set<string>();
  for (const c of connections) {
    const key = orderedKey(c.source, c.target);
    if (c.value === KEEP_APART_VALUE) {
      conflicts.add(key);
      aff.set(key, 0);
    } else {
      aff.set(key, affinityForValue(c.value));
    }
  }
  return {
    get: (a, b) => aff.get(orderedKey(a, b)) ?? 0,
    conflict: (a, b) => conflicts.has(orderedKey(a, b)),
  };
}

/** Score of one table: sum of pairwise affinity minus penalty per co-seated conflict. */
function tableScore(members: string[], aff: Affinities): number {
  let score = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      score += aff.get(members[i], members[j]);
      if (aff.conflict(members[i], members[j])) score -= CONFLICT_PENALTY;
    }
  }
  return score;
}

/**
 * Group guests into inseparable "units" via union-find over keep-together
 * connections (e.g. couples). Each returned unit is a list of guest ids that
 * must always share a table; most units are a single guest.
 */
function buildUnits(ids: string[], connections: Connection[]): string[][] {
  const parent = new Map(ids.map((id) => [id, id] as const));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // Path compression.
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const c of connections) {
    if (
      KEEP_TOGETHER_LABELS.has(c.label) &&
      parent.has(c.source) &&
      parent.has(c.target)
    ) {
      union(c.source, c.target);
    }
  }

  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const root = find(id);
    const members = groups.get(root);
    if (members) members.push(id);
    else groups.set(root, [id]);
  }
  return [...groups.values()];
}

/**
 * Best-effort seating optimiser.
 *
 * Works on whole **units** (keep-together groups such as couples) so partners
 * are never split. Strategy: greedy affinity-based filling of units into tables,
 * then hill-climbing swaps of equal-sized units between tables (which keeps both
 * tables balanced and units intact). Hard "must not sit together" pairs are
 * pushed apart via a large score penalty; any that survive are reported.
 */
export function solveSeating(
  guests: Guest[],
  connections: Connection[],
  config: SeatingConfig,
  seed: number,
): SeatingResult {
  const rng = mulberry32(seed);
  const ids = guests.map((g) => g.id);
  const n = ids.length;

  if (n === 0) {
    return { tables: [], score: 0, violations: [], seed };
  }

  const aff = buildAffinities(connections);
  const capacities = computeCapacities(n, config);
  const tableCount = capacities.length;

  // Inseparable units (couples, etc.), keyed by a stable representative id.
  const unitList = buildUnits(ids, connections);
  const unitMembers = new Map(unitList.map((m) => [m[0], m] as const));
  const sizeOf = (root: string) => unitMembers.get(root)!.length;

  // Total affinity from each unit's members to everyone outside the unit
  // (used to seed empty tables with the most socially-connected unit).
  const unitDegree = new Map<string, number>();
  for (const [root, members] of unitMembers) {
    const inUnit = new Set(members);
    let degree = 0;
    for (const m of members) {
      for (const other of ids) {
        if (!inUnit.has(other)) degree += aff.get(m, other);
      }
    }
    unitDegree.set(root, degree);
  }

  const affinityToTable = (root: string, seated: string[]): number => {
    let sum = 0;
    for (const m of unitMembers.get(root)!) {
      for (const s of seated) sum += aff.get(m, s);
    }
    return sum;
  };
  const conflictsWithTable = (root: string, seated: string[]): number => {
    let count = 0;
    for (const m of unitMembers.get(root)!) {
      for (const s of seated) if (aff.conflict(m, s)) count++;
    }
    return count;
  };

  // --- Greedy: grow each table by adding the best-fitting whole unit.
  const unassigned = new Set(unitMembers.keys());
  const tableUnits: string[][] = capacities.map(() => []);
  const tableMembers: string[][] = capacities.map(() => []);

  for (let t = 0; t < tableCount; t++) {
    if (unassigned.size === 0) break;
    const cap = capacities[t];

    while (tableMembers[t].length < cap && unassigned.size > 0) {
      const remaining = cap - tableMembers[t].length;
      let bestRoot = "";
      let bestScore = -Infinity;
      let bestConflicts = Infinity;

      for (const root of unassigned) {
        if (sizeOf(root) > remaining) continue; // wouldn't fit this table
        const conflicts = conflictsWithTable(root, tableMembers[t]);
        const pull =
          tableMembers[t].length > 0
            ? affinityToTable(root, tableMembers[t])
            : unitDegree.get(root)!;
        const s = pull + rng() * 0.001;
        if (
          conflicts < bestConflicts ||
          (conflicts === bestConflicts && s > bestScore)
        ) {
          bestConflicts = conflicts;
          bestScore = s;
          bestRoot = root;
        }
      }

      if (bestRoot === "") break; // nothing fits the remaining seats
      tableUnits[t].push(bestRoot);
      tableMembers[t].push(...unitMembers.get(bestRoot)!);
      unassigned.delete(bestRoot);
    }
  }

  // Any units that couldn't fit a table cleanly: place each (intact) into the
  // currently-emptiest table. Keeps partners together over perfect balance.
  for (const root of [...unassigned]) {
    let target = 0;
    for (let t = 1; t < tableCount; t++) {
      if (tableMembers[t].length < tableMembers[target].length) target = t;
    }
    tableUnits[target].push(root);
    tableMembers[target].push(...unitMembers.get(root)!);
    unassigned.delete(root);
  }

  // --- Hill-climb: swap equal-sized units between tables when it raises the
  // total score. Equal sizes keep both tables balanced and never split a unit.
  const iterations = Math.min(
    80_000,
    Math.max(2_000, n * n * EFFORT_ITERATIONS[config.effort]),
  );
  for (let iter = 0; iter < iterations; iter++) {
    const a = Math.floor(rng() * tableCount);
    const b = Math.floor(rng() * tableCount);
    if (a === b || tableUnits[a].length === 0 || tableUnits[b].length === 0) {
      continue;
    }
    const ia = Math.floor(rng() * tableUnits[a].length);
    const ib = Math.floor(rng() * tableUnits[b].length);
    const ra = tableUnits[a][ia];
    const rb = tableUnits[b][ib];
    if (sizeOf(ra) !== sizeOf(rb)) continue;

    const ma = new Set(unitMembers.get(ra)!);
    const mb = new Set(unitMembers.get(rb)!);
    const newA = tableMembers[a]
      .filter((id) => !ma.has(id))
      .concat(unitMembers.get(rb)!);
    const newB = tableMembers[b]
      .filter((id) => !mb.has(id))
      .concat(unitMembers.get(ra)!);

    const before =
      tableScore(tableMembers[a], aff) + tableScore(tableMembers[b], aff);
    const after = tableScore(newA, aff) + tableScore(newB, aff);

    if (after > before) {
      tableMembers[a] = newA;
      tableMembers[b] = newB;
      tableUnits[a][ia] = rb;
      tableUnits[b][ib] = ra;
    }
  }

  // --- Collect results + violations.
  const nameOf = new Map(guests.map((g) => [g.id, g.name] as const));
  const violations: string[] = [];
  let total = 0;
  for (const members of tableMembers) {
    total += tableScore(members, aff);
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (aff.conflict(members[i], members[j])) {
          violations.push(
            `${nameOf.get(members[i])} and ${nameOf.get(members[j])} are seated together but marked "must not sit together".`,
          );
        }
      }
    }
  }

  const resultTables: SeatingTable[] = tableMembers.map((guestIds, i) => ({
    id: `table-${i + 1}`,
    guestIds,
  }));

  return { tables: resultTables, score: total, violations, seed };
}
