/**
 * The validation run: what it does, in what order, and how far along it is.
 *
 * Ported from the earlier Next.js Phoxta, with one deliberate change. That app
 * modelled this as a ten-day programme — Days 1-5, then 7, 8 and 10, with no
 * Day 6, because phases were retired without renumbering. The whole run now
 * completes in minutes, so counting days describes something the product no
 * longer does, and the numbering's scars had no reason to survive the port.
 *
 * Steps are named. `market` says what it is in a log line, a query result and a
 * URL; `day_number: 7` needs a lookup table, and the lookup was the thing with
 * the gaps in it.
 *
 * No React, no Supabase, no network — which is what let this survive a change of
 * framework intact.
 */

export type IdeaStep =
  | "problem"
  | "market"
  | "value"
  | "customer"
  | "model"
  | "report"
  | "strategy";

export interface StepSpec {
  key: IdeaStep;
  name: string;
  description: string;
  /** Roughly how long this one takes, for a progress line that isn't a lie. */
  seconds: number;
  group: "Validation" | "Plan";
}

export const STEPS: StepSpec[] = [
  { key: "problem",  name: "Problem",             description: "The core problem, who has it, and how badly.",                     seconds: 25, group: "Validation" },
  { key: "market",   name: "Market",              description: "Market size, growth rate and who else is already there.",          seconds: 35, group: "Validation" },
  { key: "value",    name: "Value proposition",   description: "What makes this different, and how hard that is to copy.",         seconds: 25, group: "Validation" },
  { key: "customer", name: "Customer evidence",   description: "Real demand signals and what people already pay for.",             seconds: 30, group: "Validation" },
  { key: "model",    name: "Business model",      description: "Revenue model, pricing and the unit economics underneath.",        seconds: 30, group: "Validation" },
  { key: "report",   name: "Validation report",   description: "Everything above, judged and scored, with what to do next.",       seconds: 40, group: "Validation" },
  { key: "strategy", name: "Plan & financials",  description: "The written plan: sections, projections, milestones and the ask.",  seconds: 60, group: "Plan" },
];

export const STEP_KEYS: IdeaStep[] = STEPS.map((s) => s.key);
export const TOTAL_STEPS = STEPS.length;

/** ~4 minutes at these estimates. The UI quotes this rather than a rounder
 *  number someone liked the sound of — if the steps get slower, the promise
 *  moves with them. */
export const ESTIMATED_SECONDS = STEPS.reduce((sum, s) => sum + s.seconds, 0);

export const getStep = (key: IdeaStep): StepSpec | undefined => STEPS.find((s) => s.key === key);

export const stepIndex = (key: IdeaStep): number => STEP_KEYS.indexOf(key);

/**
 * The phases the segmented bar draws, in order.
 *
 * Tones are the palette the earlier app used for the same bar — blue for
 * validation and amber for the plan — the palette the earlier app used for the
 * same bar, so the port matches rather than picks new colours for old meanings.
 */
export const GROUPS: { name: StepSpec["group"]; tone: "blue" | "amber"; steps: IdeaStep[] }[] = [
  { name: "Validation", tone: "blue", steps: STEPS.filter((s) => s.group === "Validation").map((s) => s.key) },
  { name: "Plan", tone: "amber", steps: STEPS.filter((s) => s.group === "Plan").map((s) => s.key) },
];

/** The five that decide whether the idea is worth pursuing at all. */
export const VALIDATION_STEPS: IdeaStep[] = STEPS.filter((s) => s.group === "Validation").map((s) => s.key);

/**
 * Which steps have produced something.
 *
 * Read from three places, because a step can be finished three ways: the
 * founder supplied it, the model generated it, or the whole idea was marked
 * complete. Trusting one source alone shows a finished idea as barely started.
 */
export function getCompletedSteps(
  idea: { ai_profile?: Record<string, unknown> | null; report?: unknown; status?: string | null },
  inputSteps: IdeaStep[] = [],
): IdeaStep[] {
  const done = new Set<IdeaStep>(inputSteps.filter((s) => STEP_KEYS.includes(s)));
  const profile = idea.ai_profile ?? {};

  for (const key of STEP_KEYS) {
    if (key === "report") continue; // its own column, checked below
    const value = profile[key];
    if (value && typeof value === "object" && Object.keys(value as object).length > 0) done.add(key);
  }

  if (idea.report) done.add("report");
  if (idea.status === "completed") for (const key of STEP_KEYS) done.add(key);

  return STEP_KEYS.filter((k) => done.has(k));
}

/** The first step still outstanding, or null when the run is done. */
export function nextStep(completed: IdeaStep[]): IdeaStep | null {
  const done = new Set(completed);
  return STEP_KEYS.find((k) => !done.has(k)) ?? null;
}

export function progressPercent(completed: IdeaStep[]): number {
  if (TOTAL_STEPS === 0) return 0;
  return Math.round((completed.filter((s) => STEP_KEYS.includes(s)).length / TOTAL_STEPS) * 100);
}

/** "about 2 min" — for the button that starts the run. */
export function humanDuration(seconds: number): string {
  if (seconds < 90) return `about ${Math.round(seconds)} sec`;
  return `about ${Math.round(seconds / 60)} min`;
}

/** Time left, so the progress line counts down instead of sitting still. */
export function remainingSeconds(completed: IdeaStep[]): number {
  const done = new Set(completed);
  return STEPS.filter((s) => !done.has(s.key)).reduce((sum, s) => sum + s.seconds, 0);
}
