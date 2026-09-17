import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, History, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { EmptyModule, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Button, Card, Skeleton } from "@/components/ui/primitives";
import mod from "../module";
import {
    HREF,
    addDaysIso,
    canCreateEvent,
    conflictIds,
    conflicts,
    entriesOnDay,
    hasFullView,
    isPlanningDay,
    myInvitations,
    stats,
    weekConfirmed,
    weekDays,
    weekStartOf,
    type EntrySource,
} from "../derive";
import { useCalendarWindow, useMemberFilter } from "../hooks";
import {
    AddButton,
    AskCalendar,
    ClashNotice,
    DayHeading,
    EntryRow,
    EventDialog,
    FeedsButton,
    FeedsDialog,
    MemberFilterChips,
    OverlayToggles,
    RsvpControl,
    ViewTabs,
} from "../components/pieces";
import { ProposeDialog } from "../components/ProposeDialog";

/**
 * The agenda — the calendar's front door.
 *
 * A parent gets the whole diary with its overlays, the week at a glance, the
 * clashes and, on the planning day, the panel that closes Sunday planning. A
 * child gets their own week in bigger type. A guest gets the two or three
 * things they were invited to and the one button they own: RSVP.
 */

const HORIZON = 30;
const LOOKBACK = 14;

export default function CalendarPage() {
    const sp = useSpace();
    const { state, mutate, loading, error } = useModule(mod);
    const { toast } = useToast();
    const filter = useMemberFilter();
    const [hidden, setHidden] = useState<EntrySource[]>([]);
    const [past, setPast] = useState(false);
    const [adding, setAdding] = useState(false);
    const [feeds, setFeeds] = useState(false);
    const [proposing, setProposing] = useState(false);

    const today = sp.today;
    const from = past ? addDaysIso(today, -LOOKBACK) : today;
    const to = addDaysIso(today, HORIZON);
    const { entries, clashes } = useCalendarWindow(from, to, filter.picked, hidden);

    const child = sp.role === "child";
    const guest = sp.role === "guest";
    const manages = sp.can("calendar.manage");
    // Parents and granted members get the whole diary's furniture; a guest
    // never does, even a granted grandmother who may add what she hosts.
    const full = hasFullView(sp);
    const canAdd = canCreateEvent(sp);

    const days = useMemo(() => {
        const out: Array<{ date: string; items: typeof entries }> = [];
        for (let d = from; d <= to; d = addDaysIso(d, 1)) {
            const items = entriesOnDay(entries, d);
            if (items.length) out.push({ date: d, items });
        }
        return out;
    }, [entries, from, to]);

    const clashSet = useMemo(() => conflictIds(clashes), [clashes]);
    const counts = useMemo(() => (state ? stats(entries, today, sp.me.id, sp.members) : null), [state, entries, today, sp.me.id, sp.members]);
    const week = useMemo(() => weekDays(today), [today]);
    const nextWeekStart = useMemo(() => weekStartOf(addDaysIso(today, 7)), [today]);
    const nextWeekEntries = useMemo(() => weekDays(nextWeekStart).flatMap((d) => entriesOnDay(entries, d)), [entries, nextWeekStart]);
    const nextWeekClashes = useMemo(() => conflicts(nextWeekEntries, sp.members), [nextWeekEntries, sp.members]);

    // Invitations this member has not answered — the guest's whole job here.
    const invitations = useMemo(() => (state ? myInvitations(state, sp.me.id, today).slice(0, 5) : []), [state, sp.me.id, today]);

    if (loading || !state) {
        return (
            <div>
                <PageTitle title="Family calendar" sub="What is happening, for whom, when." area="execute" />
                <div className="space-y-3">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }
    if (error) return <EmptyModule title="The calendar couldn't load" body={error} />;

    const planning = isPlanningDay(today, sp.space.planningDay) && full && manages;
    const confirmed = weekConfirmed(state, nextWeekStart);

    return (
        <div>
            <PageTitle
                title={child ? "Your week" : "Family calendar"}
                sub={child ? "What you have on, and what we are all doing together." : guest ? "The things the family has invited you to." : "Events, deadlines, trips and birthdays — one diary, drawn from wherever they live."}
                area="execute"
                actions={
                    <>
                        <ViewTabs />
                        {full && (
                            <Button variant="outline" onClick={() => setProposing(true)}>
                                From a message
                            </Button>
                        )}
                        {full && <FeedsButton onClick={() => setFeeds(true)} />}
                        {canAdd && <AddButton onClick={() => setAdding(true)} label={child ? "Add mine" : "Add event"} />}
                    </>
                }
            />

            {guest && (
                <Notice tone="info" className="mb-5">
                    You see only what the family has invited you to. Answering below is the one thing that changes anything here.
                </Notice>
            )}

            {planning && (
                <Card className="mb-6 bg-brand-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-md font-semibold text-brand-ink">
                                <Sparkles size={16} aria-hidden="true" /> Sunday planning — next week
                            </div>
                            <p className="mt-1 text-md leading-6 text-muted">
                                {nextWeekEntries.length} things from {shortDate(nextWeekStart)}
                                {nextWeekClashes.length ? ` · ${nextWeekClashes.length} clash${nextWeekClashes.length === 1 ? "" : "es"} to sort` : " · nothing clashes"}.
                                {invitations.length ? ` ${invitations.length} invitation${invitations.length === 1 ? "" : "s"} still unanswered.` : ""}
                            </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <Link to={`${HREF}/week`} className="inline-flex h-11 items-center rounded-full border border-line-strong bg-card px-4 text-md font-semibold">
                                Look at the week
                            </Link>
                            {confirmed ? (
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        await mutate((r) => r.unconfirmWeek(nextWeekStart));
                                        toast("Reopened");
                                    }}
                                >
                                    <Check size={15} aria-hidden="true" /> Confirmed — reopen
                                </Button>
                            ) : (
                                <Button
                                    onClick={async () => {
                                        await mutate((r) => r.confirmWeek(nextWeekStart, "Confirmed at Sunday planning."));
                                        toast("Next week confirmed");
                                    }}
                                >
                                    Confirm next week
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {full && counts && (
                <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="This week" value={counts.thisWeek} sub="events and linked items" />
                    <Stat label="Today" value={counts.today} sub={shortDate(today)} />
                    <Stat label="Yours" value={counts.mine} sub="things with your name on" tone="execute" />
                    <Stat label="Clashes" value={counts.conflicts} sub={counts.conflicts ? "worth a look" : "nothing overlaps"} tone={counts.conflicts ? "warn" : "ok"} />
                </div>
            )}

            {!guest && (
                <Section title="This week" action={<Link to={`${HREF}/week`} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">Open the grid</Link>}>
                    <ul className="grid grid-cols-7 gap-1.5">
                        {week.map((d) => {
                            const items = entriesOnDay(entries, d);
                            const isToday = d === today;
                            return (
                                <li key={d}>
                                    <Link
                                        to={`${HREF}/week`}
                                        className={cn("flex h-full flex-col items-center gap-1 rounded-md px-1 py-2.5 text-center transition-colors", isToday ? "bg-brand text-white" : "bg-card hover:bg-page")}
                                    >
                                        <span className="text-2xs uppercase tracking-[0.04em] opacity-80">{new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
                                        <span className="text-base font-semibold tabular-nums">{Number(d.slice(8))}</span>
                                        <span className="flex flex-wrap justify-center gap-0.5" aria-hidden="true">
                                            {items.slice(0, 3).map((e) => (
                                                <span key={e.id} className={cn("size-1.5 rounded-full", isToday ? "bg-white" : "bg-brand")} />
                                            ))}
                                        </span>
                                        <span className="sr-only">
                                            {items.length} on {shortDate(d)}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </Section>
            )}

            {invitations.length > 0 && (
                <Section title="Waiting on you">
                    <ul className="space-y-3">
                        {invitations.map((ev) => (
                            <li key={ev.id}>
                                <Card>
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <Link to={`${HREF}/${ev.id}`} className="text-base font-semibold hover:underline">
                                                {ev.title}
                                            </Link>
                                            <p className="mt-0.5 text-sm text-muted">
                                                {shortDate(ev.startAt)}
                                                {ev.location ? ` · ${ev.location}` : ""}
                                            </p>
                                        </div>
                                        <RsvpControl event={ev} state={state} mutate={mutate} />
                                    </div>
                                </Card>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {full && (
                <div className="mb-5 space-y-3">
                    <MemberFilterChips picked={filter.picked} onToggle={filter.toggle} onClear={filter.clear} />
                    <OverlayToggles hidden={hidden} onToggle={(s) => setHidden((h) => (h.includes(s) ? h.filter((x) => x !== s) : [...h, s]))} />
                </div>
            )}

            <ClashNotice clashes={clashes} />

            <Section
                title={past ? "The last fortnight and the month ahead" : "What's coming"}
                action={
                    <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand" onClick={() => setPast((p) => !p)}>
                        <History size={14} aria-hidden="true" /> {past ? "Hide what's gone" : "Show what's gone"}
                    </button>
                }
            >
                {days.length ? (
                    <div className="space-y-6">
                        {days.map((d) => (
                            <div key={d.date}>
                                <DayHeading date={d.date} today={today} count={d.items.length} />
                                <ul className={cn("rounded-xl bg-card p-1.5", d.date === today && "ring-1 ring-brand/30")}>
                                    {d.items.map((e) => (
                                        <EntryRow key={e.id} entry={e} clash={clashSet.has(e.id)} />
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyModule
                        title={guest ? "Nothing shared with you yet" : "Nothing in the diary"}
                        body={guest ? "When the family invites you to something, it will appear here." : "Add the first thing — a service, a lesson, a birthday tea."}
                        action={canAdd ? <Button onClick={() => setAdding(true)}>Add an event</Button> : undefined}
                    />
                )}
            </Section>

            {sp.can("ai.ask") && !guest && (
                <Section title="Ask Wàfè">
                    <AskCalendar entries={entries} today={today} />
                </Section>
            )}

            {full && (
                <p className="mt-8 flex items-center gap-2 text-xs text-caption">
                    <CalendarDays size={13} aria-hidden="true" />
                    Deadlines, milestones, assignments, bills, trips and birthdays are drawn live from the modules that own them — change one there and it changes here.
                </p>
            )}

            <EventDialog open={adding} onClose={() => setAdding(false)} event={null} defaultDate={today} mutate={mutate} />
            <FeedsDialog open={feeds} onClose={() => setFeeds(false)} state={state} entries={entries} mutate={mutate} />
            <ProposeDialog open={proposing} onClose={() => setProposing(false)} mutate={mutate} />
        </div>
    );
}
