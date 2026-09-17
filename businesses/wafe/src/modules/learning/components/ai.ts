import type { AgeBand } from "@/data/core";
import type { LessonVideo, TranscriptSource, VideoSummary } from "../types";

/**
 * Reading the companion's answers.
 *
 * `docs/AI.md` documents the shape of each action's `data`, and the edge
 * function clamps it before it leaves — but a screen still never trusts a
 * model's JSON. Everything here narrows unknown to something renderable and
 * falls back to the plain text answer, so a malformed reply degrades to a
 * paragraph rather than a blank card.
 */

const BANDS: AgeBand[] = ["little", "junior", "teen", "young-adult", "adult"];

const strings = (v: unknown, max: number): string[] =>
    Array.isArray(v)
        ? v
              .map((x) => (typeof x === "string" ? x.trim() : typeof x === "object" && x && "title" in x ? String((x as { title: unknown }).title) : ""))
              .filter(Boolean)
              .slice(0, max)
        : [];

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** `summarize` → a VideoSummary, with the source label the family will see. */
export function readSummary(data: unknown, text: string, source: TranscriptSource, model?: string): VideoSummary {
    const d = (data ?? {}) as Record<string, unknown>;
    const band = str(d.suggestedBand);
    return {
        source,
        summary: str(d.summary) || text.split("\n").filter(Boolean)[0] || "The companion answered without a summary line.",
        takeaways: strings(d.takeaways, 7),
        actions: strings(d.actions ?? d.actionItems, 5),
        discussion: strings(d.discussion ?? d.discussionPrompts, 5),
        forKids: str(d.forKids) || undefined,
        suggestedBand: (BANDS.includes(band as AgeBand) ? band : "junior") as AgeBand,
        model,
        at: new Date().toISOString(),
    };
}

export interface PlanStep {
    title: string;
    minutes: number;
    activity: string;
}

export interface PlanDraft {
    title: string;
    objective: string;
    steps: PlanStep[];
    checkQuestions: string[];
}

/** `learning-plan` → a draft the parent confirms before anything is written. */
export function readPlan(data: unknown, text: string, fallbackTitle: string): PlanDraft {
    const d = (data ?? {}) as Record<string, unknown>;
    const rawSteps = Array.isArray(d.steps) ? d.steps : [];
    const steps: PlanStep[] = rawSteps
        .map((s) => {
            const o = (s ?? {}) as Record<string, unknown>;
            const minutes = Number(o.minutes);
            return { title: str(o.title), minutes: Number.isFinite(minutes) && minutes > 0 ? Math.min(240, Math.round(minutes)) : 15, activity: str(o.activity) };
        })
        .filter((s) => s.title)
        .slice(0, 24);
    return {
        title: str(d.title) || fallbackTitle,
        objective: str(d.objective) || text.split("\n").filter(Boolean)[0] || "",
        steps,
        checkQuestions: strings(d.checkQuestions, 6),
    };
}

/**
 * Acceptance criterion 7: the companion may only ever point at something the
 * family has already saved. It is asked to answer with a number from a list we
 * built; anything it says that is not one of those numbers is discarded.
 */
export function pickFromCandidates(text: string, data: unknown, candidates: LessonVideo[]): LessonVideo | null {
    if (!candidates.length) return null;
    const d = (data ?? {}) as Record<string, unknown>;
    const fromData = Number(d.choice ?? d.index ?? d.n);
    if (Number.isInteger(fromData) && fromData >= 1 && fromData <= candidates.length) return candidates[fromData - 1];
    const m = text.match(/\b([1-9]\d?)\b/);
    if (m) {
        const n = Number(m[1]);
        if (n >= 1 && n <= candidates.length) return candidates[n - 1];
    }
    const lower = text.toLowerCase();
    return candidates.find((c) => lower.includes(c.title.toLowerCase().slice(0, 24))) ?? null;
}

/** The numbered list the companion chooses from — saved videos only. */
export const candidateList = (candidates: LessonVideo[]): string =>
    candidates.map((c, i) => `${i + 1}. ${c.title} — ${c.channel}`).join("\n");
