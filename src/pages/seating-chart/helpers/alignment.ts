import type { DndAlignment } from "../../../types";

/** All nine alignments in display order (Good row → Neutral → Evil). */
export const ALIGNMENT_ORDER: DndAlignment[] = [
  "LG", "NG", "CG",
  "LN", "TN", "CN",
  "LE", "NE", "CE",
];

export interface AlignmentInfo {
  label: string;
  color: string;
}

export const ALIGNMENT_INFO: Record<DndAlignment, AlignmentInfo> = {
  LG: { label: "Lawful Good",     color: "#0f9d7a" },
  NG: { label: "Neutral Good",    color: "#159a5b" },
  CG: { label: "Chaotic Good",    color: "#1288d8" },
  LN: { label: "Lawful Neutral",  color: "#8b3fe0" },
  TN: { label: "True Neutral",    color: "#5c6472" },
  CN: { label: "Chaotic Neutral", color: "#9855e0" },
  LE: { label: "Lawful Evil",     color: "#b8720f" },
  NE: { label: "Neutral Evil",    color: "#e2652a" },
  CE: { label: "Chaotic Evil",    color: "#d9314a" },
};

// 3×3 grid coords: [law, moral]  law: 0=Lawful 1=Neutral 2=Chaotic  moral: 0=Good 1=Neutral 2=Evil
const COORDS: Record<DndAlignment, [number, number]> = {
  LG: [0, 0], NG: [1, 0], CG: [2, 0],
  LN: [0, 1], TN: [1, 1], CN: [2, 1],
  LE: [0, 2], NE: [1, 2], CE: [2, 2],
};

/** Returns compatibility [0, 1]: 1 = identical, 0 = diagonally opposite. */
export function alignmentCompatibility(a: DndAlignment, b: DndAlignment): number {
  const [la, ma] = COORDS[a];
  const [lb, mb] = COORDS[b];
  const dist = Math.abs(la - lb) + Math.abs(ma - mb);
  return 1 - dist / 4;
}

/** Cycle to the next alignment, or back to undefined after the last one. */
export function nextAlignment(current: DndAlignment | undefined): DndAlignment | undefined {
  if (!current) return ALIGNMENT_ORDER[0];
  const idx = ALIGNMENT_ORDER.indexOf(current);
  return idx === ALIGNMENT_ORDER.length - 1 ? undefined : ALIGNMENT_ORDER[idx + 1];
}

export interface TableAlignmentSummary {
  /** Count per alignment code. */
  counts: Partial<Record<DndAlignment, number>>;
  /** Number of guests with an alignment assigned. */
  total: number;
  /**
   * Average pairwise alignment compatibility for guests who have no explicit
   * connection to each other, or null if there are fewer than two such guests.
   */
  strangerHarmony: number | null;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function tableAlignmentSummary(
  guestIds: string[],
  alignmentOf: Map<string, DndAlignment>,
  connectedPairs: Set<string>,
): TableAlignmentSummary {
  const counts: Partial<Record<DndAlignment, number>> = {};
  let total = 0;

  for (const id of guestIds) {
    const al = alignmentOf.get(id);
    if (al) {
      counts[al] = (counts[al] ?? 0) + 1;
      total++;
    }
  }

  let harmonySum = 0;
  let harmonyPairs = 0;

  for (let i = 0; i < guestIds.length; i++) {
    for (let j = i + 1; j < guestIds.length; j++) {
      const a = guestIds[i];
      const b = guestIds[j];
      if (connectedPairs.has(pairKey(a, b))) continue;
      const alA = alignmentOf.get(a);
      const alB = alignmentOf.get(b);
      if (!alA || !alB) continue;
      harmonySum += alignmentCompatibility(alA, alB);
      harmonyPairs++;
    }
  }

  return {
    counts,
    total,
    strangerHarmony: harmonyPairs > 0 ? harmonySum / harmonyPairs : null,
  };
}
