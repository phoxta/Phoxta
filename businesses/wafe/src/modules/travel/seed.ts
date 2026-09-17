import type { Member, SeedContext } from "@/data/core";
import { checklistTemplate } from "./templates";
import type {
    Booking,
    ChecklistItem,
    ItineraryDay,
    ItineraryItem,
    PackItemCategory,
    PackingItem,
    PackingList,
    TravelDoc,
    TravelState,
    Traveller,
    Trip,
    TripExpense,
} from "./types";

/**
 * The Adeyemis go places.
 *
 * Four trips, because a family's travel shelf is never one thing: the big one
 * everybody is counting down to (Christmas in Lagos), the small one that is
 * almost here and therefore actually stressful (five days on the Kent coast),
 * the one they have already had and keep the photographs from (the Lake
 * District at half-term), and the one that is only a wish (Paris, someday).
 *
 * Everything is relative to `ctx.today`, so the demo never goes stale, and the
 * trips are deliberately arranged so every acceptance criterion is CLICKABLE:
 *
 *   · Kent leaves in nine days — inside T-14 — so the packing lists generate
 *     themselves the first time a parent opens the app, and the run-up has
 *     items that are already overdue.
 *   · Lagos has five of six lists, so "generate the rest" is a real button.
 *   · Tobi's and Ayo's passports expire weeks after the Lagos return date, so
 *     the six-month rule raises a warning the moment the app loads.
 *   · Dami's GHIC expires in under a month and Ifeoluwa's insurance in under three,
 *     so both the 30-day and the 90-day document reminders have something to
 *     fire on.
 *   · The Lake District came home with an album and a ledger of what it cost,
 *     including one line in a currency that isn't sterling.
 */

/** Minor units of the local currency for a whole-unit amount. */
const units = (n: number): number => Math.round(n * 100);

