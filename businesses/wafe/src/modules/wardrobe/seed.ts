import type { SeedContext } from "@/data/core";
import { isoDate } from "@/lib/format";
import type { Capsule, Colour, DonateJob, GivingEntry, HandDown, ItemCategory, ItemStatus, Occasion, Outfit, ReplacementWish, ScheduleEntry, Season, WardrobeItem, WardrobeState } from "./types";

/**
 * The Adeyemi family's wardrobes — 118 garments, 14 outfits and two weeks of
 * decided mornings.
 *
 * It is deliberately the biggest seed in the app, because a closet manager
 * that opens on twelve items is a demo and a closet manager that opens on a
 * hundred and eighteen is a product: the filters have to earn their place, the
 * grid has to scroll, and "what does Ayo wear on Tuesday" has to be a real
 * question. Everything is written as compact tuples so a hundred rows stay
 * readable and a family can be changed in one line.
 *
 * Every date is relative to `ctx.today` (Sunday), so the schedule always shows
 * a week that has just been lived and a week about to be. The cross-module
 * ids are stable on purpose: `wardrobe-donate-1` is the donate job the Tasks
 * seed already points at, and `wardrobe-wish-1` is the replacement Finance
 * picks up as a `sourceType: "wardrobe"` wish.
 */

// ---------------------------------------------------------------------------
// Photos: one small set per category, cycled deterministically.
// ---------------------------------------------------------------------------

const PHOTOS: Record<ItemCategory, string[]> = {
    top: ["wardrobe-top-1", "wardrobe-top-2", "wardrobe-top-3", "wardrobe-top-4"],
    bottom: ["wardrobe-bottom-1", "wardrobe-bottom-2", "wardrobe-bottom-3"],
    dress: ["wardrobe-dress-1", "wardrobe-dress-2"],
    outerwear: ["wardrobe-outerwear-1", "wardrobe-outerwear-2"],
    shoes: ["wardrobe-shoes-1", "wardrobe-shoes-2", "wardrobe-shoes-3", "wardrobe-shoes-4"],
    accessory: ["wardrobe-accessory-1", "wardrobe-accessory-2", "wardrobe-accessory-3"],
    uniform: ["wardrobe-uniform-1", "wardrobe-uniform-2"],
    traditional: ["wardrobe-traditional-1", "wardrobe-traditional-2", "wardrobe-traditional-3"],
    sleepwear: ["wardrobe-top-3", "wardrobe-top-1"],
    sportswear: ["wardrobe-uniform-3", "wardrobe-uniform-4"],
};

// ---------------------------------------------------------------------------
// The tuple: [name, category, colour, season, size, brand, occasions, flags]
//   flags — "fav" favourite · "wash" in the laundry · "out" outgrown
//           "down" handed down · "w:<n>" last worn n days ago
// ---------------------------------------------------------------------------

type Row = [string, ItemCategory, Colour, Season, string, string, Occasion[], string?];

