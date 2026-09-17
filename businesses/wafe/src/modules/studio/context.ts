import type { Capability, Member, Role, Space } from "@/data/core";
import { uid } from "@/lib/format";
import { MODULES } from "@/modules";
import { GRANT_FOR_CLASS, RESTRICTED, sensitivityOf } from "./derive";
import type { Proposal, SensitivityClass, Source } from "./types";

/**
 * The context builder.
 *
 * The companion knows exactly one thing: the family's own grounding, which the
 * shell assembles from each module's `aiContext` — already filtered for the
 * asking member. This file turns that string back into inspectable SECTIONS so
 * three promises in the brief become things you can look at rather than things
 * you are asked to believe:
 *
 *  1. every answer names the sections it read (the source chips);
 *  2. Financial, Health, Documents, Private and Settings sections are removed
 *     from a child's or a guest's pack unless a parent granted that exact
 *     capability — and the screen shows what was removed and why;
 *  3. when nothing in the pack answers the question, the companion says so
 *     instead of inventing.
 *
 * It also carries the two guards a child's companion needs: the age-band
 * prompt picker (Little and Junior never free-type) and the safety classifier
 * that redirects a teenager to a parent rather than answering.
 */

// ---------------------------------------------------------------------------
// Parsing the grounding into sections
// ---------------------------------------------------------------------------

export interface PackSection {
    moduleId: string;
    label: string;
    href: string;
    text: string;
    sensitivity: SensitivityClass;
}

export interface ExcludedSection extends PackSection {
    reason: string;
}

export interface ContextPack {
    /** The family header the shell always sends (name, members, values). */
    header: string;
    sections: PackSection[];
    excluded: ExcludedSection[];
    /** Characters actually sent. */
    size: number;
}

function moduleByName(name: string): { id: string; path: string } {
    const m = MODULES.find((x) => x.name === name);
    return m ? { id: m.id, path: m.path } : { id: name.toLowerCase().replace(/[^a-z]+/g, "-"), path: "/" };
}

/** Split `aiGrounding()` into the family header and one section per module. */
function parse(grounding: string): { header: string; sections: PackSection[] } {
    const header: string[] = [];
    const sections: PackSection[] = [];
    let current: PackSection | null = null;
    for (const raw of grounding.split("\n")) {
        const m = raw.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (m) {
            const { id, path } = moduleByName(m[1]);
            current = { moduleId: id, label: m[1], href: path, text: m[2], sensitivity: sensitivityOf(id) };
            sections.push(current);
        } else if (current) {
            current.text += ` ${raw.trim()}`;
        } else {
            header.push(raw);
        }
    }
    return { header: header.join("\n"), sections: sections.filter((s) => s.text.trim().length > 0) };
}

/** May this member's pack carry a section of this sensitivity class? */
export function allows(role: Role, grants: Partial<Record<Capability, boolean>>, s: SensitivityClass): boolean {
    if (role === "parent") return true;
    if (!RESTRICTED.includes(s)) return true;
    const grant = GRANT_FOR_CLASS[s];
    return Boolean(grant && grants[grant as Capability] === true);
}

/**
 * The pack for one member. Parents receive everything their own slices held;
 * children and guests lose every restricted class they were not granted, and
 * what was lost is returned alongside so the screen can show the gate working.
 */
export function buildPack(grounding: string, member: Pick<Member, "role" | "grants">): ContextPack {
    const { header, sections } = parse(grounding);
    const kept: PackSection[] = [];
    const excluded: ExcludedSection[] = [];
    for (const s of sections) {
        if (allows(member.role, member.grants ?? {}, s.sensitivity)) kept.push(s);
        else excluded.push({ ...s, reason: `${s.sensitivity} records are not in a ${member.role === "child" ? "child's" : "guest's"} context pack` });
    }
    return { header, sections: kept, excluded, size: header.length + kept.reduce((n, s) => n + s.text.length + s.label.length + 3, 0) };
}

/**
 * The context-builder test: run the widest pack this browser holds through the
 * gate as if the asking member were someone else, and report what would be
 * stripped. This is what the "What Wàfè can see" panel exercises.
 */
