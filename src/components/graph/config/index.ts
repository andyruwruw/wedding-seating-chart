/**
 * Canvas can't read CSS custom properties, so the graph's background/label
 * colors are looked up here per theme instead of living in index.css.
 */
export function graphBackground(dark: boolean): string {
  return dark ? "#1c1e27" : "#f6f6f9";
}
export function labelColor(dark: boolean): string {
  return dark ? "rgba(241, 242, 246, 0.85)" : "rgba(26, 28, 35, 0.85)";
}

/** Base node radius (graph units) before zoom scaling. */
export const NODE_RADIUS = 6;

/** Default node fill when no table coloring is applied. */
export const NODE_COLOR = "#6d4fe6";

/** Node fill for the currently selected guest. */
export const NODE_SELECTED_COLOR = "#c9971a";

export const LABEL_FONT = "600 4px Inter, sans-serif";

/** Keep-apart edges render in this warning color, dashed. */
export const CONFLICT_COLOR = "rgba(217, 49, 74, 0.9)";

/** "Might get along" hints render in this soft color, dashed. */
export const TENTATIVE_COLOR = "rgba(15, 157, 122, 0.75)";