const IFE: Row[] = [
    ["Cream silk blouse", "top", "white", "all", "UK 12", "Jigsaw", ["everyday", "formal"], "w:4"],
    ["Olive linen shirt", "top", "green", "summer", "UK 12", "Uniqlo", ["everyday"], "w:9"],
    ["Black roll-neck jumper", "top", "black", "winter", "UK 12", "M&S", ["everyday", "formal"]],
    ["Rust knitted cardigan", "top", "orange", "autumn", "UK 12", "Seasalt", ["everyday"], "fav w:2"],
    ["Breton striped top", "top", "navy", "all", "UK 12", "Boden", ["everyday"], "wash w:1"],
    ["Black tailored trousers", "bottom", "black", "all", "UK 12", "Hobbs", ["formal"], "w:4"],
    ["Dark indigo jeans", "bottom", "navy", "all", "UK 12", "Levi's", ["everyday"], "fav w:1"],
    ["Wide-leg linen trousers", "bottom", "beige", "summer", "UK 12", "Arket", ["everyday"], "w:12"],
    ["Pleated midi skirt", "bottom", "green", "autumn", "UK 12", "COS", ["everyday", "church"]],
    ["Navy wrap dress", "dress", "navy", "all", "UK 12", "Whistles", ["formal", "church"], "w:14"],
    ["Floral tea dress", "dress", "pink", "summer", "UK 12", "Ghost", ["church", "party"], "w:21"],
    ["Camel wool coat", "outerwear", "brown", "winter", "UK 12", "Jaeger", ["everyday", "formal"], "fav"],
    ["Olive quilted jacket", "outerwear", "green", "autumn", "UK 12", "Barbour", ["everyday", "play"], "w:3"],
    ["Navy raincoat", "outerwear", "navy", "spring", "UK 12", "Seasalt", ["everyday", "play"], "w:8"],
    ["Black leather ankle boots", "shoes", "black", "autumn", "UK 6", "Clarks", ["everyday", "formal"], "w:3"],
    ["Tan leather loafers", "shoes", "brown", "all", "UK 6", "Dune", ["everyday", "formal"], "w:4"],
    ["White trainers", "shoes", "white", "all", "UK 6", "Veja", ["everyday", "play"], "w:1"],
    ["Nude court heels", "shoes", "beige", "all", "UK 6", "LK Bennett", ["formal", "church"], "w:7"],
    ["Ankara wrap dress, blue and gold", "traditional", "multi", "all", "UK 12", "Yaba market", ["church", "party"], "fav w:7"],
    ["Gold gele headwrap", "traditional", "gold", "all", "One size", "Balogun market", ["church", "party"], "w:7"],
    ["Iro and buba, emerald", "traditional", "green", "all", "UK 12", "Mama Fọláké's tailor", ["church", "formal"], "w:35"],
    ["Terracotta silk scarf", "accessory", "orange", "all", "One size", "Liberty", ["everyday", "formal"]],
    ["Grey wool scarf", "accessory", "grey", "winter", "One size", "M&S", ["everyday"]],
    ["Brown leather tote", "accessory", "brown", "all", "One size", "Radley", ["everyday", "formal"], "w:4"],
    ["Cotton pyjama set", "sleepwear", "blue", "all", "UK 12", "M&S", ["everyday"], "w:1"],
    ["Black yoga leggings", "sportswear", "black", "all", "UK 12", "Sweaty Betty", ["sport"], "w:2"],
];

const TUNDE: Row[] = [
    ["White oxford shirt", "top", "white", "all", "16in collar", "Charles Tyrwhitt", ["formal", "church"], "w:5"],
    ["Blue oxford shirt", "top", "blue", "all", "16in collar", "Charles Tyrwhitt", ["formal"], "w:2"],
    ["Grey marl sweatshirt", "top", "grey", "autumn", "L", "Uniqlo", ["everyday"], "w:1"],
    ["Navy merino jumper", "top", "navy", "winter", "L", "M&S", ["everyday", "formal"], "fav"],
    ["Black polo shirt", "top", "black", "summer", "L", "Fred Perry", ["everyday"], "w:11"],
    ["Stone chinos", "bottom", "beige", "all", "34R", "GANT", ["everyday", "formal"], "w:3"],
    ["Dark jeans", "bottom", "navy", "all", "34R", "Levi's", ["everyday"], "fav w:1"],
    ["Grey suit trousers", "bottom", "grey", "all", "34R", "Reiss", ["formal"], "w:2"],
    ["Navy suit jacket", "outerwear", "navy", "all", "40R", "Reiss", ["formal", "church"], "w:2"],
    ["Black wool overcoat", "outerwear", "black", "winter", "L", "M&S", ["formal", "everyday"]],
    ["Yellow cycling rain jacket", "outerwear", "yellow", "all", "L", "Rapha", ["sport"], "w:6"],
    ["Brown brogues", "shoes", "brown", "all", "UK 9", "Loake", ["formal", "church"], "w:2"],
    ["White trainers", "shoes", "white", "all", "UK 9", "Adidas", ["everyday"], "w:1"],
    ["Cycling shoes", "shoes", "black", "all", "UK 9", "Shimano", ["sport"], "w:6"],
    ["Green wellingtons", "shoes", "green", "winter", "UK 9", "Hunter", ["play"], "w:20"],
    ["Cream and gold agbada", "traditional", "beige", "all", "L", "Lagos tailor", ["church", "formal"], "fav w:7"],
    ["Ankara shirt, indigo", "traditional", "blue", "all", "L", "Yaba market", ["church", "party"], "w:28"],
    ["Navy flat cap", "accessory", "navy", "autumn", "One size", "Christys'", ["everyday"]],
    ["Brown leather belt", "accessory", "brown", "all", "34in", "M&S", ["everyday", "formal"], "w:2"],
    ["Burgundy silk tie", "accessory", "red", "all", "One size", "T.M.Lewin", ["formal"], "w:9"],
    ["Addiscombe CC jersey", "sportswear", "red", "all", "L", "Addiscombe Cycling Club", ["sport"], "fav w:6"],
    ["Black bib shorts", "sportswear", "black", "all", "L", "dhb", ["sport"], "w:6"],
    ["Navy pyjama bottoms", "sleepwear", "navy", "all", "L", "M&S", ["everyday"], "w:1"],
    ["Grey gym shorts", "sportswear", "grey", "summer", "L", "Nike", ["sport"], "wash w:2"],
];

