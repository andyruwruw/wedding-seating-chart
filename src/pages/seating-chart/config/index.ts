import {
  RELATIONSHIP_TIERS,
  formatTierLabel,
} from "../../../components/form/config/relationship-tiers";
import type { SelectOption } from "../../../components/form/select";

/** Distinct, readable colors used to tint tables (and their nodes in the graph). */
export const TABLE_PALETTE = [
  "#8b7cff", // violet
  "#4ad6a0", // mint
  "#ff9f6e", // coral
  "#5cc8ff", // sky
  "#f7c948", // gold
  "#ff7eb6", // pink
  "#9d7bff", // purple
  "#6ee7b7", // green
  "#f6a5c0", // rose
  "#7dd3fc", // cyan
  "#fbbf72", // amber
  "#b794f6", // lilac
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
