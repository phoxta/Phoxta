import type { SeedContext, Visibility } from "@/data/core";
import type { Album, AlbumPhoto, MemoriesState, ObjectShare, Photo, Reel, ReelFrame, ShareLink, TimelineEvent, TimelineType } from "./types";

/**
 * The Adeyemi family's library.
 *
 * Nine albums, four hundred and twelve pictures, and a timeline that runs back
 * seven years — because a memories module that opens on an empty grid has not
 * shown anybody what it is for. The files on disk are a pool of real
 * photographs; the ROWS are the family's, each one with its own caption, its
 * own day, its own place and the people in it, exactly as a real library repeats
 * the same kitchen and the same church across ten years.
 *
 * Everything is anchored to `ctx.today` — the year is read off it, so the
 * demo's "2019" is always seven years ago and "on this day" always lands.
 *
 * Three things are deliberately planted for the screens to find:
 *   · TODAY IS AN ANNIVERSARY — the keys to the Croydon house, seven years ago
 *     to the day, so the dashboard has something to celebrate.
 *   · ON THIS DAY — Tobi swims a width on his own, four years ago today.
 *   · A DRAFT WAITING — "Our year", scheduled to write itself on 1 December.
 */

// ---------------------------------------------------------------------------
// The pools the library is built from
// ---------------------------------------------------------------------------

const CAPTIONS: Record<string, string[]> = {
    lagos: [
        "Balogun market, and nobody could agree on the fabric",
        "Grandma's veranda, first morning",
        "Jollof, and Dad's face when he tasted it",
        "The cousins met Ayo for the first time",
        "Christmas Eve service at Ikoyi",
        "Lekki beach — Tobi would not come out of the water",
        "Aunty Bisi's twins, everywhere at once",
        "Harmattan light on the balcony",
        "Dami translating for Ayo, badly",
        "The whole house singing at midnight",
        "Suya on the way back from the airport road",
        "Mama Fọláké's kitchen, six of us in it",
    ],
    lakes: [
        "Grasmere, before the rain came",
        "Tobi named every sheep",
        "The tent that took forty minutes",
        "Halfway up, and Ayo asked to be carried",
        "Flask of tea on the wall",
        "Boots by the door, all five pairs",
        "The lake was freezing and we went in anyway",
        "Dami read the whole way there",
        "Gingerbread in Grasmere, obviously",
        "Last morning, packing in the drizzle",
    ],
    tobi9: [
        "Nine, and he asked for a volcano cake",
        "The candles took three goes",
        "Football in the garden with the Okonkwo boys",
        "Bunting Ifeoluwa made the night before",
        "Pass the parcel, disputed",
        "Ayo ate two slices before we sang",
        "Grandma on video call, singing loudest",
        "The face when he opened the microscope",
    ],
    chapel: [
        "Sunday morning at Grace Chapel",
        "Ayo in the nativity, second shepherd",
        "Oluwafemi leading Bible study",
        "The choir, and Dami's first solo",
        "Communion, first Sunday of the month",
        "Pastor Dayo praying over the family",
        "Harvest, and far too many tins",
        "Coffee after the service, nobody left",
        "Dami's baptism, and the whole row crying",
        "Carols by candlelight",
    ],
    reception: [
        "First day in Reception — the bag was bigger than her",
        "Reading corner, week two",
        "The book bag she would not put down",
        "School gate, 8:47",
        "Her name, written by her, on the fridge",
        "Sports day, and she came fourth and was delighted",
    ],
    kitchen: [
        "The kitchen, the day we started",
        "Everything in boxes, dinner on the floor",
        "First loaf out of the new oven",
        "Tobi picked the handles",
        "Ifeoluwa's green — she was right",
        "Sunday roast, first proper one",
    ],
    summer: [
        "First day of the holidays",
        "Picnic in the garden, ants and all",
        "Eastbourne, and the pier in the mist",
        "Ice creams that did not survive the walk",
        "Ayo's first proper swim on her own",
        "The long evening light in the garden",
        "Water fight, Dami started it",
        "Football until it was too dark to see",
        "Reading in the shade after lunch",
        "Nobody wore shoes for six weeks",
    ],
    garden: [
        "The beds Oluwafemi built in April",
        "Tobi's tomatoes, finally",
        "Watering, mostly on himself",
        "Sunflowers taller than Ayo",
        "Bella asleep in the one patch of sun",
        "Sunday lunch outside for the first time",
    ],
    justus: [
        "Anniversary dinner, the good plates",
        "Whitstable, just the two of us",
        "Walking back along the front",
        "The letter he wrote, kept",
        "Coffee before anyone else was up",
    ],
    everyday: [
        "A Tuesday",
        "Homework at the kitchen table",
        "Bella and the school run",
        "Tobi's volcano, take four",
        "Dami revising, headphones on",
        "Grandma on the phone from Ibadan",
        "Pancakes because it was raining",
        "Everyone asleep in the car",
    ],
};