const DAMI: Row[] = [
    ["School blazer", "uniform", "black", "all", "Age 15-16", "Coloma Convent", ["school"], "w:2"],
    ["School blouse, white", "uniform", "white", "all", "Age 15-16", "Coloma Convent", ["school"], "wash w:2"],
    ["School skirt, grey", "uniform", "grey", "all", "Age 15-16", "Coloma Convent", ["school"], "w:2"],
    ["School jumper, maroon", "uniform", "red", "winter", "Age 15-16", "Coloma Convent", ["school"], "w:2"],
    ["School tie", "uniform", "red", "all", "One size", "Coloma Convent", ["school"], "w:2"],
    ["PE top", "sportswear", "navy", "all", "Age 15-16", "Coloma Convent", ["sport", "school"], "w:4"],
    ["PE shorts", "sportswear", "navy", "all", "Age 15-16", "Coloma Convent", ["sport"], "w:4"],
    ["Football boots", "shoes", "black", "all", "UK 5", "Nike", ["sport"], "w:4"],
    ["Black school shoes", "shoes", "black", "all", "UK 5", "Clarks", ["school"], "w:2"],
    ["Oversized sage hoodie", "top", "green", "autumn", "S", "Weekday", ["everyday"], "fav w:1"],
    ["Cropped white tee", "top", "white", "summer", "S", "Uniqlo", ["everyday"], "w:6"],
    ["Ribbed black vest top", "top", "black", "summer", "S", "H&M", ["everyday"], "w:13"],
    ["Denim jacket", "outerwear", "blue", "spring", "S", "Levi's", ["everyday"], "fav w:6"],
    ["Black puffer jacket", "outerwear", "black", "winter", "S", "The North Face", ["everyday", "school"]],
    ["Mom jeans", "bottom", "blue", "all", "W26", "Topshop", ["everyday"], "fav w:1"],
    ["Khaki cargo trousers", "bottom", "green", "all", "S", "Bershka", ["everyday"], "w:6"],
    ["Pleated tennis skirt", "bottom", "white", "summer", "S", "H&M", ["everyday", "sport"], "w:19"],
    ["Plum slip dress", "dress", "purple", "summer", "S", "Zara", ["party"], "w:26"],
    ["Navy church dress", "dress", "navy", "all", "Age 13-14", "Monsoon", ["church"], "out"],
    ["Ankara skater dress", "traditional", "multi", "all", "S", "Lagos tailor", ["church", "party"], "fav w:7"],
    ["Chunky white trainers", "shoes", "white", "all", "UK 5", "Nike", ["everyday"], "fav w:1"],
    ["Black slides", "shoes", "black", "summer", "UK 5", "Adidas", ["everyday"], "w:16"],
    ["Brown crossbody bag", "accessory", "brown", "all", "One size", "Accessorize", ["everyday", "church"], "w:7"],
    ["Fleece pyjamas", "sleepwear", "pink", "winter", "Age 15-16", "Primark", ["everyday"], "w:1"],
];

