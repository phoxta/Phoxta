import type { SeedContext, Visibility } from "@/data/core";
import { placeholderCard } from "./images";
import { partyChecklistTemplate } from "./library";
import type { Board, BoardKind, BoardSection, ChecklistItem, MoodboardsState, Pin, PinComment, Reaction } from "./types";

/**
 * The Adeyemis' boards.
 *
 * Eight of them, and they are the eight a family like this one actually keeps:
 * the kitchen they are half-way through paying for, the birthday party in
 * three weeks, what Ifeoluwa wears on a Sunday (hers alone), Christmas in Lagos
 * with Mama Fọláké pinning from Ibadan, the garden, Dami's revision corner,
 * the Christmas table, and Tobi's dinosaurs — which nobody has looked at yet,
 * so a parent has something real to review.
 *
 * Every picture is a copy we serve from `public/images`; the web pins keep the
 * page they came from in `sourceUrl` and render the stored copy, which is what
 * "cached" means here. Two pins are deliberately typographic cards: they are
 * links whose server would not let us take the picture, and the board says so.
 */

type PinSpec = {
    /** A library file name (without the extension), or null for a link card. */
    img: string | null;
    title: string;
    note?: string;
    tags: string[];
    by: string;
    days: number;
    price?: number;
    colour?: string;
    url?: string;
    section?: number;
};

