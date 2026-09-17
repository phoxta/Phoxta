import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Member, Nudge, ProgressRing, RepoContext } from "@/data/core";
import { clamp } from "@/lib/format";
import type { AiUsage, PlanDef, PlanTier, SensitivityClass, StudioItem, StudioKind, StudioState } from "./types";
import { PLANS } from "./types";

/**
 * Every number the studio shows, and — first — the one function both repos use
 * to decide what a member may receive.
 *
 * The sharp edges here are privacy edges. A parent's conversation with the
 * companion is theirs alone. A child's conversation is visible to their
 * parents by default, because the brief says a child's AI is supervised and a
 * promise you cannot inspect is not a promise. A guest sees the outputs the
 * family explicitly shared with them and nothing else — not the gallery, not
 * the meter, not one line of anybody's chat.
 */

export const BASE = "/create/studio";

// ---------------------------------------------------------------------------
// Sensitivity classes — the context-pack gate
// ---------------------------------------------------------------------------

/**
 * Which sensitivity class each module's grounding belongs to. The classes the
 * brief names — Financial, Health, Documents, Private, Settings — never enter
 * a child's or a guest's context pack unless a parent has granted exactly
 * that capability.
 */
export const CLASS_BY_MODULE: Record<string, SensitivityClass> = {
    home: "private",
    notifications: "general",
    family: "settings",
    people: "general",
    learning: "general",
    books: "general",
    bible: "general",
    curricula: "general",
    tasks: "general",
    goals: "general",
    projects: "documents",
    calendar: "general",
    finance: "financial",
    travel: "general",
    wardrobe: "general",
    wellness: "health",
    studio: "general",
    moodboards: "general",
    memories: "general",
};

/** The classes a non-parent never receives without an explicit grant. */
export const RESTRICTED: SensitivityClass[] = ["financial", "health", "documents", "private", "settings"];

/** The one grant that unlocks a restricted class for a child or guest. */
export const GRANT_FOR_CLASS: Partial<Record<SensitivityClass, string>> = {
    financial: "finance.view",
    health: "wellness.mine",
    documents: "projects.view",
};

export const sensitivityOf = (moduleId: string): SensitivityClass => CLASS_BY_MODULE[moduleId] ?? "general";

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

export function canSeeItem(item: StudioItem, me: Member): boolean {
    if (item.memberId === me.id) return true;

    // A conversation is private to the person who had it — with one exception
    // the family is told about: a child's chats are open to their parents.
    if (item.kind === "chat") return me.role === "parent" && item.data.visibleToParents;

    switch (item.visibility) {
        case "private":
            return false;
        case "shared":
            return item.sharedWith.includes(me.id);
        case "family":
            return me.role !== "child" || item.childSafe;
        case "child":
        default:
            return true;
    }
}

/**
 * The slice this member may receive. A guest gets only what was explicitly
 * shared with them (plus anything they made themselves), no meter and no
 * projects — the guest studio is a two-generator room, not a library.
 */
export function visibleTo(state: StudioState, ctx: RepoContext): StudioState {
    const me = ctx.me;
    const items = state.items.filter((i) => canSeeItem(i, me));

    if (me.role === "guest") {
        return {
            items: items.filter((i) => i.kind !== "chat" || i.memberId === me.id),
            projects: [],
            usage: { ...state.usage, costCents: 0, tokens: 0 },
            plan: state.plan,
        };
    }

    return {
        items,
        projects: me.role === "parent" ? state.projects : state.projects.filter((p) => p.childSafe || p.memberId === me.id),
        usage: state.usage,
        plan: state.plan,
    };
}

// ---------------------------------------------------------------------------
// The meter
// ---------------------------------------------------------------------------

export interface CapState {
    usedCents: number;
    capCents: number;
    pct: number;
    /** 80% and over: say it once, plainly. */
    warn: boolean;
    /** Spent: the hard stop. */
    blocked: boolean;
    message: string | null;
}

export const HARD_STOP = "This month's companion allowance is used up. Nothing is broken — the rest of Wàfè works as it always does, and the allowance resets on the 1st.";

export function capState(usage: AiUsage): CapState {
    const cap = Math.max(1, usage.capCents);
    const pct = clamp(Math.round((usage.costCents / cap) * 100), 0, 999);
    const blocked = usage.costCents >= cap;
    const warn = !blocked && pct >= 80;
    return {
        usedCents: usage.costCents,
        capCents: cap,
        pct,
        warn,
        blocked,
        message: blocked ? HARD_STOP : warn ? `You have used ${pct}% of this month's companion allowance.` : null,
    };
}

export const planOf = (state: StudioState): PlanDef => PLANS[state.plan];

/** Roughly what an action costs, in pence — the demo's honest stand-in. */
export const COST: Record<"ask" | "song" | "storyboard" | "image", number> = { ask: 2, song: 9, storyboard: 12, image: 26 };

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export const itemById = (state: StudioState, id: string): StudioItem | undefined => state.items.find((i) => i.id === id);

export const itemsOfKind = <K extends StudioKind>(state: StudioState, kind: K): Array<Extract<StudioItem, { kind: K }>> =>
    state.items.filter((i): i is Extract<StudioItem, { kind: K }> => i.kind === kind);

