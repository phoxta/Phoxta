import type { SeedContext } from "@/data/core";
import type { Community, ContactEntry, FollowUp, GiftIdea, GiftRequest, GivingPayment, Mentor, MentorSession, PeopleState, Person } from "./types";

/**
 * The Adeyemis' relational world.
 *
 * Fourteen people across Croydon, Bromley, Manchester, Birmingham, Lagos and
 * Ibadan; three communities (Grace Chapel, the home-ed co-op, the cycling
 * club); three mentors, Pastor Dayo at the centre of them. Everything is
 * relative to `ctx.today` so the demo never goes stale, and it is arranged so
 * every acceptance criterion is one click away:
 *
 *   · Kemi's birthday is TODAY  → the agenda and a celebration
 *   · Mrs Harding is TOMORROW   → the 1-day reminder with a drafted message
 *   · Uncle Seun is in 7 DAYS   → the 7-day reminder
 *   · The Okonkwos' anniversary is in 3 days
 *   · Aunty Bisi (monthly) was last called six weeks ago → Needs attention
 *   · Uncle Femi (quarterly) is four months overdue
 *   · Pastor Dayo's next session is Friday, with two past sessions, private
 *     notes, one overdue follow-up and questions to ask before next time
 *   · One gift already waiting on a decision, several ideas still unsent
 *   · Grace Chapel's tithe is paid for two months and due for this one
 */

