import type {
  Connection,
  DndAlignment,
  Guest,
  ProjectSnapshot,
  SeatingTable,
} from "../../../types";
import { resolveTier } from "../../../components/form/config/relationship-tiers";
import { pairKey } from "../../../store/use-app-store";

const VALID_ALIGNMENTS = new Set<string>([
  "LG", "NG", "CG", "LN", "TN", "CN", "LE", "NE", "CE",
]);

function parseAlignment(raw: string): DndAlignment {
  const upper = raw.trim().toUpperCase();
  return VALID_ALIGNMENTS.has(upper) ? (upper as DndAlignment) : "TN";
}

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
    .map((g) => `${g.name.trim().toLowerCase()}:${g.alignment ?? "TN"}`)
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
  lockedRows: string[][] = [],
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
    // Alignment will be set in a second pass; default TN for guests from connections tab.
    guests.push({ id, name: trimmed, alignment: "TN" });
    return id;
  };

  // Guests tab — column A: name, column D: alignment.
  // Skip a "Name" header row if present.
  const alignmentByKey = new Map<string, DndAlignment>();
  let gi = guestRows[0] && cell(guestRows[0], 0).toLowerCase() === "name" ? 1 : 0;
  for (; gi < guestRows.length; gi++) {
    const name = cell(guestRows[gi], 0);
    if (!name) continue;
    ensureGuest(name);
    alignmentByKey.set(
      name.trim().toLowerCase(),
      parseAlignment(cell(guestRows[gi], 3)),
    );
  }
  // Apply parsed alignments (TN for any guest not in the Guests tab).
  for (const g of guests) {
    g.alignment = alignmentByKey.get(g.name.toLowerCase()) ?? "TN";
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

  // Locked tab — column A: lock group label, column B: guest name. Guests
  // referenced here but absent from the Guests/Connections tabs are created
  // too, so a lock never silently loses a member.
  const groups = new Map<string, string[]>();
  const order: string[] = [];
  let li =
    lockedRows[0] && cell(lockedRows[0], 0).toLowerCase() === "locked table" ? 1 : 0;
  for (; li < lockedRows.length; li++) {
    const label = cell(lockedRows[li], 0);
    const name = cell(lockedRows[li], 1);
    if (!label || !name) continue;
    const id = ensureGuest(name);
    if (!groups.has(label)) order.push(label);
    const members = groups.get(label) ?? [];
    members.push(id);
    groups.set(label, members);
  }
  const lockedTables: SeatingTable[] = order.map((label) => ({
    id: `lock-${label}`,
    guestIds: groups.get(label)!,
    locked: true,
  }));

  return { guests, connections, lockedTables };
}