export function simulate(pack: ContextPack, role: Role, grants: Partial<Record<Capability, boolean>> = {}): { kept: PackSection[]; stripped: ExcludedSection[] } {
    const all = [...pack.sections, ...pack.excluded];
    const kept: PackSection[] = [];
    const stripped: ExcludedSection[] = [];
    for (const s of all) {
        if (allows(role, grants, s.sensitivity)) kept.push(s);
        else stripped.push({ ...s, reason: `${s.sensitivity} — excluded from a ${role}'s pack` });
    }
    return { kept, stripped };
}

// ---------------------------------------------------------------------------
// Matching a question to the pack
// ---------------------------------------------------------------------------

const STOP = new Set([
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been", "do", "does", "did", "what", "when", "where", "who", "why", "how", "we", "i", "me", "my", "our", "us",
    "you", "your", "to", "of", "in", "on", "for", "with", "at", "it", "this", "that", "there", "have", "has", "had", "can", "could", "should", "would", "will", "shall", "need", "needs",
    "get", "got", "any", "some", "about", "from", "up", "out", "if", "so", "than", "then", "them", "they", "he", "she", "his", "her", "am", "not", "no", "yes", "please", "tell", "show",
]);

const tokenise = (q: string): string[] =>
    q
        .toLowerCase()
        .replace(/[^a-z0-9à-ÿ\s'-]/gi, " ")
        .split(/\s+/)
        .map((w) => w.replace(/^'+|'+$/g, ""))
        .filter((w) => w.length > 2 && !STOP.has(w));

/** Singular/plural tolerance, no stemmer. */
const variants = (w: string): string[] => (w.endsWith("s") ? [w, w.slice(0, -1)] : [w, `${w}s`]);

const sentences = (text: string): string[] =>
    text
        .split(/(?<=[.!?;])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

export interface Match {
    section: PackSection;
    score: number;
    /** The sentences that matched, best first. */
    lines: string[];
}

export function findMatches(pack: ContextPack, question: string): Match[] {
    const words = tokenise(question);
    if (!words.length) return [];
    const out: Match[] = [];
    for (const section of pack.sections) {
        const hay = section.text.toLowerCase();
        const label = section.label.toLowerCase();
        let score = 0;
        for (const w of words) {
            for (const v of variants(w)) {
                if (label.includes(v)) score += 4;
                const hits = hay.split(v).length - 1;
                if (hits) score += Math.min(hits, 3);
            }
        }
        if (score <= 0) continue;
        const lines = sentences(section.text)
            .map((s) => ({ s, n: words.reduce((acc, w) => acc + (variants(w).some((v) => s.toLowerCase().includes(v)) ? 1 : 0), 0) }))
            .filter((x) => x.n > 0)
            .sort((a, b) => b.n - a.n)
            .slice(0, 2)
            .map((x) => x.s);
        out.push({ section, score, lines: lines.length ? lines : sentences(section.text).slice(0, 1) });
    }
    return out.sort((a, b) => b.score - a.score);
}

export const sourcesFrom = (matches: Match[], max = 4): Source[] =>
    matches.slice(0, max).map((m) => ({
        moduleId: m.section.moduleId,
        label: m.section.label,
        detail: m.lines[0]?.slice(0, 140) ?? m.section.text.slice(0, 140),
        href: m.section.href,
        sensitivity: m.section.sensitivity,
    }));

// ---------------------------------------------------------------------------
// "I can't see that"
// ---------------------------------------------------------------------------

export const CANT_SEE =
    "I can't see that. I only know what Wàfè holds for you, and nothing in there answers it — I would rather say so than make something up. If it lives somewhere else in the app, add it and ask me again.";

export const CANT_SEE_RESTRICTED =
    "I can't see that. Money, health notes and the family's documents aren't in what I'm allowed to read for you — that's a conversation for Mum or Dad, and they'll be glad you asked.";

const RESTRICTED_WORDS = ["budget", "money", "salary", "wage", "cost", "spend", "spending", "bank", "mortgage", "savings", "debt", "bill", "bills", "invoice", "medication", "diagnosis", "prescription", "passport", "insurance", "will", "deed"];

/** Is this a question a child simply may not have answered from family data? */
export const asksRestricted = (question: string): boolean => {
    const q = question.toLowerCase();
    return RESTRICTED_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(q));
};

// ---------------------------------------------------------------------------
// The local, grounded answer (what the demo runs on)
// ---------------------------------------------------------------------------

export interface LocalAnswer {
    text: string;
    sources: Source[];
    /** True when the companion declined rather than answered. */
    declined: boolean;
}

const join = (lines: string[]): string => lines.map((l) => `- ${l.replace(/^[-•]\s*/, "")}`).join("\n");

/**
 * An answer built only from the pack. It is deliberately unimaginative: it
 * quotes the family's own lines back with a sentence of framing, so a demo
 * without a backend behaves exactly like the live companion behaves at its
 * most honest — grounded, sourced, and willing to say no.
 */
export function answerLocally(question: string, pack: ContextPack, me: Member): LocalAnswer {
    const child = me.role === "child";

    if (child && asksRestricted(question) && !allows(me.role, me.grants ?? {}, "financial")) {
        return { text: CANT_SEE_RESTRICTED, sources: [], declined: true };
    }

    const matches = findMatches(pack, question);
    if (!matches.length) return { text: CANT_SEE, sources: [], declined: true };

    const top = matches.slice(0, 3);
    const lines = top.flatMap((m) => m.lines.slice(0, child ? 1 : 2)).slice(0, child ? 3 : 6);
    const lead = child
        ? `Here's what I can see for you, ${me.name.split(" ")[0]}:`
        : `Here is what I can see across ${top.map((m) => m.section.label).join(", ")}:`;
    const tail = child
        ? "\n\nIf something looks wrong, tell a grown-up and they can fix it."
        : "\n\nThat is everything Wàfè holds on it — if a piece is missing, it is missing from the app rather than from the answer.";
    return { text: `${lead}\n\n${join(lines)}${tail}`, sources: sourcesFrom(matches), declined: false };
}

// ---------------------------------------------------------------------------
// Proposals — the only way anything gets written
// ---------------------------------------------------------------------------

const PROPOSAL_RULES: Array<{ kind: Proposal["kind"]; words: string[]; href: string; verb: string }> = [
    { kind: "task", words: ["add", "remind", "chore", "job", "to-do", "todo", "task", "sort out", "chase"], href: "/execute/tasks", verb: "Add a task" },
    { kind: "event", words: ["book", "schedule", "diary", "calendar", "invite", "meet", "appointment"], href: "/execute/calendar", verb: "Put it in the calendar" },
    { kind: "plan", words: ["plan", "prepare", "organise", "organize", "pack", "before", "checklist", "get ready"], href: "/execute/tasks", verb: "Make a plan" },
    { kind: "budget", words: ["budget", "envelope", "save", "saving", "afford", "set aside"], href: "/live/finance", verb: "Change a budget" },
];

/**
 * Read the member's own question for an INTENT, and offer it back as a card.
 * The companion never acts on this: `status` starts pending and only the
 * member's confirmation moves it.
 */
export function proposalFrom(question: string, matches: Match[], me: Member, today: string): Proposal | null {
    if (me.role === "guest") return null;
    const q = question.toLowerCase();
    const rule = PROPOSAL_RULES.find((r) => r.words.some((w) => q.includes(w)));
    if (!rule) return null;
    if (rule.kind === "budget" && me.role === "child") return null;
    const about = matches[0]?.section.label ?? "the family";
    const subject = question.replace(/^(can you|could you|please|will you|would you)\s+/i, "").replace(/\?+$/, "");
    const due = new Date(`${today}T00:00:00`);
    due.setDate(due.getDate() + (rule.kind === "event" ? 7 : 3));
    return {
        id: uid("prop"),
        kind: rule.kind,
        title: subject.length > 68 ? `${subject.slice(0, 65)}…` : subject.charAt(0).toUpperCase() + subject.slice(1),
        detail: `${rule.verb} from what I read in ${about}. I have not written anything — confirm and it becomes yours to finish.`,
        memberId: me.role === "parent" ? null : me.id,
        dueDate: due.toISOString().slice(0, 10),
        href: rule.href,
        status: "pending",
        decidedAt: null,
    };
}

// ---------------------------------------------------------------------------
// Child safety
// ---------------------------------------------------------------------------

export interface SafetyVerdict {
    flagged: boolean;
    category: string;
    /** What the child is shown instead of an answer. */
    message: string;
}

const SAFETY: Array<{ category: string; patterns: RegExp[] }> = [
    { category: "self-harm", patterns: [/\bkill myself\b/i, /\bhurt myself\b/i, /\bself[- ]?harm\b/i, /\bwant to die\b/i, /\bcut myself\b/i, /\bend it all\b/i] },
    { category: "someone hurting me", patterns: [/\bhit me\b/i, /\btouched me\b/i, /\bscared of\b.*\b(dad|mum|mom|him|her|them)\b/i, /\babuse\b/i, /\bbully(ing|ies)?\b/i, /\bthreaten(ed|ing)?\b/i] },
    { category: "secrets from parents", patterns: [/\bdon'?t tell (my )?(mum|mom|dad|parents)\b/i, /\bkeep (it|this) (a )?secret\b/i, /\bwithout (my )?(mum|mom|dad|parents) knowing\b/i, /\brun away\b/i] },
    { category: "risky things", patterns: [/\b(drugs?|weed|cocaine|vape|vaping|alcohol|drunk|cigarettes?)\b/i, /\bhow (do|to) (i )?(buy|get) (a )?(knife|gun|weapon)\b/i, /\bsuicid/i] },
    { category: "adult content", patterns: [/\bporn/i, /\bsexual\b/i, /\bnudes?\b/i, /\bdating (an )?adult\b/i] },
];

/** Teen and young-adult free text passes this before it reaches the model. */
export function classifySafety(text: string): SafetyVerdict {
    for (const rule of SAFETY) {
        if (rule.patterns.some((p) => p.test(text))) {
            return {
                flagged: true,
                category: rule.category,
                message:
                    "This is bigger than me, and I'd get it wrong. Please talk to Mum or Dad — properly, today. They will not be cross with you for asking, and if it is easier I can let them know you want to talk.",
            };
        }
    }
    return { flagged: false, category: "", message: "" };
}

// ---------------------------------------------------------------------------
// The prompt picker (Little and Junior never free-type)
// ---------------------------------------------------------------------------

export interface PromptChip {
    label: string;
    prompt: string;
}

export function chipsFor(member: Member, space: Space, hour: number): PromptChip[] {
    const first = member.name.split(" ")[0];
    if (member.role === "child") {
        const little = member.ageBand === "little";
        return little
            ? [
                  { label: "🧺 What are my jobs today?", prompt: "What are my jobs today?" },
                  { label: "📖 What am I learning?", prompt: "What am I learning today?" },
                  { label: "✝️ What is my verse?", prompt: "What is my memory verse this week?" },
                  { label: "🎵 Sing me our song", prompt: "What songs has our family written?" },
                  { label: "⭐ How many points have I got?", prompt: "How many points have I got?" },
                  { label: "✈️ When are we going to Lagos?", prompt: "When are we going to Lagos?" },
              ]
            : [
                  { label: "What do I need to do today?", prompt: "What do I need to do today?" },
                  { label: "What am I learning this week?", prompt: "What am I learning this week?" },
                  { label: "How am I doing on my goals?", prompt: "How am I doing on my goals?" },
                  { label: "What is my memory verse?", prompt: "What is my memory verse this week?" },
                  { label: "What is happening this week?", prompt: "What is happening for our family this week?" },
                  { label: `Something for ${first} to make`, prompt: "What could I make in the studio today?" },
              ];
    }
    if (member.role === "guest") {
        return [
            { label: "How can I pray for the family?", prompt: "How can I pray for the family this week?" },
            { label: "What has been shared with me?", prompt: "What has the family shared with me?" },
            { label: "When is the next thing I'm part of?", prompt: "When is the next family event I am part of?" },
        ];
    }
    const morning = hour < 12;
    return [
        { label: morning ? "What matters today?" : "Where are we at today?", prompt: morning ? "What matters most today?" : "Where are we at today?" },
        { label: "What needs my attention?", prompt: "What needs my attention right now, and why?" },
        { label: "How are the children doing?", prompt: "How are the children doing this week — learning, chores, anything slipping?" },
        { label: "What do we need before Lagos?", prompt: "What do we need before Lagos?" },
        { label: `Are we living our values?`, prompt: `Are we living our values — ${space.values.join(", ")}?` },
        { label: "What is slipping this week?", prompt: "What is slipping this week?" },
    ];
}
