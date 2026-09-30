import type { StageId } from "./types";

/**
 * Imagery for the Founder Toolkit.
 *
 * Photography from Lummi, chosen as a story rather than a texture pack: a
 * freelancer deciding, a maker in her studio, a café owner writing a price on a
 * board, a contract being signed, a whiteboard, a handshake, a shopkeeper with
 * the lights on, a warehouse, and finally a set of keys changing hands.
 *
 * Real trades on purpose. "Launch a business" means a bakery, a flower shop, a
 * ceramics studio — not an abstract render of a building. A founder should see
 * someone recognisable at every stage.
 */
export const STAGE_IMAGE: Record<StageId, string> = {
    /** 00 — you, alone, deciding. */
    fit: "/assets/imgs/founder/stage-00-fit.webp",
    /** 01 — a maker with something people might actually want. */
    opportunity: "/assets/imgs/founder/stage-01-opportunity.webp",
    /** 02 — a price going up on the board. */
    model: "/assets/imgs/founder/stage-02-model.webp",
    /** 03 — the paperwork nobody enjoys and everybody needs. */
    legal: "/assets/imgs/founder/stage-03-legal.webp",
    /** 04 — the room where you explain it. */
    plan: "/assets/imgs/founder/stage-04-plan.webp",
    /** 05 — money, agreed. */
    capital: "/assets/imgs/founder/stage-05-capital.webp",
    /** 06 — open, trading, lights on. */
    operate: "/assets/imgs/founder/stage-06-operate.webp",
    /** 07 — the harder second conversation about money. */
    growth: "/assets/imgs/founder/stage-07-growth.webp",
    /** 08 — more of it, in more places. */
    scale: "/assets/imgs/founder/stage-08-scale.webp",
    /** 09 — the keys change hands. */
    harvest: "/assets/imgs/founder/stage-09-harvest.webp",
};

/**
 * The people in the hero collage. Named as trades rather than personas,
 * because the toolkit is for whoever is actually opening the shop.
 */
export const HERO_COLLAGE: { src: string; alt: string; name: string; role: string }[] = [
    {
        src: "/assets/imgs/founder/hero-baker.webp",
        alt: "A baker standing among the morning's loaves",
        name: "Bakery",
        role: "Stage 06 · Launch",
    },
    {
        src: "/assets/imgs/founder/hero-ceramics.webp",
        alt: "A ceramicist in her studio",
        name: "Ceramics studio",
        role: "Stage 02 · Model",
    },
    {
        src: "/assets/imgs/founder/hero-florist.webp",
        alt: "A florist taking stock on a tablet",
        name: "Flower shop",
        role: "Stage 08 · Scale",
    },
];

/**
 * The three beats of the story band under the hero. Each is a parallax frame:
 * an image that drifts at its own speed while a line of copy holds still.
 */
export const STORY_FRAMES: { src: string; alt: string; speed: string; kicker: string; line: string }[] = [
    {
        src: "/assets/imgs/founder/stage-00-fit.webp",
        alt: "",
        speed: "1.08",
        kicker: "Most founders start here",
        line: "with a hunch, and no idea whether it survives contact with a spreadsheet.",
    },
    {
        src: "/assets/imgs/founder/stage-02-model.webp",
        alt: "",
        speed: "0.94",
        kicker: "Somewhere in the middle",
        line: "it stops being an idea and starts being a thing with a price on it.",
    },
    {
        src: "/assets/imgs/founder/stage-06-operate.webp",
        alt: "",
        speed: "1.12",
        kicker: "And then one day",
        line: "the lights are on, the till is open, and it is simply a business.",
    },
];
