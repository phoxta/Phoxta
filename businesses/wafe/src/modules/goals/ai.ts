import type { AiResult } from "@/lib/ai";
import type { Goal, GoalsState, Milestone, Pillar } from "./types";
import { PILLAR_LABEL } from "./types";
import { goalPct, milestonesOf, nextMilestone, stalledGoals } from "./derive";

/**
 * The companion, on goals.
 *
 * Four hooks, all of them PROPOSALS — the companion never writes a milestone,
 * a task or a review. It hands the parent a list and the parent presses Add.
 * Everything it is told comes from the grounding the shell already assembled,
 * plus a short `extraContext` written here so the answer is about THIS goal
 * rather than the family in general.
 */

/** What the companion is told about one goal, in ~600 characters. */
export function goalContext(state: GoalsState, g: Goal): string {
    const ms = milestonesOf(state, g.id);
    return [
        `Goal: "${g.title}" (${PILLAR_LABEL[g.pillar]}, target ${g.targetDate}, ${goalPct(state, g)}% done${g.valueLabel ? `, serves the value ${g.valueLabel}` : ""}).`,
        g.why ? `Why it matters: ${g.why}` : "",
        g.description ? `Detail: ${g.description}` : "",
        ms.length ? `Milestones so far: ${ms.map((m) => `${m.title}${m.done ? " (done)" : m.due ? ` (due ${m.due})` : ""}`).join("; ")}.` : "No milestones yet.",
    ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 900);
}

/** "Break this goal into milestones and tasks." */
export function breakDownPrompt(g: Goal): string {
    return `Break the goal "${g.title}" into 5–7 concrete next steps this family could actually do, in order, each one a short imperative phrase (no more than nine words) with a sensible number of days from today. Steps a household can finish in an evening or a weekend — not vague intentions.`;
}

/** "Which goals are stalling?" */
export function stallPrompt(state: GoalsState, today: string): string {
    const stalled = stalledGoals(state, today);
    const list = stalled.length
        ? stalled.map((g) => `"${g.title}" (${goalPct(state, g)}%, next step: ${nextMilestone(state, g.id)?.title ?? "none set"})`).join("; ")
        : "none by the three-week rule";
    return `Looking at our goals, which are quietly slipping and what is the smallest honest next step for each? The three-week rule flags: ${list}. Be kind, be concrete, and say plainly if one of them should be paused or dropped instead.`;
}

/** The quarterly review draft. */
export function reviewPrompt(state: GoalsState, quarter: string): string {
    const done = state.goals.filter((g) => g.status === "done").map((g) => g.title);
    return `Draft our review of ${quarter} in three short paragraphs: what actually moved, what did not and why that is fair, and the one thing next quarter should be for. Finished this period: ${done.join(", ") || "nothing yet"}. Write it in our voice — plain, warm, no management language.`;
}

/** Onboarding: the first three goals, drawn from the values the family chose. */
export function firstGoalsPrompt(values: string[], mission: string): string {
    return `We are starting from scratch. Our values are ${values.join(", ")} and our mission is "${mission}". Suggest exactly three first goals for the next twelve months — one line each, no more than ten words, each one obviously belonging to one of those values, each one something a household can actually finish. Number them 1., 2., 3.`;
}

// ---------------------------------------------------------------------------
// Tolerant parsing — the companion's shape is a suggestion, never a contract
// ---------------------------------------------------------------------------

export interface Suggestion {
    title: string;
    inDays: number | null;
    note?: string;
}

interface TaskLike {
    title?: unknown;
    dueInDays?: unknown;
    note?: unknown;
}

/**
 * `suggest-tasks` returns `{ tasks[{ title, dueInDays, note }] }` (see docs/AI.md).
 * If the shape is missing we fall back to reading the plain text as a list, so
 * a slightly-off answer still gives the parent something to press Add on.
 */
export function parseSuggestions(res: AiResult<{ tasks?: TaskLike[] }>): Suggestion[] {
    const rows = Array.isArray(res.data?.tasks) ? res.data.tasks : [];
    const out: Suggestion[] = rows
        .map((t) => ({
            title: typeof t.title === "string" ? t.title.trim() : "",
            inDays: typeof t.dueInDays === "number" ? Math.round(t.dueInDays) : null,
            note: typeof t.note === "string" ? t.note.trim() : undefined,
        }))
        .filter((t) => t.title);
    if (out.length) return out.slice(0, 8);
    return (res.text || "")
        .split("\n")
        .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
        .filter((l) => l.length > 3 && l.length < 120)
        .slice(0, 8)
        .map((title) => ({ title, inDays: null }));
}

/** The onboarding answer, as three goal titles. */
export function parseGoalTitles(res: AiResult): string[] {
    return (res.text || "")
        .split("\n")
        .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
        .filter((l) => l.length > 3 && l.length < 120)
        .slice(0, 3);
}

/** A pillar guess for a suggested goal, so the form opens sensibly filled in. */
export function guessPillar(title: string): Pillar {
    const t = title.toLowerCase();
    if (/pray|bible|church|scripture|faith|god/.test(t)) return "faith";
    if (/save|money|budget|debt|fund|deposit|pension/.test(t)) return "money";
    if (/read|learn|school|study|course|exam|grade/.test(t)) return "grow";
    if (/run|ride|swim|walk|fit|health|sleep|weight/.test(t)) return "health";
    if (/garden|house|home|kitchen|decorat|repair/.test(t)) return "home";
    if (/sing|song|paint|draw|write|record|make/.test(t)) return "create";
    if (/trip|holiday|visit|travel|meal|table|family/.test(t)) return "live";
    return "execute";
}

/** Days → an ISO date, for turning a suggestion into a milestone. */
export function dueFrom(today: string, inDays: number | null, fallback: number): string {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() + (inDays ?? fallback));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The milestone titles already on a goal, lower-cased, for de-duplicating. */
export function existingTitles(ms: Milestone[]): Set<string> {
    return new Set(ms.map((m) => m.title.trim().toLowerCase()));
}
