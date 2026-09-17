import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, BookMarked, CornerDownRight, Hand, Lightbulb } from "lucide-react";
import { FRAMEWORKS, STAGE_LABEL, frameworksForStage, type Advice } from "@startup-school/core";
import { PageTitle } from "@/components/shell/AppShell";
import { Button, Card, EmptyState, Overline, Spinner, Tag } from "@/components/ui/primitives";
import { useData } from "@/state/data";
import { cn } from "@/lib/cn";

/**
 * The adviser.
 *
 * Deliberately not a chatbot, because the evidence does not support one. A
 * randomised trial of about a thousand students found an ungoverned GPT tutor
 * left them measurably worse on an unassisted exam; a carefully-built one
 * showed no gain because students engaged it in roughly one in six of the
 * moments they got something wrong. What worked in both literatures had a
 * teacher in the loop and a refusal to do the work.
 *
 * So this one has three rules, and they are visible on the page rather than
 * hidden in a prompt: it reasons only from the handbook's frameworks, it names
 * the chapter every time so you can go and read the real thing, and it will
 * not write your plan for you.
 */

type Turn = { question: string; advice: Advice | null; error?: string };

function AdviceCard({ turn }: { turn: Turn }) {
    return (
        <li className="flex flex-col gap-2">
            <p className="flex items-start gap-2 text-[15px] font-semibold leading-6">
                <CornerDownRight size={15} className="mt-1 shrink-0 text-caption" aria-hidden="true" />
                {turn.question}
            </p>

            {turn.error && (
                <Card className="border-danger-soft">
                    <p className="text-[14px] text-danger-ink">{turn.error}</p>
                </Card>
            )}

            {!turn.advice && !turn.error && (
                <Card className="flex items-center gap-2.5">
                    <Spinner /> <span className="text-[14px] text-muted">Reading the frameworks…</span>
                </Card>
            )}

            {turn.advice && (
                <Card>
                    {turn.advice.refused && (
                        <Tag tone="warn" icon={<Hand size={12} />} className="mb-2.5">
                            Not doing this one for you
                        </Tag>
                    )}
                    <p className="whitespace-pre-wrap text-[15px] leading-7">{turn.advice.answer}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
                        <BookMarked size={14} className="text-caption" aria-hidden="true" />
                        <span className="text-[13px] font-semibold">{turn.advice.framework}</span>
                        {turn.advice.source !== "—" && (
                            <span className="text-[13px] text-caption">{turn.advice.source}</span>
                        )}
                    </div>

                    {turn.advice.nextStep && (
                        <div className="mt-3 rounded-xl bg-page p-3.5">
                            <Overline>This week</Overline>
                            <p className="mt-1 text-[14px] leading-6">{turn.advice.nextStep}</p>
                        </div>
                    )}
                </Card>
            )}
        </li>
    );
}

export default function AdviserPage() {
    const { repo, user } = useData();
    const [q, setQ] = useState("");
    const [turns, setTurns] = useState<Turn[]>([]);
    const [busy, setBusy] = useState(false);
    const box = useRef<HTMLTextAreaElement>(null);

    const v = user.venture;
    const stageFrameworks = useMemo(() => frameworksForStage(v.stage), [v.stage]);
    // Something to ask when you have no idea what to ask. Drawn from where the
    // founder actually is, so it is never a generic prompt-starter.
    const suggestions = useMemo(
        () => (stageFrameworks.length ? stageFrameworks : FRAMEWORKS).slice(0, 3).map((f) => f.question),
        [stageFrameworks],
    );

    const ask = async (question: string) => {
        const text = question.trim();
        if (!text || busy) return;
        setQ("");
        setBusy(true);
        const at = turns.length;
        setTurns((t) => [...t, { question: text, advice: null }]);
        try {
            const advice = await repo.advise(text);
            setTurns((t) => t.map((x, i) => (i === at ? { ...x, advice } : x)));
        } catch (e) {
            const msg = e instanceof Error ? e.message : "The adviser is not reachable right now.";
            setTurns((t) => t.map((x, i) => (i === at ? { ...x, error: msg } : x)));
        } finally {
            setBusy(false);
            box.current?.focus();
        }
    };

    return (
        <>
            <PageTitle
                title="Adviser"
                sub="Grounded on the handbook's frameworks and your own venture record. It names the chapter every time, and it will not write your plan for you."
            />

            {!v.name && (
                <Card className="mb-6">
                    <p className="text-[14px] leading-6">
                        It answers better once it knows what you are building.{" "}
                        <Link to="/venture" className="font-semibold text-brand underline">
                            Fill in your venture record
                        </Link>{" "}
                        — the one-sentence version and the country are enough to start.
                    </p>
                </Card>
            )}

            {turns.length === 0 ? (
                <EmptyState
                    icon={<Lightbulb size={22} />}
                    title={`Where you are: ${STAGE_LABEL[v.stage]}`}
                    body="Ask about something you are actually stuck on. Vague questions get the framework and the question back, which is fair but less useful."
                />
            ) : (
                <ul className="mb-6 flex flex-col gap-6">
                    {turns.map((t, i) => (
                        <AdviceCard key={i} turn={t} />
                    ))}
                </ul>
            )}

            {turns.length === 0 && (
                <div className="mb-6 flex flex-col gap-2">
                    <Overline>Questions your stage puts to you</Overline>
                    {suggestions.map((sug) => (
                        <button
                            key={sug}
                            type="button"
                            onClick={() => void ask(sug)}
                            className="rounded-xl border border-line bg-card px-3.5 py-3 text-left text-[14px] leading-6 hover:border-brand"
                        >
                            {sug}
                        </button>
                    ))}
                </div>
            )}

            <div className="sticky bottom-4 rounded-2xl border border-line bg-card p-2 shadow-app">
                <div className="flex items-end gap-2">
                    <label className="sr-only" htmlFor="ask">Ask the adviser</label>
                    <textarea
                        id="ask"
                        ref={box}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void ask(q);
                            }
                        }}
                        rows={2}
                        placeholder="What are you stuck on?"
                        className="min-h-[52px] w-full resize-none bg-transparent px-2.5 py-2 text-[15px] leading-6 outline-none"
                    />
                    <Button
                        onClick={() => void ask(q)}
                        disabled={!q.trim() || busy}
                        aria-label="Ask"
                        className={cn("size-11 shrink-0 p-0", busy && "opacity-60")}
                    >
                        {busy ? <Spinner /> : <ArrowUp size={17} />}
                    </Button>
                </div>
            </div>

            <div className="mt-8">
                <Overline>What it reasons from</Overline>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {FRAMEWORKS.map((f) => (
                        <li
                            key={f.id}
                            className={cn(
                                "rounded-xl border border-line p-3",
                                f.stage === v.stage && "border-brand",
                            )}
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[14px] font-semibold">{f.name}</span>
                                <span className="text-[12px] text-caption">{f.source}</span>
                            </div>
                            {f.revision && (
                                <p className="mt-1.5 text-[12px] leading-5 text-muted">
                                    <strong className="font-semibold text-ink">Revised since 2018.</strong> {f.revision}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}
