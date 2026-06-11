/**
 * Relationship tiers shown to the user.
 *
 * `value` is what the seating solver actually uses: LOWER = CLOSER. Several
 * labels deliberately share the same value (e.g. "Sibling" and "Good friend"
 * are both 3) — the user picks a human label, the math only sees the number.
 *
 * Edit this list to add/rename tiers; everything else derives from it.
 */
export interface RelationshipTier {
  label: string;
  value: number;
  /** Hard constraint: this pair is one unit and must share a table. */
  keepTogether?: boolean;
}

/** Special weight: a hard "must not sit together" constraint, not a closeness. */
export const KEEP_APART_VALUE = -1;

export const RELATIONSHIP_TIERS: RelationshipTier[] = [
  { label: "Partner / Spouse", value: 1, keepTogether: true },
  { label: "Best friend", value: 1 },
  { label: "Sibling", value: 2 },
  { label: "Parent / Child", value: 2 },
  { label: "Close friend", value: 2 },
  { label: "Good friend", value: 3 },
  { label: "Cousin", value: 3 },
  { label: "Extended family", value: 4 },
  { label: "Friend", value: 4 },
  { label: "Colleague", value: 5 },
  { label: "Acquaintance", value: 5 },
  { label: "Met once", value: 6 },
  { label: "🚫 Must not sit together", value: KEEP_APART_VALUE },
];

/** Largest "normal" (non-keep-apart) tier value. Drives affinity scaling. */
export const MAX_TIER = Math.max(
  ...RELATIONSHIP_TIERS.map((t) => t.value).filter((v) => v !== KEEP_APART_VALUE),
);

/** Labels that pin two guests together as an inseparable unit (e.g. couples). */
export const KEEP_TOGETHER_LABELS = new Set(
  RELATIONSHIP_TIERS.filter((t) => t.keepTogether).map((t) => t.label),
);

/** Default tier used when an imported label is unknown. */
export const DEFAULT_TIER =
  RELATIONSHIP_TIERS.find((t) => t.label === "Acquaintance") ?? RELATIONSHIP_TIERS[0];

/**
 * Affinity = how strongly a co-seated pair wants to be together.
 * Closer tier (value 1) → highest affinity; far tier (value MAX_TIER) → 1.
 * Keep-apart returns 0 here (the hard constraint is handled separately).
 */
export function affinityForValue(value: number): number {
  if (value === KEEP_APART_VALUE) return 0;
  return MAX_TIER + 1 - value;
}

/** Look up the first label matching a value (fallback for legacy data). */
export function labelForValue(value: number): string {
  return RELATIONSHIP_TIERS.find((t) => t.value === value)?.label ?? `Tier ${value}`;
}

/** Map an arbitrary (possibly imported) label back to a tier value. */
export function valueForLabel(label: string): number {
  const norm = label.trim().toLowerCase();
  const match = RELATIONSHIP_TIERS.find((t) => t.label.toLowerCase() === norm);
  return match ? match.value : DEFAULT_TIER.value;
}

/** Index of a tier by its exact label, or -1 if not found. */
export function tierIndexForLabel(label: string): number {
  return RELATIONSHIP_TIERS.findIndex((t) => t.label === label);
}

/** Display string with the numeric weight made obvious, e.g. "Close friend · 2". */
export function formatTierLabel(tier: RelationshipTier): string {
  return tier.value === KEEP_APART_VALUE ? tier.label : `${tier.label} · ${tier.value}`;
}

/**
 * Resolve an imported relationship label to a canonical tier (case-insensitive).
 * Unknown labels fall back to the default tier so label and value stay in sync.
 */
export function resolveTier(input: string): { label: string; value: number } {
  const norm = input.trim().toLowerCase();
  const match = RELATIONSHIP_TIERS.find((t) => t.label.toLowerCase() === norm);
  return match
    ? { label: match.label, value: match.value }
    : { label: DEFAULT_TIER.label, value: DEFAULT_TIER.value };
}
