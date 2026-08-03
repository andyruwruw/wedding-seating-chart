interface IconProps {
  size?: number;
}

const BASE_PROPS = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * Shared icon set, styled to match the sidebar nav's monochrome stroke
 * icons (see `sidebar-nav.tsx`'s `ICON_PROPS`) — the one icon language the
 * whole app should use instead of emoji or ad-hoc glyphs.
 */

export function BackIcon({ size = 16 }: IconProps) {
  return (
    <svg {...BASE_PROPS} width={size} height={size} strokeWidth={1.8}>
      <path d="M12.5 4.5 6 10l6.5 5.5" />
    </svg>
  );
}

export function CloseIcon({ size = 14 }: IconProps) {
  return (
    <svg {...BASE_PROPS} width={size} height={size} strokeWidth={1.8}>
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

export function LockIcon({ size = 14 }: IconProps) {
  return (
    <svg {...BASE_PROPS} width={size} height={size} strokeWidth={1.6}>
      <rect x="5" y="9" width="10" height="7" rx="1.5" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  );
}

export function UnlockIcon({ size = 14 }: IconProps) {
  return (
    <svg {...BASE_PROPS} width={size} height={size} strokeWidth={1.6}>
      <rect x="5" y="9" width="10" height="7" rx="1.5" />
      <path d="M7 9V6.5a3 3 0 0 1 5.7-1.4" />
    </svg>
  );
}

export function ImportIcon({ size = 14 }: IconProps) {
  return (
    <svg {...BASE_PROPS} width={size} height={size} strokeWidth={1.6}>
      <path d="M10 13V4M6.5 7.5 10 4l3.5 3.5" />
      <path d="M4 14v1.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V14" />
    </svg>
  );
}

export function ExportIcon({ size = 14 }: IconProps) {
  return (
    <svg {...BASE_PROPS} width={size} height={size} strokeWidth={1.6}>
      <path d="M10 4v9M6.5 9.5 10 13l3.5-3.5" />
      <path d="M4 14v1.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V14" />
    </svg>
  );
}

export function SparkleIcon({ size = 16 }: IconProps) {
  return (
    <svg {...BASE_PROPS} width={size} height={size} strokeWidth={1.4}>
      <path d="M10 2l1.8 6.2L18 10l-6.2 1.8L10 18l-1.8-6.2L2 10l6.2-1.8L10 2z" />
    </svg>
  );
}

/** Used for the "stranger harmony" compatibility readout. */
export function HarmonyIcon({ size = 12 }: IconProps) {
  return (
    <svg {...BASE_PROPS} width={size} height={size} strokeWidth={1.6}>
      <path d="M10 17s-6-4-6-8.5A3.5 3.5 0 0 1 10 6a3.5 3.5 0 0 1 6 2.5C16 13 10 17 10 17z" />
    </svg>
  );
}

export function WarningIcon({ size = 12 }: IconProps) {
  return (
    <svg {...BASE_PROPS} width={size} height={size} strokeWidth={1.6}>
      <path d="M10 3.5 17.5 16h-15L10 3.5z" />
      <path d="M10 8.5v3.2" />
      <circle cx="10" cy="14.1" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Represents "invert / flip the ranking" for the worst-case seating toggle. */
export function SwapIcon({ size = 18 }: IconProps) {
  return (
    <svg {...BASE_PROPS} width={size} height={size} strokeWidth={1.6}>
      <path d="M4 7h9M13 7l-3-3M13 7l-3 3" />
      <path d="M16 13H7M7 13l3-3M7 13l3 3" />
    </svg>
  );
}

/** FOMO level as a fill-bar meter — reads as an intensity meter, not an emoji face. */
export function FomoIcon({ level, size = 14 }: IconProps & { level: number }) {
  const bars = [
    { x: 3, y: 12, h: 5 },
    { x: 8.3, y: 8, h: 9 },
    { x: 13.6, y: 4, h: 13 },
  ];
  return (
    <svg {...BASE_PROPS} width={size} height={size} strokeWidth={1.5}>
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={3.4}
          height={b.h}
          rx={1}
          fill={i <= level ? "currentColor" : "none"}
        />
      ))}
    </svg>
  );
}
