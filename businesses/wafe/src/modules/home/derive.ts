import type { AgeBand, AgendaItem, AttentionItem, Member, Nudge, RepoContext, Role } from "@/data/core";
import { isoDate, longDate, money, time } from "@/lib/format";
import type { PeekBudget, PeekEvent, PeekVerse } from "./peek";
import type { Briefing, CheckIn, HomeState, Milestone, WeeklyReview, When } from "./types";

/**
 * Every number Home shows, as a pure function of state.
 *
 * Two things live here that are worth naming. `visibleTo` is the privacy
 * filter both repos run before anything reaches a screen — a child's Home
 * cannot render a record the child may not read, because the record never
 * arrives. And `attentionRules` is the single, written-down definition of
 * what "Needs attention" contains, which the brief left contradictory: the
 * panel is every attention item any module raises, plus Home's own three
 * rules below, minus whatever the family has marked dealt with.
 */

/** A slice with nothing in it — what a screen renders against before load. */
export const EMPTY_HOME: HomeState = { briefings: [], checkIns: [], reviews: [], milestones: [], resolved: [] };

// ---------------------------------------------------------------------------
// Visibility — the filter both repos run
// ---------------------------------------------------------------------------

/**
 * Can this member read a timeline row?
 *
 * The platform's `wf_can_see` is deliberately generous to guests — a 'family'
 * or 'child' row is readable by anyone in the space — because most modules
 * only ever render a guest the objects they were granted. The family TIMELINE
 * is the exception: it is the one table Home puts on the guest dashboard, and
 * a mentor granted "his sessions and explicitly shared notes" must not read
 * the children's firsts through it. So a guest sees a milestone only when
 * they were named on it, and `sql/home.sql` narrows the policy to match.
 */
function canSee(m: Milestone, ctx: RepoContext): boolean {
    if (ctx.role === "guest") return m.sharedWith.includes(ctx.me.id) || m.ownerMemberId === ctx.me.id;
    if (m.visibility === "child") return true;
    if (m.ownerMemberId && m.ownerMemberId === ctx.me.id) return true;
    if (m.visibility === "shared") return m.sharedWith.includes(ctx.me.id);
    if (m.visibility === "family") return ctx.role === "parent";
    return false;
}

/**
 * The slice this member is allowed to have.
 *
 * Parents see the whole family's rhythm — that is the point of the aggregate
 * check-in. Everyone else sees their own briefings and their own check-ins,
 * and nobody but a parent sees the planning record, which contains the
 * family's priorities and last week's numbers.
 */
export function visibleTo(state: HomeState, ctx: RepoContext): HomeState {
    const parent = ctx.role === "parent";
    const mine = <T extends { memberId: string }>(rows: T[]): T[] => (parent ? rows : rows.filter((r) => r.memberId === ctx.me.id));
    return {
        briefings: mine(state.briefings),
        checkIns: mine(state.checkIns),
        reviews: parent ? state.reviews : [],
        milestones: state.milestones.filter((m) => canSee(m, ctx)),
        resolved: state.resolved,
    };
}

/**
 * The Monday that starts the week containing `date`.
 *
 * `weekStart` in lib/format parses a bare YYYY-MM-DD as UTC, which lands on
 * the previous day west of Greenwich and quietly shifts the whole week. Home
 * compares week keys against dates it builds at local noon, so it anchors its
 * own — one rule, every timezone.
 */
export function weekOf(date: string): string {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return isoDate(d);
}

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

export const MOODS: Array<{ value: number; label: string; emoji: string }> = [
    { value: 1, label: "A hard day", emoji: "😔" },
    { value: 2, label: "Heavy going", emoji: "😕" },
    { value: 3, label: "Steady", emoji: "🙂" },
    { value: 4, label: "A good day", emoji: "😊" },
    { value: 5, label: "A brilliant day", emoji: "🤩" },
];

export const moodLabel = (mood: number): string => MOODS.find((m) => m.value === mood)?.label ?? "Steady";
export const moodEmoji = (mood: number): string => MOODS.find((m) => m.value === mood)?.emoji ?? "🙂";

export const checkInFor = (state: HomeState, memberId: string, date: string): CheckIn | undefined =>
    state.checkIns.find((c) => c.memberId === memberId && c.date === date);

export const checkInsFor = (state: HomeState, memberId: string): CheckIn[] =>
    state.checkIns.filter((c) => c.memberId === memberId).sort((a, b) => b.date.localeCompare(a.date));

