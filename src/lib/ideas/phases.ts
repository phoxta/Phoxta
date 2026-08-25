/**
 * The idea validation programme: phases, the days inside them, and how far
 * along an idea is.
 *
 * Ported from the earlier Next.js Phoxta (src/lib/phaseConfig.ts,
 * ideaWorkflow.ts, ideaProgress.ts) with the structure and day numbering intact.
 * The numbering has gaps — there is no Day 6, and Day 10 follows Day 8 — because
 * phases were retired from the product without renumbering what came after.
 * Renumbering now would silently re-point every ai_profile.dayN key already
 * stored against a real idea, so the gaps stay.
 *
 * Nothing here touches React, Supabase or the network, which is why it ports
 * across a framework change untouched.
 */

export interface SubPhase {
  dayNumber: number;
  name: string;
  description: string;
}

export interface Phase {
  id: number;
  name: string;
  description: string;
  /** Maps onto the console's existing tone vocabulary rather than raw colour. */
  tone: "blue" | "amber";
  subPhases: SubPhase[];
}

export const PHASES: Phase[] = [
  {
    id: 1,
    name: "Validation",
    description: "Research, validate, and stress-test your idea",
    tone: "blue",
    subPhases: [
      { dayNumber: 1, name: "Problem Definition", description: "Articulate the core problem hypothesis and identify the target customer segment." },
      { dayNumber: 2, name: "Market Research", description: "Quantify the market opportunity and map the competitive landscape." },
      { dayNumber: 3, name: "Value Proposition", description: "Define the differentiated value proposition and competitive positioning." },
      { dayNumber: 4, name: "Customer Validation", description: "Validate assumptions with market evidence and customer intelligence." },
      { dayNumber: 5, name: "Business Model", description: "Architect the revenue model, pricing strategy, and unit economics." },
      { dayNumber: 7, name: "Report & Recommendation", description: "Consolidate validation findings into a report with practical recommendations." },
      { dayNumber: 8, name: "Strategy", description: "Generate an industry-standard business plan with financial assumptions and execution detail." },
    ],
  },
  {
    id: 3,
    name: "Web Design",
    description: "Generate a professional landing page to share your business with customers.",
    tone: "amber",
    subPhases: [
      { dayNumber: 10, name: "Web Design", description: "Generate a professional landing page to share your business with customers." },
    ],
  },
];

export const MAX_DAY_NUMBER = 10;
export const ALL_DAY_NUMBERS = PHASES.flatMap((p) => p.subPhases.map((sp) => sp.dayNumber));
export const TOTAL_SUB_PHASES = ALL_DAY_NUMBERS.length;

export function getPhaseForDay(dayNumber: number): Phase | undefined {
  return PHASES.find((p) => p.subPhases.some((sp) => sp.dayNumber === dayNumber));
}

export function getSubPhase(dayNumber: number): SubPhase | undefined {
  for (const p of PHASES) {
    const found = p.subPhases.find((sp) => sp.dayNumber === dayNumber);
    if (found) return found;
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generation
// ─────────────────────────────────────────────────────────────────────────────

export type SpecialStepAction = "report" | "business-plan-html" | "web-design";

export type AutoValidateStep =
  | { label: string; type: "day"; day: number }
  | { label: string; type: SpecialStepAction };

/**
 * The full chain, in order, that "validate this for me" runs unattended.
 *
 * Three of these are not days: the report consolidates Days 1-5, the strategy
 * view renders Day 8 as a business plan, and the web design turns the whole
 * profile into a site. They are steps in the same queue so a caller can show one
 * progress bar rather than special-casing each.
 */
export const AUTO_VALIDATE_STEPS: AutoValidateStep[] = [
  { label: "Problem Definition", type: "day", day: 1 },
  { label: "Market Research", type: "day", day: 2 },
  { label: "Value Proposition", type: "day", day: 3 },
  { label: "Customer Validation", type: "day", day: 4 },
  { label: "Business Model", type: "day", day: 5 },
  { label: "Report & Recommendation", type: "report" },
  { label: "Strategy", type: "day", day: 8 },
  { label: "Strategy View", type: "business-plan-html" },
  { label: "AI Website Design", type: "web-design" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Progress
// ─────────────────────────────────────────────────────────────────────────────

const ALL_DAYS = [...ALL_DAY_NUMBERS].sort((a, b) => a - b);
const VALIDATION_DAYS = [...(PHASES[0]?.subPhases.map((sp) => sp.dayNumber) ?? [])].sort((a, b) => a - b);
const POST_VALIDATION_DAYS = ALL_DAYS.filter((d) => !VALIDATION_DAYS.includes(d));

const hasContent = (value: unknown): boolean =>
  Boolean(value && typeof value === "object" && Object.keys(value as Record<string, unknown>).length > 0);

/**
 * Which days are done.
 *
 * Read from three places because a day can be finished three ways: the founder
 * filled it in (day_inputs), the model generated it (ai_profile.dayN), or the
 * whole idea was marked complete. Trusting only one of those would show a
 * finished idea as barely started.
 */
export function getCompletedDays(
  idea: { ai_profile?: Record<string, unknown> | null; report?: unknown; status?: string },
  dayInputDays: number[],
): number[] {
  const completed = new Set<number>((dayInputDays || []).filter((d) => ALL_DAYS.includes(d)));
  const profile = idea.ai_profile ?? {};

  for (const d of ALL_DAYS) {
    if (d === 7) continue; // the report is its own column, checked below
    if (hasContent(profile[`day${d}`])) completed.add(d);
  }

  if (idea.report) completed.add(7);
  if (idea.status === "completed") for (const d of ALL_DAYS) completed.add(d);

  return [...completed].sort((a, b) => a - b);
}

/** The day the founder should be on: validation is sequential, the rest is not. */
export function getCurrentDay(completedDays: number[]): number {
  const completed = new Set(completedDays);
  for (const d of VALIDATION_DAYS) if (!completed.has(d)) return d;
  for (const d of POST_VALIDATION_DAYS) if (!completed.has(d)) return d;
  return MAX_DAY_NUMBER + 1;
}

export const isDayCompleted = (dayNumber: number, completedDays: number[]): boolean =>
  completedDays.includes(dayNumber);

/** 0-100, for a progress meter that is honest about how much is left. */
export function progressPercent(completedDays: number[]): number {
  if (TOTAL_SUB_PHASES === 0) return 0;
  const done = completedDays.filter((d) => ALL_DAYS.includes(d)).length;
  return Math.round((done / TOTAL_SUB_PHASES) * 100);
}
