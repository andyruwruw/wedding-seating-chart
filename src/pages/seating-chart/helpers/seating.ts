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
import { feltScore, makeMultLookup, personalShortfall } from "./happiness";

/**
 * Penalty per co-seated "must not sit together" pair. Felt-happiness per guest
 * is at most 1, so this stays a hard rule no matter the guest count.
 */
const CONFLICT_PENALTY = 1_000_000;

/** Felt score for a guest with no relationships — placement-independent. */
const NEUTRAL_FELT = 0.8;

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

/** Decide each table's seat count. See SeatingConfig for the option semantics. */
export function computeCapacities(n: number, config: SeatingConfig): number[] {
  if (n <= 0) return [];
  const seats = Math.max(1, Math.floor(config.seatsPerTable));
  const tableCount = config.autoTables
    ? Math.max(1, Math.ceil(n / seats))
    : Math.min(Math.max(1, Math.floor(config.tableCount)), n);

  if (config.allowEmptySeats) {
    const caps: number[] = [];
    let placed = 0;
    for (let i = 0; i < tableCount && placed < n; i++) {
      const take = Math.min(seats, n - placed);
      caps.push(take);
      placed += take;
    }
    if (caps.length === 0) caps.push(n);
    for (let i = 0; placed < n; i++, placed++) caps[i % caps.length] += 1;
    return caps;
  }

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
  get: (a: string, b: string) => number;
  conflict: (a: string, b: string) => boolean;
}

function buildAffinities(connections: Connection[], taper: number): Affinities {
  const aff = new Map<string, number>();
  const conflicts = new Set<string>();
  for (const c of connections) {
    const key = orderedKey(c.source, c.target);
    if (c.value === KEEP_APART_VALUE) {
      conflicts.add(key);
      aff.set(key, 0);
    } else {
      aff.set(key, affinityForValue(c.value, taper));
    }
  }
  return {
    get: (a, b) => aff.get(orderedKey(a, b)) ?? 0,
    conflict: (a, b) => conflicts.has(orderedKey(a, b)),
  };
}

