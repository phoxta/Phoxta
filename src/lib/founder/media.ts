import type { StageId } from "./types";

/**
 * Imagery for the Founder Toolkit hub.
 *
 * The toolkit shipped as pure text, which read as a reference document rather
 * than a product. These assets give it the same visual weight as the rest of
 * phoxta.com — and, more importantly, a narrative.
 *
 * The ten stage images are chosen as a story rather than a texture pack: it
 * opens on a person, moves through a brand taking shape and the structure under
 * it, passes a real shop with its lights on, and closes on the thing the whole
 * journey was for. A founder scrolling the rail should feel the arc even with
 * the words switched off.
 */
export const STAGE_IMAGE: Record<StageId, string> = {
    /** 00 — you, before any of it exists. */
    fit: "/assets/imgs/pages/home-14/sec-2-portrait.webp",
    /** 01 — the world you are about to look at properly. */
    opportunity: "/assets/imgs/pages/home-6/image-15.webp",
    /** 02 — an idea becoming a brand someone could actually buy. */
    model: "/assets/imgs/pages/home-6/image-11.webp",
    /** 03 — the structure underneath, which nobody sees and everybody needs. */
    legal: "/assets/imgs/pages/home-13/home-13_sec_9_2.webp",
    /** 04 — the room where you explain it. */
    plan: "/assets/imgs/pages/home-7/insight-1-retro.webp",
    /** 05 — money, which changes the shape of everything. */
    capital: "/assets/imgs/pages/bg-img-5.webp",
    /** 06 — open, trading, lights on. */
    operate: "/assets/imgs/pages/home-6/image-12.webp",
    /** 07 — something people come back for. */
    growth: "/assets/imgs/pages/home-6/image-13.webp",
    /** 08 — more of it, in more places. */
    scale: "/assets/imgs/pages/home-6/image-14.webp",
    /** 09 — what it was all worth. */
    harvest: "/assets/imgs/pages/home-13/home-13_sec_9_5.webp",
};

/** Hero background — the gradient-render family the homepage hero uses,
 *  a different frame so the two pages are siblings, not duplicates. */
export const HERO_BG = "/assets/imgs/pages/bg-img-6.webp";

/** Hero video. Muted, looping, autoplaying — texture, not something to watch. */
export const HERO_VIDEO = "/assets/imgs/video/video-1.mp4";
export const HERO_VIDEO_POSTER = "/assets/imgs/pages/bg-img-7.webp";

/** The card row at the hero's right: real Phoxta storefronts, so the free
 *  toolkit visibly belongs to the company that sells the finished businesses. */
export const HERO_CARDS: { src: string; alt: string }[] = [
    { src: "/assets/imgs/pages/FS1.webp", alt: "A car rental storefront built on Phoxta" },
    { src: "/assets/imgs/pages/FS3.webp", alt: "A restaurant storefront built on Phoxta" },
    { src: "/assets/imgs/pages/FS7.webp", alt: "A skincare storefront built on Phoxta" },
];

/** Rotating hero headlines. The hero is the only place most visitors read. */
export const HERO_SLIDES: { title: string; sub: string }[] = [
    {
        title: "Everything you need to launch and grow a business.",
        sub: "Forty-seven tools across the ten stages of building a company — from deciding whether to start, to working out what it is worth.",
    },
    {
        title: "Every number shows its source and its year.",
        sub: "Most startup advice on the internet cites nothing. This cites a 2018 Harvard method and thirteen researched supplements written in 2026.",
    },
    {
        title: "No account. No cost. Works in any country.",
        sub: "Tell it where you are and what you sell, and the legal forms, funding routes and benchmarks adjust to match.",
    },
];

/**
 * The three beats of the story band under the hero. Each is a parallax frame:
 * an image that drifts at its own speed while a line of copy holds still.
 * Deliberately only three — this is a breath between the hero and the rail,
 * not a second homepage.
 */
export const STORY_FRAMES: { src: string; alt: string; speed: string; kicker: string; line: string }[] = [
    {
        src: "/assets/imgs/pages/home-15/sec-1-avatar-1.webp",
        alt: "",
        speed: "1.08",
        kicker: "Most founders start here",
        line: "with a hunch and no idea whether it survives contact with a spreadsheet.",
    },
    {
        src: "/assets/imgs/pages/home-6/image-11.webp",
        alt: "",
        speed: "0.94",
        kicker: "Somewhere in the middle",
        line: "it stops being an idea and starts being a thing with a price on it.",
    },
    {
        src: "/assets/imgs/pages/home-6/image-12.webp",
        alt: "",
        speed: "1.12",
        kicker: "And then one day",
        line: "the lights are on, the till is open, and it is simply a business.",
    },
];
