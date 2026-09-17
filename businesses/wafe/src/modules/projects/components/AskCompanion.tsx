import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useAi } from "@/lib/ai";
import { useSpace } from "@/state/space";
import { Notice } from "@/components/shared";
import { Button, Field } from "@/components/ui/primitives";
import type { Clip, NewCard, NewComparison, Project } from "../types";

/**
 * The companion, inside a project.
 *
 * Three jobs, all of them proposals: read back a research folder, draft the
 * board, and turn "compare these three" into a table we then fill in by hand.
 * Nothing here writes without a second click, and every answer says what it
 * was built from — the clips and the project in front of us, never the web.
 */

type Summary = { takeaways?: unknown; actions?: unknown; discussion?: unknown };
type Suggested = { tasks?: unknown };

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function suggestedTasks(v: unknown): Array<{ title: string; note: string; dueInDays: number }> {
    if (!Array.isArray(v)) return [];
    return v
        .map((raw) => raw as Record<string, unknown>)
        .map((t) => ({
            title: typeof t.title === "string" ? t.title : "",
            note: typeof t.note === "string" ? t.note : "",
            dueInDays: typeof t.dueInDays === "number" ? t.dueInDays : 7,
        }))
        .filter((t) => t.title);
}

export function AskCompanion({
    project,
    clips,
    folder,
    readOnly,
    onAddCards,
    onCreateComparison,
}: {
    project: Project;
    clips: Clip[];
    folder: string;
    readOnly: boolean;
    onAddCards: (cards: NewCard[]) => Promise<void>;
    onCreateComparison: (input: NewComparison) => Promise<void>;
}) {
    const { ask, busy, available } = useAi();
    const { today } = useSpace();
    const [mode, setMode] = useState<"none" | "summary" | "plan" | "compare">("none");
    const [text, setText] = useState("");
    const [takeaways, setTakeaways] = useState<string[]>([]);
    const [actions, setActions] = useState<string[]>([]);
    const [tasks, setTasks] = useState<Array<{ title: string; note: string; dueInDays: number }>>([]);
    const [picked, setPicked] = useState<Record<string, boolean>>({});
    const [criteria, setCriteria] = useState<string[]>([]);
    const [options, setOptions] = useState("");
    const [unavailable, setUnavailable] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const reset = (next: typeof mode) => {
        setMode(next);
        setText("");
        setTakeaways([]);
        setActions([]);
        setTasks([]);
        setPicked({});
        setCriteria([]);
        setUnavailable(null);
        setError(null);
    };

    const run = async (what: "summary" | "plan" | "compare") => {
        reset(what);
        try {
            if (what === "summary") {
                const r = await ask<Summary>({
                    action: "summarize",
                    prompt: `Summarise the research folder "${folder}" on the project "${project.title}".`,
                    extraContext: clips
                        .slice(0, 12)
                        .map((c) => `• ${c.title} (${c.url}): ${c.snapshotText || c.excerpt}`)
                        .join("\n")
                        .slice(0, 3000),
                });
                if (r.unavailable) return setUnavailable(r.unavailable);
                setText(r.text);
                setTakeaways(strs(r.data?.takeaways));
                setActions(strs(r.data?.actions));
            } else if (what === "plan") {
                const r = await ask<Suggested>({
                    action: "suggest-tasks",
                    prompt: `Draft the plan for "${project.title}". It runs from ${project.startDate} to ${project.endDate ?? "no fixed end"} and today is ${today}.`,
                    extraContext: `${project.summary}\nAlready on the board is nothing you should repeat; propose the missing steps only.`,
                });
                if (r.unavailable) return setUnavailable(r.unavailable);
                setText(r.text);
                const list = suggestedTasks(r.data?.tasks);
                setTasks(list);
                setPicked(Object.fromEntries(list.map((t) => [t.title, true])));
            } else {
                const names = options
                    .split(",")
                    .map((o) => o.trim())
                    .filter(Boolean);
                if (names.length < 2) {
                    setError("Name at least two things to compare, separated by commas.");
                    return;
                }
                const r = await ask({
                    action: "ask",
                    prompt: `We are comparing ${names.join(", ")} for the project "${project.title}". List six criteria this family should score them on, one per line, each starting with "- ". No commentary.`,
                });
                if (r.unavailable) return setUnavailable(r.unavailable);
                setText(r.text);
                setCriteria(
                    r.text
                        .split("\n")
                        .map((l) => l.replace(/^[-•*\d.\s]+/, "").trim())
                        .filter((l) => l.length > 2 && l.length < 60)
                        .slice(0, 6),
                );
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "The companion couldn't answer.");
        }
    };

    if (!available) return null;

    return (
        <section className="rounded-xl bg-card p-4">
            <h3 className="flex items-center gap-2 text-base font-semibold">
                <Sparkles size={15} className="text-brand" aria-hidden="true" /> Ask the companion
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" loading={busy && mode === "summary"} onClick={() => void run("summary")} disabled={!clips.length}>
                    Summarise this research folder
                </Button>
                {!readOnly && (
                    <Button size="sm" variant="outline" loading={busy && mode === "plan"} onClick={() => void run("plan")}>
                        Draft the project plan
                    </Button>
                )}
                {!readOnly && (
                    <Button size="sm" variant="outline" onClick={() => reset(mode === "compare" ? "none" : "compare")}>
                        Build a comparison table
                    </Button>
                )}
            </div>

            {mode === "compare" && (
                <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void run("compare");
                    }}
                >
                    <Field label="Comparing" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Coloma, Trinity, Harris" className="flex-1" hint="Comma separated." />
                    <Button type="submit" size="md" loading={busy}>
                        Suggest criteria
                    </Button>
                </form>
            )}

            {unavailable && (
                <Notice tone="info" className="mt-3">
                    {unavailable}
                </Notice>
            )}
            {error && (
                <Notice tone="danger" className="mt-3">
                    {error}
                </Notice>
            )}

            {(text || takeaways.length > 0) && mode === "summary" && (
                <div className="mt-3 rounded-lg bg-brand-soft p-4">
                    {text && <p className="whitespace-pre-wrap text-md leading-6">{text}</p>}
                    {takeaways.length > 0 && (
                        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-md leading-6">
                            {takeaways.map((t) => (
                                <li key={t}>{t}</li>
                            ))}
                        </ul>
                    )}
                    {actions.length > 0 && (
                        <>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.06em] text-brand-ink">What it suggests we do</p>
                            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-md leading-6">
                                {actions.map((a) => (
                                    <li key={a}>{a}</li>
                                ))}
                            </ul>
                            {!readOnly && (
                                <Button
                                    size="sm"
                                    className="mt-3"
                                    loading={saving}
                                    onClick={async () => {
                                        setSaving(true);
                                        try {
                                            await onAddCards(actions.map((a) => ({ projectId: project.id, title: a })));
                                            reset("none");
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                >
                                    Put these on the board
                                </Button>
                            )}
                        </>
                    )}
                    <p className="mt-3 text-2xs text-muted">I used: {clips.length} clip{clips.length === 1 ? "" : "s"} in {folder}.</p>
                </div>
            )}

            {mode === "plan" && tasks.length > 0 && (
                <div className="mt-3 rounded-lg bg-brand-soft p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-brand-ink">Proposed — nothing is added until you say so</p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                        {tasks.map((t) => (
                            <li key={t.title}>
                                <label className="flex items-start gap-2.5 text-md leading-6">
                                    <input type="checkbox" checked={picked[t.title] ?? false} onChange={(e) => setPicked({ ...picked, [t.title]: e.target.checked })} className="mt-1.5 size-4 accent-[var(--color-brand)]" />
                                    <span>
                                        {t.title}
                                        {t.note && <span className="block text-xs text-muted">{t.note}</span>}
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                    <Button
                        size="sm"
                        className="mt-3"
                        loading={saving}
                        onClick={async () => {
                            setSaving(true);
                            try {
                                const chosen = tasks.filter((t) => picked[t.title]);
                                await onAddCards(
                                    chosen.map((t) => ({
                                        projectId: project.id,
                                        title: t.title,
                                        notes: t.note,
                                        dueAt: new Date(new Date(`${today}T18:00:00`).getTime() + t.dueInDays * 86400000).toISOString(),
                                    })),
                                );
                                reset("none");
                            } finally {
                                setSaving(false);
                            }
                        }}
                    >
                        Add the ticked ones
                    </Button>
                </div>
            )}

            {mode === "compare" && criteria.length > 0 && (
                <div className="mt-3 rounded-lg bg-brand-soft p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-brand-ink">Suggested criteria</p>
                    <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-md leading-6">
                        {criteria.map((c) => (
                            <li key={c}>{c}</li>
                        ))}
                    </ul>
                    <Button
                        size="sm"
                        className="mt-3"
                        loading={saving}
                        onClick={async () => {
                            setSaving(true);
                            try {
                                await onCreateComparison({
                                    projectId: project.id,
                                    title: `Comparing ${options.split(",")[0]?.trim() ?? ""} and the others`,
                                    criteria: criteria.map((label) => ({ label, weight: 3 })),
                                    options: options
                                        .split(",")
                                        .map((o) => o.trim())
                                        .filter(Boolean)
                                        .map((label) => ({ label })),
                                });
                                reset("none");
                            } finally {
                                setSaving(false);
                            }
                        }}
                    >
                        Create the table (scores are yours to fill in)
                    </Button>
                </div>
            )}
        </section>
    );
}
