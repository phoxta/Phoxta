import { useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import type { AiAction } from "@/lib/ai";
import { useAi } from "@/lib/ai";
import { useSpace } from "@/state/space";
import { Notice } from "@/components/shared";
import { Button, Card, Field } from "@/components/ui/primitives";

/**
 * "Ask about this book."
 *
 * The two questions the brief names for this module — "summarise chapter 3 for
 * the children" and "what did we say we'd change after week 1?" — are the same
 * companion, grounded in what this family already wrote: the book's own notes,
 * the course weeks, the discussion questions. It PROPOSES: nothing here writes
 * anything, and every answer carries the line of sources it used, so a parent
 * can see it did not invent the chapter it is summarising.
 *
 * Little and junior children get the prompt picker only — no free typing —
 * which is the age-band rule from the brief, kept here rather than assumed.
 */

export interface AskPrompt {
    label: string;
    prompt: string;
    action?: AiAction;
    payload?: Record<string, unknown>;
}

type Structured = { takeaways?: unknown; actions?: unknown; discussion?: unknown; forKids?: unknown };

const list = (v: unknown, max = 7): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max) : []);

export function AskCompanion({
    title = "Ask the companion",
    blurb,
    prompts,
    sources,
    extraContext,
    payload,
    className,
}: {
    title?: string;
    blurb: string;
    prompts: AskPrompt[];
    /** Plain-English list of what the answer was grounded in ("I used…"). */
    sources: string[];
    extraContext: string;
    payload?: Record<string, unknown>;
    className?: string;
}) {
    const { ask, available } = useAi();
    const { me, can } = useSpace();
    const [busy, setBusy] = useState<string | null>(null);
    const [typed, setTyped] = useState("");
    const [answer, setAnswer] = useState<{ text: string; data: Structured | null; asked: string } | null>(null);
    const [note, setNote] = useState<string | null>(null);

    if (!can("ai.ask")) return null;

    const picker = me.role === "child" && (me.ageBand === "little" || me.ageBand === "junior");

    const run = async (p: AskPrompt) => {
        setBusy(p.label);
        setNote(null);
        setAnswer(null);
        try {
            const r = await ask<Structured>({
                action: p.action ?? "ask",
                prompt: p.prompt,
                payload: { ...payload, ...p.payload },
                extraContext,
            });
            if (r.unavailable) {
                setNote(r.unavailable);
                return;
            }
            const data = r.data && typeof r.data === "object" ? r.data : null;
            if (!r.text.trim() && !data) {
                setNote("The companion didn't have an answer for that one. Try asking it another way.");
                return;
            }
            setAnswer({ text: r.text, data, asked: p.prompt });
        } catch (e) {
            setNote(e instanceof Error ? e.message : "The companion couldn't answer just now.");
        } finally {
            setBusy(null);
        }
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const q = typed.trim();
        if (!q) return;
        void run({ label: "typed", prompt: q });
    };

    const takeaways = list(answer?.data?.takeaways);
    const discussion = list(answer?.data?.discussion, 5);
    const actions = list(answer?.data?.actions, 5);

    return (
        <Card className={className}>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles size={16} className="text-brand" aria-hidden="true" /> {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">{blurb}</p>

            <ul className="mt-3 flex flex-wrap gap-2">
                {prompts.map((p) => (
                    <li key={p.label}>
                        <Button size="sm" variant="outline" type="button" onClick={() => void run(p)} loading={busy === p.label} disabled={busy !== null}>
                            {p.label}
                        </Button>
                    </li>
                ))}
            </ul>

            {!picker && (
                <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
                    <Field
                        label="Or ask your own question"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder="What should we talk about at dinner?"
                        className="min-w-[220px] flex-1"
                    />
                    <Button type="submit" loading={busy === "typed"} disabled={busy !== null || !typed.trim()}>
                        Ask
                    </Button>
                </form>
            )}

            {!available && <p className="mt-3 text-xs text-caption">The companion needs the backend configured for this build; everything else on this page works without it.</p>}
            {busy && <p className="mt-3 text-sm text-muted">Reading what we already wrote…</p>}
            {note && (
                <Notice tone="warn" className="mt-3">
                    {note}
                </Notice>
            )}

            {answer && (
                <div className="mt-4 rounded-md bg-page px-4 py-3.5">
                    <p className="text-xs font-medium tracking-[0.06em] text-caption uppercase">You asked</p>
                    <p className="mt-0.5 text-sm text-muted">{answer.asked}</p>

                    {answer.text.trim() && <p className="mt-3 text-md leading-6 whitespace-pre-wrap text-ink">{answer.text}</p>}

                    {takeaways.length > 0 && (
                        <>
                            <p className="mt-4 text-xs font-medium tracking-[0.06em] text-muted uppercase">The gist</p>
                            <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5">
                                {takeaways.map((t) => (
                                    <li key={t} className="text-md leading-6">
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {discussion.length > 0 && (
                        <>
                            <p className="mt-4 text-xs font-medium tracking-[0.06em] text-muted uppercase">To ask at the table</p>
                            <ol className="mt-1.5 flex flex-col gap-1">
                                {discussion.map((d, i) => (
                                    <li key={d} className="text-md leading-6">
                                        <span className="mr-1.5 text-caption">{i + 1}.</span>
                                        {d}
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}

                    {actions.length > 0 && (
                        <>
                            <p className="mt-4 text-xs font-medium tracking-[0.06em] text-muted uppercase">Suggestions</p>
                            <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5">
                                {actions.map((a) => (
                                    <li key={a} className="text-md leading-6">
                                        {a}
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-2 text-xs text-caption">Suggestions only — nothing here has been saved or assigned.</p>
                        </>
                    )}

                    <p className="mt-4 border-t border-line pt-2.5 text-xs leading-5 text-caption">I used: {sources.join(" · ")}. If something isn&rsquo;t here, I said so rather than guessing.</p>
                </div>
            )}
        </Card>
    );
}
