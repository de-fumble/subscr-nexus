/**
 * Shared Apple-style design tokens used across all org dashboard pages.
 * Import these instead of duplicating the constants in every file.
 */

export const APPLE_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif";

/** Wraps the entire page in Apple's #f5f5f7 background. Apply to the inner <main> content div. */
export const pageWrap =
  "min-h-screen bg-[#f5f5f7] dark:bg-[#000]";

/** Max-width centered content container */
export const pageInner =
  "max-w-[1100px] mx-auto px-6 pt-8 pb-16 space-y-7";

/** Apple-style white card with shadow only (no border) */
export const card =
  "bg-white dark:bg-[#1c1c1e] rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)]";

/** Hoverable card variant */
export const cardHover =
  `${card} cursor-pointer transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.09),0_0_0_0.5px_rgba(0,0,0,0.07)] hover:-translate-y-px`;

/** Section label above card groups */
export const sectionLabel =
  "text-[11px] font-semibold uppercase tracking-[0.07em] text-black/35 dark:text-white/35 px-1 mb-2";

/** Primary number / stat value */
export const statValue =
  "text-[22px] font-semibold tracking-[-0.02em] leading-none text-black dark:text-white tabular-nums";

/** Supporting detail text */
export const detailText =
  "text-[11px] text-black/30 dark:text-white/30 tabular-nums";

/** Table header cell */
export const thCell =
  "text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-[0.07em] text-black/30 dark:text-white/30";

/** Table body row */
export const trRow =
  "hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors";

/** Table body cell */
export const tdCell = "py-3 px-4";

/** Divider between table rows */
export const tableDivider = "divide-y divide-black/4 dark:divide-white/4";

/** Tooltip style for recharts */
export const tooltipStyle = {
  backgroundColor: "white",
  border: "none",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  fontFamily: APPLE_FONT,
  padding: "6px 12px",
} as const;

/** X/Y axis style for recharts */
export const axisStyle = {
  fontSize: 11,
  fill: "rgba(0,0,0,0.28)",
  fontFamily: APPLE_FONT,
} as const;

/** Black pill action button (e.g. Refresh, Save) */
export const pillBtn =
  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[12px] font-medium transition-all duration-200 hover:opacity-75 active:scale-95 disabled:opacity-40";

/** Ghost text button */
export const ghostBtn =
  "flex items-center gap-1 text-[11px] font-medium text-black/40 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60 transition-colors";
