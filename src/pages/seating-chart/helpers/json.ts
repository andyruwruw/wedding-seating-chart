import type { Connection, Guest, ProjectSnapshot } from "../../../types";
import { labelForValue } from "../../../components/form/config/relationship-tiers";

export function snapshotToJson(snapshot: ProjectSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

/** Parse + lightly validate a JSON project snapshot. Throws on malformed input. */
export function jsonToSnapshot(text: string): ProjectSnapshot {
  const data = JSON.parse(text) as unknown;
  if (typeof data !== "object" || data === null) {
    throw new Error("Expected a JSON object.");
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.guests) || !Array.isArray(obj.connections)) {
    throw new Error("JSON must contain `guests` and `connections` arrays.");
  }

  const guests: Guest[] = obj.guests.map((g) => {
    const guest = g as Record<string, unknown>;
    if (typeof guest.id !== "string" || typeof guest.name !== "string") {
      throw new Error("Each guest needs a string `id` and `name`.");
    }
    return { id: guest.id, name: guest.name };
  });

  const guestIds = new Set(guests.map((g) => g.id));
  const connections: Connection[] = obj.connections
    .map((c) => {
      const conn = c as Record<string, unknown>;
      const value = Number(conn.value);
      return {
        source: String(conn.source),
        target: String(conn.target),
        value,
        // Preserve the exact label; derive one for older files without it.
        label:
          typeof conn.label === "string" ? conn.label : labelForValue(value),
      };
    })
    .filter(
      (c) =>
        guestIds.has(c.source) &&
        guestIds.has(c.target) &&
        Number.isFinite(c.value),
    );

  return { guests, connections };
}