export const newestFirst = (a: StudioItem, b: StudioItem): number => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);

export const gallery = (state: StudioState): StudioItem[] => state.items.filter((i) => i.kind !== "chat").sort(newestFirst);

export const conversations = (state: StudioState): Array<Extract<StudioItem, { kind: "chat" }>> => itemsOfKind(state, "chat").sort(newestFirst);

/** A child's conversations, for the parent's supervision panel. */
export const childConversations = (state: StudioState, ctx: RepoContext): Array<Extract<StudioItem, { kind: "chat" }>> => {
    const kids = new Set(ctx.members.filter((m) => m.role === "child").map((m) => m.id));
    return conversations(state).filter((c) => kids.has(c.memberId));
};

export const pendingProposals = (state: StudioState): Array<{ conversationId: string; proposal: NonNullable<Extract<StudioItem, { kind: "chat" }>["data"]["messages"][number]["proposal"]> }> => {
    const out: Array<{ conversationId: string; proposal: NonNullable<Extract<StudioItem, { kind: "chat" }>["data"]["messages"][number]["proposal"]> }> = [];
    for (const c of itemsOfKind(state, "chat")) {
        for (const m of c.data.messages) {
            if (m.proposal && m.proposal.status === "pending") out.push({ conversationId: c.id, proposal: m.proposal });
        }
    }
    return out;
};

export const lastMessage = (c: Extract<StudioItem, { kind: "chat" }>) => c.data.messages[c.data.messages.length - 1];

/** A one-line preview for a gallery card. */
export function previewOf(item: StudioItem): string {
    switch (item.kind) {
        case "song":
            return `${item.data.key} · ${item.data.tempo} bpm · ${item.data.structure.length} sections`;
        case "story":
            return `${item.data.scenes.length} scenes${item.data.scenes.some((s) => s.imageUrl) ? " · with pictures" : ""}`;
        case "image":
            return item.data.status === "generated" ? "Generated picture" : "Typographic card · no image model on this plan";
        case "chat":
        default:
            return item.data.messages.length ? `${item.data.messages.length} messages` : "Nothing said yet";
    }
}

export const coverOf = (item: StudioItem): string | null => {
    if (item.kind === "image") return item.data.url;
    if (item.kind === "story") return item.data.scenes.find((s) => s.imageUrl)?.imageUrl ?? null;
    return null;
};

/** The songs a child may open: child-safe, and never someone's private draft. */
export const childSafeItems = (state: StudioState): StudioItem[] => state.items.filter((i) => i.kind !== "chat" && (i.childSafe || i.visibility === "child"));

export const madeThisMonth = (state: StudioState, today: string): StudioItem[] => {
    const month = today.slice(0, 7);
    return state.items.filter((i) => i.kind !== "chat" && i.createdAt.slice(0, 7) === month);
};

/** Storyboards that have not yet been handed to Memories to play. */
export const unsentStories = (state: StudioState): Array<Extract<StudioItem, { kind: "story" }>> => itemsOfKind(state, "story").filter((s) => !s.data.sentToReelAt);

// ---------------------------------------------------------------------------
// Shared surfaces
// ---------------------------------------------------------------------------

