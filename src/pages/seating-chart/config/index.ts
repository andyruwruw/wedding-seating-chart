import {
  RELATIONSHIP_TIERS,
  formatTierLabel,
} from "../../../components/form/config/relationship-tiers";
import type { SelectOption } from "../../../components/form/select";

/** Distinct, readable colors used to tint tables (and their nodes in the graph). */
export const TABLE_PALETTE = [
  "#6d4fe6", // violet
  "#0f9d7a", // mint
  "#e2652a", // coral
  "#1288d8", // sky
  "#c9971a", // gold
  "#d6408f", // pink
  "#8b3fe0", // purple
  "#159a5b", // green
  "#cc4570", // rose
  "#0f9bc4", // cyan
  "#b8720f", // amber
  "#9855e0", // lilac
];

export function tableColor(index: number): string {
  return TABLE_PALETTE[index % TABLE_PALETTE.length];
}

/** Unassigned / default node color (slate). */
export const UNASSIGNED_COLOR = "#5b6473";

/**
 * Relationship tiers as <Select> options. The option value is the tier's ARRAY
 * INDEX (not its weight) so labels that share a weight — e.g. "Sibling" and
 * "Good friend" both = 3 — remain individually selectable in the dropdown.
 * Convert back with `tierWeightByIndex` when saving the connection.
 */
export const TIER_OPTIONS: SelectOption[] = RELATIONSHIP_TIERS.map((t, i) => ({
  label: formatTierLabel(t),
  value: i,
}));

export function tierWeightByIndex(index: number): number {
  return RELATIONSHIP_TIERS[index]?.value ?? RELATIONSHIP_TIERS[0].value;
}

/** Per-guest FOMO presets, cycled by a chip in the guest list. */
export const FOMO_LEVELS = [
  { label: "Chill", emoji: "😎", mult: 0.3 },
  { label: "Normal", emoji: "🙂", mult: 1 },
  { label: "Clingy", emoji: "🥺", mult: 2 },
] as const;

export function fomoLevel(mult = 1): (typeof FOMO_LEVELS)[number] {
  return FOMO_LEVELS.reduce((best, lvl) =>
    Math.abs(lvl.mult - mult) < Math.abs(best.mult - mult) ? lvl : best,
  );
}

export function nextFomoMult(mult = 1): number {
  const current = fomoLevel(mult);
  const i = FOMO_LEVELS.indexOf(current);
  return FOMO_LEVELS[(i + 1) % FOMO_LEVELS.length].mult;
}
