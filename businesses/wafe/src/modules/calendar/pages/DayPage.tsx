import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { isoDate, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, MemberAvatar, PageTitle, Section } from "@/components/shared";
import { Button, Card, IconButton, Skeleton } from "@/components/ui/primitives";
import mod from "../module";
import { addDaysIso, canCreateEvent, conflictIds, dayLabel, entriesOnDay, hasFullView, placeEntries, type EntrySource } from "../derive";
import { useCalendarWindow, useDateParam, useMemberFilter } from "../hooks";
import { AddButton, ClashNotice, EntryPill, EntryRow, EventDialog, MemberFilterChips, OverlayToggles, ViewTabs } from "../components/pieces";

/**
 * The day, by person — who is where, and who is free.
 *
 * The week grid answers "how heavy is this week"; the day grid answers the
 * question a family actually asks at breakfast: who is taking Ayo to the
 * dentist, and is anybody free at four.
 */

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_PX = 52;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

export default function DayPage() {
    const sp = useSpace();
    const { state, mutate, loading, error } = useModule(mod);
    const filter = useMemberFilter();
    const [hidden, setHidden] = useState<EntrySource[]>([]);
    // The day lives in the URL, so it survives a refresh and can be linked to.
    const [date, setDate] = useDateParam(sp.today);
    const [draft, setDraft] = useState<string | null>(null);

    const { entries, clashes } = useCalendarWindow(date, date, filter.picked, hidden);
    const clashSet = useMemo(() => conflictIds(clashes), [clashes]);
    const canAdd = canCreateEvent(sp);
    const full = hasFullView(sp);
    const dayItems = useMemo(() => entriesOnDay(entries, date), [entries, date]);

    const columns = useMemo(() => {
        const people = sp.members.filter((m) => (filter.picked.length ? filter.picked.includes(m.id) : true));
        return people.map((m) => ({
            member: m,
            timed: placeEntries(dayItems.filter((e) => !e.allDay && e.memberIds.includes(m.id)), START_HOUR, END_HOUR, HOUR_PX),
        }));
    }, [sp.members, filter.picked, dayItems]);

    const family = useMemo(() => dayItems.filter((e) => e.memberIds.length === 0), [dayItems]);
    const allDay = useMemo(() => dayItems.filter((e) => e.allDay && e.memberIds.length > 0), [dayItems]);
    const free = columns.filter((c) => c.timed.length === 0).map((c) => c.member);

    if (loading || !state) {
        return (
            <div>
                <PageTitle title="The day" area="execute" />
                <Skeleton className="h-96" />
            </div>
        );
    }
    if (error) return <EmptyModule title="The calendar couldn't load" body={error} />;

    return (
        <div>
            <PageTitle
                title={dayLabel(date, sp.today)}
                sub={shortDate(date)}
                area="execute"
                actions={
                    <>
                        <ViewTabs />
                        {canAdd && <AddButton onClick={() => setDraft(`${date}T09:00`)} />}
                    </>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <IconButton label="Previous day" size="md" onClick={() => setDate(addDaysIso(date, -1))}>
                    <ChevronLeft size={16} />
                </IconButton>
                <IconButton label="Next day" size="md" onClick={() => setDate(addDaysIso(date, 1))}>
                    <ChevronRight size={16} />
                </IconButton>
                <Button variant="outline" size="md" onClick={() => setDate(sp.today)}>
                    Today
                </Button>
            </div>

            {full && (
                <div className="mb-4 space-y-3">
                    <MemberFilterChips picked={filter.picked} onToggle={filter.toggle} onClear={filter.clear} />
                    <OverlayToggles hidden={hidden} onToggle={(s) => setHidden((h) => (h.includes(s) ? h.filter((x) => x !== s) : [...h, s]))} />
                </div>
            )}

            <ClashNotice clashes={clashes} />

            {(family.length > 0 || allDay.length > 0) && (
                <Card className="mb-4">
                    <h2 className="mb-2 text-md font-semibold">All of us, and all day</h2>
                    <div className="flex flex-wrap gap-2">
                        {[...family, ...allDay].map((e) => (
                            <EntryPill key={e.id} entry={e} clash={clashSet.has(e.id)} className="min-w-40" />
                        ))}
                    </div>
                </Card>
            )}

            <div className="overflow-x-auto rounded-xl bg-card p-2">
                <div style={{ minWidth: 90 + columns.length * 130 }}>
                    <div className="grid gap-1" style={{ gridTemplateColumns: `52px repeat(${columns.length}, minmax(0, 1fr))` }}>
                        <div />
                        {columns.map((c) => (
                            <div key={c.member.id} className="flex flex-col items-center gap-1 rounded-sm px-2 py-1.5">
                                <MemberAvatar member={c.member} size="sm" />
                                <span className="text-xs font-semibold">{c.member.name.split(" ")[0]}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-1 grid gap-1" style={{ gridTemplateColumns: `52px repeat(${columns.length}, minmax(0, 1fr))` }}>
                        <div>
                            {HOURS.map((h) => (
                                <div key={h} className="relative text-right text-2xs text-caption" style={{ height: HOUR_PX }}>
                                    <span className="absolute -top-1.5 right-2">{String(h).padStart(2, "0")}:00</span>
                                </div>
                            ))}
                        </div>
                        {columns.map((c) => (
                            <div key={c.member.id} className="relative rounded-sm" style={{ height: HOURS.length * HOUR_PX }}>
                                {HOURS.map((h) => (
                                    <button
                                        key={h}
                                        type="button"
                                        disabled={!canAdd}
                                        onClick={() => setDraft(`${date}T${String(h).padStart(2, "0")}:00`)}
                                        aria-label={`Add something for ${c.member.name} at ${String(h).padStart(2, "0")}:00`}
                                        className="block w-full border-t border-line/70 first:border-t-0 hover:bg-page/60 disabled:cursor-default disabled:hover:bg-transparent"
                                        style={{ height: HOUR_PX }}
                                    />
                                ))}
                                {c.timed.map((p) => (
                                    <EntryPill
                                        key={p.entry.id}
                                        entry={p.entry}
                                        clash={clashSet.has(p.entry.id)}
                                        className="absolute"
                                        style={{ top: p.top, height: p.height, left: `${(p.lane / p.lanes) * 100}%`, width: `${100 / p.lanes}%` }}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {free.length > 0 && (
                <p className={cn("mt-3 text-sm text-muted")}>
                    Nothing booked today for {free.map((m) => m.name.split(" ")[0]).join(", ")}.
                </p>
            )}

            <Section title="The whole day" className="mt-6">
                {dayItems.length ? (
                    <ul className="rounded-xl bg-card p-1.5">
                        {dayItems.map((e) => (
                            <EntryRow key={e.id} entry={e} clash={clashSet.has(e.id)} />
                        ))}
                    </ul>
                ) : (
                    <EmptyModule
                        title="A clear day"
                        body={`${shortDate(date)} has nothing in it.`}
                        action={canAdd ? <Button onClick={() => setDraft(`${date}T09:00`)}>Add something</Button> : undefined}
                    />
                )}
            </Section>

            <EventDialog
                open={Boolean(draft)}
                onClose={() => setDraft(null)}
                event={null}
                defaultDate={draft ? isoDate(draft) : date}
                defaultStart={draft && draft.includes("T") ? draft.slice(11, 16) : "09:00"}
                mutate={mutate}
            />
        </div>
    );
}