/** Consecutive days with a check-in, counting back from yesterday (today counts once done). */
export function streakFor(state: HomeState, memberId: string, today: string): number {
    const days = new Set(state.checkIns.filter((c) => c.memberId === memberId).map((c) => c.date));
    let n = 0;
    const cursor = new Date(`${today}T12:00:00`);
    if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
    for (;;) {
        const key = isoDate(cursor);
        if (!days.has(key)) break;
        n += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return n;
}

/** Every member's check-in for a day — the aggregate a parent sees. */
export function familyCheckIns(state: HomeState, members: Member[], date: string): Array<{ memberId: string; checkIn: CheckIn | undefined }> {
    return members.filter((m) => m.role !== "guest").map((m) => ({ memberId: m.id, checkIn: checkInFor(state, m.id, date) }));
}

/** The average mood across everyone who checked in, or null. */
export function moodAverage(state: HomeState, date: string): number | null {
    const rows = state.checkIns.filter((c) => c.date === date);
    if (!rows.length) return null;
    return Math.round((rows.reduce((s, c) => s + c.mood, 0) / rows.length) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Weekly review — the Week focus card
// ---------------------------------------------------------------------------

export const reviewForWeek = (state: HomeState, week: string): WeeklyReview | undefined => state.reviews.find((r) => r.weekStart === week);

/** The most recently completed planning session. */
export function latestReview(state: HomeState): WeeklyReview | undefined {
    return [...state.reviews].filter((r) => r.completedAt).sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
}

/** This week's focus if it was set, otherwise the most recent one. */
export function weekFocus(state: HomeState, today: string): WeeklyReview | undefined {
    return reviewForWeek(state, weekOf(today)) ?? latestReview(state);
}

/** True on the family's planning day (1 = Monday … 7 = Sunday). */
export function isPlanningDay(today: string, planningDay: number): boolean {
    const d = new Date(`${today}T12:00:00`).getDay();
    return (d === 0 ? 7 : d) === planningDay;
}

// ---------------------------------------------------------------------------
// On this day
// ---------------------------------------------------------------------------

/** Home's own timeline entries from an earlier year, same day and month. */
export function onThisDay(state: HomeState, today: string): Milestone[] {
    const md = today.slice(5);
    return state.milestones
        .filter((m) => m.date.slice(5) === md && m.date < today)
        .sort((a, b) => b.date.localeCompare(a.date));
}

export const yearsSince = (date: string, today: string): number => Number(today.slice(0, 4)) - Number(date.slice(0, 4));

// ---------------------------------------------------------------------------
// Needs attention — one written-down definition
// ---------------------------------------------------------------------------

/**
 * The brief described this panel three different ways. This is the one the
 * product implements, and the panel prints it so a family can see why
 * something is in front of them.
 */
export const ATTENTION_RULES: string[] = [
    "Anything a module raises: an overdue task, a breached budget, an unanswered invitation, a cadence that has slipped, a verse nobody has reviewed.",
    "A deadline inside the next 48 hours — today's and tomorrow's diary, not just today's.",
    "Work still open after the evening check-in should have happened.",
    "A week with no focus set, on any day but the planning day itself.",
];

const ONE_DAY = 86_400_000;

/** Home's own rules, as attention items, so the panel is one list. */
export function homeAttention(input: { agenda: AgendaItem[]; events: PeekEvent[]; today: string; now: Date; hasFocus: boolean; focusOverdue: boolean; checkedIn: boolean; role: Role }): AttentionItem[] {
    const out: AttentionItem[] = [];
    const horizon = input.now.getTime() + 2 * ONE_DAY;

    for (const e of input.events) {
        const t = new Date(e.at).getTime();
        if (t < input.now.getTime() || t > horizon) continue;
        if (e.date === input.today) continue; // today's diary is already on Today
        out.push({
            id: `deadline-${e.id}`,
            moduleId: "home",
            area: "home",
            tone: "info",
            title: e.title,
            body: `Tomorrow at ${time(e.at)} — inside the next 48 hours.`,
            href: e.href,
            weight: 40,
        });
    }

    const openToday = input.agenda.filter((a) => !a.done);
    if (input.now.getHours() >= 18 && openToday.length > 0) {
        out.push({
            id: "unfinished-today",
            moduleId: "home",
            area: "home",
            tone: "warn",
            title: `${openToday.length} thing${openToday.length === 1 ? "" : "s"} still open today`,
            body: "The evening check-in can reschedule, hand over or drop them in three taps.",
            href: "/",
            weight: 55,
        });
    }

    if (input.role === "parent" && !input.hasFocus && input.focusOverdue) {
        out.push({
            id: "no-week-focus",
            moduleId: "home",
            area: "home",
            tone: "info",
            title: "This week has no focus yet",
            body: "Sunday planning takes about ten minutes and sets three priorities.",
            href: "/planning",
            weight: 45,
        });
    }

    if (!input.checkedIn && input.now.getHours() >= 20) {
        out.push({
            id: "no-checkin",
            moduleId: "home",
            area: "home",
            tone: "info",
            title: "You haven't checked in tonight",
            body: "Mood, one thing you're grateful for, and what's left over.",
            href: "/",
            weight: 30,
        });
    }
    return out;
}

/** A stable key per attention item, so "dealt with" survives a reload. */
export const attentionKey = (a: AttentionItem): string => `${a.moduleId}:${a.id}`;

// ---------------------------------------------------------------------------
// The briefing
// ---------------------------------------------------------------------------

/** How many of a thing the page RENDERED, out of how many there are. */
export interface Shown {
    shown: number;
    total: number;
}

export interface BriefingInput {
    firstName: string;
    when: When;
    today: string;
    role: Role;
    /** Drives the words as well as the layout: a five-year-old is not a teen. */
    band: AgeBand;
    /** Today's agenda, already filtered to what this member may see. */
    agenda: AgendaItem[];
    /**
     * The three things the PAGE selected, in the order it shows them. The
     * briefing is the caption to what the screen chose, never a second,
     * differently-ranked opinion about the day.
     */
    lead: AgendaItem[];
    /** Open things: what the page shows, and the true total it links to. */
    things: Shown;
    events: PeekEvent[];
    /** The attention rows the page renders. */
    attention: AttentionItem[];
    /** How many there really are behind "3 of 57 — see all". */
    attentionTotal: number;
    priorities: string[];
    verse: PeekVerse | null;
    /** The worst budget, parents only — the one the money line names. */
    budget: PeekBudget | null;
    currency: string;
    checkedIn: boolean;
    lastSummary: string;
}

/**
 * THE COUNT RULE.
 *
 * The briefing may never name a number the page does not show. Everything
 * below is built from `lead` (rendered as Three things), `things` and
 * `attentionTotal` (rendered as "3 of 57 — see all"), `priorities` (rendered
 * in This week), `verse` and `budget` (rendered as the money line) — so the
 * two functions are structurally incapable of quoting an aggregate the screen
 * did not print. The old "56 jobs still to do" was exactly that: an
 * aggregation artefact, not a family's real day.
 */

/** The chips under the briefing: exactly what fed it, in the page's own numbers. */
export function briefingSources(i: BriefingInput): string[] {
    const out: string[] = [];
    if (i.things.total) out.push(`${i.things.shown} of ${i.things.total} due today`);
    if (i.events.length) out.push("Today's diary");
    if (i.priorities.length) out.push(`Week focus · ${i.priorities.length} priorit${i.priorities.length === 1 ? "y" : "ies"}`);
    if (i.verse) out.push(`Verse · ${i.verse.reference}`);
    if (i.budget) out.push(`${i.budget.label} · ${i.budget.pct}% of budget`);
    if (i.attentionTotal) out.push(`${i.attention.length} of ${i.attentionTotal} needing attention`);
    if (i.lastSummary) out.push("Last night's check-in");
    if (!out.length) out.push("Your family profile");
    return out;
}

/** Extra grounding the screen hands the companion, so it never guesses. */
export function briefingGrounding(i: BriefingInput): string {
    const lines: string[] = [`Briefing for ${i.firstName} (${i.role}) — ${longDate(i.today)}, ${i.when}.`];
    if (i.lead.length) lines.push(`The three things this screen is showing, in this order: ${i.lead.map((a) => `${a.title}${a.at ? ` at ${time(a.at)}` : ""}`).join("; ")}.`);
    if (i.events.length) lines.push(`Diary: ${i.events.map((e) => `${e.title} at ${time(e.at)}`).join("; ")}.`);
    if (i.priorities.length) lines.push(`This week's focus: ${i.priorities.join("; ")}.`);
    if (i.attention.length) lines.push(`Waiting on a decision: ${i.attention.slice(0, 3).map((a) => a.title).join("; ")}.`);
    if (i.verse) lines.push(`Verse: ${i.verse.reference} — ${i.verse.text}`);
    if (i.budget && i.role === "parent") lines.push(`Money: ${i.budget.label} at ${i.budget.pct}% of its limit (${money(i.budget.spentCents, i.currency)} of ${money(i.budget.limitCents, i.currency)}).`);
    if (i.lastSummary) lines.push(`Last check-in: ${i.lastSummary}`);
    if (i.role === "child" && i.band === "little") lines.push("Write 2 very short sentences for a five-year-old. Simple words, no numbers at all, nothing about money or grown-up worries. British English, warm, second person.");
    else if (i.role === "child" && i.band === "junior") lines.push("Write 2 short sentences for a nine-year-old. Plain words, encouraging. British English, second person. No headings, no bullet lists, no invented facts.");
    else lines.push("Write exactly three sentences on three lines, 60–80 words in total: the shape of the day naming the items above in that order; the week's focus in the family's own words; then the one thing waiting on a decision. British English, warm and concrete, second person.");
    // The count rule, restated for the companion: it writes into the same card.
    lines.push("Never state a total, count or percentage that is not in the facts above — the screen shows those and only those, and a number the family cannot see on the page is a number they cannot check.");
    return lines.join("\n");
}

/**
 * A little one's briefing: three short sentences, no counts they cannot read,
 * nothing about budgets or attention. Ayo is five; "16 jobs still to do,
 * starting with harvest lunch at the chapel" is not a sentence for her.
 */
/**
 * A five-year-old's whole briefing: one sentence, spoken.
 *
 * No count of any kind. "Your day · 2 of 16 done so far" is not a summary, it
 * is a five-year-old's morning ruined before it starts.
 */
export function littleSentence(agenda: AgendaItem[], meId?: string): string {
    const open = agenda.filter((a) => !a.done);
    if (!agenda.length) return "There is nothing on your list today. Time to play.";
    if (!open.length) return "You have done everything on your list. Well done!";
    // Hers first: a family birthday is lovely, but it is not a thing SHE does,
    // and "your first thing" has to be a thing she can go and do.
    const first = open.find((a) => a.memberId && a.memberId === meId) ?? open[0];
    // Titles arrive from other modules and carry their furniture with them —
    // "Every Kind of Volcano | SciShow Kids" is a video title, not a sentence
    // for a five-year-old, and it is about to be read aloud to her.
    const plain = first.title.split(/\s+[|—–·]\s+/)[0].trim();
    return `Your first thing today is ${plain}.`;
}

export function littleBriefing(i: BriefingInput): string {
    return littleSentence(i.lead.length ? i.lead : i.agenda);
}

/**
 * Which of a child's cards a five-year-old should be handed first.
 *
 * `pickTiles` caps one per module, which stops four chore tiles — but on its
 * own it hands Ayo whatever the module registry happens to list first, and
 * "You have 1" from Notifications is not a thing a Reception child can go and
 * do. Doing modules lead; the passive ones fill in behind them.
 */
export const LITTLE_TILE_ORDER: Record<string, number> = { tasks: 0, curricula: 1, bible: 2, books: 3, wellness: 4, learning: 5, memories: 6, moodboards: 7 };

/**
 * A junior's briefing: two sentences.
 *
 * No count at all beyond the one the tiles themselves show — "you have 23
 * things left" is a nine-year-old's morning ruined before it starts, and the
 * honest total lives one tap away on his own list.
 */
function juniorBriefing(i: BriefingInput): string {
    const open = i.lead.length ? i.lead : i.agenda.filter((a) => !a.done);
    const paras: string[] = [];
    if (!i.agenda.length) paras.push("Nothing has been set for you today, so today is yours.");
    else if (!open.length) paras.push("Everything on your list is done. That is a good day's work.");
    else paras.push(`Start with ${open[0].title.toLowerCase()}${open[0].at ? ` at ${time(open[0].at)}` : ""}.`);
    if (i.when === "evening" && !i.checkedIn) paras.push("Before bed, tell us how today went — it only takes a minute.");
    else if (i.verse) paras.push(`Today's verse is ${i.verse.reference}.`);
    return paras.join("\n\n");
}

/**
 * "Harvest lunch at 13:00" — an item named the way a person would say it.
 *
 * The title keeps its own capitals. Lowercasing a sentence mid-clause reads
 * neatly right up until the sentence is somebody's name, and "kemi
 * Adeyemi-Bright's birthday" is how a family's own words get quietly mangled.
 */
const named = (a: AgendaItem): string => `${a.title}${a.at ? ` at ${time(a.at)}` : ""}`;

/** A list in English: "a, b and c". */
function sentenceList(parts: string[]): string {
    if (parts.length <= 1) return parts[0] ?? "";
    return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * The shape of the day in two words — said, never counted.
 *
 * The count rule forbids "56 jobs still to do"; it does not forbid Home
 * having an opinion about whether a Wednesday is full.
 */
function dayShape(things: Shown, events: number): string {
    if (!things.total && !events) return "A clear day";
    if (events >= 2 || things.total >= 12) return "A full day";
    if (things.total >= 5) return "A steady day";
    return "A gentle day";
}

/**
 * The briefing we write ourselves when the companion is unavailable or the
 * month's allowance is gone. Same data, same order, plainer prose — the
 * family still gets their morning, and the card says where it came from.
 *
 * The little and junior bands get their own shorter, gentler version: the
 * adult paragraph about budgets and things needing a decision is not written
 * for them, and giving it to them anyway is the fastest way to make a child's
 * Home feel like a parent's.
 */
export function templateBriefing(i: BriefingInput): string {
    if (i.role === "child" && i.band === "little") return littleBriefing(i);
    if (i.role === "child" && i.band === "junior") return juniorBriefing(i);

    const paras: string[] = [];

    // 1. THE LEAD — the shape of the day, and the same items the page chose,
    //    in the same order. This is the caption to Three things, not a rival.
    if (i.lead.length) paras.push(`${dayShape(i.things, i.events.length)}: ${sentenceList(i.lead.map(named))}.`);
    else if (i.things.total) paras.push("Everything on today's list is already done.");
    else paras.push("Nothing is booked and nothing is due, which is its own kind of good news.");

    // 2. THE WEEK — the family's own words, never ours.
    if (i.priorities.length) paras.push(`This week the family said it was about ${i.priorities.map((p) => p.charAt(0).toLowerCase() + p.slice(1)).join(", ")}.`);

    // 3. THE ONE HARD EDGE — a decision, the evening ritual, or the good news.
    const tail: string[] = [];
    // A module writes its own row title, and a title is sometimes already a
    // whole sentence ("5 things are overdue"), so the clause goes in FRONT of
    // it rather than trying to inflect around it.
    if (i.attention.length) tail.push(`Waiting on you: ${i.attention[0].title}.`);
    else if (i.when === "evening" && !i.checkedIn) tail.push("When the house is quiet, the check-in takes about a minute.");
    else tail.push("Nothing is overdue.");
    if (i.budget && i.role === "parent" && i.budget.pct >= 100) {
        tail.push(`${i.budget.label} has gone over — ${money(i.budget.spentCents, i.currency)} of ${money(i.budget.limitCents, i.currency)}.`);
    }
    paras.push(tail.join(" "));

    return paras.join("\n\n");
}

/**
 * The line Home's own seed opens Oluwafemi's briefing with.
 *
 * It used to be hardcoded as "It is Sunday — the family's planning day" while
 * the header two inches above rendered whatever day the demo actually opened
 * on. A demo that contradicts itself in its first two lines is worse than a
 * plainer one, so the day now comes from the date.
 */
export function seedOpeningLine(today: string, planningDay: number): string {
    const day = new Date(`${today}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long" });
    return isPlanningDay(today, planningDay)
        ? `It is ${day} — the family's planning day, and the one morning of the week nothing is due before church.`
        : `It is ${day}, ${longDate(today)}, and the house is already moving.`;
}

/**
 * The briefing this member was given TODAY, whatever hour wrote it.
 *
 * One per member per day is the promise, and the promise is what the family's
 * monthly allowance is budgeted against — so the day is the key, not the day
 * and the slot. Arriving at 11:59 and again at 12:01 reads the same briefing
 * back; "Regenerate" replaces it in place.
 */
export const briefingForDay = (state: HomeState, memberId: string, date: string): Briefing | undefined =>
    state.briefings.find((b) => b.memberId === memberId && b.date === date);

/**
 * Tasks let go at tonight's check-in.
 *
 * Tasks archives a dropped task by marking it done with a reason, which is
 * right for its own board but wrong on Home: a family that chose to let
 * something go should not find it ticked off in Today as though they had done
 * it. Home hides those rows from Today and names them on the check-in card
 * instead.
 */
export function droppedToday(state: HomeState, date: string, memberId?: string): Set<string> {
    const rows = state.checkIns.filter((c) => c.date === date && (!memberId || c.memberId === memberId));
    const out = new Set<string>();
    for (const c of rows) for (const d of c.decisions) if (d.action === "drop") out.add(d.taskId);
    return out;
}

/** Today's agenda with anything let go at a check-in taken out of it. */
export const withoutDropped = (agenda: AgendaItem[], dropped: Set<string>): AgendaItem[] =>
    dropped.size ? agenda.filter((a) => !(a.moduleId === "tasks" && dropped.has(a.id))) : agenda;

/** Which briefing the hour of the day asks for. */
export const whenFor = (hour: number): When => (hour < 12 ? "morning" : hour < 17 ? "midday" : "evening");

/**
 * The first open of the day is always a morning, whatever the clock says.
 *
 * A parent who opens Wàfè for the first time at three in the afternoon was
 * handed "Your evening briefing" for a day they had not yet been told about.
 * When no briefing exists for (me, today) the card is simply "Your briefing".
 */
export const briefingLabel = (slot: When, firstOpen: boolean): string =>
    firstOpen ? "Your briefing" : slot === "morning" ? "Your morning briefing" : slot === "evening" ? "Your evening briefing" : "Where you are today";

// ---------------------------------------------------------------------------
// Module surfaces
// ---------------------------------------------------------------------------

/** Home consumes the dashboard; it contributes the rhythm as follow-ups. */
export function nudges(state: HomeState, ctx: RepoContext): Nudge[] {
    const out: Nudge[] = [];
    if (ctx.role !== "guest" && !checkInFor(state, ctx.me.id, ctx.today)) {
        out.push({
            key: `home-checkin-${ctx.me.id}-${ctx.today}`,
            moduleId: "home",
            kind: "briefing",
            title: "Time for your check-in",
            body: "Mood, one thing you're grateful for, and what's left over from today.",
            href: "/",
            memberIds: [ctx.me.id],
            notBefore: new Date(`${ctx.today}T18:30:00`).toISOString(),
        });
    }
    if (ctx.role === "parent" && isPlanningDay(ctx.today, ctx.space.planningDay) && !reviewForWeek(state, weekOf(ctx.today))?.completedAt) {
        out.push({
            key: `home-planning-${weekOf(ctx.today)}`,
            moduleId: "home",
            kind: "briefing",
            title: "Sunday planning",
            body: "Ten minutes to set three priorities for the week and look back at the last one.",
            href: "/planning",
            memberIds: [],
            notBefore: new Date(`${ctx.today}T16:00:00`).toISOString(),
        });
    }
    return out;
}

/** ≤ 1,500 chars, and only what this member may see (state is pre-filtered). */
export function aiContext(state: HomeState, ctx: RepoContext): string {
    const parts: string[] = [];
    const last = checkInsFor(state, ctx.me.id)[0];
    if (last) parts.push(`Last check-in (${last.date}): ${moodLabel(last.mood).toLowerCase()}, grateful for "${last.gratitude}". ${last.summary}`);
    const streak = streakFor(state, ctx.me.id, ctx.today);
    if (streak > 1) parts.push(`${streak} evenings checked in, in a row.`);
    const focus = weekFocus(state, ctx.today);
    if (focus?.priorities.length) parts.push(`Week focus (${focus.weekStart}): ${focus.priorities.join("; ")}.`);
    if (focus && ctx.role === "parent") parts.push(`Last week: ${focus.tasksDone}/${focus.tasksPlanned} planned tasks done, ${focus.prayersAnswered} prayer(s) answered.`);
    const today = onThisDay(state, ctx.today);
    if (today.length) parts.push(`On this day: ${today.map((m) => `${m.title} (${m.date.slice(0, 4)})`).join("; ")}.`);
    return parts.join(" ").slice(0, 1500);
}

export function search(state: HomeState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const m of state.milestones) {
        if (`${m.title} ${m.body}`.toLowerCase().includes(needle)) hits.push({ title: m.title, meta: `On this day · ${m.date.slice(0, 4)}`, href: m.href });
    }
    for (const c of state.checkIns) {
        if (`${c.gratitude} ${c.prayer} ${c.summary}`.toLowerCase().includes(needle)) hits.push({ title: c.summary || c.gratitude || "Evening check-in", meta: `Check-in · ${c.date}`, href: `/${c.memberId}/reflections` });
    }
    for (const r of state.reviews) {
        if (r.priorities.some((p) => p.toLowerCase().includes(needle)) || r.notes.toLowerCase().includes(needle)) hits.push({ title: r.priorities.join(" · ") || "Sunday planning", meta: `Week focus · ${r.weekStart}`, href: "/planning" });
    }
    return hits.slice(0, 8);
}
