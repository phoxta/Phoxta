import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Award, ChevronLeft, FileText, Flag, Plus, Sparkles, Volume2 } from "lucide-react";
import { AGE_BAND } from "@/data/core";
import { cn } from "@/lib/cn";
import { pct as pctOf, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, EmptyModule, Notice, PageTitle, Points, Section, Stat } from "@/components/shared";
import { BarChart, Ring } from "@/components/ui/charts";
import { Button, Card, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import curriculaModule from "../module";
import {
    BASE,
    assignmentsOfSubject,
    assignmentsOfUnit,
    awardsFor,
    challengeIndexFor,
    currentTerm,
    dueToday,
    feedFor,
    freshAwards,
    gradeFor,
    isDone,
    letterFor,
    logFor,
    logsFor,
    milestonesFor,
    overdueFor,
    subjectAverage,
    subjectTrend,
    subjectsFor,
    termAverage,
    trackFor,
    trackPct,
    unitsOf,
} from "../derive";
import type { BadgeAward, DevMilestone, Subject } from "../types";
import { AssignmentRow, BadgeChip, ScorePill, SourceLink, SpeakButton, SubjectPill, useSpeech } from "../components/pieces";
import { AssignmentDialog, AwardDialog, MilestoneDialog, SubjectDialog, UnitDialog } from "../components/dialogs";
import { GenerateUnitDialog } from "../components/GenerateUnitDialog";
import { ReportDialog } from "../components/ReportDialog";
import { AskDialog } from "../components/AskDialog";

/**
 * One child's term.
 *
 * The same route serves two completely different screens, because they are two
 * completely different jobs. A parent gets the register: subjects, units,
 * every piece of work, the marks and the trend, the report, the badges and the
 * milestones. A child gets their own day: what is due, the month's challenge,
 * the marks that have been released to them, and their own badge shelf — in
 * their band's layout, which for the Little band means pictures, big targets
 * and not one box to type in.
 */

const LITTLE_REFLECTIONS = ["I did it!", "It was easy", "It was tricky", "I did it with Mummy", "I did it with Daddy"];

export default function ChildPage() {
    const { memberId = "" } = useParams();
    const { state, repo, mutate, reload, loading, error } = useModule(curriculaModule);
    const sp = useSpace();
    const { toast } = useToast();
    const { speak, supported: canSpeak } = useSpeech();

    const [subjectFilter, setSubjectFilter] = useState<string>("");
    const [subjectOpen, setSubjectOpen] = useState(false);
    const [editSubject, setEditSubject] = useState<Subject | undefined>(undefined);
    const [unitOpen, setUnitOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignUnitId, setAssignUnitId] = useState<string | undefined>(undefined);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [milestoneOpen, setMilestoneOpen] = useState(false);
    const [editMilestone, setEditMilestone] = useState<DevMilestone | undefined>(undefined);
    const [reportOpen, setReportOpen] = useState(false);
    const [askOpen, setAskOpen] = useState(false);
    const [awardOpen, setAwardOpen] = useState(false);
    const [removeSubject, setRemoveSubject] = useState<Subject | null>(null);
    const [removeAward, setRemoveAward] = useState<BadgeAward | null>(null);
    const [reflection, setReflection] = useState("");
    const [justAwarded, setJustAwarded] = useState(false);

    const child = sp.members.find((m) => m.id === memberId);
    const manage = sp.can("curricula.manage");
    const isMe = sp.me.id === memberId;

    const kids = useMemo(() => sp.members.filter((m) => m.role === "child"), [sp.members]);
    const subjects = useMemo(() => (state ? subjectsFor(state, memberId) : []), [state, memberId]);
    const terms = useMemo(() => (state ? [...new Set(state.subjects.filter((s) => s.childMemberId === memberId).map((s) => s.term))] : []), [state, memberId]);

    // A fresh badge deserves a moment: the celebration animates in, then settles.
    const fresh = state && child ? freshAwards(state, memberId, sp.today, 3) : [];
    useEffect(() => {
        if (!fresh.length) return;
        setJustAwarded(true);
        const t = window.setTimeout(() => setJustAwarded(false), 2600);
        return () => window.clearTimeout(t);
    }, [fresh.length]);

    if (sp.role === "guest") return <EmptyModule title="Not shared with you" body="School work stays inside the family." />;
    if (sp.role === "child" && !isMe) return <Navigate to={`${BASE}/${sp.me.id}`} replace />;
    if (loading && !state) return <p className="text-md text-muted">Opening the term…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;
    if (!child) return <EmptyModule title="We can't find that child" body="They may have been removed from the family." action={<Link to={BASE} className="text-sm font-semibold text-brand underline">Back to the curriculum</Link>} />;
    // A curriculum belongs to a child. Reaching this route with a parent's or a
    // guest's id used to render them a school register of their own.
    if (child.role !== "child")
        return (
            <EmptyModule
                title={`${child.name.split(" ")[0]} doesn't have a curriculum`}
                body="Subjects, work, marks and badges belong to the children in the family."
                action={
                    <Link to={BASE} className="text-sm font-semibold text-brand underline">
                        Back to the curriculum
                    </Link>
                }
            />
        );

    const first = child.name.split(" ")[0];
    const term = currentTerm(state, memberId);
    const avg = termAverage(state, memberId, term);
    const track = trackFor(state, sp.today);
    const todaysIndex = track ? challengeIndexFor(track, sp.today) : 0;
    const doneToday = track ? logFor(state, track.id, memberId, sp.today) : undefined;
    const milestones = milestonesFor(state, memberId);
    const awards = awardsFor(state, memberId);
    const revoking = removeAward ? state.badges.find((b) => b.id === removeAward.badgeId) : undefined;
    const little = child.ageBand === "little";

    // ---- writes -------------------------------------------------------------

    const doChallenge = async () => {
        if (!track) return;
        const entry = await repo.logChallenge(track.id, memberId, todaysIndex, reflection);
        await reload();
        await sp.mutateCore((core) => core.addPoints(memberId, entry.sprouts, `${track.virtue} challenge`));
        setReflection("");
        toast(`${entry.sprouts} Sprouts — well done`, "success");
    };

    // =========================================================================
    // The child's own screen
    // =========================================================================
    if (isMe && sp.role === "child") {
        const feed = feedFor(state, memberId, sp.today);
        const doneCount = feed.filter((f) => f.done).length;
        const readAll = () => speak([`${first}, here is your day.`, ...feed.map((f) => f.speak)].join(" "));

        return (
            <div>
                <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="font-display text-[32px] leading-10">My learning</h1>
                        <p className="mt-1 text-lg text-muted">{feed.length ? `${doneCount} of ${feed.length} done today` : "Nothing set for today"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Points n={sp.me.points} />
                        {canSpeak && (
                            <Button variant="outline" size="lg" onClick={readAll}>
                                <Volume2 size={17} aria-hidden="true" /> Read my day
                            </Button>
                        )}
                    </div>
                </header>

                {fresh.length > 0 && (
                    <ul className="mb-5 flex flex-col gap-3">
                        {fresh.map((a) => {
                            const badge = state.badges.find((b) => b.id === a.badgeId);
                            if (!badge) return null;
                            return (
                                <li key={a.id}>
                                    <div className={cn("flex items-center gap-4 rounded-xl bg-live-soft px-5 py-4 text-live-ink transition-transform", justAwarded && "animate-pulse")} role="status">
                                        <span className={cn("text-[40px] leading-none", justAwarded && "animate-bounce")} aria-hidden="true">
                                            {badge.icon}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-display text-3xl leading-7">You earned {badge.name}!</p>
                                            <p className="mt-0.5 text-base leading-6">{a.note || `${badge.virtueOrSkill} · ${a.level}`}</p>
                                        </div>
                                        <SpeakButton text={`You earned the ${badge.name} badge. ${a.note}`} label="Hear it" />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {milestones
                    .filter((m) => m.progressPct >= 100 && !m.celebratedAt)
                    .map((m) => (
                        <div key={m.id} className="mb-5 flex flex-wrap items-center gap-4 rounded-xl bg-mint-soft px-5 py-4 text-mint" role="status">
                            <span className="text-[36px] leading-none animate-bounce" aria-hidden="true">
                                🎉
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-display text-3xl leading-7">You did it: {m.title}</p>
                                <p className="mt-0.5 text-base">That is a big one. Go and tell someone.</p>
                            </div>
                            <SpeakButton text={`You did it. ${m.title}. That is a big one. Go and tell someone.`} label="Hear it" />
                        </div>
                    ))}

                <Section title="Today">
                    {feed.length ? (
                        <ul className={cn("grid gap-3", little ? "grid-cols-[minmax(0,1fr)] sm:grid-cols-2" : "grid-cols-[minmax(0,1fr)] sm:grid-cols-2")}>
                            {feed.map((item) => (
                                <li key={item.id}>
                                    <div className={cn("flex h-full flex-col rounded-xl bg-card p-4", item.done && "opacity-70")}>
                                        {item.photoUrl && item.pictureLed && (
                                            <img src={item.photoUrl} alt={item.title} width={480} height={200} loading="lazy" className="mb-3 h-[140px] w-full rounded-md object-cover" />
                                        )}
                                        <div className="flex items-start gap-3">
                                            <span className={cn("leading-none", little ? "text-[38px]" : "text-7xl")} aria-hidden="true">
                                                {item.emoji}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className={cn("font-semibold", little ? "text-2xl leading-7" : "text-[17px] leading-6")}>{item.title}</p>
                                                <p className={cn("mt-0.5 text-muted", little ? "text-lg leading-6" : "text-md leading-5")}>{item.body}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                            <SpeakButton text={item.speak} big={little} label={little ? "Read it to me" : "Read it"} />
                                            {item.kind === "assignment" && !item.done && (
                                                <Link to={`${BASE}/${memberId}/assignments/${item.id}`} className={cn("inline-flex items-center rounded-full bg-brand font-semibold text-white", little ? "h-11 px-5 text-base" : "h-9 px-4 text-sm")}>
                                                    {little ? "Let's go" : "Open it"}
                                                </Link>
                                            )}
                                            {item.kind === "assignment" && item.done && <Tag tone="ok">Done</Tag>}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState title="Nothing set for today" body="Have a look at your books, or ask a grown-up what today looks like." />
                    )}
                </Section>

                {track && (
                    <Section title={`${track.virtue} challenge`}>
                        <Card>
                            <p className={cn("font-display leading-8", little ? "text-4xl" : "text-2xl")}>{track.challenges[todaysIndex] ?? "—"}</p>
                            <p className="mt-1 text-md text-muted">
                                Worth {track.sprouts} Sprouts · {logsFor(state, track.id, memberId).length} done this month
                            </p>
                            <ProgressBar value={trackPct(state, track, memberId, sp.today)} className="mt-3" label="Character track" />
                            {doneToday ? (
                                <div className="mt-4 rounded-lg bg-mint-soft px-4 py-3 text-mint">
                                    <p className="text-base font-semibold">Done today ✓</p>
                                    {doneToday.reflection && <p className="mt-1 text-md leading-6">&ldquo;{doneToday.reflection}&rdquo;</p>}
                                </div>
                            ) : (
                                <div className="mt-4">
                                    {little ? (
                                        <>
                                            <p className="mb-2 text-base text-muted">How did it go?</p>
                                            <div className="flex flex-wrap gap-2">
                                                {LITTLE_REFLECTIONS.map((r) => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        aria-pressed={reflection === r}
                                                        onClick={() => setReflection(r)}
                                                        className={cn("h-11 rounded-full px-4 text-base font-semibold", reflection === r ? "bg-brand text-white" : "bg-page text-muted")}
                                                    >
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <label className="block">
                                            <span className="mb-1.5 block text-sm font-medium text-muted">How did it go?</span>
                                            <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={2} className="w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-base leading-6 outline-none focus:border-brand" />
                                        </label>
                                    )}
                                    <Button className="mt-3" size={little ? "lg" : "md"} onClick={doChallenge}>
                                        I did it
                                    </Button>
                                </div>
                            )}
                            <div className="mt-3">
                                <SpeakButton text={`Today's ${track.virtue} challenge. ${track.challenges[todaysIndex] ?? ""}`} big={little} />
                            </div>
                        </Card>
                    </Section>
                )}

                {!little && (
                    <Section title="My marks">
                        {subjects.length ? (
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                                {subjects.map((s) => {
                                    const a = subjectAverage(state, s.id);
                                    return (
                                        <li key={s.id}>
                                            <Card className="flex h-full items-center gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <SubjectPill subject={s} />
                                                    <p className="mt-2 text-md text-muted">{a.graded ? `${a.graded} marked` : "Nothing marked yet"}</p>
                                                </div>
                                                {a.graded > 0 && (
                                                    <Ring pct={a.avg} size={56} stroke={3} label={`${s.name}: ${a.avg}%`}>
                                                        <span className="text-xs font-semibold tabular-nums">{a.avg}%</span>
                                                    </Ring>
                                                )}
                                            </Card>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <EmptyState title="No subjects yet" body="A grown-up sets these up." />
                        )}
                        <p className="mt-3 text-sm text-caption">Some marks are still with your parents — they&rsquo;ll show up here when they share them with you.</p>
                    </Section>
                )}

                <Section title="My badges">
                    {awards.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {awards.map((a) => {
                                const badge = state.badges.find((b) => b.id === a.badgeId);
                                if (!badge) return null;
                                return (
                                    <li key={a.id}>
                                        <BadgeChip badge={badge} level={a.level} earned note={a.note} when={a.awardedAt} />
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <EmptyState icon={<Award size={20} aria-hidden="true" />} title="No badges yet" body="Keep going — the first one is closer than you think." />
                    )}
                    {state.badges.filter((b) => !awards.some((a) => a.badgeId === b.id)).length > 0 && (
                        <>
                            <h3 className="mb-2 mt-5 text-md font-semibold text-muted">Still to earn</h3>
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {state.badges
                                    .filter((b) => !awards.some((a) => a.badgeId === b.id))
                                    .slice(0, 6)
                                    .map((b) => (
                                        <li key={b.id}>
                                            <BadgeChip badge={b} />
                                        </li>
                                    ))}
                            </ul>
                        </>
                    )}
                </Section>

                {milestones.length > 0 && (
                    <Section title="Growing up">
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                            {milestones.map((m) => (
                                <li key={m.id}>
                                    <Card className="h-full">
                                        <p className="text-lg font-semibold">{m.title}</p>
                                        {m.note && <p className="mt-0.5 text-md leading-6 text-muted">{m.note}</p>}
                                        <ProgressBar value={m.progressPct} className="mt-3" label={m.title} />
                                        <p className="mt-1.5 text-xs text-caption">{m.progressPct}%</p>
                                    </Card>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}
            </div>
        );
    }

    // =========================================================================
    // The parent's register
    // =========================================================================
    const shown = subjectFilter ? subjects.filter((s) => s.id === subjectFilter) : subjects;
    const late = overdueFor(state, memberId, sp.today);
    const today = dueToday(state, memberId, sp.today);
    const allWork = state.assignments.filter((a) => a.childMemberId === memberId);
    const doneWork = allWork.filter(isDone).length;

    return (
        <div>
            <Link to={BASE} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ChevronLeft size={14} aria-hidden="true" /> All the children
            </Link>

            <PageTitle
                title={`${first}'s curriculum`}
                sub={`${term || "No term set"} · ${AGE_BAND[child.ageBand].label} band · ${subjects.length} subject${subjects.length === 1 ? "" : "s"}`}
                area="grow"
                actions={
                    manage ? (
                        <>
                            <Button variant="outline" size="md" onClick={() => setAskOpen(true)}>
                                <Sparkles size={15} aria-hidden="true" /> Ask about {first}
                            </Button>
                            <Button variant="outline" size="md" onClick={() => setReportOpen(true)}>
                                <FileText size={15} aria-hidden="true" /> Term report
                            </Button>
                            <Button size="md" onClick={() => setAssignOpen(true)}>
                                <Plus size={15} aria-hidden="true" /> Set work
                            </Button>
                        </>
                    ) : undefined
                }
            />

            <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Term average" value={avg.graded ? `${avg.avg}%` : "—"} sub={avg.graded ? `${avg.graded} marked` : "Nothing marked yet"} tone="grow" />
                <Stat label="Work done" value={`${doneWork}/${allWork.length}`} sub={`${pctOf(doneWork, allWork.length)}% of the term`} />
                <Stat label="Due today" value={today.length} sub={late.length ? `${late.length} overdue` : "Nothing late"} tone={late.length ? "danger" : "neutral"} />
                <Stat label="Badges" value={awards.length} sub={awards[0] ? `Latest: ${state.badges.find((b) => b.id === awards[0].badgeId)?.name ?? ""}` : "None yet"} tone="ok" />
            </div>

            <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
                <button type="button" aria-pressed={!subjectFilter} onClick={() => setSubjectFilter("")} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold", !subjectFilter ? "bg-ink text-white" : "bg-card text-muted hover:text-ink")}>
                    Every subject
                </button>
                {subjects.map((s) => (
                    <button key={s.id} type="button" aria-pressed={subjectFilter === s.id} onClick={() => setSubjectFilter(s.id)} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold", subjectFilter === s.id ? "bg-ink text-white" : "bg-card text-muted hover:text-ink")}>
                        {s.name}
                    </button>
                ))}
                {manage && (
                    <button type="button" onClick={() => { setEditSubject(undefined); setSubjectOpen(true); }} className="h-9 shrink-0 rounded-full border border-dashed border-line-strong px-4 text-sm font-semibold text-muted hover:text-ink">
                        <Plus size={13} className="mr-1 inline" aria-hidden="true" /> Subject
                    </button>
                )}
            </div>

            {subjects.length === 0 ? (
                <EmptyModule
                    title={`No subjects for ${first} yet`}
                    body="Start with one — Maths, Reading, Bible, whatever the week actually contains — and add the units and the work underneath it."
                    action={manage ? <Button onClick={() => setSubjectOpen(true)}>Add the first subject</Button> : undefined}
                />
            ) : (
                <ul className="flex flex-col gap-4">
                    {shown.map((s) => {
                        const sa = subjectAverage(state, s.id);
                        const trend = subjectTrend(state, s.id);
                        const units = unitsOf(state, s.id);
                        return (
                            <li key={s.id}>
                                <Card>
                                    <div className="flex flex-wrap items-start gap-4">
                                        {s.photoUrl && <img src={s.photoUrl} alt="" width={96} height={72} loading="lazy" className="h-[72px] w-24 shrink-0 rounded-md object-cover" />}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-display text-3xl leading-7">{s.name}</h2>
                                                <SubjectPill subject={s} />
                                                <Tag tone="neutral">{s.kind === "exam" ? "Exam course" : s.kind === "school" ? "School support" : "Home education"}</Tag>
                                            </div>
                                            <p className="mt-1 text-sm text-muted">
                                                {s.note || s.term} · {s.targetHoursWeek}h a week · {assignmentsOfSubject(state, s.id).length} piece{assignmentsOfSubject(state, s.id).length === 1 ? "" : "s"} of work
                                            </p>
                                        </div>
                                        {sa.graded > 0 && <ScorePill score={sa.avg} letter={letterFor(sa.avg)} />}
                                        {manage && (
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => { setEditSubject(s); setSubjectOpen(true); }}>
                                                    Edit
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setRemoveSubject(s)}>
                                                    Remove
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {trend.length > 1 && (
                                        <div className="mt-4">
                                            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-caption">The trend</p>
                                            <BarChart data={trend} unit="%" height={80} />
                                        </div>
                                    )}

                                    <div className="mt-4 flex flex-col gap-4">
                                        {units.length === 0 && <p className="rounded-md bg-page px-3 py-3 text-sm text-muted">No units yet — a unit is a chunk of the term, and the work hangs off it.</p>}
                                        {units.map((u) => {
                                            const work = assignmentsOfUnit(state, u.id);
                                            return (
                                                <div key={u.id}>
                                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                        <h3 className="text-base font-semibold">{u.title}</h3>
                                                        {manage && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setAssignUnitId(u.id);
                                                                    setAssignOpen(true);
                                                                }}
                                                            >
                                                                <Plus size={13} aria-hidden="true" /> Set work
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {u.summary && <p className="mt-0.5 text-sm leading-5 text-muted">{u.summary}</p>}
                                                    {u.sourceHref && (
                                                        <p className="mt-1">
                                                            <SourceLink href={u.sourceHref} label={u.sourceLabel} />
                                                        </p>
                                                    )}
                                                    {work.length ? (
                                                        <ul className="mt-2 -mx-3">
                                                            {work.map((a) => (
                                                                <AssignmentRow key={a.id} a={a} subject={s} grade={gradeFor(state, a.id)} to={`${BASE}/${memberId}/assignments/${a.id}`} />
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="mt-2 text-sm text-caption">Nothing set in this unit yet.</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {manage && (
                                        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                                            <Button
                                                variant="outline"
                                                size="md"
                                                onClick={() => {
                                                    setSubjectFilter(s.id);
                                                    setUnitOpen(true);
                                                }}
                                            >
                                                <Plus size={15} aria-hidden="true" /> New unit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="md"
                                                onClick={() => {
                                                    setSubjectFilter(s.id);
                                                    setGenerateOpen(true);
                                                }}
                                            >
                                                <Sparkles size={15} aria-hidden="true" /> Draft a unit
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            </li>
                        );
                    })}
                </ul>
            )}

            <Section
                title="Milestones"
                className="mt-8"
                action={
                    manage ? (
                        <Button variant="outline" size="sm" onClick={() => { setEditMilestone(undefined); setMilestoneOpen(true); }}>
                            <Flag size={14} aria-hidden="true" /> New milestone
                        </Button>
                    ) : undefined
                }
            >
                {milestones.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {milestones.map((m) => (
                            <li key={m.id}>
                                <Card className={cn("h-full", m.progressPct >= 100 && !m.celebratedAt && "ring-2 ring-live")}>
                                    <div className="flex items-start gap-3">
                                        {m.photoUrl && <img src={m.photoUrl} alt="" width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md object-cover" />}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-lg font-semibold">{m.title}</p>
                                            {m.note && <p className="mt-0.5 text-sm leading-5 text-muted">{m.note}</p>}
                                            <ProgressBar value={m.progressPct} className="mt-3" label={m.title} />
                                            <p className="mt-1.5 text-xs text-caption">
                                                {m.progressPct}%{m.achievedAt ? ` · reached ${shortDate(m.achievedAt)}` : ""}
                                                {m.celebratedAt ? " · celebrated" : ""}
                                            </p>
                                        </div>
                                    </div>
                                    {manage && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => { setEditMilestone(m); setMilestoneOpen(true); }}>
                                                Edit
                                            </Button>
                                            {m.progressPct >= 100 && !m.celebratedAt && (
                                                <Button size="sm" onClick={async () => { await mutate((r) => r.celebrateMilestone(m.id)); toast("Celebrated 🎉", "success"); }}>
                                                    We celebrated it
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState icon={<Flag size={20} aria-hidden="true" />} title="No milestones yet" body="The things a report card never shows: reading fluency, tying laces, running their own week." />
                )}
            </Section>

            <Section
                title="Badges"
                action={
                    manage ? (
                        <Button variant="outline" size="sm" onClick={() => setAwardOpen(true)}>
                            <Award size={14} aria-hidden="true" /> Award a badge
                        </Button>
                    ) : undefined
                }
            >
                {awards.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {awards.map((a) => {
                            const badge = state.badges.find((b) => b.id === a.badgeId);
                            if (!badge) return null;
                            return (
                                <li key={a.id} className="relative">
                                    <BadgeChip badge={badge} level={a.level} earned note={a.note} when={a.awardedAt} />
                                    {manage && (
                                        <button type="button" onClick={() => setRemoveAward(a)} aria-label={`Take the ${badge.name} badge back from ${first}`} className="absolute right-2 top-2 text-2xs font-semibold text-caption hover:text-danger-ink">
                                            Take it back
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <EmptyState title={`${first} hasn't earned a badge yet`} body="Award the first one and it lands on their screen straight away." />
                )}
            </Section>

            {track && (
                <Section title={`${track.virtue} · this month`}>
                    <Card>
                        <p className="font-display text-2xl leading-7">{track.challenges[todaysIndex] ?? "—"}</p>
                        <p className="mt-1 text-sm text-muted">
                            Value · {track.valueLabel} · {logsFor(state, track.id, memberId).length} of {track.challenges.length} done this month
                        </p>
                        <ProgressBar value={trackPct(state, track, memberId, sp.today)} className="mt-3" label="Character track" />
                        {doneToday?.reflection && <p className="mt-3 rounded-md bg-page px-4 py-3 text-md leading-6 text-muted">&ldquo;{doneToday.reflection}&rdquo;</p>}
                        {!doneToday && <p className="mt-3 text-sm text-caption">{first} hasn&rsquo;t ticked today&rsquo;s challenge yet.</p>}
                    </Card>
                </Section>
            )}

            {/* ---- Dialogs ------------------------------------------------- */}
            {manage && (
                <>
                    <SubjectDialog
                        open={subjectOpen}
                        onClose={() => setSubjectOpen(false)}
                        kids={kids}
                        subject={editSubject}
                        defaultChildId={memberId}
                        onSave={async (input) => void (await mutate((r) => (editSubject ? r.updateSubject(editSubject.id, input) : r.addSubject(input))))}
                    />
                    <UnitDialog open={unitOpen} onClose={() => setUnitOpen(false)} subjects={subjects} defaultSubjectId={subjectFilter || subjects[0]?.id} onSave={async (input) => void (await mutate((r) => r.addUnit(input)))} />
                    <AssignmentDialog
                        open={assignOpen}
                        onClose={() => {
                            setAssignOpen(false);
                            setAssignUnitId(undefined);
                        }}
                        units={state.units.filter((u) => subjects.some((s) => s.id === u.subjectId))}
                        subjects={subjects}
                        defaultUnitId={assignUnitId}
                        defaultDue={sp.today}
                        onSave={async (input) => void (await mutate((r) => r.addAssignment(input)))}
                    />
                    <GenerateUnitDialog
                        open={generateOpen}
                        onClose={() => setGenerateOpen(false)}
                        subjects={subjects}
                        child={child}
                        defaultSubjectId={subjectFilter || subjects[0]?.id}
                        onCreate={async (subjectId, unit, dueFrom) => {
                            await mutate(async (r) => {
                                const created = await r.addUnit({ subjectId, title: unit.title, summary: unit.summary });
                                for (let i = 0; i < unit.assignments.length; i++) {
                                    const a = unit.assignments[i];
                                    const d = new Date(`${dueFrom}T00:00:00`);
                                    d.setDate(d.getDate() + i * 7);
                                    await r.addAssignment({ unitId: created.id, title: a.title, instructions: a.instructions, dueDate: d.toISOString().slice(0, 10), sprouts: 15 });
                                }
                            });
                            toast("Unit created", "success");
                        }}
                    />
                    <MilestoneDialog
                        open={milestoneOpen}
                        onClose={() => setMilestoneOpen(false)}
                        kids={kids}
                        milestone={editMilestone}
                        defaultChildId={memberId}
                        onSave={async (input) => void (await mutate((r) => (editMilestone ? r.updateMilestone(editMilestone.id, { title: input.title, note: input.note, progressPct: input.progressPct }) : r.addMilestone(input))))}
                    />
                    <AwardDialog
                        open={awardOpen}
                        onClose={() => setAwardOpen(false)}
                        badges={state.badges}
                        kids={kids}
                        defaultChildId={memberId}
                        onAward={async (badgeId, mId, level, note) => {
                            await mutate((r) => r.awardBadge(badgeId, mId, level, note));
                            const badge = state.badges.find((b) => b.id === badgeId);
                            if (badge) {
                                const parents = sp.members.filter((m) => m.role === "parent").map((m) => m.id);
                                await sp.mutateCore(async (core) => {
                                    await core.notify({ memberId: mId, kind: "celebrate", title: `You earned ${badge.name}!`, body: note || `${badge.virtueOrSkill} · ${level}`, href: `${BASE}/${mId}` });
                                    for (const p of parents) {
                                        if (p === sp.me.id) continue;
                                        await core.notify({ memberId: p, kind: "celebrate", title: `${first} earned ${badge.name}`, body: note || `${badge.virtueOrSkill} · ${level}`, href: `${BASE}/${mId}` });
                                    }
                                });
                            }
                            toast("Badge awarded 🎉", "success");
                        }}
                    />
                    <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} state={state} child={child} space={sp.space} terms={terms} defaultTerm={term} />
                    <AskDialog open={askOpen} onClose={() => setAskOpen(false)} state={state} child={child} />
                    <Confirm
                        open={Boolean(removeSubject)}
                        title={`Remove ${removeSubject?.name ?? "this subject"}?`}
                        body="Its units, work, submissions and marks go with it. This cannot be undone."
                        confirmLabel="Remove it"
                        danger
                        onConfirm={async () => {
                            if (removeSubject) await mutate((r) => r.removeSubject(removeSubject.id));
                        }}
                        onClose={() => setRemoveSubject(null)}
                    />
                    {/* One award, undone — without deleting the badge for every child who holds it. */}
                    <Confirm
                        open={Boolean(removeAward)}
                        title={`Take back ${revoking?.name ?? "this badge"}?`}
                        body={`It leaves ${first}'s badges. The badge itself stays, and you can award it again whenever it is earned.`}
                        confirmLabel="Take it back"
                        danger
                        onConfirm={async () => {
                            if (!removeAward) return;
                            await mutate((r) => r.revokeAward(removeAward.id));
                            toast("Taken back");
                        }}
                        onClose={() => setRemoveAward(null)}
                    />
                </>
            )}

        </div>
    );
}
