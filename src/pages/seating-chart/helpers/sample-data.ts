/**
 * A hand-built sample wedding party, used by the "Sample data" button.
 *
 * It's designed to render as a good-looking force graph: a handful of tight
 * clusters (two families, the couple's friend groups) joined by a few bridge
 * links, two married couples pinned together, a pair of estranged relatives
 * that repel, and a couple of speculative "might get along" matchmaker edges.
 */
import type { Connection, Guest, ProjectSnapshot } from "../../../types";
import { valueForLabel } from "../../../components/form/config/relationship-tiers";

/** [guest A, guest B, relationship label] — names, not ids. */
type Edge = [string, string, string];

const EDGES: Edge[] = [
  // The couple — the bridge between both families.
  ["Ava", "Liam", "Partner / Spouse"],

  // Ava's family.
  ["Ava", "Maya", "Sibling"],
  ["Ava", "Susan", "Parent / Child"],
  ["Ava", "David", "Parent / Child"],
  ["Maya", "Susan", "Parent / Child"],
  ["Maya", "David", "Parent / Child"],
  ["Susan", "David", "Partner / Spouse"],
  ["Susan", "Rose", "Parent / Child"],
  ["Ava", "Rose", "Close friend"],
  ["Susan", "Rick", "Sibling"],
  ["Ava", "Rick", "Close friend"],

  // Liam's family.
  ["Liam", "Noah", "Sibling"],
  ["Liam", "Karen", "Parent / Child"],
  ["Liam", "Tom", "Parent / Child"],
  ["Noah", "Karen", "Parent / Child"],
  ["Noah", "Tom", "Parent / Child"],
  ["Karen", "Tom", "Partner / Spouse"],
  ["Karen", "Carol", "Sibling"],
  ["Liam", "Carol", "Close friend"],

  // Ava's college friends.
  ["Ava", "Chloe", "Close friend"],
  ["Ava", "Priya", "Close friend"],
  ["Ava", "Zoe", "Good friend"],
  ["Chloe", "Priya", "Good friend"],
  ["Chloe", "Zoe", "Friend"],
  ["Priya", "Zoe", "Good friend"],
  ["Chloe", "Ben", "Partner / Spouse"],
  ["Ben", "Priya", "Friend"],

  // Liam's work friends.
  ["Liam", "Marcus", "Good friend"],
  ["Liam", "Jordan", "Friend"],
  ["Liam", "Derek", "Colleague"],
  ["Marcus", "Jordan", "Friend"],
  ["Marcus", "Derek", "Colleague"],
  ["Jordan", "Derek", "Friend"],
  ["Marcus", "Grace", "Partner / Spouse"],
  ["Grace", "Liam", "Friend"],

  // Bridges that stitch the clusters together.
  ["Maya", "Zoe", "Friend"],
  ["Noah", "Jordan", "Friend"],

  // The drama: two relatives who must not share a table.
  ["Rick", "Carol", "🚫 Must not sit together"],

  // Matchmaker hunches.
  ["Zoe", "Marcus", "Might get along"],
  ["Priya", "Jordan", "Might get along"],
];

/** A little personality: a few guests that aren't the default "Normal" FOMO. */
const FOMO_OVERRIDES: Record<string, number> = {
  Rose: 0.3, // grandma is happy anywhere
  Maya: 2, // maid of honor wants to be in the middle of it
  Derek: 0.3, // along for the ride
};

/** Build the sample guests + connections as a ready-to-load snapshot. */
export function makeSampleSnapshot(): ProjectSnapshot {
  const ids = new Map<string, string>();
  const guests: Guest[] = [];

  const idFor = (name: string): string => {
    let id = ids.get(name);
    if (!id) {
      id = `sample-${name.toLowerCase()}`;
      ids.set(name, id);
      guests.push({ id, name, fomo: FOMO_OVERRIDES[name] ?? 1 });
    }
    return id;
  };

  const connections: Connection[] = EDGES.map(([a, b, label]) => ({
    source: idFor(a),
    target: idFor(b),
    value: valueForLabel(label),
    label,
  }));

  return { guests, connections };
}
