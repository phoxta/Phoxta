import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowUp, BookOpen, CheckCircle2, FlaskConical, Lightbulb, Trash2 } from "lucide-react";
import { FRAMEWORKS, STAGE_LABEL, frameworksForStage, type Advice } from "@startup-school/core";
import { PageTitle } from "@/components/shell/AppShell";
import { Button, Card, Overline, Spinner, Tag } from "@/components/ui/primitives";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";

type Turn = { question: string; advice: Advice | null; error?: string };

function storedTurns(profileId: string): Turn[] {
    try {
        const raw = localStorage.getItem(`startup-school:adviser:${profileId}`);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (turn): turn is Turn =>
                Boolean(turn) &&
                typeof turn.question === "string" &&
                (turn.advice === null || typeof turn.advice === "object"),
        );
    } catch {
        return [];
    }
}

function AdviceResult({
    turn,
    taskSaved,
    onMakeTask,
}: {
    turn: Turn;
    taskSaved: boolean;
    onMakeTask: () => void;
}) {
    return (
        <article className="rounded-xl border border-line bg-card p-5 max-md:p-4">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden="true">
                    <Lightbulb size={15} />
                </span>
                <p className="min-w-0 flex-1 text-[15px] font-semibold leading-6">{turn.question}</p>
            </div>

            {!turn.advice && !turn.error && (
                <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-page px-3.5 py-3 text-[14px] text-muted">
                    <Spinner /> Finding the right framework...
                </div>
            )}

            {turn.error && <p className="mt-4 rounded-lg bg-danger-soft px-3.5 py-3 text-[14px] leading-6 text-danger-ink">{turn.error}</p>}

            {turn.advice && (
                <div className="mt-4 border-t border-line pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Tag tone={turn.advice.refused ? "warn" : "fund"}>{turn.advice.framework}</Tag>
                        {turn.advice.source !== "-" && <span className="text-[12px] text-caption">{turn.advice.source}</span>}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-ink">{turn.advice.answer}</p>

                    {turn.advice.nextStep && (
                        <div className="mt-4 rounded-lg border border-brand-soft bg-brand-soft/45 p-4">
                            <Overline className="text-brand-ink">Your next step</Overline>
                            <p className="mt-1 text-[14px] leading-6 text-ink">{turn.advice.nextStep}</p>
                        </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="md" onClick={onMakeTask} disabled={taskSaved || !turn.advice.nextStep}>
                            {taskSaved ? <CheckCircle2 size={14} /> : <ArrowRight size={14} />}
                            {taskSaved ? "Added to next actions" : "Make it a task"}
                        </Button>
                        {turn.advice.nextStep && <Link to={`/experiments?title=${encodeURIComponent(turn.advice.nextStep)}&hypothesis=${encodeURIComponent(turn.question)}`} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-brand hover:bg-brand-soft"><FlaskConical size={14} /> Turn into a field test</Link>}
                        <Link to="/venture" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-brand hover:bg-brand-soft">
                            Update venture <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            )}
        </article>
    );
}

/** A short, decision-first AI workspace. Advice is grounded in the same frameworks as the course. */
export default function AdviserPage() {
    const { repo, user, mutate } = useData();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [question, setQuestion] = useState("");
    const [turns, setTurns] = useState<Turn[]>([]);
    const [busy, setBusy] = useState(false);
    const [historyReady, setHistoryReady] = useState(false);
    const [taskTurns, setTaskTurns] = useState<number[]>([]);
    const input = useRef<HTMLTextAreaElement>(null);

    const venture = user.venture;
    const stageFrameworks = useMemo(() => frameworksForStage(venture.stage), [venture.stage]);
    const suggestions = useMemo(
        () => (stageFrameworks.length ? stageFrameworks : FRAMEWORKS).slice(0, 3).map((framework) => framework.question),
        [stageFrameworks],
    );
    const ventureReady = Boolean(venture.name || venture.oneLiner || venture.country);

    useEffect(() => {
        setHistoryReady(false);
        setTurns(storedTurns(user.profile.id));
        setTaskTurns([]);
        setHistoryReady(true);
    }, [user.profile.id]);

    useEffect(() => {
        if (!historyReady) return;
        try {
            localStorage.setItem(`startup-school:adviser:${user.profile.id}`, JSON.stringify(turns.slice(-12)));
        } catch {
            // Advice still works when private browsing prevents persistence.
        }
    }, [historyReady, turns, user.profile.id]);

    useEffect(() => {
        const draft = searchParams.get("draft");
        if (!draft) return;
        setQuestion(draft);
        const next = new URLSearchParams(searchParams);
        next.delete("draft");
        setSearchParams(next, { replace: true });
        window.setTimeout(() => input.current?.focus(), 0);
    }, [searchParams, setSearchParams]);

    const ask = async (value: string) => {
        const text = value.trim();
        if (!text || busy) return;
        setQuestion("");
        setBusy(true);
        const at = turns.length;
        setTurns((current) => [...current, { question: text, advice: null }]);
        try {
            const advice = await repo.advise(text);
            setTurns((current) => current.map((turn, index) => (index === at ? { ...turn, advice } : turn)));
        } catch (error) {
            const message = error instanceof Error ? error.message : "The adviser is not reachable right now.";
            setTurns((current) => current.map((turn, index) => (index === at ? { ...turn, error: message } : turn)));
        } finally {
            setBusy(false);
            input.current?.focus();
        }
    };

    const makeTask = async (turn: Turn, index: number) => {
        if (!turn.advice?.nextStep || taskTurns.includes(index)) return;
        const due = new Date();
        due.setDate(due.getDate() + 3);
        due.setHours(18, 0, 0, 0);
        try {
            await mutate((repository) => repository.addTask({ title: turn.advice!.nextStep, courseId: null, dueAt: due.toISOString() }));
            setTaskTurns((saved) => [...saved, index]);
            toast("Added to your next actions", "success");
        } catch (error) {
            toast(error instanceof Error ? error.message : "Could not add that task", "danger");
        }
    };

    const clearHistory = () => {
        setTurns([]);
        setTaskTurns([]);
        try {
            localStorage.removeItem(`startup-school:adviser:${user.profile.id}`);
        } catch {
            // The next state write is safely ignored when storage is unavailable.
        }
    };

    return (
        <div className="mx-auto max-w-3xl">
            <PageTitle title="Founder adviser" sub="Turn one real decision into a clear next step." />

            {!ventureReady ? (
                <Card className="mb-6 border border-peach-soft bg-peach-soft/45">
                    <p className="text-[14px] leading-6 text-ink">
                        Add a working name, one-line description, and market first. The adviser will then use your actual venture context.
                    </p>
                    <Link to="/venture" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand underline underline-offset-4">
                        Set up your venture <ArrowRight size={14} />
                    </Link>
                </Card>
            ) : (
                <Card className="mb-6 flex flex-wrap items-center gap-3 border border-line bg-card py-3.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden="true"><SparkleMark /></span>
                    <p className="min-w-0 flex-1 text-[14px] leading-6 text-muted">
                        Advising <strong className="font-semibold text-ink">{venture.name || "your venture"}</strong> at the {STAGE_LABEL[venture.stage].toLowerCase()} stage.
                    </p>
                    <Link to="/venture" className="text-[13px] font-semibold text-brand underline underline-offset-4">Edit context</Link>
                </Card>
            )}

            <Card className="border border-line p-5 max-md:p-4">
                <Overline>Start with the decision</Overline>
                <h2 className="mt-1 text-[20px] font-semibold leading-7">What do you need to decide or test?</h2>
                <p className="mt-1 text-[14px] leading-6 text-muted">Be specific about the customer, choice, evidence, or trade-off. You will get a framework and an action, not a generic business plan.</p>
                <label className="sr-only" htmlFor="adviser-question">Your question for the adviser</label>
                <textarea
                    id="adviser-question"
                    ref={input}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            void ask(question);
                        }
                    }}
                    rows={4}
                    placeholder="For example: We have spoken to eight households. How do I decide whether the problem is painful enough to test?"
                    className="mt-4 w-full resize-y rounded-lg border border-line-strong bg-page px-3.5 py-3 text-[15px] leading-6 outline-none placeholder:text-caption focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[12px] text-caption">Press Ctrl/Cmd + Enter to ask.</span>
                    <Button onClick={() => void ask(question)} disabled={!question.trim() || busy}>
                        {busy ? <Spinner /> : <ArrowUp size={16} />} Get a next step
                    </Button>
                </div>
            </Card>

            {turns.length === 0 && (
                <section className="mt-6" aria-labelledby="starter-questions">
                    <Overline>Useful starting points</Overline>
                    <div className="mt-2 grid gap-2">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => void ask(suggestion)}
                                className="flex items-start gap-3 rounded-xl border border-line bg-card px-4 py-3.5 text-left text-[14px] leading-6 transition-colors hover:border-brand hover:bg-brand-soft/25"
                            >
                                <ArrowRight size={15} className="mt-1 shrink-0 text-brand" aria-hidden="true" />
                                <span>{suggestion}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {turns.length > 0 && (
                <section className="mt-6" aria-labelledby="advice-history">
                    <div className="mb-3 flex items-center gap-3">
                        <h2 id="advice-history" className="flex-1 text-[18px] font-semibold">Your decisions</h2>
                        <Button variant="ghost" size="sm" onClick={clearHistory}><Trash2 size={13} /> Clear</Button>
                    </div>
                    <div className="flex flex-col gap-4">
                        {turns.map((turn, index) => (
                            <AdviceResult key={`${turn.question}-${index}`} turn={turn} taskSaved={taskTurns.includes(index)} onMakeTask={() => void makeTask(turn, index)} />
                        ))}
                    </div>
                </section>
            )}

            <details className="mt-6 rounded-xl border border-line bg-card p-4">
                <summary className="cursor-pointer list-none text-[14px] font-semibold">
                    <span className="inline-flex items-center gap-2"><BookOpen size={16} className="text-brand" /> How the adviser works</span>
                </summary>
                <p className="mt-3 text-[14px] leading-6 text-muted">
                    It uses your venture record and the course frameworks. Every response names the framework it used and leaves the judgement, evidence, and final decision with you.
                </p>
            </details>
        </div>
    );
}

function SparkleMark() {
    return <span className="text-[18px] leading-none" aria-hidden="true">*</span>;
}
