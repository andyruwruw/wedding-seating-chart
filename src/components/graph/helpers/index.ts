import {
  KEEP_APART_VALUE,
  MAX_TIER,
  TENTATIVE_VALUES,
} from "../../form/config/relationship-tiers";
import {
  CONFLICT_COLOR,
  NODE_HIGHLIGHT_OFFSET,
  NODE_HIGHLIGHT_OPACITY,
  NODE_HIGHLIGHT_RADIUS_RATIO,
  TENTATIVE_COLOR,
} from "../config";

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

/**
 * Draws the glossy highlight dot every graph node gets, offset toward the
 * upper-left. Shared with the SVG `GraphNode` component so canvas- and
 * SVG-rendered nodes share the same look.
 */
export function drawNodeHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  ctx.save();
  ctx.globalAlpha = NODE_HIGHLIGHT_OPACITY;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(
    x - r * NODE_HIGHLIGHT_OFFSET,
    y - r * NODE_HIGHLIGHT_OFFSET,
    r * NODE_HIGHLIGHT_RADIUS_RATIO,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}
