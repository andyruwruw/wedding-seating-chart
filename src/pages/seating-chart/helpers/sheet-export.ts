import type { Connection, Guest, SeatingResult } from "../../../types";
import type { CellValue } from "../../../lib/google/sheets";
import { overallHappiness, tableHappiness } from "./happiness";

/** Tab titles written to the attached spreadsheet (single words → no quoting). */
export const SHEET_TABS = {
  seating: "Seating",
  guests: "Guests",
  connections: "Connections",
} as const;

export const SHEET_TAB_LIST = [
  SHEET_TABS.seating,
  SHEET_TABS.guests,
  SHEET_TABS.connections,
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
  const rows: CellValue[][] = [["Name", "Connections", "Table"]];
  for (const g of guests) {
    const count = connections.filter(
      (c) => c.source === g.id || c.target === g.id,
    ).length;
    const tbl = tableOf.has(g.id) ? `Table ${tableOf.get(g.id)! + 1}` : "";
    rows.push([g.name, count, tbl]);
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

export function seatingRows(
  guests: Guest[],
  connections: Connection[],
  result: SeatingResult | null,
): CellValue[][] {
  if (!result || result.tables.length === 0) {
    return [["No seating chart generated yet."]];
  }
  const nameOf = nameLookup(guests);
  const rows: CellValue[][] = [];
  rows.push(["Overall happiness", overallHappiness(result.tables, connections)]);
  rows.push([]);
  rows.push(["Table", "Happiness", "Status", "Seat", "Guest"]);
  result.tables.forEach((t, i) => {
    const h = tableHappiness(t.guestIds, connections);
    t.guestIds.forEach((id, seat) => {
      rows.push([`Table ${i + 1}`, h.score, h.label, seat + 1, nameOf(id)]);
    });
  });
  return rows;
}
