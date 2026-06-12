import {
  KEEP_APART_VALUE,
  MAX_TIER,
  TENTATIVE_VALUES,
} from "../../form/config/relationship-tiers";
import { CONFLICT_COLOR, TENTATIVE_COLOR } from "../config";

export interface LinkStyle {
  color: string;
  width: number;
  dashed: boolean;
}

/**
 * Map a connection's tier value to its on-screen style.
 * Closer pairs (low value → high affinity) get thicker, brighter edges.
 * Keep-apart pairs get a dashed red warning edge.
 */
export function linkStyle(value: number): LinkStyle {
  if (value === KEEP_APART_VALUE) {
    return { color: CONFLICT_COLOR, width: 1.6, dashed: true };
  }
  if (TENTATIVE_VALUES.has(value)) {
    return { color: TENTATIVE_COLOR, width: 1.4, dashed: true };
  }
  // Visual ramp from the tier rank (independent of the seating taper, so the
  // graph stays legible at any weighting). 0 = far, 1 = closest.
  const t = (MAX_TIER - value) / Math.max(1, MAX_TIER - 1);
  const width = 0.6 + t * 3.2;
  const alpha = 0.18 + t * 0.62;
  // Cool guest-network color, warming toward the accent for close ties.
  const color = `rgba(${Math.round(120 + t * 19)}, ${Math.round(
    130 + t * -6,
  )}, ${Math.round(170 + t * 85)}, ${alpha.toFixed(3)})`;
  return { color, width, dashed: false };
}