export function dashboard(state: StudioState, ctx: RepoContext): DashboardContribution {
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];

    const cap = capState(state.usage);
    const plan = planOf(state);

    if (ctx.role === "parent") {
        const pending = pendingProposals(state);
        if (pending.length) {
            attention.push({
                id: "studio-proposals",
                moduleId: "studio",
                area: "create",
                tone: "info",
                title: `${pending.length} companion proposal${pending.length === 1 ? "" : "s"} waiting`,
                body: `Wàfè suggested ${pending
                    .slice(0, 2)
                    .map((p) => `"${p.proposal.title}"`)
                    .join(" and ")}. Nothing happens until you say yes.`,
                href: BASE,
                weight: 42,
            });
        }

        if (cap.blocked) {
            attention.push({
                id: "studio-cap",
                moduleId: "studio",
                area: "create",
                tone: "warn",
                title: "The companion's allowance is spent",
                body: `${plan.name} includes £${(plan.aiCapCents / 100).toFixed(2)} of companion a month. It resets on the 1st.`,
                href: `${BASE}/gallery`,
                weight: 30,
            });
        } else if (cap.warn) {
            attention.push({
                id: "studio-cap-warn",
                moduleId: "studio",
                area: "create",
                tone: "info",
                title: `Companion allowance at ${cap.pct}%`,
                body: "Still plenty for the briefings; the studio is the expensive part.",
                href: `${BASE}/gallery`,
                weight: 12,
            });
        }

        rings.push({
            id: "studio-usage",
            moduleId: "studio",
            area: "create",
            label: "Companion allowance",
            pct: clamp(cap.pct, 0, 100),
            sub: `${plan.name} plan · resets on the 1st`,
            href: `${BASE}/gallery`,
        });

        const made = madeThisMonth(state, ctx.today);
        if (made.length) {
            const latest = made.sort(newestFirst)[0];
            agenda.push({
                id: `studio-latest-${latest.id}`,
                moduleId: "studio",
                area: "create",
                title: `Made this month: ${latest.title}`,
                meta: `Studio · ${made.length} thing${made.length === 1 ? "" : "s"}`,
                memberId: null,
                at: null,
                done: true,
                href: `${BASE}/gallery/${latest.id}`,
                sort: 940,
            });
        }
    }

    if (ctx.role === "child") {
        childCards.push(
            {
                id: "studio-make-story",
                moduleId: "studio",
                area: "create",
                title: "Make a story",
                body: "Six pictures and a beginning, a middle and an end. You say what it is about.",
                emoji: "📖",
                href: `${BASE}/stories`,
            },
            {
                id: "studio-sing",
                moduleId: "studio",
                area: "create",
                title: "Sing our song",
                body: "The words get big and scroll along so you can sing without losing your place.",
                emoji: "🎵",
                href: `${BASE}/songs`,
            },
        );
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: StudioState, ctx: RepoContext): Nudge[] {
    if (ctx.role === "guest") return [];
    const parents = ctx.members.filter((m) => m.role === "parent").map((m) => m.id);
    const out: Nudge[] = [];

    for (const { conversationId, proposal } of pendingProposals(state)) {
        out.push({
            key: `studio-proposal-${proposal.id}`,
            moduleId: "studio",
            kind: "family",
            title: "Wàfè has a suggestion",
            body: `"${proposal.title}" — it will not happen until someone confirms it.`,
            href: `${BASE}/gallery/${conversationId}`,
            memberIds: parents,
        });
    }

    const cap = capState(state.usage);
    if (cap.warn && !state.usage.warnedAt) {
        out.push({
            key: `studio-cap-80-${state.usage.month}`,
            moduleId: "studio",
            kind: "family",
            title: `Companion allowance at ${cap.pct}%`,
            body: "A heads-up, not a problem. When it runs out the companion pauses and everything else carries on.",
            href: `${BASE}/gallery`,
            memberIds: parents,
        });
    }

    for (const s of unsentStories(state)) {
        if (s.data.scenes.every((sc) => sc.imageUrl)) {
            out.push({
                key: `studio-story-ready-${s.id}`,
                moduleId: "studio",
                kind: "celebrate",
                title: `"${s.title}" is ready to watch`,
                body: `${ctx.members.find((m) => m.id === s.memberId)?.name.split(" ")[0] ?? "Someone"} finished a ${s.data.scenes.length}-scene story. Play it after dinner.`,
                href: `${BASE}/gallery/${s.id}`,
                memberIds: [...new Set([...parents, s.memberId])],
            });
        }
    }

    return out;
}

export function aiContext(state: StudioState, ctx: RepoContext): string {
    const songs = itemsOfKind(state, "song");
    const stories = itemsOfKind(state, "story");
    const images = itemsOfKind(state, "image");
    if (!songs.length && !stories.length && !images.length) return "";

    const first = (id: string) => ctx.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "someone";
    const parts: string[] = [];

    if (songs.length) {
        parts.push(
            `Songs the family has written: ${songs
                .map((s) => `"${s.title}" (${s.data.key}, ${s.data.tempo} bpm, ${s.data.structure.map((x) => x.section).join("/")}${s.data.recording ? ", recorded" : ""})`)
                .join("; ")}.`,
        );
    }
    if (stories.length) {
        parts.push(`Storyboards: ${stories.map((s) => `"${s.title}" by ${first(s.memberId)}, ${s.data.scenes.length} scenes`).join("; ")}.`);
    }
    if (images.length) {
        const made = images.filter((i) => i.data.status === "generated").length;
        parts.push(`Pictures: ${made} generated, ${images.length - made} kept as typographic cards because the plan has no image model.`);
    }
    if (ctx.role === "parent") {
        const cap = capState(state.usage);
        parts.push(`Companion allowance this month: ${cap.pct}% of £${(cap.capCents / 100).toFixed(2)} on the ${planOf(state).name} plan.`);
    }
    return parts.join(" ").slice(0, 1500);
}

export function search(state: StudioState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const i of state.items) {
        if (i.kind === "chat") {
            if (i.title.toLowerCase().includes(needle)) hits.push({ title: i.title, meta: "Companion · conversation", href: `${BASE}/gallery/${i.id}` });
            continue;
        }
        const body =
            i.kind === "song"
                ? i.data.structure.map((s) => `${s.section} ${s.lyrics}`).join(" ")
                : i.kind === "story"
                  ? i.data.scenes.map((s) => `${s.caption} ${s.narration}`).join(" ")
                  : i.data.prompt;
        if (`${i.title} ${body}`.toLowerCase().includes(needle)) {
            hits.push({ title: i.title, meta: `Studio · ${i.kind === "song" ? "song" : i.kind === "story" ? "storyboard" : "picture"}`, href: `${BASE}/gallery/${i.id}` });
        }
    }
    return hits.slice(0, 8);
}

/** The tier a plan upgrade would move to (for the plan table's call to action). */
export const nextTier = (tier: PlanTier): PlanTier | null => (tier === "seed" ? "household" : tier === "household" ? "legacy" : null);
