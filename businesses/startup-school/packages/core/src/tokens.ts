/**
 * Phoxta Startup School design tokens — the same values as the web app's Tailwind theme
 * (src/index.css), so a phone screen and a browser tab are the one product.
 * A rebrand touches this file and index.css together.
 *
 * Taken from the school's own marketing hero: vermilion #C7260A over maroon
 * #800B01, with #F0460E kept as a decorative glow because white on it is only
 * 3.76:1. See the long note in src/index.css for why each value is what it is.
 */
export const colors = {
    brand: "#c7260a",
    brandHover: "#a01f08",
    brandSoft: "#fdeae5",
    /** The hero's CTA orange. Decoration only — it cannot carry white text. */
    brandGlow: "#f0460e",
    brandInk: "#9e1e06",

    start: "#c7260a",
    startSoft: "#fdeae5",
    startInk: "#9e1e06",
    fund: "#800b01",
    fundSoft: "#e9cac1",
    fundInk: "#800b01",
    grow: "#8f5e00",
    growSoft: "#fbf1da",
    growInk: "#6d4700",
    mint: "#2b7a55",
    mintSoft: "#e3f2ea",
    /** Deliberately the same gold as `grow`, not a near-miss of it. */
    peach: "#8f5e00",
    peachSoft: "#fbf1da",
    danger: "#c41d3f",
    dangerSoft: "#fce8ec",
    dangerInk: "#9e1230",
    plum: "#3f5e6b",
    plumSoft: "#e6eef1",

    page: "#f8f5f3",
    card: "#ffffff",
    subtle: "#f1edeb",
    line: "#e9e4e1",
    lineStrong: "#dbd4d0",
    track: "#e6dfdb",
    backdrop: "#ddd7d3",

    ink: "#1d1d1d",
    muted: "#585959",
    caption: "#6e6a68",
    white: "#ffffff",
} as const;

/** "radius scales with the size of the thing" */
export const radius = { xs: 6, sm: 12, md: 14, lg: 16, xl: 20, "2xl": 24, full: 999 } as const;

/**
 * Cover gradients per course theme.
 *
 * `theme` is decorative and independent of the course's track, so these five
 * exist to give a grid of cards variety — which means they all have to sit in
 * the hero's warm family or the odd one out reads as a mistake rather than a
 * choice. `mint` was green and is now olive-bronze for exactly that reason; the
 * SEMANTIC mint (a passed quiz, a finished session) is still green, because a
 * success state has a job that the brand family cannot do.
 *
 * Every light stop clears 3:1 against white for the overlaid sparkle, and every
 * pair is at least dE 18 apart.
 */
export const coverGradient = {
    start: ["#E8501F", "#A01F08"],
    fund: ["#B02A12", "#5E0800"],
    grow: ["#B98211", "#6D4700"],
    mint: ["#7A6A16", "#443A06"],
    peach: ["#C96A22", "#8A3F06"],
} as const;

export const fontFamily = "Plus Jakarta Sans";
