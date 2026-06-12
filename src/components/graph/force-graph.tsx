import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { NodeObject } from "react-force-graph-2d";
import type { GraphSettings } from "../../types";
import { KEEP_APART_VALUE } from "../form/config/relationship-tiers";
import {
  GRAPH_BACKGROUND,
  LABEL_COLOR,
  LABEL_FONT,
  NODE_GLOW,
  NODE_RADIUS,
  NODE_SELECTED_COLOR,
} from "./config";
import { linkStyle } from "./helpers";

export interface GraphNode {
  id: string;
  name: string;
  /** Fill color (e.g. tinted by assigned table). */
  color: string;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

interface ForceGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  settings: GraphSettings;
}

type RFNode = NodeObject & GraphNode;

type ForceAccessor = number | ((link: unknown) => number);
interface ForceObj {
  strength?: (value: ForceAccessor) => unknown;
  distance?: (value: ForceAccessor) => unknown;
}

/** Minimal shape of the d3 forces we configure on the graph instance. */
interface ForceHandle {
  d3Force: (name: string, force?: unknown) => ForceObj | undefined;
  d3ReheatSimulation: () => void;
}

/**
 * A radial gravity force pulling every node toward the center (0,0).
 *
 * d3's built-in `forceCenter` only re-centers the centroid — it never pulls
 * nodes together — so on its own the repel charge has nothing to push against.
 * This custom force provides the actual inward pull, with a live-tunable
 * strength read from a ref each tick.
 */
function makeCenterGravity(getStrength: () => number) {
  let nodes: RFNode[] = [];
  const force = (alpha: number) => {
    const s = getStrength();
    if (!s) return;
    for (const n of nodes) {
      n.vx = (n.vx ?? 0) - (n.x ?? 0) * s * alpha;
      n.vy = (n.vy ?? 0) - (n.y ?? 0) * s * alpha;
    }
  };
  (force as unknown as { initialize: (n: RFNode[]) => void }).initialize = (
    n,
  ) => {
    nodes = n;
  };
  return force;
}

/**
 * A repulsion force between "must not sit together" pairs. Their link is drawn
 * but exerts no attraction (link strength 0), so this pushes them apart instead
 * of letting the graph pull them together.
 */
function makeKeepApartForce(
  getPairs: () => Array<[string, string]>,
  getStrength: () => number,
) {
  let byId = new Map<string, RFNode>();
  const force = (alpha: number) => {
    const s = getStrength();
    if (!s) return;
    for (const [aId, bId] of getPairs()) {
      const a = byId.get(aId);
      const b = byId.get(bId);
      if (!a || !b) continue;
      let dx = (b.x ?? 0) - (a.x ?? 0);
      const dy = (b.y ?? 0) - (a.y ?? 0);
      if (dx === 0 && dy === 0) dx = 0.5; // break exact overlap
      const l2 = Math.max(1, dx * dx + dy * dy);
      const l = Math.sqrt(l2);
      const f = ((s / l2) * alpha) / l; // inverse-square repulsion
      a.vx = (a.vx ?? 0) - dx * f;
      a.vy = (a.vy ?? 0) - dy * f;
      b.vx = (b.vx ?? 0) + dx * f;
      b.vy = (b.vy ?? 0) + dy * f;
    }
  };
  (force as unknown as { initialize: (n: RFNode[]) => void }).initialize = (
    n,
  ) => {
    byId = new Map(n.map((node) => [node.id, node] as const));
  };
  return force;
}