const TOBI: Row[] = [
    ["Co-op polo shirt, navy", "uniform", "navy", "all", "Age 9-10", "Croydon Home-Ed Co-op", ["school"], "w:3"],
    ["Co-op sweatshirt", "uniform", "navy", "autumn", "Age 9-10", "Croydon Home-Ed Co-op", ["school"], "w:3"],
    ["Grey school trousers", "uniform", "grey", "all", "Age 9-10", "M&S", ["school"], "w:3"],
    ["Black school shoes", "shoes", "black", "all", "Size 2", "Clarks", ["school"], "out"],
    ["Dinosaur t-shirt", "top", "green", "summer", "Age 9-10", "Next", ["everyday", "play"], "fav w:2"],
    ["Striped long-sleeve top", "top", "red", "all", "Age 9-10", "Boden", ["everyday"], "w:5"],
    ["Arsenal football shirt", "top", "red", "all", "Age 9-10", "Adidas", ["sport", "play"], "fav w:1"],
    ["Mustard hoodie", "top", "yellow", "autumn", "Age 9-10", "H&M", ["everyday", "play"], "w:4"],
    ["Grey fleece jumper", "top", "grey", "winter", "Age 8-9", "Mountain Warehouse", ["play"], "out"],
    ["Green waterproof coat", "outerwear", "green", "spring", "Age 9-10", "Regatta", ["play", "school"], "w:5"],
    ["Blue jeans", "bottom", "blue", "all", "Age 9-10", "Gap", ["everyday"], "w:2"],
    ["Grey jogging bottoms", "bottom", "grey", "all", "Age 9-10", "Nike", ["everyday", "sport"], "fav wash w:1"],
    ["Beige cargo shorts", "bottom", "beige", "summer", "Age 9-10", "Next", ["play"], "w:17"],
    ["Navy church trousers", "bottom", "navy", "all", "Age 9-10", "M&S", ["church"], "w:7"],
    ["Swimming trunks", "sportswear", "blue", "all", "Age 9-10", "Speedo", ["sport"], "w:5"],
    ["Swimming goggles", "accessory", "blue", "all", "One size", "Speedo", ["sport"], "w:5"],
    ["Blue trainers", "shoes", "blue", "all", "Size 2", "Clarks", ["everyday", "play"], "fav w:1"],
    ["Yellow wellingtons", "shoes", "yellow", "winter", "Size 2", "Joules", ["play"], "w:10"],
    ["Football boots", "shoes", "black", "all", "Size 2", "Nike", ["sport"], "w:8"],
    ["Ankara shirt, green and gold", "traditional", "green", "all", "Age 9-10", "Lagos tailor", ["church", "party"], "w:7"],
    ["Bobble hat and gloves", "accessory", "red", "winter", "One size", "Mountain Warehouse", ["play"]],
    ["Blue dressing gown", "sleepwear", "blue", "winter", "Age 9-10", "Primark", ["everyday"], "w:1"],
    ["Dinosaur pyjamas", "sleepwear", "green", "all", "Age 9-10", "Next", ["everyday"], "fav w:1"],
    ["Science club apron", "accessory", "white", "all", "Age 9-10", "Croydon Home-Ed Co-op", ["school"], "w:3"],
];

const AYO: Row[] = [
    ["School polo shirt, white", "uniform", "white", "all", "Age 5-6", "Winterbourne Infants", ["school"], "w:2"],
    ["School cardigan, red", "uniform", "red", "autumn", "Age 5-6", "Winterbourne Infants", ["school"], "w:2"],
    ["School pinafore, grey", "uniform", "grey", "all", "Age 5-6", "Winterbourne Infants", ["school"], "w:2"],
    ["Red gingham summer dress", "uniform", "red", "summer", "Age 5-6", "Winterbourne Infants", ["school"], "w:11"],
    ["Black school shoes", "shoes", "black", "all", "Size 10", "Clarks", ["school"], "w:2"],
    ["Navy padded winter coat", "outerwear", "navy", "winter", "Age 6-7", "Mountain Warehouse", ["play", "school"], "down"],
    ["Pink raincoat", "outerwear", "pink", "spring", "Age 5-6", "Regatta", ["play"], "w:5"],
    ["Unicorn t-shirt", "top", "purple", "summer", "Age 5-6", "Next", ["everyday", "play"], "fav w:3"],
    ["Yellow long-sleeve top", "top", "yellow", "all", "Age 5-6", "H&M", ["everyday"], "w:4"],
    ["Cream cardigan", "top", "white", "autumn", "Age 5-6", "Next", ["church", "everyday"], "w:7"],
    ["Denim pinafore dress", "dress", "blue", "all", "Age 5-6", "Gap", ["everyday"], "w:6"],
    ["Gold party dress", "dress", "gold", "all", "Age 5-6", "Monsoon", ["party", "church"], "fav w:23"],
    ["Ankara dress, pink and orange", "traditional", "multi", "all", "Age 5-6", "Lagos tailor", ["church", "party"], "fav w:7"],
    ["Navy leggings", "bottom", "navy", "all", "Age 5-6", "Primark", ["everyday", "play"], "w:3"],
    ["Pink leggings", "bottom", "pink", "all", "Age 5-6", "Primark", ["everyday", "play"], "wash w:1"],
    ["Denim shorts", "bottom", "blue", "summer", "Age 4-5", "Gap", ["play"], "out"],
    ["Pink trainers", "shoes", "pink", "all", "Size 10", "Clarks", ["everyday", "play"], "fav w:1"],
    ["Red wellingtons", "shoes", "red", "winter", "Size 10", "Joules", ["play"], "w:9"],
    ["Purple swimming costume", "sportswear", "purple", "all", "Age 5-6", "Speedo", ["sport"], "w:5"],
    ["Ladybird pyjamas", "sleepwear", "red", "all", "Age 5-6", "Next", ["everyday"], "fav w:1"],
];

