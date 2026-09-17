// Domain model for the Founder Toolkit (/founder).
//
// The toolkit is a free, public, guided journey from "should I start?" to
// "what is it worth?", built on the `entrepreneur-handbook` skill: HBR's
// Entrepreneur's Handbook (2018) for the method, plus a researched 2026 layer
// for current benchmarks.
//
// Everything on screen is data-driven. Six TOOL KINDS render every tool, so a
// new tool is a data definition, not a new component.

/** A sourced figure. Every benchmark shown to a user carries where and when. */
export interface Sourced {
    /** The value as displayed, e.g. "19%", "$24M", "2.7x". */
    value: string;
    /** What it measures / the population, e.g. "655K B2B opportunities". */
    context?: string;
    /** Publisher or author, e.g. "Ebsta x Pavilion". */
    source: string;
    /** Year of publication. Benchmarks age; always show it. */
    year: number;
    /** Which reference file it came from, e.g. "modern/S01-sales.md". */
    ref?: string;
    url?: string;
}

/** The ten journey stages, in the book's order. */
export type StageId =
    | "fit"
    | "opportunity"
    | "model"
    | "legal"
    | "plan"
    | "capital"
    | "operate"
    | "growth"
    | "scale"
    | "harvest";

/** The six tool kinds. Each has one renderer. */
export type ToolKind =
    | "quiz" // scored questions -> profile + verdict
    | "calculator" // numbers in -> numbers out, compared to benchmarks
    | "checklist" // items tracked to done
    | "worksheet" // structured prose, each answer with confidence + a test
    | "generator" // AI-backed document
    | "reference"; // benchmark tables and lookups

export interface Stage {
    id: StageId;
    /** URL segment under /founder. */
    slug: string;
    number: number;
    title: string;
    /** The question this stage answers, in the founder's words. */
    question: string;
    /** One or two lines shown on the hub card. */
    summary: string;
    /** The verdict a founder must reach before moving on. */
    gate: string;
    /** Handbook chapters behind this stage. */
    handbook: string[];
    /** 2026 supplements behind this stage. */
    modern: string[];
    /** Tool ids, in the order they should be worked through. */
    tools: string[];
}

// ---------------------------------------------------------------- quiz

export interface QuizOption {
    label: string;
    /** Points contributed. Higher is better unless the tool says otherwise. */
    score: number;
    /** Shown after answering, to teach rather than just score. */
    note?: string;
}

export interface QuizQuestion {
    id: string;
    prompt: string;
    /** Groups questions into a scored cluster, e.g. a trait cluster. */
    group?: string;
    help?: string;
    options: QuizOption[];
}

export interface QuizBand {
    /** Inclusive lower bound as a percentage of the maximum score. */
    minPct: number;
    label: string;
    verdict: "go" | "learn" | "stop";
    advice: string;
}

export interface QuizSpec {
    questions: QuizQuestion[];
    bands: QuizBand[];
    /** Shown under the result, e.g. what the evidence actually says. */
    caveat?: string;
}

// ---------------------------------------------------------- calculator

export interface CalcField {
    id: string;
    label: string;
    /** Unit suffix/prefix hint, e.g. "£", "%", "months". */
    unit?: string;
    help?: string;
    /** Sensible starting value so the tool is never an empty form. */
    default?: number;
    min?: number;
    max?: number;
    step?: number;
}

export interface CalcOutput {
    id: string;
    label: string;
    /** Formula shown to the user, so the maths is never a black box. */
    formula: string;
    help?: string;
    /** How to render: a plain number, money, a percentage, a multiple. */
    format?: "number" | "money" | "percent" | "multiple" | "months";
    /** Benchmark to compare against, when one exists. */
    benchmark?: Sourced;
    /** Green when true. Used for traffic lights. */
    good?: (outputs: Record<string, number>, inputs: Record<string, number>) => boolean;
}

export interface CalcSpec {
    fields: CalcField[];
    outputs: CalcOutput[];
    /** Pure function: inputs -> outputs. No side effects, easy to unit test. */
    compute: (inputs: Record<string, number>) => Record<string, number>;
    /** Shown beneath the result; the rule of thumb behind the numbers. */
    rule?: string;
}

// ----------------------------------------------------------- checklist

export interface ChecklistItem {
    id: string;
    label: string;
    help?: string;
    /** Only show when the founder's country matches. */
    region?: string;
    /** Marks the item as the one that most often blocks a deal. */
    critical?: boolean;
}

export interface ChecklistSpec {
    groups: { title: string; items: ChecklistItem[] }[];
}

// ----------------------------------------------------------- worksheet

export interface WorksheetRow {
    id: string;
    label: string;
    help?: string;
    placeholder?: string;
    /** Ask for confidence and a planned test (the book's Table 2-1 habit). */
    wantsEvidence?: boolean;
}

export interface WorksheetSpec {
    rows: WorksheetRow[];
    intro?: string;
}

// ----------------------------------------------------------- generator

export interface GeneratorSpec {
    /** Server-side task name the advisor function understands. */
    task: string;
    /** Fields collected before generating. */
    fields: { id: string; label: string; help?: string; multiline?: boolean }[];
    /** What the user gets back. */
    produces: string;
}

// ----------------------------------------------------------- reference

export interface ReferenceSpec {
    columns: string[];
    rows: (string | Sourced)[][];
    note?: string;
}

// ---------------------------------------------------------------- tool

export interface Tool {
    id: string;
    slug: string;
    stage: StageId;
    kind: ToolKind;
    title: string;
    /** One line: what it does for the founder. */
    blurb: string;
    /** Which reference file backs it, shown as provenance. */
    ref: string;
    /** Frameworks named, for the "what this is based on" line. */
    basedOn?: string;
    /** Tools worth doing first. Drives the hub's "start here" ordering. */
    featured?: boolean;
    spec: QuizSpec | CalcSpec | ChecklistSpec | WorksheetSpec | GeneratorSpec | ReferenceSpec;
}

// -------------------------------------------------------- venture record

/** Everything the founder has entered, saved locally and optionally to their account. */
export interface VentureRecord {
    /** Free-text venture name, used in generated documents. */
    name: string;
    /** ISO-ish country code the founder operates in; drives regional content. */
    country: string;
    /** Business model, which selects the right metric set. */
    model: "saas" | "marketplace" | "ecommerce" | "services" | "ai" | "other" | "";
    /** Per-tool saved state, keyed by tool id. */
    tools: Record<string, ToolState>;
    updatedAt: string;
}

export interface ToolState {
    /** Raw answers, shape depends on the tool kind. */
    answers: Record<string, unknown>;
    /** Computed verdict or score, cached for the dashboard. */
    result?: { score?: number; label?: string; verdict?: string };
    completedAt?: string;
}

export const EMPTY_VENTURE: VentureRecord = {
    name: "",
    country: "GB",
    model: "",
    tools: {},
    updatedAt: "",
};
