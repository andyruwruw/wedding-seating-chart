import type { Connection, Guest, ProjectSnapshot } from "../../../types";
import {
  labelForValue,
  resolveTier,
} from "../../../components/form/config/relationship-tiers";
import { pairKey } from "../../../store/use-app-store";

/**
 * CSV format is an edge list: `Source,Target,Relationship`.
 * - One row per connection, using guest NAMES (not ids) and the tier LABEL.
 * - Guests with no connections are written as `Name,,` so they survive a round-trip.
 */
const HEADER = "Source,Target,Relationship";

function escapeField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function snapshotToCsv(
  guests: Guest[],
  connections: Connection[],
): string {
  const nameOf = new Map(guests.map((g) => [g.id, g.name] as const));
  const rows: string[] = [HEADER];

  const connectedIds = new Set<string>();
  for (const c of connections) {
    const source = nameOf.get(c.source);
    const target = nameOf.get(c.target);
    if (!source || !target) continue;
    connectedIds.add(c.source);
    connectedIds.add(c.target);
    const label = c.label ?? labelForValue(c.value);
    rows.push([source, target, label].map(escapeField).join(","));
  }

  // Standalone guests so they aren't lost.
  for (const g of guests) {
    if (!connectedIds.has(g.id)) {
      rows.push([escapeField(g.name), "", ""].join(","));
    }
  }

  return rows.join("\n");
}

/** Parse a single CSV line, honouring quoted fields. */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
}

/**
 * Build a snapshot from CSV text. Guests are created on first reference (by name,
 * case-insensitive); unknown relationship labels fall back to a default tier.
 */
export function csvToSnapshot(text: string): ProjectSnapshot {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { guests: [], connections: [] };

  // Skip the header row if present.
  const start = lines[0].toLowerCase().startsWith("source,") ? 1 : 0;

  const idByName = new Map<string, string>();
  const guests: Guest[] = [];
  const ensureGuest = (name: string): string => {
    const key = name.toLowerCase();
    const existing = idByName.get(key);
    if (existing) return existing;
    const id = makeId();
    idByName.set(key, id);
    guests.push({ id, name });
    return id;
  };

  const connections: Connection[] = [];
  const seenPairs = new Set<string>();

  for (let i = start; i < lines.length; i++) {
    const [sourceName, targetName, relationship] = parseLine(lines[i]);
    if (!sourceName) continue;
    const sourceId = ensureGuest(sourceName);
    if (!targetName) continue; // standalone guest row

    const targetId = ensureGuest(targetName);
    if (sourceId === targetId) continue;
    const key = pairKey(sourceId, targetId);
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    const tier = resolveTier(relationship ?? "");
    connections.push({
      source: sourceId,
      target: targetId,
      value: tier.value,
      label: tier.label,
    });
  }

  return { guests, connections };
}

/**
 * Build a snapshot from a plain list of names — one per line (a leading "Name"
 * header is ignored). Only the first column of each line is used, so a names-only
 * CSV export from a spreadsheet works too. Creates guests with no connections.
 */
export function namesToSnapshot(text: string): ProjectSnapshot {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const start =
    lines[0] && parseLine(lines[0])[0].toLowerCase() === "name" ? 1 : 0;

  const guests: Guest[] = [];
  const seen = new Set<string>();
  for (let i = start; i < lines.length; i++) {
    const name = parseLine(lines[i])[0]?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    guests.push({ id: makeId(), name });
  }
  return { guests, connections: [] };
}

/** A ready-to-edit example relationships sheet offered as a download. */
export const CSV_TEMPLATE = `Source,Target,Relationship
Alice,Bob,Partner / Spouse
Alice,Carol,Close friend
Bob,Dave,Colleague
Carol,Dave,Acquaintance
Erin,Frank,🚫 Must not sit together
Grace,,`;