export function ForceGraph({
  nodes,
  links,
  selectedId,
  onSelect,
  settings,
}: ForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceHandle | undefined>(undefined);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Live-updated gravity strength + a stable force instance registered once.
  const gravityStrength = useRef(settings.centerForce);
  const gravityForce = useRef(
    makeCenterGravity(() => gravityStrength.current),
  ).current;
  const gravityRegistered = useRef(false);

  // Keep-apart repulsion: live list of pairs + strength, registered once.
  const keepApartPairs = useRef<Array<[string, string]>>([]);
  const keepApartStrength = useRef(0);
  const keepApartForce = useRef(
    makeKeepApartForce(
      () => keepApartPairs.current,
      () => keepApartStrength.current,
    ),
  ).current;
  const keepApartRegistered = useRef(false);

  // Track container size so the canvas always fills its column.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // react-force-graph mutates node objects (x/y/vx/vy), so we keep a stable
  // object per id across renders and only patch the display color.
  const nodeCache = useRef(new Map<string, RFNode>());
  const graphData = useMemo(() => {
    const cache = nodeCache.current;
    const liveIds = new Set(nodes.map((n) => n.id));
    for (const id of cache.keys()) {
      if (!liveIds.has(id)) cache.delete(id);
    }
    const rfNodes = nodes.map((n) => {
      const existing = cache.get(n.id);
      if (existing) {
        existing.name = n.name;
        existing.color = n.color;
        return existing;
      }
      const created: RFNode = { ...n };
      cache.set(n.id, created);
      return created;
    });
    return { nodes: rfNodes, links: links.map((l) => ({ ...l })) };
  }, [nodes, links]);

  // Apply the user's force settings to the live d3 simulation. Re-run when the
  // settings or the data change (the graph rebuilds its forces on new data).
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;

    const charge = fg.d3Force("charge");
    charge?.strength?.(-settings.repelForce);

    const link = fg.d3Force("link");
    link?.distance?.(settings.linkDistance);
    // "Must not sit together" links exert no pull — they repel instead (below).
    link?.strength?.((l) =>
      (l as GraphLink).value === KEEP_APART_VALUE ? 0 : settings.linkForce,
    );

    // Real inward pull. forceCenter only translates the centroid, so we drive a
    // custom gravity force instead (registered once, strength read live).
    gravityStrength.current = settings.centerForce;
    if (!gravityRegistered.current) {
      fg.d3Force("gravity", gravityForce);
      gravityRegistered.current = true;
    }

    // Push keep-apart pairs apart, scaled with the repel setting.
    keepApartPairs.current = links
      .filter((l) => l.value === KEEP_APART_VALUE)
      .map((l) => [l.source, l.target] as [string, string]);
    keepApartStrength.current = Math.max(2500, settings.repelForce * 25);
    if (!keepApartRegistered.current) {
      fg.d3Force("keepApart", keepApartForce);
      keepApartRegistered.current = true;
    }

    fg.d3ReheatSimulation();
    // `size.width` is included so this re-runs once the canvas actually mounts
    // (the graph ref is only available after a non-zero size is measured).
  }, [settings, graphData, links, gravityForce, keepApartForce, size.width]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {size.width > 0 && (
        <ForceGraph2D
          ref={graphRef as never}
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor={GRAPH_BACKGROUND}
          cooldownTicks={120}
          d3VelocityDecay={0.3}
          linkColor={(l) => linkStyle((l as GraphLink).value).color}
          linkWidth={(l) => linkStyle((l as GraphLink).value).width}
          linkLineDash={(l) =>
            linkStyle((l as GraphLink).value).dashed ? [3, 3] : null
          }
          onNodeClick={(node) => onSelect((node as RFNode).id)}
          onBackgroundClick={() => onSelect(null)}
          onNodeDragEnd={(node) => {
            const n = node as RFNode;
            n.fx = n.x;
            n.fy = n.y;
          }}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as RFNode;
            const x = n.x ?? 0;
            const y = n.y ?? 0;
            const selected = n.id === selectedId;
            const r = selected ? NODE_RADIUS * 1.25 : NODE_RADIUS;

            // Glow / bloom.
            ctx.shadowColor = n.color;
            ctx.shadowBlur = selected ? NODE_GLOW * 1.6 : NODE_GLOW;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fillStyle = selected ? NODE_SELECTED_COLOR : n.color;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Selection ring.
            if (selected) {
              ctx.beginPath();
              ctx.arc(x, y, r + 2.5, 0, 2 * Math.PI);
              ctx.strokeStyle = n.color;
              ctx.lineWidth = 1;
              ctx.stroke();
            }

            // Label (fades in as you zoom in).
            if (globalScale > 1.2 || selected) {
              ctx.font = LABEL_FONT;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = LABEL_COLOR;
              ctx.fillText(n.name, x, y + r + 1.5);
            }
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as RFNode;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(n.x ?? 0, n.y ?? 0, NODE_RADIUS + 3, 0, 2 * Math.PI);
            ctx.fill();
          }}
        />
      )}
    </div>
  );
}
