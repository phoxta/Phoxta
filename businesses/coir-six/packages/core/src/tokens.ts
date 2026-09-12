/**
 * Coir Six design tokens — the same values as the web app's Tailwind theme
 * (src/index.css), so a phone screen and a browser tab are the one product.
 * A rebrand touches this file and index.css together.
 */
export const colors = {
    brand: "#6c5dd3",
    brandHover: "#5b4cc4",
    brandSoft: "#eeebfb",
    brandGlow: "#9084e6",
    brandInk: "#5446bf",

    fe: "#4a8fe0",
    feSoft: "#e8f1fc",
    feInk: "#2e6db4",
    ux: "#6c5dd3",
    uxSoft: "#eeebfb",
    uxInk: "#5446bf",
    br: "#d35db7",
    brSoft: "#fbe8f5",
    brInk: "#a93a8c",
    mint: "#2b8a61",
    mintSoft: "#e4f5ee",
    peach: "#c0692b",
    peachSoft: "#fcebd9",
    danger: "#e5623b",
    dangerSoft: "#fcebe5",
    dangerInk: "#c44a25",
    plum: "#6f2e8c",
    plumSoft: "#f3e6f8",

    page: "#f6f6fa",
    card: "#ffffff",
    subtle: "#ebe9f8",
    line: "#ececf2",
    lineStrong: "#dcdce5",
    track: "#dcd9f3",
    backdrop: "#dcdde3",

    ink: "#1b1b23",
    muted: "#5f5f74",
    caption: "#6e6e82",
    white: "#ffffff",
} as const;

/** "radius scales with the size of the thing" */
export const radius = { xs: 6, sm: 12, md: 14, lg: 16, xl: 20, "2xl": 24, full: 999 } as const;

/** Cover gradients per course theme (the design's, no photo needed). */
export const coverGradient = {
    fe: ["#4A8FE0", "#2E6DB4"],
    ux: ["#8A7BE6", "#6C5DD3"],
    br: ["#E77FC8", "#C24A9A"],
    mint: ["#5FB88F", "#2B8A61"],
    peach: ["#E8A46B", "#C0692B"],
} as const;

export const fontFamily = "Plus Jakarta Sans";
