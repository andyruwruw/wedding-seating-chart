import { useEffect, useRef, useState } from "react";
import type { GraphSettings } from "../../types";

export interface ForceLayoutNode {
  id: string;
}

export interface ForceLayoutLink {
  source: string;
  target: string;
  /**
   * Keep-apart links don't pull their nodes together — they push them apart
   * instead, same as the real graph's `makeKeepApartForce` (see
   * `force-graph.tsx`).
   */
  keepApart?: boolean;
}

interface Point {
  x: number;
  y: number;
}

const DAMPING = 0.88;
const NOISE = 0.05;
// Caps any single force's per-frame velocity contribution — a safety net
// for pathological cases (near-zero distance) rather than a normal operating
// limit.
const MAX_STEP = 4;
// Same idea as d3-force's alpha: every force is scaled by a value that decays
// from 1 toward a small floor each frame, so the layout actually converges
// (like the real graph settling after its cooldown) instead of drifting
// forever if the forces don't balance exactly. The floor keeps a faint,
// bounded residual wobble alive rather than freezing solid.
const ALPHA_DECAY = 0.985;
const ALPHA_MIN = 0.06;

function clampStep(v: number): number {
  return Math.max(-MAX_STEP, Math.min(MAX_STEP, v));
}

/**
 * A minimal force-directed layout — repel, link/link-distance, and center
 * gravity — driven by the same `GraphSettings` knobs and per-frame
 * integration as the real app's force graph, instead of a synced CSS
 * animation or a spring toward a fixed hand-placed position. Nodes start
 * scattered near `center` and the forces below organize them, exactly like
 * the real graph organizes actual guest nodes.
 */
export function useForceLayout(
  nodes: ForceLayoutNode[],
  links: ForceLayoutLink[],
  settings: GraphSettings,
  center: Point,
  /**
   * Max distance from `center` a node may drift. A graph topology that
   * doesn't force-balance perfectly (e.g. a node with only one weak link)
   * can otherwise wander slowly forever — the real graph is bounded by its
   * canvas the same way.
   */
  maxRadius: number,
): Point[] {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const linksRef = useRef(links);
  linksRef.current = links;
  const centerRef = useRef(center);
  centerRef.current = center;

  const stateRef = useRef(
    nodes.map((_, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      return {
        x: center.x + Math.cos(angle) * 30,
        y: center.y + Math.sin(angle) * 30,
        vx: 0,
        vy: 0,
      };
    }),
  );
  const indexById = useRef(new Map(nodes.map((n, i) => [n.id, i])));
  const alphaRef = useRef(1);

  const [positions, setPositions] = useState<Point[]>(() =>
    stateRef.current.map((n) => ({ x: n.x, y: n.y })),
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf: number;
    const tick = () => {
      const state = stateRef.current;
      const { centerForce, repelForce, linkForce, linkDistance } = settingsRef.current;
      const c = centerRef.current;
      const ids = indexById.current;

      alphaRef.current = Math.max(ALPHA_MIN, alphaRef.current * ALPHA_DECAY);
      const alpha = alphaRef.current;
      const force = (v: number) => clampStep(v) * alpha;

      // A faint continuous perturbation so the layout never fully freezes —
      // the same reason a settled real graph still isn't perfectly static.
      for (const n of state) {
        n.vx += (Math.random() - 0.5) * NOISE;
        n.vy += (Math.random() - 0.5) * NOISE;
      }

      // Repel — every pair pushes apart, inverse-square, like d3's charge force.
      for (let i = 0; i < state.length; i++) {
        for (let j = i + 1; j < state.length; j++) {
          const a = state[i];
          const b = state[j];
          let dx = b.x - a.x;
          const dy = b.y - a.y;
          if (dx === 0 && dy === 0) dx = 0.5;
          const distSq = Math.max(200, dx * dx + dy * dy);
          const dist = Math.sqrt(distSq);
          const f = force(repelForce / distSq);
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // Link + link-distance — spring toward the resting length. Keep-apart
      // pairs skip the spring and get a modest boost on top of the ordinary
      // pairwise repel above instead.
      for (const link of linksRef.current) {
        const ai = ids.get(link.source);
        const bi = ids.get(link.target);
        if (ai == null || bi == null) continue;
        const a = state[ai];
        const b = state[bi];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));

        if (link.keepApart) {
          const strength = repelForce * 1.5;
          const f = force(strength / (dist * dist));
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        } else {
          const delta = force((dist - linkDistance) * linkForce);
          const fx = (dx / dist) * delta;
          const fy = (dy / dist) * delta;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Center gravity — pulls every node back toward the layout's center.
      for (const n of state) {
        n.vx += force((c.x - n.x) * centerForce);
        n.vy += force((c.y - n.y) * centerForce);
      }

      // Integrate with damping.
      for (const n of state) {
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx;
        n.y += n.vy;
      }

      // Contain — soft wall at maxRadius so an under-constrained node can't
      // wander off indefinitely.
      for (const n of state) {
        const dx = n.x - c.x;
        const dy = n.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxRadius) {
          const scale = maxRadius / dist;
          n.x = c.x + dx * scale;
          n.y = c.y + dy * scale;
          n.vx *= 0.3;
          n.vy *= 0.3;
        }
      }

      setPositions(state.map((n) => ({ x: n.x, y: n.y })));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `nodes`/`links` are fixed decorative graphs for the component's
    // lifetime; live values are read from the refs above each frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return positions;
}
