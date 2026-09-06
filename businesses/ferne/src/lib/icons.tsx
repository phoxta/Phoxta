/** The store's icon set. Inline SVG so nothing blocks first paint on a font or
 *  sprite request, and so each glyph inherits `currentColor`. */
import type { ReactElement } from "react";

const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
};

export const IconBag = (): ReactElement => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M6 8h12l-1 12H7z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
);

export const IconHeart = ({ filled = false }: { filled?: boolean }): ReactElement => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
    </svg>
);

export const IconArrow = (): ReactElement => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
);

export const IconArrowLeft = (): ReactElement => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} strokeWidth={2} aria-hidden="true">
        <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
);

export const IconSearch = (): ReactElement => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M20 20l-4-4" />
    </svg>
);

export const IconBurger = (): ReactElement => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
);

export const IconClose = (): ReactElement => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} strokeWidth={2} aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

export const IconUser = (): ReactElement => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
);

export const IconCheck = (): ReactElement => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} strokeWidth={2.5} aria-hidden="true">
        <path d="M5 12l5 5 9-10" />
    </svg>
);

export const IconLeaf = ({ color = "#fff" }: { color?: string }): ReactElement => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M12 21c0-6 3-11 8-13-1 7-4 11-8 13z" />
        <path d="M12 21c0-6-3-11-8-13 1 7 4 11 8 13z" />
        <path d="M12 21V9" />
    </svg>
);

export const IconRefill = (): ReactElement => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} strokeWidth={2} aria-hidden="true">
        <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
        <path d="M18 3v4h-4M6 21v-4h4" />
    </svg>
);

export const IconTruck = (): ReactElement => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} strokeWidth={2} aria-hidden="true">
        <rect x="3" y="7" width="13" height="10" rx="2" />
        <path d="M16 10h3l2 3v4h-5" />
        <circle cx="7.5" cy="18" r="1.5" />
        <circle cx="17.5" cy="18" r="1.5" />
    </svg>
);

export const IconInstagram = (): ReactElement => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
);

export const IconTikTok = (): ReactElement => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
        <path d="M14 4c.5 2.5 2.5 4 5 4" />
    </svg>
);