export function seed(ctx: SeedContext): MoodboardsState {
    const [ife, tunde] = ctx.parents;
    const [dami, tobi, ayo] = ctx.kids;
    const [folake] = ctx.guests;

    const boards: Board[] = [];
    const sections: BoardSection[] = [];
    const pins: Pin[] = [];
    const comments: PinComment[] = [];
    const checklist: ChecklistItem[] = [];

    const board = (
        b: Omit<Board, "id" | "spaceId" | "createdAt" | "updatedAt" | "reviewedAt" | "reviewedBy" | "archived"> & {
            id?: string;
            createdDays: number;
            updatedDays: number;
            reviewedAt?: string | null;
            reviewedBy?: string | null;
            sectionTitles?: string[];
        },
    ): { row: Board; sectionIds: string[] } => {
        const { createdDays, updatedDays, sectionTitles = [], reviewedAt = null, reviewedBy = null, id, ...rest } = b;
        const row: Board = {
            ...rest,
            id: id ?? ctx.uid("board"),
            spaceId: ctx.space.id,
            reviewedAt,
            reviewedBy,
            archived: false,
            createdAt: ctx.at(createdDays, "20:10"),
            updatedAt: ctx.at(updatedDays, "21:05"),
        };
        boards.push(row);
        const sectionIds = sectionTitles.map((title, i) => {
            const s: BoardSection = { id: ctx.uid("bsec"), spaceId: ctx.space.id, boardId: row.id, title, order: i };
            sections.push(s);
            return s.id;
        });
        return { row, sectionIds };
    };

    const addPins = (boardId: string, sectionIds: string[], specs: PinSpec[]): Pin[] => {
        const made: Pin[] = [];
        specs.forEach((p, i) => {
            const web = Boolean(p.url);
            const imageUrl = p.img ? ctx.img(p.img) : placeholderCard(p.title, p.url ? new URL(p.url).hostname.replace(/^www\./, "") : "typed in by hand");
            const row: Pin = {
                id: ctx.uid("pin"),
                spaceId: ctx.space.id,
                boardId,
                sectionId: p.section === undefined ? null : (sectionIds[p.section] ?? null),
                title: p.title,
                note: p.note ?? "",
                source: web ? "url" : "library",
                sourceUrl: p.url ?? null,
                imageUrl,
                cachedFrom: p.img ? (web ? "fetched" : "library") : "placeholder",
                cachedAt: ctx.at(p.days, "20:30"),
                tags: p.tags,
                priceCents: p.price ?? null,
                colour: p.colour ?? null,
                order: i,
                addedBy: p.by,
                copiedFromPinId: null,
                createdAt: ctx.at(p.days, "20:30"),
            };
            pins.push(row);
            made.push(row);
        });
        return made;
    };

    const say = (pinId: string, memberId: string, text: string, days: number, hhmm: string, reaction: Reaction | null = null): void => {
        comments.push({ id: ctx.uid("pcm"), spaceId: ctx.space.id, pinId, memberId, text, reaction, at: ctx.at(days, hhmm) });
    };

    const base = (kind: BoardKind, visibility: Visibility) => ({ kind, visibility });

    // =======================================================================
    // 1 · Kitchen refresh — the board the project is actually being built from
    // =======================================================================
    const kitchen = board({
        ...base("interior", "family"),
        title: "Kitchen refresh",
        description: "Everything we've agreed on, and the two things we still haven't. Doing it once, doing it properly, finishing before Lagos.",
        template: "interior",
        ownerMemberId: ife.id,
        collaboratorIds: [tunde.id, dami.id],
        sharedWith: [],
        childSafe: true,
        tags: ["home", "kitchen"],
        coverPinId: null,
        projectId: "proj-1",
        projectLabel: "Kitchen refresh",
        tripId: null,
        tripLabel: "",
        createdDays: -63,
        updatedDays: -2,
        sectionTitles: ["Layout", "Colour & finish", "Lighting", "Storage"],
    });
    const kitchenPins = addPins(kitchen.row.id, kitchen.sectionIds, [
        { img: "moodboards-kitchen-shaker", title: "Shaker doors, warm wood", note: "This is the one. Plain fronts, no beading, so it doesn't date.", tags: ["kitchen", "shaker", "wood"], by: ife.id, days: -60, colour: "#c8a879", section: 1, url: "https://www.johnlewis.com/kitchens/shaker" },
        { img: "moodboards-kitchen-green", title: "Deep green base units", note: "Oluwafemi's favourite. Green below, pale above — nothing above eye level is dark.", tags: ["kitchen", "green", "colour"], by: tunde.id, days: -58, colour: "#4f6b4a", section: 1 },
        { img: "moodboards-kitchen-worktop", title: "Pale worktop over dark bases", note: "Quartz. We compared it properly in the project — oak lost on the maintenance.", tags: ["kitchen", "worktop"], by: ife.id, days: -47, price: 214000, colour: "#e2ded4", section: 1 },
        { img: "moodboards-kitchen-splashback", title: "Splashback: small square tiles", note: "Grout in a warm grey, not white. White grout by a hob is a lie.", tags: ["kitchen", "tiles"], by: ife.id, days: -40, price: 18600, colour: "#cfd6d2", section: 1 },
        { img: "moodboards-kitchen-lighting", title: "Three pendants over the island", note: "Three, not two — the island is 2.4m and two looks mean.", tags: ["kitchen", "lighting"], by: tunde.id, days: -36, price: 27000, colour: "#d9cdb8", section: 2 },
        { img: "moodboards-lamp", title: "A lamp on the worktop", note: "For the corner by the back door, so the room is warm before the big lights go on.", tags: ["kitchen", "lighting", "warm"], by: ife.id, days: -33, price: 5900, colour: "#c8873f", section: 2 },
        { img: "moodboards-kitchen-shelf", title: "Open shelving on the short wall", note: "Two shelves only. Everything on them has to be used weekly or it goes.", tags: ["kitchen", "storage"], by: ife.id, days: -30, colour: "#b79a76", section: 3 },
        { img: "moodboards-kitchen-handles", title: "Brass handles", note: "Unlacquered, so they go dull and warm instead of scratched and shiny.", tags: ["kitchen", "brass", "detail"], by: dami.id, days: -26, price: 9800, colour: "#b08d4f", section: 1 },
        { img: "moodboards-kitchen-floor", title: "Engineered oak, wide boards", note: "Three children and a dog. Engineered, not solid, and a matt finish.", tags: ["kitchen", "floor"], by: tunde.id, days: -22, price: 96000, colour: "#c9a17a", section: 1, url: "https://www.woodfloorwarehouse.co.uk/oak" },
        { img: "moodboards-palette", title: "The palette, on paper", note: "Held against the window at 8am and again at 6pm. It survives both.", tags: ["kitchen", "colour", "paint"], by: ife.id, days: -19, colour: "#ded5c4", section: 1 },
        { img: "moodboards-linen", title: "How we want the table to feel", note: "Not a decision, just the mood. Linen, green, something growing.", tags: ["kitchen", "table", "linen"], by: ife.id, days: -15, colour: "#a9b39c", section: 1 },
        { img: null, title: "Croydon Joinery — the island quote", note: "£3,240 fitted, four weeks from order. Their site won't let us keep the photograph.", tags: ["kitchen", "quote"], by: ife.id, days: -12, price: 324000, url: "https://www.croydonjoinery.example/gallery/island-14" },
        { img: "moodboards-kitchen-shelf", title: "Bin drawer, not a bin", note: "Pull-out, three compartments. The one thing everyone who has done this says.", tags: ["kitchen", "storage"], by: tunde.id, days: -8, price: 14500, colour: "#b79a76", section: 3 },
        { img: null, title: "Tap: pull-out spray, matt black", note: "Still undecided — matt black shows limescale in Croydon water.", tags: ["kitchen", "undecided"], by: ife.id, days: -2, price: 19900, url: "https://www.trade-taps.example/products/8814" },
    ]);
    kitchen.row.coverPinId = kitchenPins[0].id;
    say(kitchenPins[1].id, ife.id, "I've come round to the green. Not on the tall units though.", -57, "21:40", "yes");
    say(kitchenPins[1].id, tunde.id, "That's all I wanted in writing.", -57, "21:52", "love");
    say(kitchenPins[7].id, ife.id, "Dami found these. Cheaper than the ones I'd saved and better.", -25, "19:20", "love");
    say(kitchenPins[13].id, tunde.id, "Chrome. I'll die on this hill.", -1, "22:05", "no");
    say(kitchenPins[13].id, ife.id, "Noted. Let's look at both on Saturday.", -1, "22:11", "maybe");

    // =======================================================================
    // 2 · Tobi's 10th birthday — dinosaurs. Collaborators, and a checklist.
    // =======================================================================
    const party = board({
        ...base("party", "shared"),
        title: "Tobi's 10th birthday — dinosaurs",
        description: "Saturday the 26th, 2–4pm, ours. Tobi is picking the cake and Mama Fọláké is sending ideas from Ibadan.",
        template: "party",
        ownerMemberId: ife.id,
        collaboratorIds: [tunde.id, tobi.id, ayo.id, folake.id],
        sharedWith: [tunde.id, tobi.id, ayo.id, dami.id, folake.id],
        childSafe: true,
        tags: ["party", "dinosaurs", "birthday"],
        coverPinId: null,
        projectId: null,
        projectLabel: "",
        tripId: null,
        tripLabel: "",
        createdDays: -24,
        updatedDays: -1,
        sectionTitles: ["The look", "Food & cake", "Games", "Favours"],
    });
    const partyPins = addPins(party.row.id, party.sectionIds, [
        { img: "moodboards-dino-cake", title: "THE CAKE", note: "Tobi: \"this one, with the green one on top\".", tags: ["dinosaurs", "cake"], by: tobi.id, days: -23, price: 4500, colour: "#6f9a5a", section: 1 },
        { img: "moodboards-party-balloons", title: "Balloon arch by the door", note: "Green and sand, no primary colours.", tags: ["birthday", "balloons"], by: ife.id, days: -21, price: 2400, colour: "#c9c3b6", section: 0 },
        { img: "moodboards-party-bunting", title: "Bunting we can make", note: "Ayo can cut the triangles. Two evenings.", tags: ["birthday", "bunting", "make"], by: ife.id, days: -20, colour: "#d4744f", section: 0 },
        { img: "moodboards-party-table", title: "The table, roughly", note: "Paper cloth. Everything on it survives being knocked over.", tags: ["birthday", "table"], by: ife.id, days: -18, colour: "#dcc9a8", section: 0 },
        { img: "moodboards-dino-toys", title: "Dinosaurs down the middle", note: "From the toy box, not bought. They already own forty.", tags: ["dinosaurs", "table"], by: tunde.id, days: -17, colour: "#c86a3a", section: 0 },
        { img: "moodboards-party-games", title: "Sack race in the garden", note: "Weather plan B: the same thing in the hall with the rug rolled up.", tags: ["birthday", "games"], by: tunde.id, days: -15, section: 2, colour: "#8fa06a" },
        { img: "moodboards-garden-lights", title: "Festoon lights if it runs late", note: "We already own these — they're in the shed.", tags: ["birthday", "lighting"], by: tunde.id, days: -14, colour: "#e0b46a", section: 0 },
        { img: null, title: "Dig-for-fossils tray", note: "Sand tray, plaster eggs, small brushes. Mama Fọláké's idea and it's the best one.", tags: ["dinosaurs", "games"], by: folake.id, days: -11, section: 2, url: "https://www.partysavers.example/fossil-dig" },
        { img: "moodboards-dino-toys", title: "Party bags: one dinosaur each", note: "Plus a biscuit and nothing that makes a noise.", tags: ["favours"], by: ife.id, days: -9, price: 1800, colour: "#c86a3a", section: 3 },
        { img: "moodboards-linen", title: "Green napkins, folded like leaves", note: "Tobi found this. Ten minutes of folding, worth it.", tags: ["birthday", "table", "make"], by: tobi.id, days: -6, colour: "#93a583", section: 0 },
        { img: "moodboards-dino-cake", title: "Cupcakes as the backup pudding", note: "Twelve. Nobody has ever regretted twelve cupcakes.", tags: ["cake", "food"], by: folake.id, days: -4, colour: "#6f9a5a", section: 1 },
        { img: "moodboards-party-games", title: "Pin the tail on the stegosaurus", note: "Ayo's suggestion, and she's right.", tags: ["games", "make"], by: ayo.id, days: -1, section: 2, colour: "#8fa06a" },
    ]);
    party.row.coverPinId = partyPins[0].id;
    say(partyPins[0].id, folake.id, "That cake is beautiful. Save me a piece and send a photograph.", -22, "18:40", "love");
    say(partyPins[0].id, tobi.id, "IT HAS THREE LAYERS", -22, "19:02", "love");
    say(partyPins[7].id, ife.id, "Mama, this is the best idea on the board. Ordering it today.", -10, "09:30", "love");
    say(partyPins[7].id, folake.id, "I have raised four children. I know what keeps them still.", -10, "10:15");
    say(partyPins[11].id, ife.id, "Ayo, that's going on the list.", -1, "17:20", "yes");

    partyChecklistTemplate("Tobi's birthday").forEach((line, i) => {
        checklist.push({
            id: ctx.uid("chk"),
            spaceId: ctx.space.id,
            boardId: party.row.id,
            text: line.text,
            note: line.note ?? "",
            dueInDays: line.dueInDays ?? 0,
            assigneeMemberId: i % 3 === 1 ? tunde.id : ife.id,
            taskId: null,
            sentAt: null,
            origin: "companion",
            order: i,
            createdAt: ctx.at(-7, "21:00"),
        });
    });

    // =======================================================================
    // 3 · Sunday best — Ifeoluwa's alone
    // =======================================================================
    const sunday = board({
        ...base("style", "private"),
        title: "Sunday best",
        description: "What I actually want to wear, rather than what I keep reaching for.",
        template: "wardrobe",
        ownerMemberId: ife.id,
        collaboratorIds: [],
        sharedWith: [],
        childSafe: false,
        tags: ["style", "sunday best"],
        coverPinId: null,
        projectId: null,
        projectLabel: "",
        tripId: null,
        tripLabel: "",
        createdDays: -51,
        updatedDays: -5,
        sectionTitles: ["Outfits", "Fabric", "Shoes & jewellery"],
    });
    const sundayPins = addPins(sunday.row.id, sunday.sectionIds, [
        { img: "moodboards-ankara", title: "Ankara, but quieter", note: "One bold thing at a time. This print with a plain top.", tags: ["ankara", "sunday best", "colour"], by: ife.id, days: -50, colour: "#b5563d", section: 0 },
        { img: "moodboards-headwrap", title: "Gele I can actually tie", note: "The wide one. Twenty minutes is not a Sunday morning.", tags: ["gele", "sunday best"], by: ife.id, days: -46, colour: "#c09040", section: 0 },
        { img: "moodboards-lagos-fabric", title: "Fabric from Balogun for Christmas", note: "Ask Mama Fọláké to look while she's there — six yards.", tags: ["fabric", "lagos"], by: ife.id, days: -38, colour: "#a4643f", section: 1 },
        { img: "moodboards-hair", title: "Braids, shoulder length", note: "Before the party, not after. Six hours and I'd rather it wasn't a Saturday.", tags: ["hair", "sunday best"], by: ife.id, days: -30, section: 0, colour: "#4a3a2f" },
        { img: "moodboards-shoes", title: "Flat shoes that still look like something", note: "I stand for two hours. That is the whole brief.", tags: ["shoes", "sunday best"], by: ife.id, days: -22, price: 7900, colour: "#8a6a4b", section: 2 },
        { img: "moodboards-suit", title: "For Oluwafemi, when he asks", note: "Navy, one button, no pattern. He will ask in December.", tags: ["tailoring", "sunday best"], by: ife.id, days: -14, colour: "#3d4653", section: 0 },
        { img: "moodboards-linen", title: "The colour family, roughly", note: "Warm. Nothing cold-toned near my face.", tags: ["colour"], by: ife.id, days: -9, colour: "#c2a97f", section: 1 },
        { img: "moodboards-palette", title: "Three colours, that's it", note: "Terracotta, olive, cream. Everything I own should get on with those.", tags: ["colour", "rule"], by: ife.id, days: -5, colour: "#b98d63", section: 1 },
    ]);
    sunday.row.coverPinId = sundayPins[0].id;

    // =======================================================================
    // 4 · Lagos trip ideas — shared with Mama Fọláké, linked to the trip
    // =======================================================================
    const lagos = board({
        ...base("holiday", "shared"),
        title: "Lagos trip ideas",
        description: "Fifteen weeks out. What we want to eat, see and bring back — and what Mama Fọláké says we actually need.",
        template: null,
        ownerMemberId: tunde.id,
        collaboratorIds: [ife.id, folake.id, dami.id],
        sharedWith: [ife.id, folake.id, dami.id, tobi.id],
        childSafe: true,
        tags: ["lagos", "christmas", "travel"],
        coverPinId: null,
        projectId: null,
        projectLabel: "",
        tripId: "trip-lagos",
        tripLabel: "Christmas in Lagos",
        createdDays: -44,
        updatedDays: -3,
        sectionTitles: ["Places", "Food", "Bringing back"],
    });
    const lagosPins = addPins(lagos.row.id, lagos.sectionIds, [
        { img: "moodboards-lagos-street", title: "The road to Ikeja on a Tuesday", note: "For the children, so nobody is surprised by the noise.", tags: ["lagos", "city"], by: tunde.id, days: -43, section: 0, colour: "#8a7d68" },
        { img: "moodboards-lagos-food", title: "Jollof, properly", note: "Mama's, not a restaurant's. This is only here to make us hungry.", tags: ["lagos", "food"], by: tunde.id, days: -40, section: 1, colour: "#b5563d" },
        { img: "moodboards-lagos-beach", title: "An afternoon at the beach", note: "One day, early, before it gets busy.", tags: ["lagos", "beach"], by: ife.id, days: -35, section: 0, colour: "#d99a4e" },
        { img: "moodboards-lagos-fabric", title: "Balogun market — fabric list", note: "Six yards for me, two for Ayo's Christmas dress.", tags: ["lagos", "fabric", "market"], by: ife.id, days: -30, section: 2, colour: "#a4643f" },
        { img: null, title: "Lekki Conservation Centre — the canopy walk", note: "Tobi will talk about this for a year. Their site blocks the photo.", tags: ["lagos", "children"], by: folake.id, days: -24, section: 0, url: "https://www.ncfnigeria.example/lekki" },
        { img: "moodboards-lagos-food", title: "Suya on the way home", note: "Dami's non-negotiable.", tags: ["lagos", "food"], by: dami.id, days: -18, section: 1, colour: "#b5563d" },
        { img: "moodboards-headwrap", title: "Gele for the Christmas service", note: "Mama Fọláké is tying it, so I am not to practise.", tags: ["lagos", "sunday best"], by: folake.id, days: -12, section: 2, colour: "#c09040" },
        { img: "moodboards-christmas-place", title: "Christmas Day table at Mama's", note: "Twenty-two people. She has done it before.", tags: ["lagos", "christmas", "table"], by: folake.id, days: -7, section: 0, colour: "#c3b49a" },
        { img: "moodboards-lagos-beach", title: "One quiet morning, just us two", note: "Oluwafemi's. Booked nothing, promised nothing, still counts.", tags: ["lagos", "us"], by: tunde.id, days: -3, section: 0, colour: "#d99a4e" },
    ]);
    lagos.row.coverPinId = lagosPins[2].id;
    say(lagosPins[4].id, tunde.id, "Adding this to the itinerary. Thank you Mama.", -23, "20:10", "love");
    say(lagosPins[7].id, ife.id, "Twenty-two. She says it like it's four.", -6, "21:30", "love");
    say(lagosPins[7].id, folake.id, "Bring the children hungry, that is all I ask.", -6, "22:02");

    // =======================================================================
    // 5 · The garden — the slow one
    // =======================================================================
    const garden = board({
        ...base("garden", "family"),
        title: "The garden, one bed at a time",
        description: "Not this year. Possibly not next. But when we do it, this is it.",
        template: "garden",
        ownerMemberId: tunde.id,
        collaboratorIds: [ife.id, tobi.id],
        sharedWith: [],
        childSafe: true,
        tags: ["garden", "home", "someday"],
        coverPinId: null,
        projectId: null,
        projectLabel: "",
        tripId: null,
        tripLabel: "",
        createdDays: -120,
        updatedDays: -11,
        sectionTitles: ["Beds & borders", "Paths & seating", "Pots", "Lighting"],
    });
    const gardenPins = addPins(garden.row.id, garden.sectionIds, [
        { img: "moodboards-garden-beds", title: "Two raised beds along the fence", note: "Sleepers, 40cm high, so nobody has to kneel.", tags: ["garden", "growing"], by: tunde.id, days: -118, price: 22000, colour: "#6d7a4f", section: 0 },
        { img: "moodboards-garden-pots", title: "Terracotta, mixed sizes", note: "Cheap ones crack in a Croydon February. Buy fewer, better.", tags: ["garden", "pots"], by: ife.id, days: -96, price: 6500, colour: "#b5714a", section: 2 },
        { img: "moodboards-garden-shed", title: "The shed, moved to the corner", note: "It's in the sunniest spot, which is the one thing it doesn't need.", tags: ["garden", "storage"], by: tunde.id, days: -70, colour: "#7b6a52", section: 1 },
        { img: "moodboards-garden-lights", title: "Festoon lights over the table", note: "The single cheapest thing that would change that garden.", tags: ["garden", "lighting"], by: ife.id, days: -55, price: 3800, colour: "#e0b46a", section: 3 },
        { img: "moodboards-garden-beds", title: "Tobi's bed — his to plant", note: "Carrots, sunflowers, whatever he wants. His, not ours.", tags: ["garden", "children"], by: tobi.id, days: -40, colour: "#6d7a4f", section: 0 },
        { img: "moodboards-linen", title: "Somewhere to eat outside", note: "Six chairs, a table that lives out all year.", tags: ["garden", "table"], by: ife.id, days: -28, colour: "#a9b39c", section: 1 },
        { img: "moodboards-garden-pots", title: "Herbs by the back door", note: "Where you can reach them in the rain without shoes.", tags: ["garden", "herbs"], by: ife.id, days: -18, colour: "#b5714a", section: 2 },
        { img: "moodboards-garden-shed", title: "Bike storage that isn't the hall", note: "Four bikes. The hall has had enough.", tags: ["garden", "storage"], by: tunde.id, days: -11, colour: "#7b6a52", section: 1 },
    ]);
    garden.row.coverPinId = gardenPins[0].id;
    say(gardenPins[4].id, tunde.id, "Carrots then. We'll build it in the spring.", -39, "18:40", "love");

    // =======================================================================
    // 6 · Dami's revision corner — a child's board, already reviewed
    // =======================================================================
    const revision = board({
        ...base("school-project", "family"),
        title: "Dami's revision corner",
        description: "Where I'm going to work for the next eight months. Mum says I can have the wall.",
        template: null,
        ownerMemberId: dami.id,
        collaboratorIds: [ife.id],
        sharedWith: [],
        childSafe: true,
        tags: ["study", "gcse", "my room"],
        coverPinId: null,
        projectId: null,
        projectLabel: "",
        tripId: null,
        tripLabel: "",
        createdDays: -33,
        updatedDays: -4,
        reviewedAt: ctx.at(-30, "21:15"),
        reviewedBy: ife.id,
        sectionTitles: ["The desk", "The wall"],
    });
    const revisionPins = addPins(revision.row.id, revision.sectionIds, [
        { img: "moodboards-desk", title: "Desk by the window, not the bed", tags: ["study", "desk"], by: dami.id, days: -32, section: 0, colour: "#a08a6c" },
        { img: "moodboards-pinboard", title: "Colour-coded revision wall", note: "One colour per subject. Chemistry is the red one and there is a lot of red.", tags: ["study", "revision"], by: dami.id, days: -29, section: 1, colour: "#c25a4a" },
        { img: "moodboards-study-shelf", title: "Books off the floor", tags: ["study", "books"], by: dami.id, days: -24, section: 0, colour: "#6b5a45" },
        { img: "moodboards-lamp", title: "A lamp that isn't the ceiling light", note: "Warm bulb. The big light at 9pm is horrible.", tags: ["study", "lighting"], by: dami.id, days: -16, price: 3200, section: 0, colour: "#c8873f" },
        { img: "moodboards-palette", title: "Two colours, nothing loud", note: "Sage and cream. I want to be able to think in there.", tags: ["colour"], by: dami.id, days: -9, section: 1, colour: "#9aa88f" },
        { img: "moodboards-linen", title: "Something soft on the wall", note: "So it doesn't echo when I read out loud.", tags: ["study", "make"], by: dami.id, days: -4, section: 1, colour: "#a9b39c" },
    ]);
    revision.row.coverPinId = revisionPins[0].id;
    say(revisionPins[1].id, ife.id, "This is brilliant. We'll do the wall at half term.", -28, "20:05", "love");

    // =======================================================================
    // 7 · Christmas table — the annual one
    // =======================================================================
    const christmas = board({
        ...base("party", "family"),
        title: "Christmas table",
        description: "We're in Lagos this year, so this is for Mama Fọláké's table — and for ours next year.",
        template: "party",
        ownerMemberId: ife.id,
        collaboratorIds: [tunde.id, folake.id, dami.id],
        sharedWith: [],
        childSafe: true,
        tags: ["christmas", "table"],
        coverPinId: null,
        projectId: null,
        projectLabel: "",
        tripId: "trip-lagos",
        tripLabel: "Christmas in Lagos",
        createdDays: -20,
        updatedDays: -6,
        sectionTitles: ["The table", "Details"],
    });
    const christmasPins = addPins(christmas.row.id, christmas.sectionIds, [
        { img: "moodboards-christmas-table", title: "Warm, not red-and-gold", tags: ["christmas", "table"], by: ife.id, days: -19, section: 0, colour: "#a8623f" },
        { img: "moodboards-christmas-candles", title: "Candles down the middle", note: "Low ones. You have to be able to see the person opposite.", tags: ["christmas", "candles"], by: ife.id, days: -17, section: 0, colour: "#d9a45c" },
        { img: "moodboards-christmas-wreath", title: "Wreath on Mama's door", note: "Made, not bought. Ayo and Tobi, the week before.", tags: ["christmas", "make"], by: folake.id, days: -14, section: 1, colour: "#4f6b4a" },
        { img: "moodboards-christmas-place", title: "Place cards in the children's handwriting", note: "Twenty-two of them. Start early.", tags: ["christmas", "place cards", "make"], by: ife.id, days: -11, section: 1, colour: "#c3b49a" },
        { img: "moodboards-linen", title: "Cloth, and something green on it", tags: ["christmas", "linen"], by: ife.id, days: -9, section: 0, colour: "#a9b39c" },
        { img: "moodboards-lagos-food", title: "Jollof at the centre, obviously", tags: ["christmas", "food"], by: tunde.id, days: -7, section: 0, colour: "#b5563d" },
        { img: "moodboards-christmas-candles", title: "The reading, before the food", note: "Luke 2. Oluwafemi reads it, the children act it, we eat afterwards.", tags: ["christmas", "faith"], by: tunde.id, days: -6, section: 1, colour: "#d9a45c" },
    ]);
    christmas.row.coverPinId = christmasPins[0].id;
    say(christmasPins[3].id, folake.id, "Send them to me and I will put them out myself.", -10, "19:45", "love");

    // =======================================================================
    // 8 · Tobi's dinosaurs — a child's board nobody has looked at yet (AC 4)
    // =======================================================================
    const dinos = board({
        ...base("ideas", "child"),
        title: "Dinosaurs I like",
        description: "For the science fair and also just because.",
        template: null,
        ownerMemberId: tobi.id,
        collaboratorIds: [ayo.id],
        sharedWith: [],
        childSafe: true,
        tags: ["dinosaurs", "science"],
        coverPinId: null,
        projectId: null,
        projectLabel: "",
        tripId: null,
        tripLabel: "",
        createdDays: -6,
        updatedDays: -1,
        sectionTitles: [],
    });
    const dinoPins = addPins(dinos.row.id, dinos.sectionIds, [
        { img: "moodboards-dino-toys", title: "Stegosaurus (the best one)", note: "17 plates. I counted.", tags: ["dinosaurs"], by: tobi.id, days: -6, colour: "#c86a3a" },
        { img: "moodboards-dino-cake", title: "A cake shaped like a volcano", note: "For the science fair AND my birthday.", tags: ["dinosaurs", "cake"], by: tobi.id, days: -5, colour: "#6f9a5a" },
        { img: "moodboards-pinboard", title: "My science fair poster plan", note: "Three sections: what, how, what happened.", tags: ["science", "school"], by: tobi.id, days: -4, colour: "#c25a4a" },
        { img: "moodboards-garden-beds", title: "Fossils in the garden", note: "Bury them and dig them up. Ayo doesn't know yet.", tags: ["dinosaurs", "games"], by: tobi.id, days: -2, colour: "#6d7a4f" },
        { img: "moodboards-dino-toys", title: "Ayo's favourite (the small orange one)", tags: ["dinosaurs"], by: ayo.id, days: -1, colour: "#c86a3a" },
    ]);
    dinos.row.coverPinId = dinoPins[0].id;
    say(dinoPins[4].id, tobi.id, "That one is a Triceratops Ayo", -1, "17:40", "yes");

    return { boards, sections, pins, comments, checklist };
}
