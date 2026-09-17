import type { BoardKind, NewChecklistLine } from "./types";

/**
 * The starter shelf: templates, a small curated picture library, and the
 * party checklist the companion falls back to.
 *
 * WHY THERE IS NO WEB IMAGE SEARCH HERE. The brief's engineering list names
 * "search" as a pin source. Searching a third-party image index would mean
 * (a) calling an origin the app's content-security policy does not allow,
 * (b) rendering pictures nobody in the family has ever seen on a screen a
 * five-year-old also uses, and (c) hot-linking, which rule 1 of this module
 * forbids. So "search" here searches what the family already owns — their
 * memories, their studio work, every pin on a board they can see, and the
 * curated set below — and pasting a URL covers the rest, with the picture
 * cached on the way in. It is a deliberate substitution, and the Add-a-pin
 * sheet says so in as many words.
 */

export interface LibraryItem {
    id: string;
    title: string;
    url: string;
    tags: string[];
    kinds: BoardKind[];
}

/** Photographs that ship with the app (public/images), free to use. */
export const LIBRARY: LibraryItem[] = [
    { id: "lib-kitchen-shaker", title: "Shaker doors, warm wood", url: "/images/moodboards-kitchen-shaker.jpg", tags: ["kitchen", "shaker", "wood"], kinds: ["interior"] },
    { id: "lib-kitchen-green", title: "Deep green cabinets", url: "/images/moodboards-kitchen-green.jpg", tags: ["kitchen", "green", "colour"], kinds: ["interior"] },
    { id: "lib-kitchen-splashback", title: "Tiled splashback", url: "/images/moodboards-kitchen-splashback.jpg", tags: ["kitchen", "tiles"], kinds: ["interior"] },
    { id: "lib-kitchen-shelf", title: "Open shelving", url: "/images/moodboards-kitchen-shelf.jpg", tags: ["kitchen", "storage"], kinds: ["interior"] },
    { id: "lib-kitchen-worktop", title: "Pale worktop, dark base", url: "/images/moodboards-kitchen-worktop.jpg", tags: ["kitchen", "worktop"], kinds: ["interior"] },
    { id: "lib-kitchen-handles", title: "Brass handles", url: "/images/moodboards-kitchen-handles.jpg", tags: ["kitchen", "brass", "detail"], kinds: ["interior"] },
    { id: "lib-kitchen-lighting", title: "Pendants over the island", url: "/images/moodboards-kitchen-lighting.jpg", tags: ["kitchen", "lighting"], kinds: ["interior"] },
    { id: "lib-kitchen-floor", title: "Wood floor that survives children", url: "/images/moodboards-kitchen-floor.jpg", tags: ["kitchen", "floor"], kinds: ["interior"] },
    { id: "lib-dino-cake", title: "Dinosaur cake", url: "/images/moodboards-dino-cake.jpg", tags: ["dinosaurs", "cake", "birthday"], kinds: ["party"] },
    { id: "lib-dino-toys", title: "Dinosaur table toys", url: "/images/moodboards-dino-toys.jpg", tags: ["dinosaurs", "favours"], kinds: ["party"] },
    { id: "lib-party-table", title: "The party table", url: "/images/moodboards-party-table.jpg", tags: ["birthday", "table"], kinds: ["party"] },
    { id: "lib-party-balloons", title: "Balloon arch", url: "/images/moodboards-party-balloons.jpg", tags: ["birthday", "balloons"], kinds: ["party"] },
    { id: "lib-party-bunting", title: "Paper bunting", url: "/images/moodboards-party-bunting.jpg", tags: ["birthday", "bunting", "make"], kinds: ["party"] },
    { id: "lib-party-games", title: "Garden games", url: "/images/moodboards-party-games.jpg", tags: ["birthday", "games"], kinds: ["party"] },
    { id: "lib-ankara", title: "Ankara, bold print", url: "/images/moodboards-ankara.jpg", tags: ["ankara", "sunday best", "colour"], kinds: ["style"] },
    { id: "lib-headwrap", title: "Gele", url: "/images/moodboards-headwrap.jpg", tags: ["gele", "sunday best"], kinds: ["style"] },
    { id: "lib-suit", title: "A suit that fits", url: "/images/moodboards-suit.jpg", tags: ["tailoring", "sunday best"], kinds: ["style"] },
    { id: "lib-shoes", title: "Shoes, brown leather", url: "/images/moodboards-shoes.jpg", tags: ["shoes", "sunday best"], kinds: ["style"] },
    { id: "lib-hair", title: "Braids", url: "/images/moodboards-hair.jpg", tags: ["hair", "sunday best"], kinds: ["style"] },
    { id: "lib-lagos-street", title: "Lagos, midweek", url: "/images/moodboards-lagos-street.jpg", tags: ["lagos", "city"], kinds: ["holiday"] },
    { id: "lib-lagos-food", title: "Jollof and plantain", url: "/images/moodboards-lagos-food.jpg", tags: ["lagos", "food"], kinds: ["holiday"] },
    { id: "lib-lagos-fabric", title: "Fabric market", url: "/images/moodboards-lagos-fabric.jpg", tags: ["lagos", "fabric", "market"], kinds: ["holiday", "style"] },
    { id: "lib-lagos-beach", title: "Sunset, Lekki side", url: "/images/moodboards-lagos-beach.jpg", tags: ["lagos", "beach"], kinds: ["holiday"] },
    { id: "lib-garden-beds", title: "Raised beds", url: "/images/moodboards-garden-beds.jpg", tags: ["garden", "growing"], kinds: ["garden"] },
    { id: "lib-garden-shed", title: "A shed that earns its corner", url: "/images/moodboards-garden-shed.jpg", tags: ["garden", "storage"], kinds: ["garden"] },
    { id: "lib-garden-pots", title: "Terracotta pots", url: "/images/moodboards-garden-pots.jpg", tags: ["garden", "pots"], kinds: ["garden"] },
    { id: "lib-garden-lights", title: "Festoon lights", url: "/images/moodboards-garden-lights.jpg", tags: ["garden", "lighting"], kinds: ["garden", "party"] },
    { id: "lib-desk", title: "A desk you can think at", url: "/images/moodboards-desk.jpg", tags: ["study", "desk"], kinds: ["school-project", "ideas"] },
    { id: "lib-study-shelf", title: "Books within reach", url: "/images/moodboards-study-shelf.jpg", tags: ["study", "books"], kinds: ["school-project", "ideas"] },
    { id: "lib-pinboard", title: "Pinboard, colour-coded", url: "/images/moodboards-pinboard.jpg", tags: ["study", "revision"], kinds: ["school-project"] },
    { id: "lib-lamp", title: "Warm desk lamp", url: "/images/moodboards-lamp.jpg", tags: ["study", "lighting"], kinds: ["school-project", "interior"] },
    { id: "lib-christmas-table", title: "Christmas table", url: "/images/moodboards-christmas-table.jpg", tags: ["christmas", "table"], kinds: ["party"] },
    { id: "lib-christmas-wreath", title: "Wreath on the door", url: "/images/moodboards-christmas-wreath.jpg", tags: ["christmas", "make"], kinds: ["party"] },
    { id: "lib-christmas-candles", title: "Candles down the middle", url: "/images/moodboards-christmas-candles.jpg", tags: ["christmas", "candles"], kinds: ["party"] },
    { id: "lib-christmas-place", title: "Place cards", url: "/images/moodboards-christmas-place.jpg", tags: ["christmas", "place cards"], kinds: ["party"] },
    { id: "lib-linen", title: "Linen and greenery", url: "/images/moodboards-linen.jpg", tags: ["table", "linen"], kinds: ["party", "interior"] },
    { id: "lib-palette", title: "Paint swatches", url: "/images/moodboards-palette.jpg", tags: ["colour", "paint"], kinds: ["interior", "ideas"] },
];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface BoardTemplate {
    id: string;
    label: string;
    kind: BoardKind;
    blurb: string;
    sections: string[];
    tags: string[];
}

