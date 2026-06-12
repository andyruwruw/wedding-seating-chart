import type { Connection, Guest, ProjectSnapshot } from "../../../types";
import { resolveTier } from "../../../components/form/config/relationship-tiers";
import { pairKey } from "../../../store/use-app-store";

/**
 * A name-based, order-independent fingerprint of the guests + connections.
 * Stable across id regeneration (so app state and a re-imported sheet compare
 * equal), letting us tell a real external edit from our own echo.
 */
export function snapshotSignature(
  guests: Guest[],
  connections: Connection[],
): string {
  const nameOf = new Map(
    guests.map((g) => [g.id, g.name.trim().toLowerCase()] as const),
  );
  const gPart = guests
    .map((g) => g.name.trim().toLowerCase())
    .sort()
    .join("|");
  const cPart = connections
    .map((c) => {
      const a = nameOf.get(c.source) ?? c.source;
      const b = nameOf.get(c.target) ?? c.target;
      const [x, y] = a < b ? [a, b] : [b, a];
      return `${x}~${y}~${c.label}`;
    })
    .sort()
    .join("|");
  return `${gPart}##${cPart}`;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
}

const cell = (row: string[] | undefined, i: number) => (row?.[i] ?? "").trim();

/**
 * Reconstruct guests + connections from the values of our "Guests" and
 * "Connections" tabs (as written by sheet-export). Returns whatever it can
 * parse — the caller decides whether a non-empty result means "importable".
 */
export function snapshotFromTabs(
  guestRows: string[][],
  connectionRows: string[][],
): ProjectSnapshot {
  const idByName = new Map<string, string>();
  const guests: Guest[] = [];
  const ensureGuest = (name: string): string => {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    const existing = idByName.get(key);
    if (existing) return existing;
    const id = makeId();
    idByName.set(key, id);
    guests.push({ id, name: trimmed });
    return id;
  };

  // Guests tab — column A is the name; skip a "Name" header if present.
  let gi = guestRows[0] && cell(guestRows[0], 0).toLowerCase() === "name" ? 1 : 0;
  for (; gi < guestRows.length; gi++) {
    const name = cell(guestRows[gi], 0);
    if (name) ensureGuest(name);
  }

  // Connections tab — Source, Target, Relationship; skip a header if present.
  const connections: Connection[] = [];
  const seen = new Set<string>();
  let ci =
    connectionRows[0] && cell(connectionRows[0], 0).toLowerCase() === "source"
      ? 1
      : 0;
  for (; ci < connectionRows.length; ci++) {
    const source = cell(connectionRows[ci], 0);
    const target = cell(connectionRows[ci], 1);
    if (!source || !target) continue;
    const sourceId = ensureGuest(source);
    const targetId = ensureGuest(target);
    if (sourceId === targetId) continue;
    const key = pairKey(sourceId, targetId);
    if (seen.has(key)) continue;
    seen.add(key);
    const tier = resolveTier(cell(connectionRows[ci], 2));
    connections.push({
      source: sourceId,
      target: targetId,
      value: tier.value,
      label: tier.label,
    });
  }

  return { guests, connections };
}
