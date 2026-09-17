import { useState } from "react";
import { Link } from "react-router-dom";
import { Archive, BookOpen, Brain, Heart, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, EmptyModule, MemberAvatar, MoreLink, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Button, Card, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import bibleModule from "../module";
import {
    BASE,
    activePlan,
    answeredPrayers,
    dueVerses,
    howToPrayThisWeek,
    myStudies,
    nextVerseDate,
    openPrayers,
    planDayNumber,
    prayerStreak,
    recentlyAnswered,
    scriptureFor,
    versesOf,
} from "../derive";
import { PrayerCard, ScriptureCard, StreakPill, StudyCard } from "../components/pieces";
import { PlanDialog } from "../components/PlanDialog";
import { PrayerDialog } from "../components/PrayerDialog";
import { StudyDialog } from "../components/StudyDialog";
import type { BiblePlan, NewPlan, NewPrayer, NewStudy } from "../types";

/**
 * The front door: what the house is reading today, what everyone is on, and
 * the wall.
 *
 * Three products live behind one route, because three people arrive here.
 * A parent gets the household view. A child gets today's verse in big type,
 * their verses to practise and their own study. A guest gets the prayer wall
 * they were granted and nothing else — or, when nothing was granted, a page
 * that says so rather than an empty list that implies there is more.
 */

export default function BiblePage() {
    const { state, mutate, loading, error } = useModule(bibleModule);
    const { me, role, can, members, today } = useSpace();
    const { toast } = useToast();
    const [askOpen, setAskOpen] = useState(false);
    const [studyOpen, setStudyOpen] = useState(false);
    const [planOpen, setPlanOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<BiblePlan | undefined>(undefined);
    const [retiring, setRetiring] = useState<BiblePlan | null>(null);
    const [removingPlan, setRemovingPlan] = useState<BiblePlan | null>(null);

    const manage = can("bible.manage");
    const child = role === "child";
    const guest = role === "guest";

    if (loading && !state) return <p className="text-md text-muted">Opening the Bible…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const verse = state.verses[0] ?? scriptureFor(state, today);
    const plan = activePlan(state);
    const open = openPrayers(state).filter((p) => p.visibility !== "private");
    const streak = prayerStreak(state, me.id, today);
    const due = dueVerses(state, me.id, today);
    const mine = myStudies(state, me.id);
    const library = state.studies.filter((s) => !s.assigneeMemberIds.includes(me.id));

    const addPrayer = async (input: NewPrayer): Promise<void> => {
        await mutate((r) => r.addPrayer(input));
        toast("On the wall.", "success");
    };
    const addStudy = async (input: NewStudy): Promise<void> => {
        await mutate((r) => r.addStudy(input));
        toast("Study created.", "success");
    };
    const togglePrayed = async (prayerId: string, on: boolean): Promise<void> => {
        await mutate((r) => r.togglePrayed(prayerId, me.id, on));
    };
    /** Starting a plan makes it the one the whole house reads (AC5); editing only touches its own fields. */
    const savePlan = async (input: NewPlan): Promise<void> => {
        if (editingPlan) {
            const id = editingPlan.id;
            await mutate((r) => r.updatePlan(id, { title: input.title, startDate: input.startDate, translation: input.translation, assigneeMemberIds: input.assigneeMemberIds }));
            toast("Plan updated.", "success");
        } else {
            await mutate((r) => r.addPlan(input));
            toast(`Started — day one is ${shortDate(input.startDate)}.`, "success");
        }
    };

    // ---- Guest ------------------------------------------------------------
    if (guest) {
        const granted = state.wallGuestIds.includes(me.id);
        const wall = howToPrayThisWeek(state);
        const ours = state.prayers.filter((p) => p.authorMemberId === me.id);
        if (!granted) {
            return (
                <div>
                    <PageTitle title="Prayer" sub="Guests see what a family chooses to share, one named thing at a time." area="grow" />
                    <EmptyModule
                        title="The prayer wall hasn't been shared with you"
                        body="When the family grants you the wall, this page will hold what they have asked guests to pray for — and only that. Nothing is being hidden behind this screen; there is nothing here for you yet."
                    />
                </div>
            );
        }
        return (
            <div>
                <PageTitle
                    title="Praying with the family"
                    sub="What they have asked guests to carry this week. You can pray, and you can add a request of your own."
                    area="grow"
                    actions={
                        <Button onClick={() => setAskOpen(true)}>
                            <Plus size={16} aria-hidden="true" /> Ask for prayer
                        </Button>
                    }
                />
                {verse && <ScriptureCard verse={verse} planTitle={plan?.title} />}

                <Section className="mt-8" title="How to pray for us this week" action={<MoreLink to={`${BASE}/prayer`}>The wall</MoreLink>}>
                    {wall.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                            {wall.map((p) => (
                                <PrayerCard key={p.id} state={state} prayer={p} meId={me.id} onPrayed={(on) => togglePrayed(p.id, on)} />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState icon={<Heart size={20} aria-hidden="true" />} title="Nothing shared with guests this week" body="The family hasn't marked anything for guests yet." />
                    )}
                </Section>

                <Section title="Your requests">
                    {ours.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                            {ours.map((p) => (
                                <PrayerCard key={p.id} state={state} prayer={p} meId={me.id} />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState title="You haven't asked for anything yet" body="Whatever you add goes on the wall with your name on it." action={<Button onClick={() => setAskOpen(true)}>Ask for prayer</Button>} />
                    )}
                </Section>

                <PrayerDialog open={askOpen} onClose={() => setAskOpen(false)} onSave={addPrayer} role={role} />
            </div>
        );
    }

    // ---- Child ------------------------------------------------------------
    if (child) {
        const wall = open.slice(0, 4);
        return (
            <div>
                <PageTitle title="God and us" sub="Today's verse, the verses you're learning, and what we're praying for." area="grow" />
                {verse && <ScriptureCard verse={verse} planTitle={plan?.title} big />}

                <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <Link to={`${BASE}/verses`} className="flex items-start gap-3 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                        <span className="text-6xl leading-none" aria-hidden="true">
                            🧠
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[17px] font-semibold">{due.length ? `${due.length} verse${due.length === 1 ? "" : "s"} to practise` : "Nothing to practise today"}</span>
                            <span className="mt-0.5 block text-md leading-5 text-muted">
                                {due.length ? due.map((d) => d.verse.reference).join(" · ") : nextVerseDate(state, me.id) ? `Your next card is on ${shortDate(nextVerseDate(state, me.id) as string)}.` : "Ask a parent to add one."}
                            </span>
                        </span>
                    </Link>
                    <button type="button" onClick={() => setAskOpen(true)} className="flex items-start gap-3 rounded-xl bg-card p-4 text-left transition-shadow hover:shadow-hover">
                        <span className="text-6xl leading-none" aria-hidden="true">
                            🙏
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[17px] font-semibold">Ask for prayer</span>
                            <span className="mt-0.5 block text-md leading-5 text-muted">Tell the family what you'd like God to help with.</span>
                        </span>
                    </button>
                </div>

                <Section className="mt-8" title="Your study">
                    {mine.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                            {mine.map((s) => (
                                <StudyCard key={s.id} state={state} study={s} memberId={me.id} />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState icon={<BookOpen size={20} aria-hidden="true" />} title="No study for you just yet" body="A parent will give you one when it's time." />
                    )}
                </Section>

                <Section title="What we're praying for" action={<MoreLink to={`${BASE}/prayer`}>See the wall</MoreLink>}>
                    {wall.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                            {wall.map((p) => (
                                <PrayerCard key={p.id} state={state} prayer={p} meId={me.id} onPrayed={(on) => togglePrayed(p.id, on)} compact />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState title="The wall is quiet" body="Nothing to pray for right now." />
                    )}
                </Section>

                <PrayerDialog open={askOpen} onClose={() => setAskOpen(false)} onSave={addPrayer} role={role} />
            </div>
        );
    }

    // ---- Parent -----------------------------------------------------------
    const answeredThisYear = answeredPrayers(state).filter((p) => (p.answeredAt ?? "").slice(0, 4) === today.slice(0, 4));
    const dayNo = plan ? planDayNumber(plan, today) : 0;
    const planTotal = plan ? state.planDays.filter((d) => d.planId === plan.id).length : 0;
    const ahead = plan
        ? state.planDays
              .filter((d) => d.planId === plan.id && d.day > dayNo && d.day <= dayNo + 4)
              .sort((a, b) => a.day - b.day)
        : [];
    const familyDue = members.filter((m) => m.role !== "guest").map((m) => ({ member: m, due: dueVerses(state, m.id, today), total: versesOf(state, m.id).length })).filter((r) => r.total > 0);

    return (
        <div>
            <PageTitle
                title="Bible, prayer & discipleship"
                sub="What the house is reading today, the studies we're on, the verses we're learning, and the wall where we ask — and record what God has done."
                area="grow"
                actions={
                    <>
                        <Button variant="outline" onClick={() => setAskOpen(true)}>
                            <Plus size={16} aria-hidden="true" /> Ask for prayer
                        </Button>
                        {manage && <Button onClick={() => setStudyOpen(true)}>New study</Button>}
                    </>
                }
            />

            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[1.4fr_1fr]">
                {verse ? <ScriptureCard verse={verse} planTitle={plan?.title} big action={<Link to={`${BASE}/verses`} className="inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-sm font-semibold">Memory verses</Link>} /> : null}
                <div className="grid grid-cols-2 gap-3 content-start">
                    <Stat label="Reading plan" value={plan ? `Day ${dayNo}` : "—"} sub={plan ? `${plan.title} · ${planTotal} days` : "No plan running"} tone="grow" />
                    <Stat label="Cards due" value={familyDue.reduce((n, r) => n + r.due.length, 0)} sub="Across the family, from 07:00" tone={familyDue.some((r) => r.due.length) ? "warn" : "neutral"} />
                    <Stat label="Open requests" value={open.length} sub="On the wall" />
                    <Stat label="Answered" value={answeredThisYear.length} sub={`So far in ${today.slice(0, 4)}`} tone="ok" />
                </div>
            </div>

            <Section
                className="mt-8"
                title="The plan we're on"
                action={
                    manage && plan ? (
                        <Button size="sm" variant="outline" onClick={() => { setEditingPlan(undefined); setPlanOpen(true); }}>
                            <Plus size={14} aria-hidden="true" /> New plan
                        </Button>
                    ) : undefined
                }
            >
                {plan ? (
                    <Card>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-semibold">{plan.title}</h3>
                                <p className="mt-0.5 text-sm text-muted">
                                    Day {dayNo} of {planTotal} · {plan.translation} · started {shortDate(plan.startDate)}
                                </p>
                            </div>
                            <Tag tone="grow">{plan.assigneeMemberIds.length === 0 || plan.assigneeMemberIds.length >= members.filter((m) => m.role !== "guest").length ? "Everyone" : `${plan.assigneeMemberIds.length} of us`}</Tag>
                        </div>
                        <ProgressBar className="mt-3" value={planTotal ? (dayNo / planTotal) * 100 : 0} label={`${plan.title} progress`} />
                        {dayNo > planTotal && planTotal > 0 && (
                            <p className="mt-3 text-sm leading-5 text-muted">This plan has run out of days — retire it and today's verse goes back to the family list, or start a new one.</p>
                        )}
                        {ahead.length > 0 && (
                            <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                                {ahead.map((d) => (
                                    <li key={d.day} className="rounded-md bg-page px-3.5 py-2.5">
                                        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-caption">Day {d.day}</span>
                                        <span className="mt-0.5 block text-md font-medium">{d.passage}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {manage && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                                <Button size="sm" variant="outline" onClick={() => { setEditingPlan(plan); setPlanOpen(true); }}>
                                    <Pencil size={14} aria-hidden="true" /> Edit
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setRetiring(plan)}>
                                    <Archive size={14} aria-hidden="true" /> Retire it
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setRemovingPlan(plan)}>
                                    <Trash2 size={14} aria-hidden="true" /> Delete
                                </Button>
                            </div>
                        )}
                    </Card>
                ) : (
                    <EmptyState
                        icon={<BookOpen size={20} aria-hidden="true" />}
                        title="No plan running — we're on the family verse list"
                        body={`Today's verse is coming from the ${state.rollingVerses.length} verse${state.rollingVerses.length === 1 ? "" : "s"} the family keeps in rotation. Start a plan and the whole house reads the same passage each morning instead.`}
                        action={
                            manage ? (
                                <Button onClick={() => { setEditingPlan(undefined); setPlanOpen(true); }}>
                                    <Plus size={16} aria-hidden="true" /> Start a reading plan
                                </Button>
                            ) : undefined
                        }
                    />
                )}
                {manage && state.plans.filter((p) => !p.active).length > 0 && (
                    <>
                        <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.06em] text-caption">Put away</h3>
                        <ul className="mt-2 flex flex-col gap-2">
                            {state.plans
                                .filter((p) => !p.active)
                                .map((p) => (
                                    <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-md bg-card px-4 py-3">
                                        <span className="min-w-0 flex-1 text-md">
                                            <span className="font-medium">{p.title}</span>
                                            <span className="ml-2 text-xs text-caption">
                                                {state.planDays.filter((d) => d.planId === p.id).length} days · started {shortDate(p.startDate)}
                                            </span>
                                        </span>
                                        <Button size="sm" variant="outline" onClick={() => mutate((r) => r.updatePlan(p.id, { active: true }))}>
                                            Make this the plan
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setRemovingPlan(p)} aria-label={`Delete ${p.title}`}>
                                            <Trash2 size={14} aria-hidden="true" />
                                        </Button>
                                    </li>
                                ))}
                        </ul>
                    </>
                )}
            </Section>

            <Section className="mt-8" title="What we're studying">
                {mine.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {mine.map((s) => (
                            <StudyCard key={s.id} state={state} study={s} memberId={me.id} />
                        ))}
                    </ul>
                ) : (
                    <EmptyState icon={<BookOpen size={20} aria-hidden="true" />} title="You're not on a study" body="Pick one from the library below, or write your own." action={manage ? <Button onClick={() => setStudyOpen(true)}>New study</Button> : undefined} />
                )}
            </Section>

            {library.length > 0 && (
                <Section title="In the library">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {library.map((s) => (
                            <StudyCard key={s.id} state={state} study={s} memberId={me.id} />
                        ))}
                    </ul>
                </Section>
            )}

            {familyDue.length > 0 && (
                <Section title="Learning by heart" action={<MoreLink to={`${BASE}/verses`}>Practise</MoreLink>}>
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {familyDue.map(({ member, due: theirs, total }) => (
                            <li key={member.id}>
                                <Link to={`${BASE}/verses?who=${member.id}`} className="flex items-center gap-3 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                                    <MemberAvatar member={member} size="md" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-base font-semibold">{member.name.split(" ")[0]}</span>
                                        <span className="block text-sm text-muted">
                                            {total} verse{total === 1 ? "" : "s"} · {theirs.length ? `${theirs.length} due now` : "nothing due"}
                                        </span>
                                    </span>
                                    <span className={cn("grid size-8 place-items-center rounded-full text-sm font-semibold", theirs.length ? "bg-peach-soft text-peach" : "bg-mint-soft text-mint")} aria-hidden="true">
                                        {theirs.length || "✓"}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <Section
                title="The prayer wall"
                action={
                    <div className="flex items-center gap-3">
                        <StreakPill days={streak.days} graceUsed={streak.graceUsed} />
                        <MoreLink to={`${BASE}/prayer`} />
                    </div>
                }
            >
                {open.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {open.slice(0, 4).map((p) => (
                            <PrayerCard key={p.id} state={state} prayer={p} meId={me.id} onPrayed={(on) => togglePrayed(p.id, on)} compact />
                        ))}
                    </ul>
                ) : (
                    <EmptyState icon={<Heart size={20} aria-hidden="true" />} title="Nothing open on the wall" body="That is either a very good week or a quiet one." action={<Button onClick={() => setAskOpen(true)}>Ask for prayer</Button>} />
                )}
            </Section>

            {recentlyAnswered(state, today, 45).length > 0 && (
                <Section title="Answered lately" action={<MoreLink to={`${BASE}/prayer?tab=answered`}>The archive</MoreLink>}>
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {recentlyAnswered(state, today, 45)
                            .slice(0, 4)
                            .map((p) => (
                                <PrayerCard key={p.id} state={state} prayer={p} meId={me.id} />
                            ))}
                    </ul>
                </Section>
            )}

            <p className="mt-10 flex items-center gap-2 text-xs text-caption">
                <Brain size={13} aria-hidden="true" />
                Private prayers never appear here, in a briefing, or in anything the companion says — not even to a parent.
            </p>

            <PrayerDialog open={askOpen} onClose={() => setAskOpen(false)} onSave={addPrayer} role={role} />
            {manage && (
                <>
                    <StudyDialog open={studyOpen} onClose={() => setStudyOpen(false)} onSave={addStudy} />
                    <PlanDialog open={planOpen} onClose={() => setPlanOpen(false)} initial={editingPlan} onSave={savePlan} />
                    <Confirm
                        open={retiring !== null}
                        onClose={() => setRetiring(null)}
                        title="Retire this plan?"
                        body={retiring ? `"${retiring.title}" goes into Put away, and tomorrow's verse comes from the family list again. Nothing is deleted — you can bring it back.` : undefined}
                        confirmLabel="Retire it"
                        onConfirm={async () => {
                            if (!retiring) return;
                            await mutate((r) => r.updatePlan(retiring.id, { active: false }));
                            toast("Put away — we're back on the family verse list.", "success");
                        }}
                    />
                    <Confirm
                        open={removingPlan !== null}
                        onClose={() => setRemovingPlan(null)}
                        title="Delete this plan?"
                        body={removingPlan ? `"${removingPlan.title}" and its ${state.planDays.filter((d) => d.planId === removingPlan.id).length} days go for good. This cannot be undone.` : undefined}
                        confirmLabel="Delete"
                        danger
                        onConfirm={async () => {
                            if (!removingPlan) return;
                            await mutate((r) => r.removePlan(removingPlan.id));
                            toast("Plan deleted.", "success");
                        }}
                    />
                </>
            )}
        </div>
    );
}
