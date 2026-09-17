import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CalendarRange, Sparkles } from "lucide-react";
import { addDays, isoDate, longDate } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { useData, useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { MemberAvatar, Notice, PageTitle, Stat } from "@/components/shared";
import { Button, EmptyState, Field } from "@/components/ui/primitives";
import homeModule from "../module";
import { EMPTY_HOME, reviewForWeek, weekOf } from "../derive";

/**
 * Sunday planning — the fourth beat of the loop.
 *
 * Ten minutes on the planning day: look at what last week actually did, agree
 * three priorities, and write down the one paragraph that explains them. Those
 * three priorities are the Week focus card every member sees for the rest of
 * the week, so this screen is short on purpose. The quarterly review under it
 * is the same record read thirteen weeks at a time.
 */
export default function PlanningPage() {
    const sp = useSpace();
    const { dashboard } = useData();
    const { state: loaded, mutate } = useModule(homeModule);
    const state = loaded ?? EMPTY_HOME;
    const { ask, busy: aiBusy } = useAi();
    const { toast } = useToast();

    const today = sp.today;
    const tomorrow = isoDate(addDays(`${today}T12:00:00`, 1));
    const nextWeek = weekOf(tomorrow);
    const thisWeek = weekOf(today);

    const [target, setTarget] = useState(nextWeek);
    const existing = reviewForWeek(state, target);

    const [priorities, setPriorities] = useState<string[]>(["", "", ""]);
    const [notes, setNotes] = useState("");
    const [planned, setPlanned] = useState(0);
    const [completed, setCompleted] = useState(0);
    const [answered, setAnswered] = useState(0);
    const [saving, setSaving] = useState(false);
    const [suggestion, setSuggestion] = useState<string | null>(null);

    useEffect(() => {
        setPriorities([existing?.priorities[0] ?? "", existing?.priorities[1] ?? "", existing?.priorities[2] ?? ""]);
        setNotes(existing?.notes ?? "");
        setPlanned(existing?.tasksPlanned ?? dashboard.agenda.length);
        setCompleted(existing?.tasksDone ?? dashboard.agenda.filter((a) => a.done).length);
        setAnswered(existing?.prayersAnswered ?? 0);
    }, [existing, dashboard.agenda]);

    const history = useMemo(() => [...state.reviews].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, 13), [state.reviews]);
    const quarter = useMemo(
        () =>
            history.reduce(
                (acc, r) => ({ planned: acc.planned + r.tasksPlanned, done: acc.done + r.tasksDone, prayers: acc.prayers + r.prayersAnswered }),
                { planned: 0, done: 0, prayers: 0 },
            ),
        [history],
    );

    if (sp.role !== "parent") {
        return (
            <div>
                <PageTitle title="Sunday planning" sub="The family's weekly planning session." area="home" />
                <EmptyState title="Planning is a parents' screen" body="The three priorities it sets show up on your Home as Week focus." action={<Link to="/" className="text-sm font-semibold text-brand underline underline-offset-4">Back to Home</Link>} />
            </div>
        );
    }

    const propose = async () => {
        setSuggestion(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: "Propose exactly three priorities for the family's coming week, drawn only from what is already open — overdue work, upcoming deadlines, goals with no movement, and anything that needs a decision. One short line each, no preamble, no numbering.",
            });
            if (r.unavailable) {
                setSuggestion(r.unavailable);
                return;
            }
            const lines = r.text
                .split("\n")
                .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
                .filter(Boolean)
                .slice(0, 3);
            if (lines.length) {
                setPriorities([lines[0] ?? "", lines[1] ?? "", lines[2] ?? ""]);
                setSuggestion("Proposed from your own open work — edit anything before you save.");
            } else setSuggestion("The companion had nothing to propose this week.");
        } catch {
            setSuggestion("The companion couldn't answer just now. Write the three yourself — it takes a minute.");
        }
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await mutate((r) => r.saveReview({ weekStart: target, priorities, notes, tasksPlanned: planned, tasksDone: completed, prayersAnswered: answered, completed: true }));
            toast("Week focus saved", "success");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageTitle
                title="Sunday planning"
                sub="Look back at the week that was, then agree the three things that matter in the week ahead."
                area="home"
                actions={
                    <Link to="/" className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-sm font-semibold hover:border-ink">
                        <CalendarRange size={15} aria-hidden="true" /> Home
                    </Link>
                }
            />

            <div className="mb-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Which week">
                {[
                    { id: nextWeek, label: nextWeek === thisWeek ? "This week" : "The week ahead" },
                    { id: thisWeek, label: "This week" },
                ]
                    .filter((o, i, all) => all.findIndex((x) => x.id === o.id) === i)
                    .map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            role="radio"
                            aria-checked={target === o.id}
                            onClick={() => setTarget(o.id)}
                            className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold ${target === o.id ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink"}`}
                        >
                            {o.label} · from {longDate(`${o.id}T12:00:00`)}
                        </button>
                    ))}
            </div>

            <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
                <div className="flex flex-col gap-4 lg:col-span-2">
                    <section className="rounded-xl bg-card p-4 md:p-5">
                        <h2 className="mb-1 font-display text-2xl leading-7">Three priorities</h2>
                        <p className="mb-4 text-sm text-muted">If everything else slipped, these three would still make it a good week.</p>
                        <div className="space-y-3">
                            {priorities.map((p, i) => (
                                <Field key={i} label={`Priority ${i + 1}`} value={p} onChange={(e) => setPriorities((all) => all.map((x, j) => (j === i ? e.target.value : x)))} placeholder={["Settle the school rhythm", "Book Lagos flights", "Finish kitchen quotes"][i]} />
                            ))}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => void propose()} loading={aiBusy}>
                                <Sparkles size={14} aria-hidden="true" /> Propose three
                            </Button>
                            {suggestion && <span className="text-xs text-muted">{suggestion}</span>}
                        </div>
                        <label className="mt-4 block">
                            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Notes for the week</span>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Keep the mornings simple: breakfast, verse, out by 08:40." className="w-full rounded-md border border-line-strong bg-card px-3.5 py-2.5 text-md leading-6 outline-none focus:border-brand" />
                        </label>
                    </section>

                    <section className="rounded-xl bg-card p-4 md:p-5">
                        <h2 className="mb-1 font-display text-2xl leading-7">Looking back</h2>
                        <p className="mb-4 text-sm text-muted">The numbers are prefilled from today&apos;s board — adjust them to what the week really did.</p>
                        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                            <Field label="Tasks planned" type="number" min={0} value={planned} onChange={(e) => setPlanned(Number(e.target.value) || 0)} />
                            <Field label="Tasks done" type="number" min={0} value={completed} onChange={(e) => setCompleted(Number(e.target.value) || 0)} />
                            <Field label="Prayers answered" type="number" min={0} value={answered} onChange={(e) => setAnswered(Number(e.target.value) || 0)} />
                        </div>
                    </section>

                    <div className="flex items-center gap-3">
                        <Button type="submit" variant="brand" loading={saving} disabled={!priorities.some((p) => p.trim())}>
                            {existing?.completedAt ? "Update the week focus" : "Save the week focus"}
                        </Button>
                        {existing?.completedAt && (
                            <span className="text-xs text-caption">
                                Last set {longDate(existing.completedAt)} by <MemberAvatar memberId={existing.hostMemberId} size="xs" showName className="align-middle" />
                            </span>
                        )}
                    </div>
                </div>

                <aside className="flex flex-col gap-4">
                    <section className="rounded-xl bg-card p-4 md:p-5">
                        <h2 className="mb-3 font-display text-2xl leading-7">Quarterly review</h2>
                        {history.length ? (
                            <>
                                <div className="grid grid-cols-3 gap-2">
                                    <Stat label="Planned" value={quarter.planned} />
                                    <Stat label="Done" value={quarter.done} tone="ok" />
                                    <Stat label="Answered" value={quarter.prayers} tone="live" />
                                </div>
                                <ul className="mt-4 space-y-3">
                                    {history.map((r) => (
                                        <li key={r.id} className="rounded-lg bg-page px-3.5 py-3">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xs font-semibold text-muted">From {longDate(`${r.weekStart}T12:00:00`)}</span>
                                                <span className="ml-auto text-xs tabular-nums text-caption">
                                                    {r.tasksDone}/{r.tasksPlanned}
                                                </span>
                                            </div>
                                            <ol className="mt-1.5 space-y-0.5 text-sm leading-5">
                                                {r.priorities.map((p) => (
                                                    <li key={p}>· {p}</li>
                                                ))}
                                            </ol>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <Notice tone="info">Nothing to review yet. After a few Sundays this becomes the family&apos;s quarter at a glance.</Notice>
                        )}
                    </section>

                    {/*
                     * The full ring wall — the only place it is allowed to
                     * appear. Home shows three; the other hundred and twenty-
                     * nine are an AUDIT, and an audit is exactly the right
                     * thing on the one day the family sits down to plan.
                     */}
                    {dashboard.rings.length > 0 && (
                        <details className="rounded-xl bg-card p-4 md:p-5">
                            <summary className="cursor-pointer font-display text-2xl leading-7">Everything we&apos;re tracking</summary>
                            <p className="mt-1 text-sm text-muted">
                                {dashboard.rings.length} things have a percentage against them. Home shows three; this is the whole wall, once a week.
                            </p>
                            <ul className="mt-3 space-y-1.5">
                                {[...dashboard.rings]
                                    .sort((a, b) => a.pct - b.pct)
                                    .map((r) => (
                                        <li key={`${r.moduleId}:${r.id}`}>
                                            <Link to={r.href} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-page">
                                                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.label}</span>
                                                <span className="shrink-0 text-xs tabular-nums text-muted">{r.pct}%</span>
                                            </Link>
                                        </li>
                                    ))}
                            </ul>
                        </details>
                    )}
                </aside>
            </form>
        </div>
    );
}