export const TEMPLATES: BoardTemplate[] = [
    { id: "party", label: "Party", kind: "party", blurb: "Cake, table, games, favours — and a checklist you can turn into tasks.", sections: ["The look", "Food & cake", "Games", "Favours"], tags: ["party"] },
    { id: "interior", label: "Interior", kind: "interior", blurb: "A room, broken into the decisions you actually have to make.", sections: ["Layout", "Colour & finish", "Lighting", "Storage"], tags: ["home"] },
    { id: "wardrobe", label: "Wardrobe", kind: "style", blurb: "Outfits, fabric, shoes and the shapes that suit you.", sections: ["Outfits", "Fabric", "Shoes & jewellery"], tags: ["style"] },
    { id: "wedding", label: "Wedding", kind: "party", blurb: "The day, in the order you'll book it.", sections: ["Venue", "Dress & attire", "Flowers", "Table", "Music"], tags: ["wedding"] },
    { id: "garden", label: "Garden", kind: "garden", blurb: "Beds, paths, pots and what to plant when.", sections: ["Beds & borders", "Paths & seating", "Pots", "Lighting"], tags: ["garden"] },
];

export const templateById = (id: string | null): BoardTemplate | undefined => (id ? TEMPLATES.find((t) => t.id === id) : undefined);