export function seed(ctx: SeedContext): PeopleState {
    const { space, uid, at, img } = ctx;
    const sid = space.id;

    /**
     * A birthday whose day/month is N days from today, with a real birth year.
     * Anchored at midday: `ctx.day()` builds local midnight and then converts to
     * UTC, which slips a day under British Summer Time — and a birthday that is
     * one day out is exactly the bug this demo exists to disprove.
     */
    const md = (daysFromToday: number): string => at(daysFromToday, "12:00").slice(5, 10);
    const bday = (year: number, daysFromToday: number): string => `${year}-${md(daysFromToday)}`;

    const gift = (title: string, occasion: string, pounds: number, note = "", status: GiftIdea["status"] = "idea"): GiftIdea => ({
        id: uid("gift"),
        title,
        occasion,
        estCents: Math.round(pounds * 100),
        status,
        note,
        createdAt: at(-30, "20:00"),
    });

    const person = (p: Partial<Person> & Pick<Person, "name" | "relationship" | "kind">): Person => ({
        id: uid("person"),
        spaceId: sid,
        photoUrl: null,
        birthday: null,
        anniversary: null,
        address: "",
        phone: "",
        email: "",
        notes: "",
        prayerNeeds: "",
        giftIdeas: [],
        cadence: "none",
        lastContactedAt: null,
        linkedMemberId: null,
        tags: [],
        visibility: "family",
        sharedWith: [],
        ownerMemberId: "mem-ife",
        inviteCode: null,
        sharedObjects: [],
        redacted: false,
        createdAt: at(-200, "10:00"),
        ...p,
    });

    // -----------------------------------------------------------------------
    // People
    // -----------------------------------------------------------------------
    const folake = person({
        name: "Mama Fọláké Adeyemi",
        relationship: "Oluwafemi's mother · Grandma to the children",
        kind: "relative",
        photoUrl: img("member-folake"),
        birthday: "1958-11-14",
        anniversary: "1979-04-21",
        address: "12 Ọ̀yọ́ Road, Bodija, Ibadan, Oyo State, Nigeria",
        phone: "+234 803 447 2210",
        email: "folake@adewale.example",
        notes: "Calls on Sunday evenings after church. Prefers WhatsApp voice notes to typing. Her knee has been troubling her since May.",
        prayerNeeds: "Her knee, and the church building fund in Ibadan.",
        giftIdeas: [gift("Wax print head-tie set", "Birthday", 35, "Ìyá Sade's stall on Rye Lane has the deep indigo one."), gift("Photo book of the children", "Christmas", 24, "Twelve months of pictures, printed and posted.", "requested")],
        cadence: "weekly",
        lastContactedAt: at(-2, "19:30"),
        linkedMemberId: "mem-folake",
        tags: ["close family", "church"],
        inviteCode: "WAFE-FOLA-2026",
        sharedObjects: ["The prayer wall", "Christmas in Lagos", "Album: Summer 2026", "Album: Ayo's first day", "Events she is tagged in"],
    });

    const seun = person({
        name: "Uncle Seun Adeyemi",
        relationship: "Oluwafemi's older brother · Manchester",
        kind: "relative",
        photoUrl: img("people-seun"),
        birthday: bday(1978, 7),
        address: "48 Ladybarn Lane, Fallowfield, Manchester M14 6YL",
        phone: "+44 7700 900 118",
        email: "seun.adewale@example.com",
        notes: "Drives down for the August bank holiday every year. Three children — Tola, Femi and the baby, Zara.",
        prayerNeeds: "The new job at the trust, and Zara's chest.",
        giftIdeas: [gift("United home shirt (Tola, age 11)", "Birthday", 45), gift("Bag of Ìyá Sade's ògì", "Just because", 8)],
        cadence: "monthly",
        lastContactedAt: at(-12, "21:10"),
        tags: ["close family"],
    });

    const bisi = person({
        name: "Aunty Bisi Ọlátúndé",
        relationship: "Ifeoluwa's older sister · Lagos",
        kind: "relative",
        photoUrl: img("people-bisi"),
        birthday: bday(1980, 24),
        address: "7B Adéọlá Odéku, Victoria Island, Lagos, Nigeria",
        phone: "+234 802 991 5533",
        email: "bisi.olatunde@example.com",
        notes: "Runs the fabric business on Balogun. Six hours ahead — call before 20:00 our time. She sent the children's Christmas outfits in July.",
        prayerNeeds: "The shop lease renewal, and Kunle's university applications.",
        giftIdeas: [gift("Marks & Spencer hamper", "Christmas", 60)],
        cadence: "monthly",
        // Six weeks — the overdue cadence the spec asks for.
        lastContactedAt: at(-42, "18:40"),
        tags: ["close family"],
    });

    const baba = person({
        name: "Baba Adébáyọ̀ Adeyemi",
        relationship: "Oluwafemi's father · Ibadan",
        kind: "relative",
        birthday: "1954-02-02",
        anniversary: "1979-04-21",
        address: "12 Ọ̀yọ́ Road, Bodija, Ibadan, Oyo State, Nigeria",
        phone: "+234 803 447 2211",
        notes: "Retired headmaster. Wants the children to learn Yorùbá properly — Tobi practises with him on Saturdays.",
        prayerNeeds: "Strength, and patience with the generator.",
        giftIdeas: [gift("Reading glasses, +2.5", "Christmas", 18)],
        cadence: "weekly",
        lastContactedAt: at(-2, "19:30"),
        tags: ["close family"],
    });

    const okonkwo = person({
        name: "Chidi & Ngozi Okonkwo",
        relationship: "Friends from Grace Chapel · Bromley",
        kind: "friend",
        photoUrl: img("people-okonkwo"),
        anniversary: `2009-${md(3)}`,
        address: "31 Plaistow Lane, Bromley BR1 3PA",
        phone: "+44 7700 900 442",
        email: "chidi.okonkwo@example.com",
        notes: "Their Chinedu is in Tobi's class at co-op. They host the July barbecue.",
        prayerNeeds: "Ngozi's mother in Enugu.",
        giftIdeas: [gift("Anniversary hamper", "Anniversary", 45, "Cheese, olives and the elderflower they like.")],
        cadence: "monthly",
        lastContactedAt: at(-9, "12:00"),
        tags: ["friend", "church"],
        inviteCode: "WAFE-OKON-2026",
        sharedObjects: ["Board: Tobi's 10th birthday"],
    });

    const dayo = person({
        name: "Pastor Dayo Ìlòrí",
        relationship: "Grace Chapel, Thornton Heath · mentors Oluwafemi and Ifeoluwa",
        kind: "friend",
        photoUrl: img("member-dayo"),
        birthday: "1974-10-03",
        address: "Grace Chapel, Brigstock Road, Thornton Heath CR7 7JN",
        phone: "+44 7700 900 771",
        email: "dayo@gracechapel.example",
        notes: "Prefers Friday evenings. Ask about the men's group before committing Oluwafemi to anything else.",
        prayerNeeds: "The building works, and his daughter's A-levels.",
        cadence: "monthly",
        lastContactedAt: at(-10, "19:00"),
        linkedMemberId: "mem-dayo",
        tags: ["church", "mentor"],
        inviteCode: "WAFE-DAYO-2026",
        sharedObjects: ["His mentor sessions", "Notes shared with him"],
    });

    const ronke = person({
        name: "Sister Ronke Adéyemí",
        relationship: "Grace Chapel · welcome team with Ifeoluwa",
        kind: "friend",
        phone: "+44 7700 900 233",
        email: "ronke.a@example.com",
        notes: "Brings the jollof for every church lunch. Lost her father in March.",
        prayerNeeds: "Grief, and her mother moving in.",
        cadence: "monthly",
        lastContactedAt: at(-5, "13:20"),
        tags: ["church", "friend"],
    });

    const harding = person({
        name: "Mrs Harding",
        relationship: "Next door · number 46",
        kind: "neighbour",
        photoUrl: img("people-neighbour"),
        birthday: bday(1949, 1),
        address: "46 Bensham Lane, Croydon CR0 2RS",
        phone: "+44 20 8684 1122",
        notes: "Keeps our spare key. Ayo takes her a drawing most Fridays. Deaf in her left ear — knock hard.",
        prayerNeeds: "Her hip operation in the spring.",
        giftIdeas: [gift("Rose bush for the front", "Birthday", 22, "She admired the yellow one at number 52.")],
        cadence: "weekly",
        lastContactedAt: at(-4, "16:00"),
        tags: ["neighbour"],
    });

    const kemi = person({
        name: "Kemi Adeyemi-Bright",
        relationship: "Oluwafemi's cousin · Peckham",
        kind: "relative",
        // Today — the birthday on the agenda and the celebration.
        birthday: bday(1990, 0),
        address: "Flat 9, Bellenden Road, London SE15 4QY",
        phone: "+44 7700 900 505",
        email: "kemi.bright@example.com",
        notes: "Photographer. Did the pictures for Ayo's christening and won't take money for them.",
        prayerNeeds: "A steady contract.",
        giftIdeas: [gift("Voucher for the camera shop", "Birthday", 50)],
        cadence: "quarterly",
        lastContactedAt: at(-20, "11:00"),
        tags: ["close family", "friend"],
    });

    const femiU = person({
        name: "Uncle Femi Ọlátúndé",
        relationship: "Ifeoluwa's uncle · Birmingham",
        kind: "relative",
        birthday: "1961-07-19",
        address: "88 Soho Road, Handsworth, Birmingham B21 9SS",
        phone: "+44 7700 900 617",
        notes: "The family historian. Has the photographs from Ibadan in the 1960s — we keep meaning to scan them.",
        prayerNeeds: "His eyesight.",
        cadence: "quarterly",
        // Four months — a second overdue cadence.
        lastContactedAt: at(-124, "17:30"),
        tags: ["close family"],
    });

    const amara = person({
        name: "Aunty Amara Nwosu",
        relationship: "Family friend · paediatrician, Croydon University Hospital",
        kind: "friend",
        phone: "+44 7700 900 884",
        email: "amara.nwosu@example.com",
        notes: "Not our GP — but the person Ifeoluwa rings at 2am when a temperature will not come down.",
        prayerNeeds: "Rest. She is on nights until October.",
        cadence: "quarterly",
        lastContactedAt: at(-31, "21:45"),
        tags: ["friend"],
        visibility: "family",
    });

    const marcus = person({
        name: "Coach Marcus Bell",
        relationship: "Tobi's football coach · Croydon Colts U10",
        kind: "other",
        phone: "+44 7700 900 909",
        email: "colts.u10@example.com",
        notes: "Saturday training 09:30 at Ashburton Playing Fields. Kit money is due each September.",
        cadence: "none",
        lastContactedAt: at(-6, "10:15"),
        tags: ["school", "club"],
    });

    const yewande = person({
        name: "Mrs Yewande Cole",
        relationship: "Dami's piano teacher · six years now",
        kind: "other",
        photoUrl: img("people-piano"),
        birthday: bday(1971, 46),
        phone: "+44 7700 900 336",
        email: "yewande.cole@example.com",
        notes: "£28 a lesson, Thursdays 16:30. Thinks Dami should sit Grade 6 in the spring.",
        cadence: "monthly",
        lastContactedAt: at(-3, "17:00"),
        tags: ["school"],
    });

    const whitfields = person({
        name: "Grace & Sam Whitfield",
        relationship: "Home-ed co-op · Purley",
        kind: "friend",
        address: "5 Foxley Lane, Purley CR8 3EE",
        phone: "+44 7700 900 271",
        email: "grace.whitfield@example.com",
        notes: "Grace runs the co-op science mornings with Ifeoluwa. Four children, all home-educated.",
        prayerNeeds: "Sam's redundancy consultation.",
        cadence: "monthly",
        lastContactedAt: at(-14, "09:40"),
        tags: ["friend", "school"],
    });

    const people: Person[] = [folake, baba, seun, bisi, kemi, femiU, okonkwo, dayo, ronke, harding, amara, whitfields, marcus, yewande];

    // -----------------------------------------------------------------------
    // Contact log
    // -----------------------------------------------------------------------
    const contact = (personId: string, days: number, hhmm: string, channel: ContactEntry["channel"], note: string, by: string): ContactEntry => ({
        id: uid("contact"),
        personId,
        at: at(days, hhmm),
        channel,
        note,
        byMemberId: by,
    });

    const contacts: ContactEntry[] = [
        contact(folake.id, -2, "19:30", "video", "Sunday call. Ayo read her memory verse and Mama cried.", "mem-ife"),
        contact(baba.id, -2, "19:30", "video", "Same call — Tobi practised his Yorùbá greetings.", "mem-tunde"),
        contact(yewande.id, -3, "17:00", "message", "Confirmed Thursday and asked about Grade 6.", "mem-ife"),
        contact(harding.id, -4, "16:00", "visit", "Ayo took her a drawing of Bella.", "mem-ife"),
        contact(ronke.id, -5, "13:20", "call", "Checked in after church. Her mother moves in next month.", "mem-ife"),
        contact(marcus.id, -6, "10:15", "message", "Kit money sent for the season.", "mem-tunde"),
        contact(okonkwo.id, -9, "12:00", "visit", "Lunch after the service. Chinedu and Tobi disappeared into the garden.", "mem-tunde"),
        contact(dayo.id, -10, "19:00", "visit", "Mentor session — budgeting with generosity.", "mem-tunde"),
        contact(seun.id, -12, "21:10", "call", "Long one. The trust job starts in October.", "mem-tunde"),
        contact(whitfields.id, -14, "09:40", "message", "Swapped the co-op science rota.", "mem-ife"),
        contact(kemi.id, -20, "11:00", "message", "Asked if she could shoot the Christmas portraits in Lagos.", "mem-ife"),
        contact(amara.id, -31, "21:45", "call", "Ayo's temperature. Amara said paracetamol and patience.", "mem-ife"),
        contact(bisi.id, -42, "18:40", "call", "Talked about the shop lease. She sounded tired.", "mem-ife"),
        contact(femiU.id, -124, "17:30", "call", "Promised to come and scan the Ibadan photographs. We have not.", "mem-tunde"),
    ];

    // -----------------------------------------------------------------------
    // Communities
    // -----------------------------------------------------------------------
    const chapel: Community = {
        id: uid("community"),
        spaceId: sid,
        name: "Grace Chapel, Thornton Heath",
        type: "church",
        meetingRhythm: "Sundays 10:00 · Bible study Wednesdays 19:30",
        meetsWhere: "Brigstock Road, Thornton Heath CR7 7JN",
        link: "https://gracechapel.example",
        photoUrl: img("people-grace-chapel"),
        rolesHeld: ["Oluwafemi — leads the Wednesday Bible study", "Ifeoluwa — welcome team, first Sunday of the month", "Dami — youth band, keys"],
        contacts: [
            { name: "Pastor Dayo Ìlòrí", role: "Senior pastor", phone: "+44 7700 900 771", email: "dayo@gracechapel.example" },
            { name: "Sister Ronke Adéyemí", role: "Welcome team lead", phone: "+44 7700 900 233", email: "ronke.a@example.com" },
        ],
        givingCommitmentCents: 12000,
        givingFrequency: "monthly",
        memberIds: ["mem-ife", "mem-tunde", "mem-dami", "mem-tobi", "mem-ayo"],
        linkedEventIds: [],
        sharedWithGuests: true,
        notes: "Our church home since 2011. The building fund closes in December.",
        createdAt: at(-400, "10:00"),
    };

    const coop: Community = {
        id: uid("community"),
        spaceId: sid,
        name: "Croydon Home-Ed Co-op",
        type: "coop",
        meetingRhythm: "Tuesdays & Thursdays, 09:30–12:30",
        meetsWhere: "St Andrew's Hall, Southbridge Road, Croydon CR0 1AF",
        link: "https://croydonhomeed.example",
        photoUrl: img("people-coop"),
        rolesHeld: ["Ifeoluwa — runs the science mornings with Grace Whitfield"],
        contacts: [{ name: "Grace Whitfield", role: "Co-ordinator", phone: "+44 7700 900 271", email: "grace.whitfield@example.com" }],
        givingCommitmentCents: 2500,
        givingFrequency: "monthly",
        memberIds: ["mem-tobi", "mem-ayo", "mem-ife"],
        linkedEventIds: [],
        sharedWithGuests: false,
        notes: "Subs cover the hall and materials. Science fair is on the 10th.",
        createdAt: at(-320, "10:00"),
    };

    const cycling: Community = {
        id: uid("community"),
        spaceId: sid,
        name: "Addiscombe Cycling Club",
        type: "club",
        meetingRhythm: "Saturdays 07:00 · club run from the clock tower",
        meetsWhere: "Addiscombe, Croydon",
        link: "https://addiscombecc.example",
        photoUrl: img("people-cycling"),
        rolesHeld: ["Oluwafemi — rides the intermediate group"],
        contacts: [{ name: "Ray Mensah", role: "Ride leader", phone: "+44 7700 900 158", email: "rides@addiscombecc.example" }],
        givingCommitmentCents: 800,
        givingFrequency: "monthly",
        memberIds: ["mem-tunde"],
        linkedEventIds: [],
        sharedWithGuests: false,
        notes: "Membership renews in April. Oluwafemi is riding the Surrey Hills sportive in the spring.",
        createdAt: at(-240, "10:00"),
    };

    const communities: Community[] = [chapel, coop, cycling];

    const pay = (c: Community, days: number, amountCents: number, note: string): GivingPayment => ({
        id: uid("giving"),
        communityId: c.id,
        communityName: c.name,
        amountCents,
        paidAt: at(days, "20:00"),
        note,
        byMemberId: "mem-ife",
    });

    const giving: GivingPayment[] = [
        pay(chapel, -66, 12000, "Tithe · July"),
        pay(chapel, -35, 12000, "Tithe · August"),
        pay(chapel, -35, 5000, "Building fund"),
        pay(coop, -35, 2500, "Co-op subs · August"),
        pay(cycling, -35, 800, "Club membership"),
        pay(coop, -66, 2500, "Co-op subs · July"),
        // This month: the co-op and the club are settled, the tithe is not —
        // one clean outstanding commitment to record from the screen.
        pay(coop, -4, 2500, "Co-op subs · September"),
        pay(cycling, -4, 800, "Club membership"),
    ];

    // -----------------------------------------------------------------------
    // Mentors and sessions
    // -----------------------------------------------------------------------
    const mDayo: Mentor = {
        id: uid("mentor"),
        spaceId: sid,
        personId: dayo.id,
        memberId: "mem-dayo",
        area: "faith",
        title: "Pastor",
        menteeMemberIds: ["mem-tunde", "mem-ife"],
        nextSessionAt: at(5, "19:00"),
        createdAt: at(-300, "10:00"),
    };

    const mYewande: Mentor = {
        id: uid("mentor"),
        spaceId: sid,
        personId: yewande.id,
        memberId: null,
        area: "music",
        title: "Piano teacher",
        menteeMemberIds: ["mem-dami"],
        nextSessionAt: at(4, "16:30"),
        createdAt: at(-280, "10:00"),
    };

    const mMarcus: Mentor = {
        id: uid("mentor"),
        spaceId: sid,
        personId: marcus.id,
        memberId: null,
        area: "other",
        title: "Football coach",
        menteeMemberIds: ["mem-tobi"],
        nextSessionAt: at(6, "09:30"),
        createdAt: at(-160, "10:00"),
    };

    const mentors: Mentor[] = [mDayo, mYewande, mMarcus];

    const sessions: MentorSession[] = [
        {
            id: uid("session"),
            mentorId: mDayo.id,
            date: at(-24, "19:00"),
            participants: ["mem-tunde"],
            agenda: "Leading family devotions",
            notes: "Dayo's push: fifteen minutes, same time, every day beats an hour on a Sunday nobody remembers. Start with the children's memory verse rather than my reading. He said the honest thing — that I have been leading a Bible study for thirty people and not for my own five. That landed.",
            notesVisibility: "private",
            notesSharedWith: [],
            ownerMemberId: "mem-tunde",
            questionsBeforeNext: ["How do I keep Dami engaged without making it a lecture?", "What do we do on the evenings I get home after 20:00?"],
            nextSessionAt: at(-10, "19:00"),
            notesWithheld: false,
            createdAt: at(-24, "21:00"),
        },
        {
            id: uid("session"),
            mentorId: mDayo.id,
            date: at(-10, "19:00"),
            participants: ["mem-tunde", "mem-ife"],
            agenda: "Budgeting with generosity",
            notes: "Give first, then plan — not the other way round. Dayo suggested a fixed monthly figure to the chapel and a small open envelope for whoever God puts in front of us. Ifeoluwa raised the Lagos flights; he said generosity and prudence are not opposites and we should decide the giving before we price the tickets.",
            notesVisibility: "shared",
            notesSharedWith: ["mem-ife"],
            ownerMemberId: "mem-tunde",
            questionsBeforeNext: ["Is £120 a month the right commitment while the Lagos trip is being paid for?", "How do we teach the children giving without it becoming pocket-money maths?"],
            nextSessionAt: at(5, "19:00"),
            notesWithheld: false,
            createdAt: at(-10, "21:15"),
        },
        {
            id: uid("session"),
            mentorId: mYewande.id,
            date: at(-3, "16:30"),
            participants: ["mem-dami"],
            agenda: "Grade 5 pieces — the Chopin and the scales",
            notes: "Left hand is rushing in bar 24. Twenty minutes a day, hands separately, metronome at 72. Mrs Cole thinks Grade 6 in the spring is realistic if the scales are solid by half term.",
            // Written for Dami to read: practice notes are hers, not gossip about her.
            notesVisibility: "child",
            notesSharedWith: [],
            ownerMemberId: "mem-ife",
            questionsBeforeNext: ["Which two pieces for Grade 6?"],
            nextSessionAt: at(4, "16:30"),
            notesWithheld: false,
            createdAt: at(-3, "18:00"),
        },
        {
            id: uid("session"),
            mentorId: mMarcus.id,
            date: at(-6, "09:30"),
            participants: ["mem-tobi"],
            agenda: "Saturday training · playing on the left",
            notes: "Tobi is quick but hides on the left wing. Coach wants him taking the ball forward rather than passing it back. Ten minutes of ball work in the garden on the days he does not train.",
            notesVisibility: "child",
            notesSharedWith: [],
            ownerMemberId: "mem-tunde",
            questionsBeforeNext: [],
            nextSessionAt: at(6, "09:30"),
            notesWithheld: false,
            createdAt: at(-6, "11:00"),
        },
        {
            id: uid("session"),
            mentorId: mDayo.id,
            date: at(-38, "19:30"),
            participants: ["mem-tunde"],
            agenda: "The men's group — should Oluwafemi lead a table?",
            notes: "Agreed: one table, twice a month, from January — not before. Dayo will put it to the elders and send the dates. Oluwafemi to be honest about the Lagos trip taking December.",
            // Explicitly shared with Pastor Dayo: he needs these, and only these.
            notesVisibility: "shared",
            notesSharedWith: ["mem-dayo", "mem-ife"],
            ownerMemberId: "mem-tunde",
            questionsBeforeNext: ["What does leading a table actually cost me in hours?"],
            nextSessionAt: at(-24, "19:00"),
            notesWithheld: false,
            createdAt: at(-38, "21:00"),
        },
    ];

    const followUps: FollowUp[] = [
        { id: uid("followup"), sessionId: sessions[0].id, mentorId: mDayo.id, title: "Print the family devotion cards", memberId: "mem-tunde", dueAt: at(-2, "18:00"), done: false, taskId: null, createdAt: at(-24, "21:05") },
        { id: uid("followup"), sessionId: sessions[0].id, mentorId: mDayo.id, title: "Ask Ifeoluwa about the Sunday evening slot", memberId: "mem-tunde", dueAt: at(-20, "18:00"), done: true, taskId: null, createdAt: at(-24, "21:06") },
        { id: uid("followup"), sessionId: sessions[1].id, mentorId: mDayo.id, title: "Set the chapel giving envelope to £120 a month", memberId: "mem-ife", dueAt: at(3, "18:00"), done: false, taskId: null, createdAt: at(-10, "21:20") },
        { id: uid("followup"), sessionId: sessions[1].id, mentorId: mDayo.id, title: "Price the Lagos flights before we decide the giving", memberId: "mem-tunde", dueAt: at(2, "18:00"), done: false, taskId: null, createdAt: at(-10, "21:21") },
        { id: uid("followup"), sessionId: sessions[2].id, mentorId: mYewande.id, title: "Twenty minutes of scales a day, hands separately", memberId: "mem-dami", dueAt: at(1, "17:00"), done: false, taskId: null, createdAt: at(-3, "18:05") },
    ];

    const giftRequests: GiftRequest[] = [
        {
            id: uid("giftreq"),
            personId: folake.id,
            giftIdeaId: folake.giftIdeas[1].id,
            title: "Photo book of the children",
            forPersonName: folake.name,
            occasion: "Christmas",
            estCents: 2400,
            status: "pending",
            note: "Twelve months of pictures, printed and posted to Ibadan.",
            requestedBy: "mem-ife",
            requestedAt: at(-4, "21:30"),
        },
    ];

    return { people, contacts, communities, giving, mentors, sessions, followUps, giftRequests };
}
