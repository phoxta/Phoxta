import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Award, BookPlus, CalendarDays, Download, PartyPopper, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { pct as pctOf, shortDate } from "@/lib/format";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, EmptyModule, MemberAvatar, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { Button, Card, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import curriculaModule from "../module";
import {
    BASE,
    assignmentsFor,
    awaitingGrade,
    awardCount,
    challengeIndexFor,
    currentTerm,
    dueThisWeek,
    dueToday,
    isDone,
    logFor,
    logsFor,
    milestonesToCelebrate,
    monthOf,
    overdueFor,
    subjectById,
    subjectsFor,
    termAverage,
    trackFor,
    trackPct,
} from "../derive";
import type { Badge, BadgeAward, ImportableUnit, NewGrade } from "../types";
import { AssignmentRow, BadgeChip } from "../components/pieces";
import { AwardDialog, BadgeDialog, ImportUnitDialog, SubjectDialog } from "../components/dialogs";
import { GradeDialog } from "../components/GradeDialog";
import { TrackDialog } from "../components/TrackDialog";

/**
 * The curriculum, from a parent's chair.
 *
 * Four things a parent actually does here, in the order they do them: look at
 * the children, mark what has been handed in, hand out a badge someone has
 * earned, and keep the month's character track alive. A child never lands on
 * this page — they are sent straight to their own, which is the only shelf
 * they can see anyway.
 */

type Tab = "children" | "marking" | "badges" | "character";

const TABS: Array<{ v: Tab; label: string }> = [
    { v: "children", label: "The children" },
    { v: "marking", label: "To mark" },
    { v: "badges", label: "Badges" },
    { v: "character", label: "Character" },
];

export default function CurriculaPage() {
    const { state, mutate, loading, error } = useModule(curriculaModule);
    const sp = useSpace();
    const { toast } = useToast();
    const books = useModuleState<{ units?: ImportableUnit[] }>("books");
    const [tab, setTab] = useState<Tab>("children");
    const [subjectOpen, setSubjectOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [badgeOpen, setBadgeOpen] = useState(false);
    const [awardOpen, setAwardOpen] = useState(false);
    const [awardBadgeId, setAwardBadgeId] = useState<string | undefined>(undefined);
    const [trackOpen, setTrackOpen] = useState(false);
    const [gradeId, setGradeId] = useState<string | null>(null);
    const [removeBadge, setRemoveBadge] = useState<Badge | null>(null);
    const [removeAward, setRemoveAward] = useState<BadgeAward | null>(null);

    const manage = sp.can("curricula.manage");
    const kids = useMemo(() => sp.members.filter((m) => m.role === "child"), [sp.members]);

    if (sp.role === "child") return <Navigate to={`${BASE}/${sp.me.id}`} replace />;
    if (loading && !state) return <p className="text-md text-muted">Opening the register…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    if (!manage) {
        // A guest is not someone with a missing permission — school work is simply not
        // theirs, and Family → Permissions would never grant it. Say so in their words.
        const guest = sp.role === "guest";
        return (
            <div>
                <PageTitle title="Children's curricula" sub="Subjects, work and marks for each child." area="grow" />
                <EmptyModule
                    title={guest ? "Not shared with you" : "This is the family's school record"}
                    body={guest ? "School work stays inside the family. What they have shared with you is on your home screen." : "Only a parent can open it. If you should be able to see a child's work, ask a parent to widen your access in Family → Permissions."}
                    action={
                        guest ? (
                            <Link to="/" className="text-sm font-semibold text-brand underline">
                                Back to your home
                            </Link>
                        ) : undefined
                    }
                />
            </div>
        );
    }

    const month = monthOf(sp.today);
    const track = trackFor(state, sp.today);
    const waiting = awaitingGrade(state);
    const celebrate = milestonesToCelebrate(
        state,
        kids.map((k) => k.id),
    );
    const importable = books?.units ?? [];
    const revokingBadge = removeAward ? state.badges.find((b) => b.id === removeAward.badgeId) : undefined;
    const revokingFrom = removeAward ? sp.members.find((m) => m.id === removeAward.memberId)?.name.split(" ")[0] : undefined;
    const grading = gradeId ? state.assignments.find((a) => a.id === gradeId) : undefined;
    const gradingChild = grading ? sp.members.find((m) => m.id === grading.childMemberId) : undefined;

    const weekCount = kids.reduce((n, k) => n + dueThisWeek(state, k.id, sp.today).length, 0);
    const overdueCount = kids.reduce((n, k) => n + overdueFor(state, k.id, sp.today).length, 0);
    const awardsThisMonth = state.awards.filter((a) => a.awardedAt.slice(0, 7) === month).length;

    const notifyAward = async (memberId: string, badge: Badge, level: string, note: string) => {
        const parents = sp.members.filter((m) => m.role === "parent").map((m) => m.id);
        const child = sp.members.find((m) => m.id === memberId);
        const title = `${child?.name.split(" ")[0] ?? "They"} earned ${badge.name}`;
        await sp.mutateCore(async (core) => {
            await core.notify({ memberId, kind: "celebrate", title: `You earned ${badge.name}!`, body: note || `${badge.virtueOrSkill} · ${level}`, href: `${BASE}/${memberId}` });
            for (const p of parents) {
                if (p === sp.me.id) continue;
                await core.notify({ memberId: p, kind: "celebrate", title, body: note || `${badge.virtueOrSkill} · ${level}`, href: `${BASE}/${memberId}` });
            }
        });
    };

    const doAward = async (badgeId: string, memberId: string, level: string, note: string) => {
        await mutate((r) => r.awardBadge(badgeId, memberId, level, note));
        const badge = state.badges.find((b) => b.id === badgeId);
        if (badge) await notifyAward(memberId, badge, level, note);
        toast("Badge awarded — it's on their screen now", "success");
    };

    const doGrade = async (input: NewGrade) => {
        if (!grading) return;
        await mutate((r) => r.gradeAssignment(grading.id, input));
        toast(input.visibleToChild ? "Marked, and released to them" : "Marked — kept with you for now");
    };

    return (
        <div>
            <PageTitle
                title="Children's curricula"
                sub="Subjects, units and work for each child — with the marks, the badges, the milestones and this month's character track."
                area="grow"
                actions={
                    <>
                        <Button variant="outline" size="md" onClick={() => setImportOpen(true)}>
                            <Download size={15} aria-hidden="true" /> Import from the Library
                        </Button>
                        <Button size="md" onClick={() => setSubjectOpen(true)}>
                            <Plus size={15} aria-hidden="true" /> New subject
                        </Button>
                    </>
                }
            />

            <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Due this week" value={weekCount} sub={`${kids.length} children`} />
                <Stat label="To mark" value={waiting.length} sub={waiting.length ? "Handed in and waiting" : "Nothing waiting"} tone={waiting.length ? "warn" : "neutral"} />
                <Stat label="Overdue" value={overdueCount} sub={overdueCount ? "Worth a conversation" : "Nothing late"} tone={overdueCount ? "danger" : "ok"} />
                <Stat label="Badges this month" value={awardsThisMonth} sub={track ? `${track.virtue} is this month's virtue` : "No track set"} tone="grow" />
            </div>

            {celebrate.length > 0 && (
                <ul className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                    {celebrate.map((m) => {
                        const child = sp.members.find((x) => x.id === m.memberId);
                        return (
                            <li key={m.id}>
                                <div className="flex items-start gap-3 rounded-xl bg-live-soft px-4 py-4 text-live-ink">
                                    <PartyPopper size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-base font-semibold">
                                            {child?.name.split(" ")[0] ?? "Someone"} reached {m.title}
                                        </p>
                                        <p className="mt-0.5 text-sm leading-5">A hundred per cent. Mark it together before the week runs away — a photo, a phone call to Ibadan, something.</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                onClick={async () => {
                                                    await mutate((r) => r.celebrateMilestone(m.id));
                                                    toast("Celebrated 🎉", "success");
                                                }}
                                            >
                                                We celebrated it
                                            </Button>
                                            <Link to={`${BASE}/${m.memberId}`} className="inline-flex h-7 items-center rounded-full bg-card px-3 text-xs font-semibold">
                                                Open {child?.name.split(" ")[0] ?? "them"}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto" role="tablist" aria-label="Curriculum views">
                {TABS.map((t) => (
                    <button
                        key={t.v}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.v}
                        onClick={() => setTab(t.v)}
                        className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors", tab === t.v ? "bg-ink text-white" : "bg-card text-muted hover:text-ink")}
                    >
                        {t.label}
                        {t.v === "marking" && waiting.length > 0 ? ` · ${waiting.length}` : ""}
                    </button>
                ))}
            </div>

            {/* ---- The children ------------------------------------------- */}
            {tab === "children" && (
                <>
                    {kids.length === 0 ? (
                        <EmptyModule title="No children in this family yet" body="Add them in Family → People and their subjects will live here." />
                    ) : (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
                            {kids.map((kid) => {
                                const term = currentTerm(state, kid.id);
                                const avg = termAverage(state, kid.id, term);
                                const subjects = subjectsFor(state, kid.id);
                                const today = dueToday(state, kid.id, sp.today);
                                const week = dueThisWeek(state, kid.id, sp.today);
                                const late = overdueFor(state, kid.id, sp.today);
                                const done = assignmentsFor(state, kid.id).filter(isDone).length;
                                const all = assignmentsFor(state, kid.id).length;
                                return (
                                    <li key={kid.id}>
                                        <Card className="flex h-full flex-col">
                                            <div className="flex items-start gap-4">
                                                <MemberAvatar member={kid} size="lg" />
                                                <div className="min-w-0 flex-1">
                                                    <Link to={`${BASE}/${kid.id}`} className="text-xl font-semibold hover:underline">
                                                        {kid.name}
                                                    </Link>
                                                    <p className="text-sm text-muted">
                                                        {term || "No term set"} · {subjects.length} subject{subjects.length === 1 ? "" : "s"}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {late.length > 0 && <Tag tone="danger">{late.length} overdue</Tag>}
                                                        {today.length > 0 && <Tag tone="warn">{today.length} due today</Tag>}
                                                        <Tag tone="grow">{awardCount(state, kid.id)} badges</Tag>
                                                    </div>
                                                </div>
                                                {avg.graded > 0 && (
                                                    <Ring pct={avg.avg} size={64} stroke={3} label={`${kid.name}: ${avg.avg}% average`}>
                                                        <span className="text-sm font-semibold tabular-nums">{avg.avg}%</span>
                                                    </Ring>
                                                )}
                                            </div>

                                            <div className="mt-4">
                                                <div className="mb-1.5 flex items-center justify-between text-xs text-caption">
                                                    <span>Work done this term</span>
                                                    <span className="tabular-nums">
                                                        {done} of {all}
                                                    </span>
                                                </div>
                                                <ProgressBar value={pctOf(done, all)} label={`${kid.name} work done`} />
                                            </div>

                                            <div className="mt-4 flex-1">
                                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-caption">This week</p>
                                                {week.length ? (
                                                    <ul className="-mx-3">
                                                        {week.slice(0, 4).map((a) => (
                                                            <AssignmentRow key={a.id} a={a} subject={subjectById(state, a.subjectId)} to={`${BASE}/${kid.id}/assignments/${a.id}`} />
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="rounded-md bg-page px-3 py-3 text-sm text-muted">Nothing set for this week yet.</p>
                                                )}
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                                                <Link to={`${BASE}/${kid.id}`} className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white">
                                                    Open the term
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="md"
                                                    onClick={() => {
                                                        setAwardBadgeId(undefined);
                                                        setAwardOpen(true);
                                                    }}
                                                >
                                                    <Award size={15} aria-hidden="true" /> Award a badge
                                                </Button>
                                            </div>
                                        </Card>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}

            {/* ---- To mark ------------------------------------------------- */}
            {tab === "marking" && (
                <>
                    <Section title="Handed in, waiting for you">
                        {waiting.length ? (
                            <ul className="rounded-xl bg-card p-1.5">
                                {waiting.map((a) => {
                                    const child = sp.members.find((m) => m.id === a.childMemberId);
                                    return (
                                        <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-page">
                                            <MemberAvatar memberId={a.childMemberId} size="xs" />
                                            <span className="min-w-0 flex-1">
                                                <Link to={`${BASE}/${a.childMemberId}/assignments/${a.id}`} className="block truncate text-md font-semibold hover:underline">
                                                    {a.title}
                                                </Link>
                                                <span className="block text-xs text-caption">
                                                    {child?.name.split(" ")[0]} · {subjectById(state, a.subjectId)?.name ?? "—"} · due {shortDate(a.dueDate)}
                                                </span>
                                            </span>
                                            <Button size="md" onClick={() => setGradeId(a.id)}>
                                                Mark it
                                            </Button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <EmptyState icon={<CalendarDays size={20} aria-hidden="true" />} title="Nothing waiting to be marked" body="When one of the children hands something in, it lands here — and on your Today." />
                        )}
                    </Section>

                    <Section title="Recently marked">
                        {state.grades.length ? (
                            <ul className="rounded-xl bg-card p-1.5">
                                {[...state.grades]
                                    .sort((a, b) => b.gradedAt.localeCompare(a.gradedAt))
                                    .slice(0, 8)
                                    .map((g) => {
                                        const a = state.assignments.find((x) => x.id === g.assignmentId);
                                        if (!a) return null;
                                        return (
                                            <li key={g.assignmentId} className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2.5">
                                                <MemberAvatar memberId={a.childMemberId} size="xs" />
                                                <span className="min-w-0 flex-1">
                                                    <Link to={`${BASE}/${a.childMemberId}/assignments/${a.id}`} className="block truncate text-md font-medium hover:underline">
                                                        {a.title}
                                                    </Link>
                                                    <span className="block text-xs text-caption">
                                                        {g.score}% · {g.letter} · marked {shortDate(g.gradedAt)}
                                                    </span>
                                                </span>
                                                {g.visibleToChild ? (
                                                    <Tag tone="ok">Released</Tag>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={async () => {
                                                            await mutate((r) => r.setGradeVisibility(g.assignmentId, true));
                                                            toast("They can see it now");
                                                        }}
                                                    >
                                                        Release the mark
                                                    </Button>
                                                )}
                                            </li>
                                        );
                                    })}
                            </ul>
                        ) : (
                            <EmptyState title="No marks yet" body="Mark a piece of work and the term average updates the moment you save." />
                        )}
                    </Section>
                </>
            )}

            {/* ---- Badges -------------------------------------------------- */}
            {tab === "badges" && (
                <>
                    <Section
                        title="What can be earned"
                        action={
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setBadgeOpen(true)}>
                                    <Plus size={14} aria-hidden="true" /> New badge
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setAwardBadgeId(undefined);
                                        setAwardOpen(true);
                                    }}
                                >
                                    <Award size={14} aria-hidden="true" /> Award one
                                </Button>
                            </div>
                        }
                    >
                        {state.badges.length ? (
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {state.badges.map((b) => (
                                    <li key={b.id} className="relative">
                                        <BadgeChip
                                            badge={b}
                                            earned
                                            onClick={() => {
                                                setAwardBadgeId(b.id);
                                                setAwardOpen(true);
                                            }}
                                        />
                                        <button type="button" onClick={() => setRemoveBadge(b)} aria-label={`Remove the ${b.name} badge`} className="absolute right-2 top-2 text-2xs font-semibold text-caption hover:text-danger-ink">
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState icon={<Award size={20} aria-hidden="true" />} title="No badges yet" body="A badge with real criteria is worth ten stickers. Write the first one." action={<Button onClick={() => setBadgeOpen(true)}>New badge</Button>} />
                        )}
                    </Section>

                    <Section title="Recently awarded">
                        {state.awards.length ? (
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                                {[...state.awards]
                                    .sort((a, b) => b.awardedAt.localeCompare(a.awardedAt))
                                    .slice(0, 6)
                                    .map((a) => {
                                        const badge = state.badges.find((b) => b.id === a.badgeId);
                                        if (!badge) return null;
                                        return (
                                            <li key={a.id} className="flex items-center gap-3 rounded-lg bg-card p-3">
                                                <MemberAvatar memberId={a.memberId} size="sm" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-md font-semibold">
                                                        {badge.icon} {badge.name} · {a.level}
                                                    </span>
                                                    <span className="clamp-2 block text-xs leading-4 text-caption">{a.note || badge.criteria}</span>
                                                </span>
                                                <span className="shrink-0 text-right">
                                                    <span className="block text-xs text-caption">{shortDate(a.awardedAt)}</span>
                                                    {/* One award undone, without deleting the badge for everyone who holds it. */}
                                                    <button type="button" onClick={() => setRemoveAward(a)} aria-label={`Take the ${badge.name} badge back`} className="mt-0.5 text-2xs font-semibold text-caption hover:text-danger-ink">
                                                        Take it back
                                                    </button>
                                                </span>
                                            </li>
                                        );
                                    })}
                            </ul>
                        ) : (
                            <EmptyState title="Nothing awarded yet" body="Award the first one and it lands on the child's screen, their profile and the family timeline." />
                        )}
                    </Section>
                </>
            )}

            {/* ---- Character ----------------------------------------------- */}
            {tab === "character" && (
                <Section
                    title={track ? `${track.virtue} · this month` : "This month's character track"}
                    action={
                        <Button variant="outline" size="sm" onClick={() => setTrackOpen(true)}>
                            <Sparkles size={14} aria-hidden="true" /> {track ? "Edit the month" : "Set the month"}
                        </Button>
                    }
                >
                    {track ? (
                        <div className="flex flex-col gap-4">
                            <Card>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Tag tone="grow">Value · {track.valueLabel}</Tag>
                                    <Tag tone="neutral">{track.sprouts} Sprouts a day</Tag>
                                    <Tag tone="neutral">{track.challenges.length} challenges</Tag>
                                </div>
                                {track.intro && <p className="mt-3 text-base leading-7">{track.intro}</p>}
                                <div className="mt-4 rounded-lg bg-grow-soft px-4 py-4">
                                    <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-grow-ink">Today&rsquo;s challenge</p>
                                    <p className="mt-1 font-display text-2xl leading-7 text-grow-ink">{track.challenges[challengeIndexFor(track, sp.today)] ?? "—"}</p>
                                </div>
                            </Card>

                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
                                {kids.map((kid) => {
                                    const done = Boolean(logFor(state, track.id, kid.id, sp.today));
                                    const p = trackPct(state, track, kid.id, sp.today);
                                    const entries = logsFor(state, track.id, kid.id);
                                    return (
                                        <li key={kid.id}>
                                            <Card className="h-full">
                                                <div className="flex items-center gap-3">
                                                    <MemberAvatar member={kid} size="sm" />
                                                    <span className="min-w-0 flex-1 truncate text-base font-semibold">{kid.name.split(" ")[0]}</span>
                                                    {done ? <Tag tone="ok">Done today</Tag> : <Tag tone="neutral">Not yet</Tag>}
                                                </div>
                                                <ProgressBar value={p} className="mt-3" label={`${kid.name} character track`} />
                                                <p className="mt-2 text-xs text-caption">
                                                    {entries.length} of {track.challenges.length} this month
                                                </p>
                                                {entries[0]?.reflection && <p className="mt-3 rounded-md bg-page px-3 py-2.5 text-sm leading-5 text-muted">&ldquo;{entries[0].reflection}&rdquo;</p>}
                                            </Card>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : (
                        <EmptyState
                            icon={<Sparkles size={20} aria-hidden="true" />}
                            title="No track for this month"
                            body="Pick one of your family's values and give the month thirty small challenges. The companion will draft it; you keep every line."
                            action={<Button onClick={() => setTrackOpen(true)}>Set the month</Button>}
                        />
                    )}
                </Section>
            )}

            {/* ---- Dialogs ------------------------------------------------- */}
            <SubjectDialog open={subjectOpen} onClose={() => setSubjectOpen(false)} kids={kids} onSave={async (input) => void (await mutate((r) => r.addSubject(input)))} />
            <ImportUnitDialog
                open={importOpen}
                onClose={() => setImportOpen(false)}
                available={importable}
                subjects={state.subjects.filter((s) => !s.archived)}
                today={sp.today}
                onImport={async (subjectId, unit, dueFrom) => {
                    await mutate((r) => r.importUnit(subjectId, unit, dueFrom));
                    toast("Imported — the unit still links back to the course", "success");
                }}
            />
            <BadgeDialog open={badgeOpen} onClose={() => setBadgeOpen(false)} subjects={state.subjects} onSave={async (input) => void (await mutate((r) => r.addBadge(input)))} />
            <AwardDialog open={awardOpen} onClose={() => setAwardOpen(false)} badges={state.badges} kids={kids} defaultBadgeId={awardBadgeId} onAward={doAward} />
            <TrackDialog open={trackOpen} onClose={() => setTrackOpen(false)} month={month} values={sp.space.values} track={track} onSave={async (input) => void (await mutate((r) => (track ? r.updateTrack(track.id, input) : r.addTrack(input))))} />
            {grading && (
                <GradeDialog
                    open={Boolean(gradeId)}
                    onClose={() => setGradeId(null)}
                    assignment={grading}
                    subject={subjectById(state, grading.subjectId)}
                    grade={state.grades.find((g) => g.assignmentId === grading.id)}
                    submission={state.submissions.find((s) => s.assignmentId === grading.id)}
                    childName={gradingChild?.name.split(" ")[0] ?? "them"}
                    onSave={doGrade}
                />
            )}
            <Confirm
                open={Boolean(removeBadge)}
                title={`Remove the ${removeBadge?.name ?? ""} badge?`}
                body="Every award of it goes too. The children who earned it will no longer see it on their shelf."
                confirmLabel="Remove it"
                danger
                onConfirm={async () => {
                    if (removeBadge) await mutate((r) => r.removeBadge(removeBadge.id));
                }}
                onClose={() => setRemoveBadge(null)}
            />

            <Confirm
                open={Boolean(removeAward)}
                title={`Take back ${revokingBadge?.name ?? "this badge"}?`}
                body={`It leaves ${revokingFrom ? `${revokingFrom}'s` : "their"} badges. The badge itself stays, and you can award it again whenever it is earned.`}
                confirmLabel="Take it back"
                danger
                onConfirm={async () => {
                    if (!removeAward) return;
                    await mutate((r) => r.revokeAward(removeAward.id));
                    toast("Taken back");
                }}
                onClose={() => setRemoveAward(null)}
            />

            {kids.length > 0 && state.subjects.length === 0 && (
                <p className="mt-6 flex items-center gap-2 text-sm text-caption">
                    <BookPlus size={14} aria-hidden="true" /> Start with one subject for one child — the rest of this page fills itself in.
                </p>
            )}
        </div>
    );
}