/** Union-find keep-together groups (couples, etc.) into inseparable units. */
function buildUnits(ids: string[], connections: Connection[]): string[][] {
  const parent = new Map(ids.map((id) => [id, id] as const));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  for (const c of connections) {
    if (
      KEEP_TOGETHER_LABELS.has(c.label) &&
      parent.has(c.source) &&
      parent.has(c.target)
    ) {
      const ra = find(c.source);
      const rb = find(c.target);
      if (ra !== rb) parent.set(ra, rb);
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
 * Objective: maximise the sum of every guest's *felt happiness* — how much of
 * their world is at their table, minus how left-out they feel from the biggest
 * gathering of their people happening elsewhere (weighted by `fomo`). Keep-apart
 * is a hard penalty; keep-together pairs (couples) move as one unit.
 *
 * Method: an affinity-greedy seed, then hill-climbing swaps of equal-sized units
 * between tables, evaluated incrementally (only the people whose social picture
 * changed are re-scored), keeping any swap that raises the total.
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
  if (n === 0) return { tables: [], score: 0, violations: [], seed };

  const { taper, fomo: globalFomo, cohesion } = config;
  const multOf = makeMultLookup(guests);
  const aff = buildAffinities(connections, taper);
  const capacities = computeCapacities(n, config);
  const tableCount = capacities.length;

  // --- Per-guest social graph (positive friends + conflict partners).
  const friends = new Map<string, Array<[string, number]>>();
  const conflictPartners = new Map<string, string[]>();
  const totalW = new Map<string, number>();
  for (const id of ids) {
    friends.set(id, []);
    conflictPartners.set(id, []);
    totalW.set(id, 0);
  }
  for (const c of connections) {
    if (!friends.has(c.source) || !friends.has(c.target)) continue;
    if (c.value === KEEP_APART_VALUE) {
      conflictPartners.get(c.source)!.push(c.target);
      conflictPartners.get(c.target)!.push(c.source);
    } else {
      const a = affinityForValue(c.value, taper);
      friends.get(c.source)!.push([c.target, a]);
      friends.get(c.target)!.push([c.source, a]);
      totalW.set(c.source, totalW.get(c.source)! + a);
      totalW.set(c.target, totalW.get(c.target)! + a);
    }
  }

  // --- Inseparable units.
  const unitList = buildUnits(ids, connections);
  const unitMembers = new Map(unitList.map((m) => [m[0], m] as const));
  const sizeOf = (root: string) => unitMembers.get(root)!.length;

  const unitDegree = new Map<string, number>();
  for (const [root, members] of unitMembers) {
    const inUnit = new Set(members);
    let degree = 0;
    for (const m of members) {
      for (const other of ids) if (!inUnit.has(other)) degree += aff.get(m, other);
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

  // --- Greedy seed: grow each table by the best-fitting whole unit.
  const unassigned = new Set(unitMembers.keys());
  const tableUnits: string[][] = capacities.map(() => []);
  const tableMembers: string[][] = capacities.map(() => []);

  for (let tbl = 0; tbl < tableCount; tbl++) {
    if (unassigned.size === 0) break;
    const cap = capacities[tbl];
    while (tableMembers[tbl].length < cap && unassigned.size > 0) {
      const remaining = cap - tableMembers[tbl].length;
      let bestRoot = "";
      let bestScore = -Infinity;
      let bestConflicts = Infinity;
      for (const root of unassigned) {
        if (sizeOf(root) > remaining) continue;
        const conflicts = conflictsWithTable(root, tableMembers[tbl]);
        const pull =
          tableMembers[tbl].length > 0
            ? affinityToTable(root, tableMembers[tbl])
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
      if (bestRoot === "") break;
      tableUnits[tbl].push(bestRoot);
      tableMembers[tbl].push(...unitMembers.get(bestRoot)!);
      unassigned.delete(bestRoot);
    }
  }
  for (const root of [...unassigned]) {
    let target = 0;
    for (let tbl = 1; tbl < tableCount; tbl++) {
      if (tableMembers[tbl].length < tableMembers[target].length) target = tbl;
    }
    tableUnits[target].push(root);
    tableMembers[target].push(...unitMembers.get(root)!);
    unassigned.delete(root);
  }

  // --- Incremental felt-happiness state.
  const tableOf = new Map<string, number>();
  tableMembers.forEach((members, tbl) =>
    members.forEach((id) => tableOf.set(id, tbl)),
  );
  // friend weight + conflict count per table, per guest.
  const fwt = new Map<string, number[]>();
  const cwt = new Map<string, number[]>();
  for (const id of ids) {
    const w = new Array(tableCount).fill(0);
    for (const [f, a] of friends.get(id)!) w[tableOf.get(f)!] += a;
    fwt.set(id, w);
    const cf = new Array(tableCount).fill(0);
    for (const c of conflictPartners.get(id)!) cf[tableOf.get(c)!] += 1;
    cwt.set(id, cf);
  }

  // Per-person objective: minimise each guest's "shortfall" (1 − felt) raised to
  // a convex power that grows with their (personal × global) FOMO. A few badly-
  // left-out guests cost more than many mildly-imperfect ones, so the optimiser
  // refuses to sacrifice one person to please several others — and a clingy guest
  // is protected harder while a chill guest is the first the solver will move.
  const objOf = (id: string): number => {
    const tp = tableOf.get(id)!;
    const tw = totalW.get(id)!;
    let term: number;
    if (tw > 0) {
      const w = fwt.get(id)!;
      const withMe = w[tp];
      let leftOut = 0;
      for (let i = 0; i < tableCount; i++) {
        if (i !== tp && w[i] > leftOut) leftOut = w[i];
      }
      const felt = feltScore(withMe, leftOut, tw, globalFomo);
      const shortfall = personalShortfall(felt, multOf(id));
      // Fairness (avoid leaving anyone out) plus a group-cohesion reward for the
      // share of one's friends at the table (keeps cliques together).
      term =
        -Math.pow(shortfall, 1 + globalFomo) + cohesion * (withMe / tw);
    } else {
      const shortfall = personalShortfall(NEUTRAL_FELT, multOf(id));
      term = -Math.pow(shortfall, 1 + globalFomo);
    }
    return term - 0.5 * CONFLICT_PENALTY * cwt.get(id)![tp];
  };

  // Shared helpers for the hill-climb.
  const apply = (mv: Array<[string, number, number]>) => {
    for (const [m, from, to] of mv) {
      for (const [f, a2] of friends.get(m)!) {
        const w = fwt.get(f)!;
        w[from] -= a2;
        w[to] += a2;
      }
      for (const c of conflictPartners.get(m)!) {
        const cf = cwt.get(c)!;
        cf[from] -= 1;
        cf[to] += 1;
      }
      tableOf.set(m, to);
    }
  };
  // Try a set of moves; keep them only if the total objective improves.
  const tryMoves = (moved: Array<[string, number, number]>): boolean => {
    const affected = new Set<string>();
    for (const [m] of moved) {
      affected.add(m);
      for (const [f] of friends.get(m)!) affected.add(f);
      for (const c of conflictPartners.get(m)!) affected.add(c);
    }
    let before = 0;
    for (const id of affected) before += objOf(id);
    apply(moved);
    let after = 0;
    for (const id of affected) after += objOf(id);
    if (after > before) return true;
    apply(moved.map(([m, from, to]) => [m, to, from])); // revert
    return false;
  };

  // --- Hill-climb. Relocate units into spare seats and swap units between
  // tables (any sizes that fit), so cohesive groups can actually consolidate.
  // Capacity ceiling: the physical seats when empty seats are allowed (gives the
  // optimiser slack to gather groups), otherwise the balanced per-table count.
  const seatCap = Math.max(1, Math.floor(config.seatsPerTable));
  const cap = capacities.map((c) => (config.allowEmptySeats ? seatCap : c));
  const tableSize = tableMembers.map((m) => m.length);

  const iterations = Math.min(
    60_000,
    Math.max(2_000, n * n * EFFORT_ITERATIONS[config.effort]),
  );
  for (let iter = 0; iter < iterations; iter++) {
    const a = Math.floor(rng() * tableCount);
    const b = Math.floor(rng() * tableCount);
    if (a === b || tableUnits[a].length === 0) continue;
    const ia = Math.floor(rng() * tableUnits[a].length);
    const ra = tableUnits[a][ia];
    const sa = sizeOf(ra);

    if (rng() < 0.5) {
      // Relocate unit ra from table a → b, if b has room.
      if (tableSize[b] + sa > cap[b]) continue;
      const moved = unitMembers.get(ra)!.map((m) => [m, a, b] as [string, number, number]);
      if (tryMoves(moved)) {
        tableUnits[a].splice(ia, 1);
        tableUnits[b].push(ra);
        tableSize[a] -= sa;
        tableSize[b] += sa;
      }
    } else {
      // Swap unit ra@a with rb@b, if both tables stay within capacity.
      if (tableUnits[b].length === 0) continue;
      const ib = Math.floor(rng() * tableUnits[b].length);
      const rb = tableUnits[b][ib];
      const sb = sizeOf(rb);
      if (tableSize[a] - sa + sb > cap[a] || tableSize[b] - sb + sa > cap[b]) {
        continue;
      }
      const moved: Array<[string, number, number]> = [];
      for (const m of unitMembers.get(ra)!) moved.push([m, a, b]);
      for (const m of unitMembers.get(rb)!) moved.push([m, b, a]);
      if (tryMoves(moved)) {
        tableUnits[a][ia] = rb;
        tableUnits[b][ib] = ra;
        tableSize[a] += sb - sa;
        tableSize[b] += sa - sb;
      }
    }
  }

  // --- Build tables from the final assignment, dropping any now-empty tables.
  const compactIndex = new Map<number, number>();
  let nextIndex = 0;
  for (let t = 0; t < tableCount; t++) {
    if (tableSize[t] > 0) compactIndex.set(t, nextIndex++);
  }
  const finalMembers: string[][] = Array.from(
    { length: Math.max(1, nextIndex) },
    () => [],
  );
  for (const id of ids) {
    finalMembers[compactIndex.get(tableOf.get(id)!) ?? 0].push(id);
  }

  const nameOf = new Map(guests.map((g) => [g.id, g.name] as const));
  const violations: string[] = [];
  for (const members of finalMembers) {
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

  let score = 0;
  for (const id of ids) score += objOf(id);

  const resultTables: SeatingTable[] = finalMembers.map((guestIds, i) => ({
    id: `table-${i + 1}`,
    guestIds,
  }));

  return { tables: resultTables, score: Math.round(score), violations, seed };
}