// ---------------------------------------------------------------------------
// The party checklist the companion falls back to
// ---------------------------------------------------------------------------

/**
 * When the companion is unavailable (no backend, allowance used up, offline)
 * the party board still produces a checklist — the same shape, written by
 * hand, so the feature never depends on the model being reachable. That is the
 * brief's "template fallback" rule applied outside the briefing.
 */
export function partyChecklistTemplate(boardTitle: string): NewChecklistLine[] {
    return [
        { text: `Fix the date and time for ${boardTitle}`, note: "Two hours is plenty for under-tens.", dueInDays: 0, origin: "template" },
        { text: "Write the guest list and send invitations", note: "Ask for allergies on the invitation itself.", dueInDays: 2, origin: "template" },
        { text: "Order or bake the cake", note: "Pin the one everybody agreed on, then order from it.", dueInDays: 7, origin: "template" },
        { text: "Buy decorations from the board", note: "Balloons, bunting, table cover.", dueInDays: 10, origin: "template" },
        { text: "Plan three games and one quiet activity", note: "The quiet one is for when it all gets too much.", dueInDays: 12, origin: "template" },
        { text: "Make up the party bags", note: "One per guest, plus two spare.", dueInDays: 14, origin: "template" },
        { text: "Confirm who is helping on the day", note: "Two adults besides the parents.", dueInDays: 15, origin: "template" },
        { text: "Charge the camera and pick a playlist", note: "Somebody has to take the photographs.", dueInDays: 16, origin: "template" },
    ];
}

/** Colours we can name without a model, for the palette's fallback. */
export function namedColour(hex: string): string {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return "Colour";
    const int = parseInt(m[1], 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2 / 255;
    const sat = max === min ? 0 : (max - min) / (l > 0.5 ? 510 - max - min : max + min);
    if (sat < 0.12) return l > 0.78 ? "Chalk" : l > 0.45 ? "Stone" : l > 0.2 ? "Slate" : "Charcoal";
    let h = 0;
    if (max === r) h = ((g - b) / (max - min)) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else h = (r - g) / (max - min) + 4;
    h = (h * 60 + 360) % 360;
    const name = h < 20 ? "Terracotta" : h < 45 ? "Ochre" : h < 70 ? "Straw" : h < 160 ? "Olive" : h < 200 ? "Teal" : h < 250 ? "Ink blue" : h < 300 ? "Plum" : h < 340 ? "Rose" : "Terracotta";
    return `${l > 0.62 ? "Pale " : l < 0.3 ? "Deep " : ""}${name}`;
}