export function seed(ctx: SeedContext): TravelState {
    const { day, at, uid, img, today } = ctx;
    const by = (id: string): Member | undefined => ctx.members.find((m) => m.id === id);
    const ife = by("mem-ife") ?? ctx.parents[0];
    const tunde = by("mem-tunde") ?? ctx.parents[1] ?? ctx.parents[0];
    const dami = by("mem-dami") ?? ctx.kids[0];
    const tobi = by("mem-tobi") ?? ctx.kids[1] ?? ctx.kids[0];
    const ayo = by("mem-ayo") ?? ctx.kids[2] ?? ctx.kids[0];
    const folake = by("mem-folake") ?? ctx.guests[0];

    const trips: Trip[] = [];
    const travellers: Traveller[] = [];
    const days: ItineraryDay[] = [];
    const items: ItineraryItem[] = [];
    const bookings: Booking[] = [];
    const docs: TravelDoc[] = [];
    const lists: PackingList[] = [];
    const packItems: PackingItem[] = [];
    const checklist: ChecklistItem[] = [];
    const expenses: TripExpense[] = [];

    const addTraveller = (tripId: string, memberId: string, role: Traveller["role"] = "traveller", passportExpiry: string | null = null, notes = ""): void => {
        travellers.push({ id: uid("trav"), tripId, memberId, role, passportExpiry, notes });
    };

    const addDay = (tripId: string, date: string, title: string, notes = ""): ItineraryDay => {
        const d: ItineraryDay = { id: uid("day"), tripId, date, title, notes };
        days.push(d);
        return d;
    };

    const addItem = (dayRow: ItineraryDay, time: string, title: string, place = "", coords: string | null = null, costCents = 0, notes = "", bookingRef = "", done = false): void => {
        items.push({
            id: uid("itin"),
            tripId: dayRow.tripId,
            dayId: dayRow.id,
            time,
            title,
            place,
            coords,
            notes,
            bookingRef,
            costCents,
            order: items.filter((i) => i.dayId === dayRow.id).length,
            done,
        });
    };

    const addList = (tripId: string, memberId: string, template: PackingList["template"], generatedAt: string | null, rows: Array<[string, number, PackItemCategory, boolean] | [string, number, PackItemCategory, boolean, string, string]>): void => {
        const list: PackingList = { id: uid("plist"), tripId, memberId, template, generatedAt };
        lists.push(list);
        rows.forEach((r, i) => {
            packItems.push({
                id: uid("pitem"),
                listId: list.id,
                item: r[0],
                qty: r[1],
                category: r[2],
                checked: r[3],
                wardrobeItemId: (r[4] as string | undefined) ?? null,
                wardrobeLabel: (r[5] as string | undefined) ?? "",
                order: i,
            });
        });
    };

    const addChecklist = (tripId: string, kind: Trip["kind"], countryCode: string, doneItems: string[] = [], doneAt = at(-6, "20:00"), ownerBy: Record<string, string> = {}): void => {
        for (const row of checklistTemplate(kind, countryCode)) {
            checklist.push({
                id: uid("check"),
                tripId,
                item: row.item,
                note: row.note,
                dueOffsetDays: row.dueOffsetDays,
                ownerMemberId: ownerBy[row.item] ?? null,
                doneAt: doneItems.includes(row.item) ? doneAt : null,
            });
        }
    };

    // =======================================================================
    // 1 · Christmas in Lagos — the one the whole house is counting down to
    // =======================================================================
    // 19 December to 3 January on the demo's clock, and always ~15 weeks out.
    const lagosStart = day(104);
    const lagosEnd = day(119);
    const lagos: Trip = {
        id: "trip-lagos",
        spaceId: ctx.space.id,
        title: "Christmas in Lagos",
        destination: "Lagos, Nigeria",
        countryCode: "NG",
        kind: "visit",
        status: "booked",
        startDate: lagosStart,
        endDate: lagosEnd,
        coverUrl: img("travel-lagos"),
        notes: "Sixteen days at Mama's. Oluwafemi is running the plan; Ifeoluwa is running the budget. The cousins have not met Ayo yet.",
        budgetCents: units(4800),
        // The Finance module's stable budget keys are a short, fixed list; a
        // family holiday belongs to "fun", and the LABEL carries the meaning.
        financeCategoryId: "fun",
        financeCategoryLabel: "Trips & holidays",
        localCurrency: "NGN",
        // 1 GBP ≈ ₦1,850 — the rate Oluwafemi used when he budgeted.
        fxRate: 1850,
        valueId: "Love",
        albumId: null,
        albumTitle: "",
        template: "warm",
        visibility: "family",
        sharedWith: [folake?.id ?? ""].filter(Boolean),
        createdBy: tunde.id,
        createdAt: at(-58, "21:40"),
        updatedAt: at(-2, "08:15"),
    };
    trips.push(lagos);

    addTraveller(lagos.id, ife.id, "traveller", "2031-08-14");
    addTraveller(lagos.id, tunde.id, "traveller", "2029-11-02", "Booked the flights on the Avios.");
    addTraveller(lagos.id, dami.id, "traveller", "2030-03-19", "Revision comes with her. Two hours a day, her idea.");
    addTraveller(lagos.id, tobi.id, "traveller", "2027-03-12", "Passport needs renewing before we fly.");
    addTraveller(lagos.id, ayo.id, "traveller", "2027-02-08", "First time meeting the cousins.");
    if (folake) addTraveller(lagos.id, folake.id, "host", null, "Coming down from Ibadan on the 22nd and staying through New Year.");

    // -- the itinerary, three days drafted so far ---------------------------
    const lgDay1 = addDay(lagos.id, day(105), "Landing and jollof", "We land before dawn. Nobody sleeps, everybody eats.");
    addItem(lgDay1, "05:30", "Land at Murtala Muhammed", "Murtala Muhammed International Airport, Ikeja, Lagos", "6.5774,3.3212", 0, "Immigration takes a while with five of us. Uncle Segun is meeting us at arrivals.", "BA075");
    addItem(lgDay1, "08:30", "Breakfast at Mama's", "Ikoyi, Lagos", "6.4550,3.4350", 0, "Akara and pap. Ayo will need a nap by ten.");
    addItem(lgDay1, "17:00", "The cousins come over", "Ikoyi, Lagos", "6.4550,3.4350", units(0), "Twelve of them. Tobi has been practising his Yoruba for this.");

    const lgDay2 = addDay(lagos.id, day(107), "Lekki Conservation Centre", "The canopy walkway is the longest in Africa. Ayo may or may not make it across.");
    addItem(lgDay2, "09:30", "Canopy walkway", "Lekki Conservation Centre, Lekki–Epe Expressway, Lagos", "6.4419,3.5406", units(48000), "Go early — it gets hot and the queue builds after ten.", "");
    addItem(lgDay2, "13:00", "Lunch at the tea house", "Lekki Conservation Centre, Lagos", "6.4419,3.5406", units(22000), "Suya and a very long sit down.");
    addItem(lgDay2, "16:30", "Elegushi beach", "Elegushi Beach, Lekki, Lagos", "6.4281,3.4784", units(15000), "Sunset, and the boys will get soaked.");

    const lgDay3 = addDay(lagos.id, day(110), "Christmas Day", "Church, then the long table, then presents and photographs.");
    addItem(lgDay3, "07:00", "Carol service", "Grace Chapel Lagos, Victoria Island", "6.4281,3.4219", 0, "Oluwafemi is reading the second lesson.");
    addItem(lgDay3, "13:00", "Christmas lunch, all twenty-two of us", "Ikoyi, Lagos", "6.4550,3.4350", 0, "Mama cooks, we all wash up. That is the arrangement.");
    addItem(lgDay3, "18:00", "Presents and photographs", "Ikoyi, Lagos", "6.4550,3.4350", 0, "The one photograph with everybody in it. Set the timer.");

    // -- bookings -----------------------------------------------------------
    bookings.push(
        {
            id: uid("bk"),
            tripId: lagos.id,
            kind: "flight",
            provider: "British Airways",
            reference: "BA075 · KX7ND2",
            startAt: at(104, "22:15"),
            endAt: at(105, "05:30"),
            costCents: units(3420),
            link: "https://www.britishairways.com/travel/managebooking",
            imageUrl: null,
            confirmed: true,
            sensitivity: "general",
            notes: "Heathrow T5 to Lagos, overnight. Five seats together in row 34.",
        },
        {
            id: uid("bk"),
            tripId: lagos.id,
            kind: "flight",
            provider: "British Airways",
            reference: "BA076 · KX7ND2",
            startAt: at(119, "23:05"),
            endAt: at(120, "05:40"),
            costCents: 0,
            link: "https://www.britishairways.com/travel/managebooking",
            imageUrl: null,
            confirmed: true,
            sensitivity: "general",
            notes: "The return, on the same reference.",
        },
        {
            id: uid("bk"),
            tripId: lagos.id,
            kind: "stay",
            provider: "Mama Fọláké's house, Ikoyi",
            reference: "",
            startAt: at(105, "06:30"),
            endAt: at(119, "18:00"),
            costCents: 0,
            link: "",
            imageUrl: null,
            confirmed: true,
            sensitivity: "general",
            notes: "Two rooms and the back veranda. Ayo is on the camp bed and thrilled about it.",
        },
        {
            id: uid("bk"),
            tripId: lagos.id,
            kind: "car",
            provider: "Bolt Drive · airport transfer and a driver for the first week",
            reference: "",
            startAt: at(105, "06:00"),
            endAt: at(112, "18:00"),
            costCents: units(310),
            link: "",
            imageUrl: null,
            confirmed: false,
            sensitivity: "financial",
            notes: "Quote only. Uncle Segun says he can do better — ask him before paying.",
        },
        {
            id: uid("bk"),
            tripId: lagos.id,
            kind: "insurance",
            provider: "Aviva · annual multi-trip, family of five",
            reference: "AV-MT-4471902",
            startAt: at(-287, "09:00"),
            endAt: at(78, "23:59"),
            costCents: units(186),
            link: "",
            imageUrl: null,
            confirmed: true,
            sensitivity: "documents",
            notes: "Renews before we fly. Check the medical cover for Nigeria explicitly.",
        },
    );

    // -- packing: five of six lists, Ayo's still to make --------------------
    addList(lagos.id, ife.id, "warm", at(-9, "21:20"), [
        ["Passport and travel papers", 1, "documents", true],
        ["Gele and wrapper", 1, "clothes", true, "ward-ife-gele", "Green gele & wrapper · Lagos capsule"],
        ["Ankara two-piece", 1, "clothes", true, "ward-ife-ankara", "Ankara two-piece · Lagos capsule"],
        ["Light outfits", 10, "clothes", true],
        ["Sandals", 2, "clothes", false],
        ["Sun cream", 1, "toiletries", true],
        ["Insect repellent", 1, "toiletries", true],
        ["Malaria tablets for six", 1, "medical", true],
        ["Gifts for the aunties", 8, "gifts", false],
        ["Phone charger and adapter", 2, "tech", false],
        ["Wash bag", 1, "toiletries", false],
        ["Paracetamol and plasters", 1, "medical", false],
    ]);
    addList(lagos.id, tunde.id, "warm", at(-9, "21:26"), [
        ["Passport and travel papers", 1, "documents", true],
        ["Agbada for Christmas Day", 1, "clothes", true, "ward-tunde-agbada", "White agbada · Lagos capsule"],
        ["Light shirts", 8, "clothes", true],
        ["Trousers", 4, "clothes", false],
        ["Sandals", 1, "clothes", false],
        ["Sun cream", 1, "toiletries", true],
        ["Laptop and charger", 1, "tech", false],
        ["Adapters", 3, "tech", false],
        ["Malaria tablets", 1, "medical", false],
        ["Football for the cousins", 1, "gifts", false],
    ]);
    addList(lagos.id, dami.id, "warm", at(-8, "18:05"), [
        ["Passport and travel papers", 1, "documents", true],
        ["Ankara two-piece", 1, "clothes", true, "ward-dami-ankara", "Ankara two-piece · Lagos capsule"],
        ["Light outfits", 9, "clothes", true],
        ["Trainers", 1, "clothes", true],
        ["Sun hat", 1, "clothes", false],
        ["Headphones", 1, "tech", true],
        ["Charger and power bank", 1, "tech", true],
        ["Chemistry revision notes", 1, "other", true],
        ["Sun cream", 1, "toiletries", false],
        ["Insect repellent", 1, "toiletries", false],
        ["Wash bag", 1, "toiletries", false],
    ]);
    addList(lagos.id, tobi.id, "warm", at(-8, "18:12"), [
        ["Passport and travel papers", 1, "documents", false],
        ["Blue Ankara shirt", 1, "clothes", true, "ward-tobi-ankara", "Blue Ankara shirt · Lagos capsule"],
        ["T-shirts", 8, "clothes", true],
        ["Shorts", 5, "clothes", false],
        ["Sandals", 1, "clothes", false],
        ["Sun hat", 1, "clothes", false],
        ["Sun cream", 1, "toiletries", false],
        ["Insect repellent", 1, "toiletries", false],
        ["Colouring things", 1, "kids", false],
        ["A book for the journey", 2, "kids", false],
    ]);
    if (folake) {
        addList(lagos.id, folake.id, "warm", at(-4, "10:30"), [
            ["Bag for the drive down from Ibadan", 1, "other", true],
            ["The blue lace for Christmas Day", 1, "clothes", true],
            ["Blood-pressure tablets", 1, "medical", true],
            ["Reading glasses", 2, "other", true],
            ["Photographs for the children", 1, "gifts", true],
            ["Bible and hymn book", 1, "other", true],
        ]);
    }

    // -- the run-up: nine things, two of them done -------------------------
    addChecklist(
        lagos.id,
        "visit",
        "NG",
        ["Travel insurance for everyone travelling", "Ask the GP about vaccinations and anything we need to take"],
        at(-11, "19:30"),
        {
            "Check every passport is valid six months past our return": ife.id,
            "Order currency and tell the bank we're travelling": ife.id,
            "Check in online and pick seats together": tunde.id,
        },
    );

    // -- what it has cost so far -------------------------------------------
    expenses.push(
        {
            id: uid("exp"),
            tripId: lagos.id,
            label: "Flights, five seats",
            amountCents: units(3420),
            currency: ctx.space.currency,
            fxRate: 1,
            homeCents: units(3420),
            financeCategoryId: lagos.financeCategoryId,
            memberId: tunde.id,
            date: day(-58),
            note: "Booked the night they went on sale.",
            postedAt: at(-58, "21:55"),
        },
        {
            id: uid("exp"),
            tripId: lagos.id,
            label: "Annual travel insurance",
            amountCents: units(186),
            currency: ctx.space.currency,
            fxRate: 1,
            homeCents: units(186),
            financeCategoryId: lagos.financeCategoryId,
            memberId: ife.id,
            date: day(-11),
            note: "Covers the Kent week too.",
            postedAt: at(-11, "19:35"),
        },
        {
            id: uid("exp"),
            tripId: lagos.id,
            label: "Christmas gifts for the cousins",
            amountCents: units(95000),
            currency: "NGN",
            fxRate: 1850,
            homeCents: Math.round(units(95000) / 1850),
            financeCategoryId: lagos.financeCategoryId,
            memberId: tunde.id,
            date: day(-5),
            note: "Sent to Uncle Segun to buy there — cheaper than carrying it.",
            postedAt: at(-5, "12:10"),
        },
    );

    // =======================================================================
    // 2 · Five days on the Kent coast — nine days away, inside T-14
    // =======================================================================
    const kentStart = day(9);
    const kent: Trip = {
        id: "trip-kent",
        spaceId: ctx.space.id,
        title: "Five days on the Kent coast",
        destination: "Whitstable, Kent",
        countryCode: "GB",
        kind: "holiday",
        status: "booked",
        startDate: kentStart,
        endDate: day(13),
        coverUrl: img("travel-coast"),
        notes: "Cheap week, off season, the cottage with the blue door. Ifeoluwa wants one day where nobody plans anything.",
        budgetCents: units(950),
        financeCategoryId: "fun",
        financeCategoryLabel: "Trips & holidays",
        localCurrency: ctx.space.currency,
        fxRate: 1,
        valueId: "Joy",
        albumId: null,
        albumTitle: "",
        template: "beach",
        visibility: "family",
        sharedWith: [],
        createdBy: ife.id,
        createdAt: at(-34, "20:05"),
        updatedAt: at(-3, "13:20"),
    };
    trips.push(kent);
    addTraveller(kent.id, ife.id, "traveller", "2031-08-14");
    addTraveller(kent.id, tunde.id, "traveller", "2029-11-02", "Working the Monday from the cottage.");
    addTraveller(kent.id, dami.id, "traveller", "2030-03-19");
    addTraveller(kent.id, tobi.id, "traveller", "2027-03-12");
    addTraveller(kent.id, ayo.id, "traveller", "2027-02-08");

    const kDay1 = addDay(kent.id, day(9), "Down on the train", "Victoria to Whitstable, then the walk from the station with all the bags.");
    addItem(kDay1, "10:40", "Train from St Pancras", "St Pancras International, London", "51.5308,-0.1258", 0, "Seats booked in coach D. Ayo by the window or there will be a scene.", "SE-88214");
    addItem(kDay1, "14:00", "Pick up the keys", "Harbour Street, Whitstable", "51.3606,1.0257", 0, "Key safe by the blue door — code is in the email.");
    addItem(kDay1, "18:00", "Fish and chips on the beach", "Whitstable Beach, Kent", "51.3625,1.0230", units(38), "Sitting on the shingle with the wind in the vinegar.");

    const kDay2 = addDay(kent.id, day(10), "The harbour and the oyster sheds", "");
    addItem(kDay2, "09:30", "Whitstable Harbour Market", "Whitstable Harbour, Kent", "51.3620,1.0242", 0, "Tobi has £5 and a plan for it.");
    addItem(kDay2, "13:00", "Lunch at the oyster shed", "The Forge, Whitstable Harbour", "51.3620,1.0242", units(46), "Not the oysters, for four fifths of the family.");
    addItem(kDay2, "15:30", "Fossil hunting at Tankerton Slopes", "Tankerton Slopes, Whitstable", "51.3661,1.0430", 0, "Bring the bucket. And the wellies.");

    const kDay3 = addDay(kent.id, day(11), "Canterbury", "One cathedral, one bookshop, one very long café stop.");
    addItem(kDay3, "10:00", "Canterbury Cathedral", "Canterbury Cathedral, Canterbury, Kent", "51.2798,1.0830", units(52), "Family ticket. The crypt is the bit Tobi will remember.", "");
    addItem(kDay3, "14:00", "The Goods Shed", "The Goods Shed, Station Road West, Canterbury", "51.2814,1.0733", units(34), "Lunch and a wander round the stalls.");

    bookings.push(
        {
            id: uid("bk"),
            tripId: kent.id,
            kind: "stay",
            provider: "Sykes Cottages · the blue door, Harbour Street",
            reference: "SYK-448210",
            startAt: at(9, "15:00"),
            endAt: at(13, "10:00"),
            costCents: units(620),
            link: "https://www.sykescottages.co.uk/",
            imageUrl: null,
            confirmed: true,
            sensitivity: "general",
            notes: "Balance paid. Key safe code comes by email the day before.",
        },
        {
            id: uid("bk"),
            tripId: kent.id,
            kind: "transport",
            provider: "Southeastern · advance singles, family railcard",
            reference: "",
            startAt: at(9, "10:40"),
            endAt: at(13, "16:20"),
            costCents: units(86),
            link: "",
            imageUrl: null,
            confirmed: false,
            sensitivity: "financial",
            notes: "Still in the basket. Book before the advance fares go.",
        },
    );

    // No packing lists yet — the trip has just crossed T-14, and the module
    // generates them per traveller from the trip's template on first load.
    addChecklist(kent.id, "holiday", "GB", ["Book the cottage balance and print the directions"], at(-20, "21:00"), {
        "Service the car and check the tyres": tunde.id,
        "Food shop for the first night": ife.id,
    });

    // =======================================================================
    // 3 · The Lake District at half-term — been, and there is an album
    // =======================================================================
    const lakes: Trip = {
        id: "trip-lakes",
        spaceId: ctx.space.id,
        title: "Half-term in the Lake District",
        destination: "Grasmere, Cumbria",
        countryCode: "GB",
        kind: "holiday",
        status: "done",
        startDate: day(-104),
        endDate: day(-99),
        coverUrl: img("travel-lakes"),
        notes: "Rained for four days out of five and nobody minded. Tobi walked further than any of us thought he could.",
        budgetCents: units(800),
        financeCategoryId: "fun",
        financeCategoryLabel: "Trips & holidays",
        localCurrency: ctx.space.currency,
        fxRate: 1,
        valueId: "Joy",
        albumId: "album-lakes",
        albumTitle: "Lake District, half-term",
        template: "cold",
        visibility: "family",
        sharedWith: [],
        createdBy: ife.id,
        createdAt: at(-160, "19:00"),
        updatedAt: at(-98, "20:30"),
    };
    trips.push(lakes);
    addTraveller(lakes.id, ife.id, "traveller", "2031-08-14");
    addTraveller(lakes.id, tunde.id, "traveller", "2029-11-02");
    addTraveller(lakes.id, dami.id, "traveller", "2030-03-19");
    addTraveller(lakes.id, tobi.id, "traveller", "2027-03-12");
    addTraveller(lakes.id, ayo.id, "traveller", "2027-02-08");

    const lkDay1 = addDay(lakes.id, day(-104), "Drive up", "Five hours and one very long queue at Charnock Richard.");
    addItem(lkDay1, "08:00", "Leave Croydon", "Croydon, London", null, 0, "", "", true);
    addItem(lkDay1, "16:00", "Cottage at Grasmere", "Grasmere, Cumbria", "54.4597,-3.0247", 0, "", "", true);
    const lkDay2 = addDay(lakes.id, day(-102), "Easedale Tarn", "The walk everybody still talks about.");
    addItem(lkDay2, "10:00", "Easedale Tarn walk", "Easedale Tarn, Grasmere", "54.4650,-3.0570", 0, "Four and a half miles, two of them uphill and all of them wet.", "", true);
    addItem(lkDay2, "15:00", "Grasmere gingerbread", "Sarah Nelson's Grasmere Gingerbread, Grasmere", "54.4589,-3.0246", units(14), "", "", true);

    bookings.push({
        id: uid("bk"),
        tripId: lakes.id,
        kind: "stay",
        provider: "Sally's cottage, Grasmere",
        reference: "GR-2211",
        startAt: at(-104, "16:00"),
        endAt: at(-99, "10:00"),
        costCents: units(540),
        link: "",
        imageUrl: null,
        confirmed: true,
        sensitivity: "general",
        notes: "Wood burner, no wifi, a drying room that earned its keep.",
    });

    addList(lakes.id, ife.id, "cold", at(-110, "20:00"), [
        ["Waterproof coat", 1, "clothes", true],
        ["Walking boots", 1, "clothes", true],
        ["Warm layers", 5, "clothes", true],
        ["Thermal socks", 3, "clothes", true],
        ["Wash bag", 1, "toiletries", true],
    ]);
    addList(lakes.id, tunde.id, "cold", at(-110, "20:04"), [
        ["Waterproof coat", 1, "clothes", true],
        ["Walking boots", 1, "clothes", true],
        ["Warm layers", 5, "clothes", true],
        ["Head torch", 1, "other", true],
    ]);
    addList(lakes.id, dami.id, "cold", at(-110, "20:08"), [
        ["Waterproof coat", 1, "clothes", true],
        ["Warm layers", 5, "clothes", true],
        ["Headphones", 1, "tech", true],
        ["Charger", 1, "tech", true],
    ]);
    addList(lakes.id, tobi.id, "cold", at(-110, "20:11"), [
        ["Waterproof coat", 1, "clothes", true],
        ["Wellies", 1, "clothes", true],
        ["Warm layers", 5, "clothes", true],
        ["Bug pot and magnifier", 1, "kids", true],
    ]);
    addList(lakes.id, ayo.id, "cold", at(-110, "20:14"), [
        ["Waterproof coat", 1, "clothes", true],
        ["Wellies", 1, "clothes", true],
        ["Warm layers", 5, "clothes", true],
        ["Favourite teddy", 1, "kids", true],
        ["Two picture books", 2, "kids", true],
    ]);

    for (const row of checklistTemplate("holiday", "GB")) {
        checklist.push({ id: uid("check"), tripId: lakes.id, item: row.item, note: row.note, dueOffsetDays: row.dueOffsetDays, ownerMemberId: null, doneAt: at(-106, "18:00") });
    }

    expenses.push(
        { id: uid("exp"), tripId: lakes.id, label: "Cottage, five nights", amountCents: units(540), currency: ctx.space.currency, fxRate: 1, homeCents: units(540), financeCategoryId: lakes.financeCategoryId, memberId: ife.id, date: day(-160), note: "", postedAt: at(-160, "19:10") },
        { id: uid("exp"), tripId: lakes.id, label: "Petrol, there and back", amountCents: units(96), currency: ctx.space.currency, fxRate: 1, homeCents: units(96), financeCategoryId: lakes.financeCategoryId, memberId: tunde.id, date: day(-99), note: "", postedAt: at(-99, "19:00") },
        { id: uid("exp"), tripId: lakes.id, label: "Food and the gingerbread", amountCents: units(138), currency: ctx.space.currency, fxRate: 1, homeCents: units(138), financeCategoryId: lakes.financeCategoryId, memberId: ife.id, date: day(-100), note: "Mostly the gingerbread.", postedAt: at(-100, "20:00") },
        { id: uid("exp"), tripId: lakes.id, label: "Boat on Windermere", amountCents: units(38), currency: ctx.space.currency, fxRate: 1, homeCents: units(38), financeCategoryId: lakes.financeCategoryId, memberId: tunde.id, date: day(-101), note: "", postedAt: at(-101, "17:20") },
    );

    // =======================================================================
    // 4 · Paris, someday — a wish with a picture on it
    // =======================================================================
    const paris: Trip = {
        id: "trip-paris",
        spaceId: ctx.space.id,
        title: "Paris, someday",
        destination: "Paris, France",
        countryCode: "FR",
        kind: "holiday",
        status: "dreaming",
        startDate: null,
        endDate: null,
        coverUrl: img("travel-paris"),
        notes: "Dami's idea, and she has been quietly saving for it. Three days, the Louvre, and a proper crêpe on the street.",
        budgetCents: units(1600),
        financeCategoryId: "savings",
        financeCategoryLabel: "Trips & holidays",
        localCurrency: "EUR",
        fxRate: 1.17,
        valueId: "Joy",
        albumId: null,
        albumTitle: "",
        template: "city",
        visibility: "family",
        sharedWith: [],
        createdBy: dami.id,
        createdAt: at(-21, "22:10"),
        updatedAt: at(-21, "22:10"),
    };
    trips.push(paris);
    addTraveller(paris.id, ife.id, "traveller", "2031-08-14");
    addTraveller(paris.id, tunde.id, "traveller", "2029-11-02");
    addTraveller(paris.id, dami.id, "traveller", "2030-03-19");
    addTraveller(paris.id, tobi.id, "traveller", "2027-03-12");
    addTraveller(paris.id, ayo.id, "traveller", "2027-02-08");

    // =======================================================================
    // Documents — sensitivity "documents", parents only, in both repos
    // =======================================================================
    const passport = (memberId: string, number: string, expiresAt: string, notes = ""): TravelDoc => ({
        id: uid("doc"),
        tripId: null,
        memberId,
        kind: "passport",
        label: "British passport",
        number,
        expiresAt,
        imageUrl: null,
        notes,
        sensitivity: "documents",
    });
    docs.push(
        passport(ife.id, "533412889110", "2031-08-14"),
        passport(tunde.id, "533498210447", "2029-11-02"),
        passport(dami.id, "541120933812", "2030-03-19"),
        passport(tobi.id, "547781200315", "2027-03-12", "Renew before Lagos — a child passport takes about six weeks."),
        passport(ayo.id, "549900411827", "2027-02-08", "Renew with Tobi's; same form, same photo booth, same afternoon."),
        {
            id: uid("doc"),
            tripId: null,
            memberId: dami.id,
            kind: "other",
            label: "GHIC card",
            number: "80099344215",
            expiresAt: day(26),
            imageUrl: null,
            notes: "Free to renew online, and it takes ten minutes.",
            sensitivity: "documents",
        },
        {
            id: uid("doc"),
            tripId: null,
            memberId: ife.id,
            kind: "insurance",
            label: "Aviva annual multi-trip certificate",
            number: "AVMT4471902",
            expiresAt: day(78),
            imageUrl: null,
            notes: "Covers Kent and Lagos. Renew before the December flights.",
            sensitivity: "documents",
        },
        {
            id: uid("doc"),
            tripId: null,
            memberId: tunde.id,
            kind: "licence",
            label: "Driving licence (photocard)",
            number: "ADEWA802291TA9XY",
            expiresAt: "2029-01-29",
            imageUrl: null,
            notes: "Needed for car hire in Lagos.",
            sensitivity: "documents",
        },
        {
            id: uid("doc"),
            tripId: lagos.id,
            kind: "vaccination",
            memberId: tobi.id,
            label: "Yellow fever certificate",
            number: "YF-2024-88120",
            expiresAt: "2034-06-11",
            imageUrl: null,
            notes: "Valid for ten years. Keep it with the passports.",
            sensitivity: "documents",
        },
    );

    void today;
    return { trips, travellers, days, items, bookings, docs, lists, packItems, checklist, expenses };
}
