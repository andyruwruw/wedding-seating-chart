import type { Connection, Guest, SeatingResult, SeatingTable } from "../../../types";
import type { CellValue } from "../../../lib/google/sheets";
import { computeHappiness, makeMultLookup } from "./happiness";

/** Tab titles written to the attached spreadsheet (single words → no quoting). */
export const SHEET_TABS = {
  seating: "Seating",
  guests: "Guests",
  connections: "Connections",
  locked: "Locked",
} as const;

export const SHEET_TAB_LIST = [
  SHEET_TABS.seating,
  SHEET_TABS.guests,
  SHEET_TABS.connections,
  SHEET_TABS.locked,
];

function nameLookup(guests: Guest[]): (id: string) => string {
  const map = new Map(guests.map((g) => [g.id, g.name] as const));
  return (id) => map.get(id) ?? "?";
}

export function guestRows(
  guests: Guest[],
  connections: Connection[],
  result: SeatingResult | null,
): CellValue[][] {
  const tableOf = new Map<string, number>();
  result?.tables.forEach((t, i) =>
    t.guestIds.forEach((id) => tableOf.set(id, i)),
  );
  const rows: CellValue[][] = [["Name", "Connections", "Table", "Alignment"]];
  for (const g of guests) {
    const count = connections.filter(
      (c) => c.source === g.id || c.target === g.id,
    ).length;
    const tbl = tableOf.has(g.id) ? `Table ${tableOf.get(g.id)! + 1}` : "";
    rows.push([g.name, count, tbl, g.alignment ?? "TN"]);
  }
  return rows;
}

export function connectionRows(
  guests: Guest[],
  connections: Connection[],
): CellValue[][] {
  const nameOf = nameLookup(guests);
  const rows: CellValue[][] = [["Source", "Target", "Relationship", "Value"]];
  for (const c of connections) {
    rows.push([nameOf(c.source), nameOf(c.target), c.label, c.value]);
  }
  return rows;
}

/**
 * One row per (locked table, guest) pair. Locked tables are name-based, like
 * the Guests/Connections tabs, so they survive an id-regenerating re-import.
 */
export function lockedRows(
  guests: Guest[],
  lockedTables: SeatingTable[],
): CellValue[][] {
  const nameOf = nameLookup(guests);
  const rows: CellValue[][] = [["Locked Table", "Guest"]];
  lockedTables.forEach((lt, i) => {
    for (const id of lt.guestIds) {
      rows.push([`Locked ${i + 1}`, nameOf(id)]);
    }
  });
  return rows;
}

export function seatingRows(
  guests: Guest[],
  connections: Connection[],
  result: SeatingResult | null,
  taper: number,
  fomo: number,
  worstCase: boolean,
): CellValue[][] {
  if (!result || result.tables.length === 0) {
    return [["No seating chart generated yet."]];
  }
  const nameOf = nameLookup(guests);
  const report = computeHappiness(
    result.tables,
    connections,
    taper,
    fomo,
    makeMultLookup(guests),
    worstCase,
  );
  const rows: CellValue[][] = [];
  rows.push(["Overall happiness", report.overall]);
  rows.push([]);
  rows.push(["Table", "Table happiness", "Status", "Seat", "Guest", "Guest happiness"]);
  result.tables.forEach((t, i) => {
    const h = report.table[i];
    t.guestIds.forEach((id, seat) => {
      const gh = report.guest.get(id);
      rows.push([
        `Table ${i + 1}`,
        h.score,
        h.label,
        seat + 1,
        nameOf(id),
        gh ? gh.score : "",
      ]);
    });
  });
  return rows;
}