const FILES: Record<string, string[]> = {
    lagos: ["memories-lagos-1", "memories-lagos-2", "memories-lagos-4", "memories-lagos-3", "memories-christmas-1", "memories-christmas-2"],
    lakes: ["memories-lakes-1", "memories-lakes-2", "memories-lakes-3", "memories-lakes-4", "memories-park-1"],
    tobi9: ["memories-birthday-1", "memories-birthday-2", "memories-birthday-3", "memories-birthday-4", "memories-park-3"],
    chapel: ["memories-church-1", "memories-church-3", "memories-devotion", "memories-nativity", "memories-church-2"],
    reception: ["memories-school-1", "memories-school-2", "memories-school-3", "memories-first-ayo"],
    kitchen: ["memories-kitchen-1", "memories-kitchen-2", "memories-kitchen-3", "memories-home-1"],
    summer: ["memories-summer-1", "memories-summer-2", "memories-summer-3", "memories-summer-4", "memories-park-2", "memories-swim-2", "memories-park-3", "memories-swim-1"],
    garden: ["memories-garden-1", "memories-garden-2", "memories-summer-1", "memories-park-1"],
    justus: ["memories-home-2", "memories-summer-2", "memories-summer-4", "memories-kitchen-3"],
    everyday: ["memories-sciencefair", "memories-folake-1", "memories-first-bike", "memories-school-2", "memories-devotion", "memories-kitchen-2", "memories-hero"],
};

const PLACES: Record<string, string> = {
    lagos: "Ikoyi, Lagos",
    lakes: "Grasmere, Cumbria",
    tobi9: "Croydon",
    chapel: "Grace Chapel, Thornton Heath",
    reception: "Croydon",
    kitchen: "Croydon",
    summer: "Croydon & the Sussex coast",
    garden: "Croydon",
    justus: "Whitstable, Kent",
    everyday: "Croydon",
};

// ---------------------------------------------------------------------------
// The seed
// ---------------------------------------------------------------------------

