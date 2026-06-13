/**
 * A hand-built sample wedding (~80 guests), used by the "Sample data" button.
 *
 * It's designed to render as a good-looking force graph: a dozen tight,
 * clearly-separated clusters (families, friend groups, coworkers, neighbors,
 * a book club) each connected internally as a clique, joined by a few weaker
 * bridge links, married couples pinned together, a handful of estranged
 * relatives that repel, and some speculative "might get along" matchmaker edges.
 */
import type { Connection, Guest, ProjectSnapshot } from "../../../types";
import { valueForLabel } from "../../../components/form/config/relationship-tiers";

interface SampleGroup {
  /** The relationship every internal pair gets (couples are overridden below). */
  tier: string;
  members: string[];
  /** Pairs within the group that are actually married (pinned together). */
  couples?: [string, string][];
}

/** Each group becomes its own visual cluster (a clique at `tier`). */
const GROUPS: SampleGroup[] = [
  {
    tier: "Sibling",
    members: ["Ava", "Susan", "David", "Maya", "Ethan", "Rose"],
    couples: [["Susan", "David"]],
  },
  {
    tier: "Cousin",
    members: ["Rick", "Patty", "Jenna", "Cole", "Bella", "Edna"],
    couples: [["Rick", "Patty"]],
  },
  {
    tier: "Sibling",
    members: ["Liam", "Karen", "Tom", "Noah", "Hannah", "Walt"],
    couples: [["Karen", "Tom"]],
  },
  {
    tier: "Cousin",
    members: ["Gary", "Linda", "Drew", "Mia", "Logan", "Joan"],
    couples: [["Gary", "Linda"]],
  },
  {
    tier: "Close friend",
    members: ["Chloe", "Priya", "Zoe", "Bree", "Ivy", "Quinn", "Skye", "Wren"],
  },
  {
    tier: "Good friend",
    members: ["Tara", "Megan", "Holly", "Sam", "Dana", "Gwen"],
  },
  {
    tier: "Colleague",
    members: ["Rachel", "Steve", "Nina", "Omar", "Beth", "Cody"],
  },
  {
    tier: "Close friend",
    members: ["Marcus", "Jordan", "Derek", "Pete", "Wes", "Hank", "Roy"],
  },
  {
    tier: "Colleague",
    members: ["Carl", "Dwight", "Angela", "Kevin", "Phyllis"],
  },
  {
    tier: "Good friend",
    members: ["Brody", "Chase", "Tyler", "Reed", "Jay", "Max"],
  },
  {
    tier: "Friend",
    members: ["Grace", "Ben", "Owen", "Lily", "Faye", "Gus"],
  },
  {
    tier: "Friend",
    members: ["Frank", "Doris", "Hal", "Marge", "Stan"],
    couples: [
      ["Frank", "Doris"],
      ["Hal", "Marge"],
    ],
  },
  {
    tier: "Friend",
    members: ["Nora", "Vera", "Ada", "Cleo", "Iris", "June", "Opal"],
  },
];

/** Weaker links that stitch the clusters together — [A, B, relationship]. */
const BRIDGES: [string, string, string][] = [
  ["Ava", "Liam", "Partner / Spouse"], // the couple — joins both families
  ["Susan", "Rick", "Sibling"], // bride's mom ↔ her brother (extended family)
  ["Karen", "Gary", "Sibling"], // groom's mom ↔ her brother (extended family)
  ["Ava", "Chloe", "Close friend"], // bride ↔ college crew
  ["Ava", "Tara", "Good friend"], // bride ↔ high-school crew
  ["Ava", "Rachel", "Colleague"], // bride ↔ coworkers
  ["Ava", "Grace", "Friend"], // bride ↔ mutual friends
  ["Liam", "Marcus", "Close friend"], // groom ↔ college crew
  ["Liam", "Brody", "Good friend"], // groom ↔ childhood crew
  ["Liam", "Carl", "Colleague"], // groom ↔ coworkers
  ["Liam", "Ben", "Friend"], // groom ↔ mutual friends
  ["Chloe", "Ben", "Partner / Spouse"], // college ↔ mutual (married)
  ["Marcus", "Grace", "Partner / Spouse"], // college ↔ mutual (married)
  ["Frank", "Ava", "Friend"], // neighbors ↔ bride
  ["Nora", "Susan", "Friend"], // book club ↔ bride's mom
  ["Owen", "Hal", "Friend"], // mutual ↔ neighbors
  ["Stan", "Gus", "Acquaintance"], // neighbors ↔ mutual
];

/** The drama: pairs who must not share a table (they repel in the graph). */
const KEEP_APART: [string, string][] = [
  ["Rick", "Gary"], // the feuding uncles
  ["Patty", "Linda"], // the aunts who don't speak
  ["Bree", "Wes"], // exes from the two college groups
];

/** Matchmaker hunches — drawn as dashed "might get along" edges. */
const MATCH: [string, string][] = [
  ["Quinn", "Jordan"],
  ["Zoe", "Pete"],
  ["Nina", "Reed"],
  ["Ivy", "Chase"],
  ["Skye", "Roy"],
];

/** A little personality: guests who aren't the default "Normal" FOMO. */
const FOMO_OVERRIDES: Record<string, number> = {
  Rose: 0.3, // grandparents are happy anywhere
  Edna: 0.3,
  Walt: 0.3,
  Joan: 0.3,
  Phyllis: 0.3,
  Maya: 2, // maid of honor wants to be where the action is
  Noah: 2, // best man too
};

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

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

  // Register everyone first so the guest list stays grouped by cluster.
  for (const group of GROUPS) for (const m of group.members) idFor(m);

  // Collect edges in a map so later entries (couples, bridges) win over the
  // clique default for a pair.
  const edges = new Map<string, { a: string; b: string; label: string }>();
  const setEdge = (a: string, b: string, label: string) => {
    if (a !== b) edges.set(pairKey(a, b), { a, b, label });
  };

  for (const group of GROUPS) {
    const m = group.members;
    for (let i = 0; i < m.length; i++) {
      for (let j = i + 1; j < m.length; j++) setEdge(m[i], m[j], group.tier);
    }
    for (const [a, b] of group.couples ?? []) setEdge(a, b, "Partner / Spouse");
  }
  for (const [a, b, label] of BRIDGES) setEdge(a, b, label);
  for (const [a, b] of KEEP_APART) setEdge(a, b, "🚫 Must not sit together");
  for (const [a, b] of MATCH) setEdge(a, b, "Might get along");

  const connections: Connection[] = [...edges.values()].map(({ a, b, label }) => ({
    source: idFor(a),
    target: idFor(b),
    value: valueForLabel(label),
    label,
  }));

  return { guests, connections };
}
