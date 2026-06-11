import {
  affinityForValue,
  KEEP_APART_VALUE,
  MAX_TIER,
} from "../../form/config/relationship-tiers";
import { CONFLICT_COLOR } from "../config";

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
  const affinity = affinityForValue(value); // 1..MAX_TIER
  const t = (affinity - 1) / Math.max(1, MAX_TIER - 1); // 0 (far) .. 1 (close)
  const width = 0.6 + t * 3.2;
  const alpha = 0.18 + t * 0.62;
  // Cool guest-network color, warming toward the accent for close ties.
  const color = `rgba(${Math.round(120 + t * 19)}, ${Math.round(
    130 + t * -6,
  )}, ${Math.round(170 + t * 85)}, ${alpha.toFixed(3)})`;
  return { color, width, dashed: false };
}