export function seed(ctx: SeedContext): MemoriesState {
    const { space, day, at, img, today } = ctx;
    const Y = Number(today.slice(0, 4));
    const md = today.slice(5); // "09-06" — the day "on this day" lands on

    const ife = ctx.parents[0]?.id ?? "mem-ife";
    const tunde = ctx.parents[1]?.id ?? "mem-tunde";
    const dami = ctx.kids[0]?.id ?? "mem-dami";
    const tobi = ctx.kids[1]?.id ?? "mem-tobi";
    const ayo = ctx.kids[2]?.id ?? "mem-ayo";
    const folake = ctx.guests[0]?.id ?? "mem-folake";
    const everyone = [ife, tunde, dami, tobi, ayo];

    const photos: Photo[] = [];
    const albums: Album[] = [];
    const albumPhotos: AlbumPhoto[] = [];
    const timeline: TimelineEvent[] = [];
    const reels: Reel[] = [];
    const frames: ReelFrame[] = [];
    const shares: ObjectShare[] = [];
    const links: ShareLink[] = [];

    let pn = 0;
    let an = 0;
    let tn = 0;
    let fn = 0;

    /** Deterministic, plausible file sizes: 1.9 – 4.3 MB a picture. */
    const sizeOf = (i: number, video: boolean): number => (video ? 18_000_000 + ((i * 977) % 26_000_000) : 1_900_000 + ((i * 733) % 2_400_000));

    const addPhoto = (input: {
        id?: string;
        file: string;
        caption: string;
        takenAt: string;
        place: string;
        peopleIds: string[];
        tags: string[];
        addedBy: string;
        favourite?: boolean;
        video?: boolean;
        visibility?: Visibility;
        sharedWith?: string[];
        childSafe?: boolean;
    }): Photo => {
        const i = ++pn;
        const video = input.video ?? false;
        const p: Photo = {
            id: input.id ?? `mph-${i}`,
            spaceId: space.id,
            url: img(input.file),
            posterUrl: video ? img(input.file) : null,
            kind: video ? "video" : "photo",
            format: video ? "mp4" : "jpeg",
            caption: input.caption,
            takenAt: input.takenAt,
            place: input.place,
            peopleIds: input.peopleIds,
            tags: input.tags,
            addedBy: input.addedBy,
            favourite: input.favourite ?? false,
            visibility: input.visibility ?? "child",
            sharedWith: input.sharedWith ?? [],
            childSafe: input.childSafe ?? true,
            width: 1600,
            height: 1067,
            bytes: sizeOf(i, video),
            needsConversion: false,
            createdAt: `${input.takenAt}T20:00:00.000Z`,
        };
        photos.push(p);
        return p;
    };

    // -- the six that matter, with stable ids ---------------------------------
    // Milestones the timeline and "on this day" both point at.

    const pKeys = addPhoto({
        id: "mph-keys",
        file: "memories-home-2",
        caption: "The keys to the Croydon house",
        takenAt: `${Y - 7}-${md}`,
        place: "Croydon, South London",
        peopleIds: [ife, tunde],
        tags: ["first", "home"],
        addedBy: ife,
        favourite: true,
    });
    const pBoxes = addPhoto({
        id: "mph-boxes",
        file: "memories-home-1",
        caption: "Moving day — Tobi lived in a box for an hour",
        takenAt: `${Y - 7}-${md.slice(0, 3)}09`,
        place: "Croydon, South London",
        peopleIds: [tobi],
        tags: ["first", "home"],
        addedBy: tunde,
    });
    const pSwim = addPhoto({
        id: "mph-first-swim",
        file: "memories-swim-1",
        caption: "Tobi swims a width on his own",
        takenAt: `${Y - 4}-${md}`,
        place: "Croydon Sports Arena",
        peopleIds: [tobi],
        tags: ["first", "swimming"],
        addedBy: ife,
        favourite: true,
    });
    const pBaptism = addPhoto({
        id: "mph-baptism",
        file: "memories-church-2",
        caption: "Dami's baptism — the whole row in tears",
        takenAt: `${Y - 3}-06-15`,
        place: "Grace Chapel, Thornton Heath",
        peopleIds: [dami, ife, tunde],
        tags: ["first", "faith"],
        addedBy: tunde,
        favourite: true,
    });
    const pBike = addPhoto({
        id: "mph-first-bike",
        file: "memories-first-bike",
        caption: "Tobi rides off without the stabilisers",
        takenAt: `${Y - 3}-08-11`,
        place: "Lloyd Park, Croydon",
        peopleIds: [tobi, tunde],
        tags: ["first"],
        addedBy: tunde,
    });
    const pAyo = addPhoto({
        id: "mph-ayo-home",
        file: "memories-first-ayo",
        caption: "Ayo comes home",
        takenAt: `${Y - 5}-08-30`,
        place: "Croydon University Hospital",
        peopleIds: [ayo, ife, tunde],
        tags: ["first"],
        addedBy: ife,
        favourite: true,
    });
    const pReception = addPhoto({
        id: "mph-reception",
        file: "memories-school-1",
        caption: "Ayo's first day in Reception — the bag was bigger than her",
        takenAt: `${Y - 1}-09-02`,
        place: "Croydon",
        peopleIds: [ayo],
        tags: ["first", "school"],
        addedBy: ife,
        favourite: true,
    });

    // -- the nine albums ------------------------------------------------------

    const addAlbum = (input: {
        id: string;
        title: string;
        description: string;
        from: string;
        to: string;
        pool: keyof typeof FILES;
        count: number;
        people: string[][];
        tags: string[];
        owner: string;
        contributorIds?: string[];
        tripId?: string | null;
        visibility?: Visibility;
        sharedWith?: string[];
        childSafe?: boolean;
        auto?: boolean;
        extraPhotoIds?: string[];
        videoEvery?: number;
    }): Album => {
        const files = FILES[input.pool];
        const captions = CAPTIONS[input.pool];
        const place = PLACES[input.pool];
        const spanDays = Math.max(0, Math.round((new Date(`${input.to}T00:00:00`).getTime() - new Date(`${input.from}T00:00:00`).getTime()) / 86400000));
        const ids: string[] = [...(input.extraPhotoIds ?? [])];
        for (let i = 0; i < input.count; i++) {
            const offset = input.count === 1 ? 0 : Math.round((i * spanDays) / (input.count - 1 || 1));
            const d = new Date(`${input.from}T00:00:00`);
            d.setDate(d.getDate() + offset);
            const takenAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const p = addPhoto({
                file: files[i % files.length],
                caption: captions[i % captions.length],
                takenAt,
                place,
                peopleIds: input.people[i % input.people.length],
                tags: input.tags,
                addedBy: i % 5 === 0 ? tunde : input.owner,
                favourite: i % 9 === 3,
                video: Boolean(input.videoEvery) && i % (input.videoEvery as number) === 2,
                visibility: input.visibility ?? "child",
                sharedWith: input.sharedWith ?? [],
                childSafe: input.childSafe ?? true,
            });
            ids.push(p.id);
        }
        const album: Album = {
            id: input.id,
            spaceId: space.id,
            title: input.title,
            description: input.description,
            coverPhotoId: ids[0] ?? null,
            dateFrom: input.from,
            dateTo: input.to,
            visibility: input.visibility ?? "child",
            sharedWith: input.sharedWith ?? [],
            childSafe: input.childSafe ?? true,
            ownerMemberId: input.owner,
            contributorIds: input.contributorIds ?? [],
            tripId: input.tripId ?? null,
            auto: input.auto ?? false,
            createdAt: `${input.to}T21:00:00.000Z`,
        };
        albums.push(album);
        ids.forEach((photoId, order) => {
            albumPhotos.push({ id: `map-${++an}`, albumId: album.id, photoId, caption: "", order });
        });
        return album;
    };

    const aLagos = addAlbum({
        id: "album-lagos-25",
        title: "Christmas in Lagos",
        description: "Three weeks at Mama Fọláké's, and the first time all five of us were there at once.",
        from: `${Y - 1}-12-18`,
        to: `${Y}-01-04`,
        pool: "lagos",
        count: 68,
        people: [everyone, [ife, folake], [tobi, ayo], [dami], [tunde, folake], [ayo, folake]],
        tags: ["lagos", "christmas", "family"],
        owner: ife,
        videoEvery: 11,
    });

    const aLakes = addAlbum({
        id: "album-lakes",
        title: "Half-term in the Lake District",
        description: "Six days in Grasmere. It rained on four of them and nobody minded.",
        from: day(-104),
        to: day(-99),
        pool: "lakes",
        count: 54,
        people: [everyone, [tobi, ayo], [dami, ife], [tunde], [tobi]],
        tags: ["lakes", "holiday"],
        owner: tunde,
        tripId: "trip-lakes",
        auto: true,
        videoEvery: 17,
    });

    const aTobi = addAlbum({
        id: "album-tobi-nine",
        title: "Tobi turns nine",
        description: "A volcano cake, eleven children and one very tired dog.",
        from: `${Y}-05-21`,
        to: `${Y}-05-21`,
        pool: "tobi9",
        count: 31,
        people: [[tobi], [tobi, ayo], everyone, [tobi, dami], [ayo]],
        tags: ["birthday", "tobi"],
        owner: ife,
    });

    const aChapel = addAlbum({
        id: "album-chapel",
        title: "Sundays at Grace Chapel",
        description: "Three years of Sunday mornings, harvests, nativities and one baptism.",
        from: `${Y - 3}-01-14`,
        to: day(-7),
        pool: "chapel",
        count: 47,
        people: [everyone, [dami], [tunde], [ayo], [ife, folake]],
        tags: ["church", "faith"],
        owner: tunde,
        extraPhotoIds: [pBaptism.id],
    });

    const aReception = addAlbum({
        id: "album-reception",
        title: "Ayo starts Reception",
        description: "September, a bag bigger than she is, and a fortnight of being very brave.",
        from: `${Y - 1}-09-02`,
        to: `${Y - 1}-09-20`,
        pool: "reception",
        count: 22,
        people: [[ayo], [ayo, ife], [ayo, tobi]],
        tags: ["school", "ayo", "first"],
        owner: ife,
        extraPhotoIds: [pReception.id],
    });

    const aKitchen = addAlbum({
        id: "album-kitchen",
        title: "The kitchen, before and after",
        description: "Four months of dust, a green nobody but Ifeoluwa believed in, and the first proper Sunday roast.",
        from: `${Y - 2}-02-10`,
        to: `${Y - 2}-06-08`,
        pool: "kitchen",
        count: 26,
        people: [[ife, tunde], [tobi], everyone],
        tags: ["home", "kitchen"],
        owner: ife,
        visibility: "family",
        childSafe: true,
    });

    const aSummer = addAlbum({
        id: "album-summer",
        title: `Summer ${Y}`,
        description: "Six weeks with no shoes on. The reel came out of this one.",
        from: `${Y}-07-18`,
        to: day(-9),
        pool: "summer",
        count: 63,
        people: [everyone, [tobi, ayo], [dami], [ayo], [dami, tobi, ayo]],
        tags: ["summer", "holiday"],
        owner: ife,
        contributorIds: [dami],
        videoEvery: 13,
    });

    const aGarden = addAlbum({
        id: "album-garden",
        title: "The Croydon garden",
        description: "Beds, tomatoes, sunflowers and a dog who found the only patch of sun.",
        from: `${Y - 3}-04-06`,
        to: day(-21),
        pool: "garden",
        count: 38,
        people: [[tobi], [tunde, tobi], [ayo], everyone],
        tags: ["garden", "home"],
        owner: tunde,
        contributorIds: [tobi, dami],
    });

    const aJustUs = addAlbum({
        id: "album-just-us",
        title: "Just us two",
        description: "The days we marked, and the days we went and had a coffee on our own.",
        from: `${Y - 5}-06-12`,
        to: day(-40),
        pool: "justus",
        count: 19,
        people: [[ife, tunde]],
        tags: ["us two"],
        owner: ife,
        visibility: "shared",
        sharedWith: [ife, tunde],
        childSafe: false,
    });

    // -- the unfiled ones: the last two months of ordinary days ---------------

    for (let i = 0; i < 37; i++) {
        addPhoto({
            file: FILES.everyday[i % FILES.everyday.length],
            caption: CAPTIONS.everyday[i % CAPTIONS.everyday.length],
            takenAt: day(-58 + Math.round((i * 55) / 36)),
            place: PLACES.everyday,
            peopleIds: [[tobi], [dami], [ayo], everyone, [ife, ayo]][i % 5],
            tags: ["everyday"],
            addedBy: i % 3 === 0 ? tunde : ife,
            favourite: i % 11 === 4,
        });
    }

    // -- the timeline ---------------------------------------------------------

    const event = (input: { date: string; type: TimelineType; title: string; body: string; photoId?: string | null; memberIds?: string[]; href?: string; sourceId?: string | null; visibility?: Visibility; sharedWith?: string[]; childSafe?: boolean }): TimelineEvent => {
        const e: TimelineEvent = {
            id: `mtl-${++tn}`,
            spaceId: space.id,
            date: input.date,
            type: input.type,
            sourceId: input.sourceId ?? null,
            title: input.title,
            body: input.body,
            photoId: input.photoId ?? null,
            memberIds: input.memberIds ?? [],
            href: input.href ?? "/create/memories/timeline",
            visibility: input.visibility ?? "child",
            sharedWith: input.sharedWith ?? [],
            childSafe: input.childSafe ?? true,
            imported: false,
            createdAt: `${input.date}T21:00:00.000Z`,
        };
        timeline.push(e);
        return e;
    };

    // One event per album, linking to the album (AC 4).
    for (const a of [aLagos, aLakes, aTobi, aChapel, aReception, aKitchen, aSummer, aGarden, aJustUs]) {
        event({
            date: a.dateTo,
            type: "album",
            title: a.title,
            body: a.description,
            photoId: a.coverPhotoId,
            href: `/create/memories/albums/${a.id}`,
            sourceId: a.id,
            visibility: a.visibility,
            sharedWith: a.sharedWith,
            childSafe: a.childSafe,
            memberIds: [a.ownerMemberId],
        });
    }

    // The firsts and the milestones — the spine of the seven years.
    event({ date: `${Y - 7}-${md}`, type: "first", title: "We got the keys to the Croydon house", body: "Nothing in it but a kettle and a mattress, and we prayed in every room.", photoId: pKeys.id, memberIds: [ife, tunde] });
    event({ date: `${Y - 7}-${md.slice(0, 3)}09`, type: "first", title: "Moving day", body: "Tobi lived in a cardboard box for an hour and refused lunch.", photoId: pBoxes.id, memberIds: [tobi] });
    event({ date: `${Y - 6}-11-02`, type: "trip", title: "Manchester with the cousins", body: "Four days, eleven people, one bathroom.", memberIds: everyone });
    event({ date: `${Y - 5}-08-30`, type: "first", title: "Ayo is born", body: "3.1 kg, and she has not stopped talking since.", photoId: pAyo.id, memberIds: [ayo, ife, tunde] });
    event({ date: `${Y - 5}-06-12`, type: "celebration", title: "Ten years together", body: "Whitstable, oysters, and the good plates when we got home.", memberIds: [ife, tunde], visibility: "family", childSafe: true });
    event({ date: `${Y - 4}-${md}`, type: "first", title: "Tobi's first swim", body: "A whole width, on his own, and he came up looking for us.", photoId: pSwim.id, memberIds: [tobi] });
    event({ date: `${Y - 4}-04-19`, type: "answered_prayer", title: "Ifeoluwa's first consultancy client", body: "We prayed about it for five months. She signed on the Tuesday.", memberIds: [ife], href: "/grow/bible/prayer" });
    event({ date: `${Y - 3}-06-15`, type: "milestone", title: "Dami is baptised", body: "She wrote her own testimony and read it without shaking.", photoId: pBaptism.id, memberIds: [dami], href: "/grow/bible" });
    event({ date: `${Y - 3}-08-11`, type: "first", title: "Tobi rides without stabilisers", body: "Lloyd Park, and Dad ran further than he'd like to admit.", photoId: pBike.id, memberIds: [tobi] });
    event({ date: `${Y - 3}-01-14`, type: "first", title: "Our first Sunday at Grace Chapel", body: "We sat at the back. We have not sat at the back since.", memberIds: everyone });
    event({ date: `${Y - 2}-06-08`, type: "milestone", title: "The kitchen is finished", body: "Four months, one green, and a Sunday roast to prove it.", photoId: aKitchen.coverPhotoId, href: `/create/memories/albums/${aKitchen.id}`, memberIds: [ife, tunde] });
    event({ date: `${Y - 2}-09-05`, type: "trip", title: "Five days on the Kent coast", body: "The year of the crab bucket.", memberIds: everyone });
    event({ date: `${Y - 1}-09-02`, type: "first", title: "Ayo starts Reception", body: "She waved once and did not look back. Ifeoluwa cried in the car.", photoId: pReception.id, href: `/create/memories/albums/${aReception.id}`, memberIds: [ayo] });
    event({ date: `${Y - 1}-12-24`, type: "celebration", title: "Christmas Eve in Lagos", body: "All five of us at Mama Fọláké's, and the house sang until midnight.", photoId: aLagos.coverPhotoId, href: `/create/memories/albums/${aLagos.id}`, memberIds: everyone });
    event({ date: `${Y}-02-08`, type: "badge", title: "🏅 Dami turns fifteen", body: "Her own login, her own budget, and a laptop on the wish list.", memberIds: [dami], href: "/family/people" });
    event({ date: `${Y}-05-21`, type: "celebration", title: "Tobi is nine", body: "Volcano cake. Eleven children. One tired dog.", photoId: aTobi.coverPhotoId, href: `/create/memories/albums/${aTobi.id}`, memberIds: [tobi] });
    event({ date: day(-104), type: "trip", title: "Half-term in the Lake District", body: "Six days in Grasmere, four of them wet.", photoId: aLakes.coverPhotoId, href: `/create/memories/albums/${aLakes.id}`, memberIds: everyone });
    event({ date: day(-46), type: "answered_prayer", title: "Oluwafemi's contract came through", body: "Two years of asking. Ifeoluwa marked it answered on the wall.", memberIds: [tunde], href: "/grow/bible/prayer" });
    event({ date: day(-21), type: "milestone", title: "Tobi's tomatoes, at last", body: "Three years of trying and a bumper crop in a plastic tub.", memberIds: [tobi], href: `/create/memories/albums/${aGarden.id}` });
    event({ date: day(-9), type: "celebration", title: `The last day of summer ${Y}`, body: "Six weeks with no shoes on. Back to school on Monday.", photoId: aSummer.coverPhotoId, href: `/create/memories/albums/${aSummer.id}`, memberIds: everyone });

    // -- the reels ------------------------------------------------------------

    const addReel = (input: {
        id: string;
        title: string;
        subtitle: string;
        mood: Reel["mood"];
        transition: Reel["transition"];
        slideMs: number;
        status: Reel["status"];
        autoKind: Reel["autoKind"];
        trackTitle: string;
        trackNote: string;
        owner: string;
        photoIds: string[];
        captions?: string[];
        createdAt: string;
        scheduledFor?: string | null;
        visibility?: Visibility;
        sharedWith?: string[];
    }): Reel => {
        const reel: Reel = {
            id: input.id,
            spaceId: space.id,
            title: input.title,
            subtitle: input.subtitle,
            mood: input.mood,
            transition: input.transition,
            slideMs: input.slideMs,
            status: input.status,
            autoKind: input.autoKind,
            trackTitle: input.trackTitle,
            trackNote: input.trackNote,
            trackItemId: null,
            coverPhotoId: input.photoIds[0] ?? null,
            ownerMemberId: input.owner,
            visibility: input.visibility ?? "child",
            sharedWith: input.sharedWith ?? [],
            childSafe: true,
            scheduledFor: input.scheduledFor ?? null,
            storyboardId: null,
            createdAt: input.createdAt,
        };
        reels.push(reel);
        input.photoIds.forEach((photoId, order) => {
            frames.push({ id: `mfr-${++fn}`, reelId: reel.id, photoId, caption: input.captions?.[order] ?? "", durationMs: null, order });
        });
        return reel;
    };

    const summerIds = albumPhotos
        .filter((ap) => ap.albumId === aSummer.id)
        .sort((a, b) => a.order - b.order)
        .map((ap) => ap.photoId)
        .filter((id) => photos.find((p) => p.id === id)?.kind === "photo")
        .slice(0, 48);

    const summerReel = addReel({
        id: "reel-summer",
        title: `Summer ${Y}`,
        subtitle: "Six weeks, one long golden afternoon",
        mood: "joy",
        transition: "crossfade",
        slideMs: 3200,
        status: "ready",
        autoKind: "custom",
        trackTitle: "Ayo's Song",
        trackNote: "The family's own, recorded at the kitchen table in August.",
        owner: ife,
        photoIds: summerIds,
        captions: ["The first day of the holidays", "", "", "Eastbourne, in the mist", "", "", "Her first proper swim", "", "", "The long evening light"],
        createdAt: at(-8, "21:30"),
    });

    // Sixty frames across seven years — the long one, and the one that proves a
    // reel of this length still opens and still runs (AC 1).
    const decadeIds: string[] = [];
    const spread = [pKeys, pBoxes, pAyo, pSwim, pBike, pBaptism, pReception].map((p) => p.id);
    decadeIds.push(...spread);
    for (const a of [aChapel, aKitchen, aLagos, aLakes, aTobi, aGarden, aSummer]) {
        const ids = albumPhotos
            .filter((ap) => ap.albumId === a.id)
            .sort((x, y) => x.order - y.order)
            .map((ap) => ap.photoId)
            .filter((id) => photos.find((p) => p.id === id)?.kind === "photo");
        for (let i = 0; i < 8 && decadeIds.length < 60; i++) {
            const id = ids[Math.floor((i * ids.length) / 8)];
            if (id && !decadeIds.includes(id)) decadeIds.push(id);
        }
    }
    const takenAtOf = new Map(photos.map((p) => [p.id, p.takenAt]));
    decadeIds.sort((a, b) => (takenAtOf.get(a) ?? "").localeCompare(takenAtOf.get(b) ?? ""));

    addReel({
        id: "reel-seven-years",
        title: "Seven years in Croydon",
        subtitle: "From the keys to this summer",
        mood: "warm",
        transition: "crossfade",
        slideMs: 3600,
        status: "ready",
        autoKind: "custom",
        trackTitle: "Ẹ Kú Ilé (Welcome Home)",
        trackNote: "Licensed track, used in the app only — nothing is downloaded.",
        owner: tunde,
        photoIds: decadeIds.slice(0, 60),
        captions: ["The keys, seven years ago today"],
        createdAt: at(-30, "22:10"),
    });

    // The December draft, waiting for its date (AC 8).
    addReel({
        id: "reel-our-year",
        title: `Our year ${Y}`,
        subtitle: "Writes itself on 1 December from this year's timeline",
        mood: "warm",
        transition: "crossfade",
        slideMs: 4000,
        status: "draft",
        autoKind: "our_year",
        trackTitle: "To be chosen",
        trackNote: "Pick the track when the draft is ready.",
        owner: ife,
        photoIds: [],
        createdAt: at(-1, "07:00"),
        scheduledFor: `${Y}-12-01`,
    });

    // -- who has been let in --------------------------------------------------

    let sn = 0;
    const grant = (objectType: ObjectShare["objectType"], objectId: string, memberId: string, when: string): void => {
        shares.push({ id: `msh-${++sn}`, spaceId: space.id, objectType, objectId, memberId, grantedBy: ife, createdAt: when });
    };
    // Mama Fọláké: two albums and the reel, exactly as the brief says.
    grant("album", aLagos.id, folake, at(-120, "19:00"));
    grant("album", aChapel.id, folake, at(-120, "19:02"));
    grant("reel", summerReel.id, folake, at(-8, "21:40"));

    let ln = 0;
    const link = (objectType: ShareLink["objectType"], objectId: string, token: string, createdDays: number, expiresDays: number, views: number, revoked = false): void => {
        links.push({
            id: `mln-${++ln}`,
            spaceId: space.id,
            objectType,
            objectId,
            token,
            createdBy: ife,
            createdAt: at(createdDays, "20:00"),
            expiresAt: at(expiresDays, "20:00"),
            revokedAt: revoked ? at(-2, "09:15") : null,
            views,
            lastViewedAt: views ? at(Math.max(createdDays, -3), "21:12") : null,
        });
    };
    link("reel", summerReel.id, "sum26-quiet-harbour", -4, 26, 11);
    link("album", aChapel.id, "chapel-open-door", -28, 2, 6);
    link("album", aKitchen.id, "kitchen-before-after", -60, -6, 4);
    link("album", aLakes.id, "lakes-grasmere-rain", -40, 20, 2, true);

    const usedBytes = photos.reduce((n, p) => n + p.bytes, 0);

    return {
        photos,
        albums,
        albumPhotos,
        timeline,
        reels,
        frames,
        shares,
        links,
        plan: "household",
        usedBytes,
        totalPhotos: photos.length,
    };
}
