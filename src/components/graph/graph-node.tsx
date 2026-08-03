import {
  NODE_HIGHLIGHT_OFFSET,
  NODE_HIGHLIGHT_OPACITY,
  NODE_HIGHLIGHT_RADIUS_RATIO,
} from "./config";

interface GraphNodeProps {
  cx: number;
  cy: number;
  r: number;
  fill: string;
}

/**
 * A single graph node: a filled circle plus the glossy highlight dot every
 * node gets on the real force graph (see `drawNodeHighlight`). Any SVG
 * graphic that wants to look like the app's actual graph — e.g. the landing
 * page's illustrations — should render its nodes with this instead of a
 * plain `<circle>`. Pass live-animated `cx`/`cy` (see `useForceLayout`) to
 * make it move the way the real graph does.
 */
export function GraphNode({ cx, cy, r, fill }: GraphNodeProps) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle
        cx={cx - r * NODE_HIGHLIGHT_OFFSET}
        cy={cy - r * NODE_HIGHLIGHT_OFFSET}
        r={r * NODE_HIGHLIGHT_RADIUS_RATIO}
        fill="#ffffff"
        opacity={NODE_HIGHLIGHT_OPACITY}
      />
    </g>
  );
}