// ---------------------------------------------------------------------------

export function seed(ctx: SeedContext): WardrobeState {
    const { space, at, img } = ctx;

    /**
     * Calendar days, computed locally.
     *
     * `ctx.day()` slices its date out of `toISOString()`, which is the previous
     * day everywhere the space is ahead of UTC — which is London for eight
     * months of the year. The schedule is the one thing in this module that
     * MUST land on the right morning, so the dates here are built from local
     * time (anchored at noon, so a clock change cannot move them either).
     */
    const day = (offset: number): string => {
        const d = new Date(`${ctx.today}T12:00:00`);
        d.setDate(d.getDate() + offset);
        return isoDate(d);
    };
    const [ife, tunde] = ctx.parents;
    const [dami, tobi, ayo] = ctx.kids;

    const items: WardrobeItem[] = [];
    const byName = new Map<string, string>();
    const counters: Record<string, number> = {};
    let n = 0;

    const build = (ownerId: string, ownerKey: string, rows: Row[]): void => {
        for (const [name, category, colour, season, size, brand, occasions, flags = ""] of rows) {
            const f = flags.split(/\s+/);
            const wornDays = Number(f.find((x) => x.startsWith("w:"))?.slice(2) ?? NaN);
            const status: ItemStatus = f.includes("out") ? "outgrown" : f.includes("down") ? "handed-down" : "in-use";
            const idx = (counters[category] = (counters[category] ?? 0) + 1) - 1;
            const pool = PHOTOS[category];
            const id = `wi-${++n}`;
            byName.set(`${ownerKey}:${name}`, id);
            items.push({
                id,
                spaceId: space.id,
                name,
                ownerMemberId: ownerId,
                category,
                colour,
                season,
                size,
                brand,
                occasions,
                imageUrl: img(pool[idx % pool.length]),
                status,
                favourite: f.includes("fav"),
                inLaundry: f.includes("wash"),
                lastWorn: Number.isFinite(wornDays) ? day(-wornDays) : null,
                wearCount: Number.isFinite(wornDays) ? 4 + ((n * 7) % 23) : 0,
                careNotes: category === "traditional" ? "Hand wash cold, line dry in the shade." : category === "uniform" ? "40°, tumble dry low. Name tape inside the collar." : "",
                notes: "",
                capsuleIds: [],
                visibility: category === "sleepwear" && (ownerId === ife.id || ownerId === tunde.id) ? "private" : "family",
                sharedWith: [],
                createdAt: at(-120 - (n % 400), "10:00"),
            });
        }
    };

    build(ife.id, "ife", IFE);
    build(tunde.id, "tunde", TUNDE);
    build(dami.id, "dami", DAMI);
    build(tobi.id, "tobi", TOBI);
    build(ayo.id, "ayo", AYO);

    /** Look a garment up by owner and name — the seed's only cross-reference. */
    const of = (owner: string, ...names: string[]): string[] => names.map((x) => byName.get(`${owner}:${x}`)).filter((x): x is string => Boolean(x));
    const one = (owner: string, name: string): string => of(owner, name)[0] ?? "";

    // -- Outfits -------------------------------------------------------------

    let o = 0;
    const outfit = (name: string, memberId: string, occasion: Outfit["occasion"], itemIds: string[], extra: Partial<Outfit> = {}): Outfit => ({
        id: `wo-${++o}`,
        spaceId: space.id,
        name,
        memberId,
        occasion,
        itemIds,
        imageUrl: null,
        notes: "",
        isUniform: false,
        lastWorn: null,
        createdBy: ife.id,
        createdAt: at(-60, "20:00"),
        ...extra,
    });

    const outfits: Outfit[] = [
        outfit("Sunday best", ife.id, "church", of("ife", "Ankara wrap dress, blue and gold", "Gold gele headwrap", "Nude court heels", "Brown leather tote"), { imageUrl: img("wardrobe-outfit-church"), notes: "The blue and gold, with the gele Mama Fọláké tied for me.", lastWorn: day(-7) }),
        outfit("Client day", ife.id, "formal", of("ife", "Cream silk blouse", "Black tailored trousers", "Tan leather loafers", "Brown leather tote", "Terracotta silk scarf"), { notes: "Camera-ready from the waist up, comfortable from the waist down.", lastWorn: day(-4) }),
        outfit("Church, Sunday", tunde.id, "church", of("tunde", "Cream and gold agbada", "Brown brogues"), { lastWorn: day(-7) }),
        outfit("Canary Wharf Monday", tunde.id, "formal", of("tunde", "Blue oxford shirt", "Grey suit trousers", "Navy suit jacket", "Burgundy silk tie", "Brown brogues", "Brown leather belt"), { isUniform: true, lastWorn: day(-2) }),
        outfit("Club ride", tunde.id, "sport", of("tunde", "Addiscombe CC jersey", "Black bib shorts", "Yellow cycling rain jacket", "Cycling shoes"), { notes: "Saturday, 7am, Farthing Downs.", lastWorn: day(-1) }),
        outfit("School day", dami.id, "school", of("dami", "School blazer", "School blouse, white", "School skirt, grey", "School jumper, maroon", "School tie", "Black school shoes"), { imageUrl: img("wardrobe-outfit-school"), isUniform: true, lastWorn: day(-2) }),
        outfit("PE Wednesday", dami.id, "sport", of("dami", "PE top", "PE shorts", "Football boots"), { lastWorn: day(-4) }),
        outfit("Church, Sunday", dami.id, "church", of("dami", "Ankara skater dress", "Chunky white trainers", "Brown crossbody bag"), { lastWorn: day(-7) }),
        outfit("Saturday, out with friends", dami.id, "everyday", of("dami", "Oversized sage hoodie", "Mom jeans", "Chunky white trainers", "Denim jacket"), { lastWorn: day(-1) }),
        outfit("Co-op Tuesday", tobi.id, "school", of("tobi", "Co-op polo shirt, navy", "Co-op sweatshirt", "Grey school trousers", "Blue trainers", "Science club apron"), { isUniform: true, lastWorn: day(-5) }),
        outfit("Swimming Friday", tobi.id, "sport", of("tobi", "Swimming trunks", "Swimming goggles", "Grey jogging bottoms", "Blue trainers"), { notes: "Kit in the blue bag the night before, or it is forgotten.", lastWorn: day(-2) }),
        outfit("Church, Sunday", tobi.id, "church", of("tobi", "Ankara shirt, green and gold", "Navy church trousers", "Blue trainers"), { lastWorn: day(-7) }),
        outfit("Reception days", ayo.id, "school", of("ayo", "School polo shirt, white", "School pinafore, grey", "School cardigan, red", "Black school shoes"), { isUniform: true, lastWorn: day(-2) }),
        outfit("Sunday best", ayo.id, "church", of("ayo", "Ankara dress, pink and orange", "Cream cardigan", "Pink trainers"), { imageUrl: img("wardrobe-outfit-party"), lastWorn: day(-7) }),
    ];

    const outfitId = (memberId: string, name: string): string => outfits.find((x) => x.memberId === memberId && x.name === name)?.id ?? "";

    // -- The schedule: the week just lived, today, and the week ahead ---------

    let s = 0;
    const plan = (memberId: string, offset: number, name: string, eventLabel: string, note = ""): ScheduleEntry => ({
        id: `ws-${++s}`,
        spaceId: space.id,
        memberId,
        date: day(offset),
        outfitId: outfitId(memberId, name),
        eventLabel,
        note,
        wornAt: offset < 0 ? at(offset, "08:10") : null,
    });

    const schedule: ScheduleEntry[] = [
        // Last week
        ...[-6, -5, -4, -3, -2].map((d) => plan(dami.id, d, d === -4 ? "PE Wednesday" : "School day", d === -4 ? "PE" : "School")),
        plan(tobi.id, -5, "Co-op Tuesday", "Co-op"),
        plan(tobi.id, -3, "Co-op Tuesday", "Co-op"),
        plan(tobi.id, -2, "Swimming Friday", "Swimming"),
        ...[-6, -5, -4, -3, -2].map((d) => plan(ayo.id, d, "Reception days", d === -2 ? "School and swimming" : "School")),
        plan(ife.id, -4, "Client day", "Workshop in Shoreditch"),
        plan(tunde.id, -6, "Canary Wharf Monday", "Office"),
        plan(tunde.id, -3, "Canary Wharf Monday", "Office"),
        plan(tunde.id, -1, "Club ride", "Addiscombe club ride"),
        // Today — church
        plan(ife.id, 0, "Sunday best", "Church", "Grace Chapel, 10am."),
        plan(tunde.id, 0, "Church, Sunday", "Church", "Leading Bible study after the service."),
        plan(dami.id, 0, "Church, Sunday", "Church"),
        plan(tobi.id, 0, "Church, Sunday", "Church"),
        plan(ayo.id, 0, "Sunday best", "Church", "The pink and orange one, she has already asked."),
        // The week ahead
        ...[1, 2, 4, 5].map((d) => plan(dami.id, d, "School day", "School")),
        plan(dami.id, 3, "PE Wednesday", "PE", "Netball trial after school."),
        plan(tobi.id, 2, "Co-op Tuesday", "Co-op"),
        plan(tobi.id, 4, "Co-op Tuesday", "Co-op", "Science fair set-up."),
        plan(tobi.id, 5, "Swimming Friday", "Swimming"),
        ...[1, 2, 3, 4].map((d) => plan(ayo.id, d, "Reception days", "School")),
        plan(ayo.id, 5, "Reception days", "School and swimming", "Costume and towel in the red bag."),
        plan(ife.id, 1, "Client day", "Client workshop, 11am"),
        plan(tunde.id, 1, "Canary Wharf Monday", "Office"),
        plan(tunde.id, 6, "Club ride", "Addiscombe club ride"),
        plan(ife.id, 7, "Sunday best", "Church"),
    ].filter((x) => x.outfitId);

    // -- Trip capsules: Christmas in Lagos -----------------------------------

    let c = 0;
    const capsule = (memberId: string, itemIds: string[], notes: string): Capsule => ({
        id: `wc-${++c}`,
        spaceId: space.id,
        name: "Lagos, Christmas",
        memberId,
        tripId: null,
        tripLabel: "Christmas in Lagos",
        season: "summer",
        itemIds,
        notes,
        createdAt: at(-9, "21:30"),
    });

    const capsules: Capsule[] = [
        capsule(ife.id, of("ife", "Ankara wrap dress, blue and gold", "Gold gele headwrap", "Iro and buba, emerald", "Olive linen shirt", "Wide-leg linen trousers", "Floral tea dress", "Nude court heels", "Tan leather loafers"), "Two church outfits, one for the thanksgiving service, and something to travel in."),
        capsule(tunde.id, of("tunde", "Cream and gold agbada", "Ankara shirt, indigo", "White oxford shirt", "Stone chinos", "Black polo shirt", "Brown brogues", "White trainers"), "The agbada is for the compound on Christmas Day."),
        capsule(dami.id, of("dami", "Ankara skater dress", "Cropped white tee", "Ribbed black vest top", "Khaki cargo trousers", "Plum slip dress", "Black slides", "Chunky white trainers"), "Nothing heavy. It is thirty-two degrees."),
        capsule(tobi.id, of("tobi", "Ankara shirt, green and gold", "Navy church trousers", "Dinosaur t-shirt", "Arsenal football shirt", "Beige cargo shorts", "Swimming trunks", "Blue trainers"), "Trunks — there is a pool at the hotel in Ikeja."),
        capsule(ayo.id, of("ayo", "Ankara dress, pink and orange", "Gold party dress", "Unicorn t-shirt", "Yellow long-sleeve top", "Navy leggings", "Purple swimming costume", "Pink trainers"), "The gold dress for the family photograph."),
    ];

    for (const cap of capsules) {
        for (const id of cap.itemIds) {
            const it = items.find((x) => x.id === id);
            if (it) it.capsuleIds = [...it.capsuleIds, cap.id];
        }
    }

    // -- Hand-me-downs -------------------------------------------------------

    const coatId = one("ayo", "Navy padded winter coat");
    const handdowns: HandDown[] = [
        {
            id: "wd-1",
            spaceId: space.id,
            itemId: coatId,
            itemName: "Navy padded winter coat",
            fromMemberId: tobi.id,
            toMemberId: ayo.id,
            note: "Tobi shot up over the summer. Ayo has been asking for it since she saw the hood.",
            at: at(-42, "16:20"),
        },
        {
            id: "wd-2",
            spaceId: space.id,
            itemId: one("tobi", "Yellow wellingtons"),
            itemName: "Yellow wellingtons",
            fromMemberId: dami.id,
            toMemberId: tobi.id,
            note: "Third child in these. Still watertight.",
            at: at(-210, "11:00"),
        },
    ].filter((h) => h.itemId);

    // -- The outgrown pipeline ----------------------------------------------

    const shoesId = one("tobi", "Black school shoes");
    const fleeceId = one("tobi", "Grey fleece jumper");
    const shortsId = one("ayo", "Denim shorts");

    const wishes: ReplacementWish[] = [
        {
            id: "wardrobe-wish-1",
            spaceId: space.id,
            itemId: shoesId,
            name: "Shoes size 3",
            forMemberId: tobi.id,
            size: "Size 3",
            priceCents: 3400,
            note: "Clarks, black, velcro — the laces never get tied. Measure his feet first; he was a 2 in April.",
            status: "open",
            createdBy: ife.id,
            createdAt: at(-2, "19:40"),
        },
        {
            id: "wardrobe-wish-2",
            spaceId: space.id,
            itemId: null,
            name: "Two school blouses, age 15-16",
            forMemberId: dami.id,
            size: "Age 15-16",
            priceCents: 1800,
            note: "One is grey now and one has a biro line down the sleeve.",
            status: "sent",
            createdBy: ife.id,
            createdAt: at(-16, "20:05"),
        },
        {
            id: "wardrobe-wish-3",
            spaceId: space.id,
            itemId: shortsId,
            name: "Denim shorts, age 5-6",
            forMemberId: ayo.id,
            size: "Age 5-6",
            priceCents: 1200,
            note: "For Lagos. The old pair is age 4-5 and will not fasten.",
            status: "bought",
            createdBy: ife.id,
            createdAt: at(-11, "13:15"),
        },
    ];

    const donations: DonateJob[] = [
        {
            id: "wardrobe-donate-1",
            spaceId: space.id,
            title: "Donate the outgrown school shoes",
            itemIds: [shoesId, fleeceId, shortsId].filter(Boolean),
            charity: "The charity shop on London Road",
            dueDate: day(6),
            assigneeMemberId: ife.id,
            note: "Three things from the wardrobe clear-out. The shoes still have a term in them for somebody.",
            doneAt: null,
            givingEntryId: null,
            createdBy: ife.id,
            createdAt: at(-2, "19:42"),
        },
        {
            id: "wardrobe-donate-0",
            spaceId: space.id,
            title: "Summer bag for the church collection",
            itemIds: [],
            charity: "Grace Chapel clothing collection",
            dueDate: day(-26),
            assigneeMemberId: tunde.id,
            note: "Eight things the children grew out of over the summer.",
            doneAt: at(-24, "12:30"),
            givingEntryId: "wardrobe-giving-1",
            createdBy: ife.id,
            createdAt: at(-31, "18:00"),
        },
    ];

    const giving: GivingEntry[] = [
        {
            id: "wardrobe-giving-1",
            spaceId: space.id,
            donationId: "wardrobe-donate-0",
            label: "Clothing to Grace Chapel collection",
            itemCount: 8,
            amountCents: 4500,
            budgetId: "giving",
            date: day(-24),
            memberId: tunde.id,
            note: "Estimated at what the charity shop would price them.",
        },
    ];

    // The two garments already in the donate bag read as "to donate", not merely
    // "outgrown" — the pipeline is visible on the item itself.
    for (const id of [shoesId, fleeceId, shortsId]) {
        const it = items.find((x) => x.id === id);
        if (it) it.status = "donate";
    }

    return { items, outfits, schedule, capsules, handdowns, wishes, donations, giving };
}
