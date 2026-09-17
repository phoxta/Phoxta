import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { isoDate, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, PageTitle } from "@/components/shared";
import { Button, IconButton, Skeleton } from "@/components/ui/primitives";
import mod from "../module";
import { addDaysIso, canCreateEvent, conflictIds, entriesOnDay, hasFullView, placeEntries, weekDays, type EntrySource } from "../derive";
import { useCalendarWindow, useDateParam, useMemberFilter } from "../hooks";
import { AddButton, ClashNotice, EntryPill, EventDialog, MemberFilterChips, OverlayToggles, ViewTabs } from "../components/pieces";

/**
 * The week, as a time grid.
 *
 * 07:00 to 22:00, seven columns, today's picked out — and every overlay in its
 * own area colour beside the family's own events, because the point of the
 * week view is to see the WHOLE load, not just the part the calendar owns.
 * Tap an empty slot and the event form opens on that hour.
 */

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_PX = 52;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

export default function WeekPage() {
    const sp = useSpace();
    const { state, mutate, loading, error } = useModule(mod);
    const filter = useMemberFilter();
    const [hidden, setHidden] = useState<EntrySource[]>([]);
    // The week lives in the URL, so it survives a refresh and can be linked to.
    const [anchor, setAnchor] = useDateParam(sp.today);
    const [draft, setDraft] = useState<string | null>(null);

    const days = useMemo(() => weekDays(anchor), [anchor]);
    const { entries, clashes } = useCalendarWindow(days[0], days[6], filter.picked, hidden);
    const clashSet = useMemo(() => conflictIds(clashes), [clashes]);
    const canAdd = canCreateEvent(sp);
    const full = hasFullView(sp);

    const byDay = useMemo(
        () =>
            days.map((d) => {
                const all = entriesOnDay(entries, d);
                return { date: d, allDay: all.filter((e) => e.allDay), timed: placeEntries(all.filter((e) => !e.allDay), START_HOUR, END_HOUR, HOUR_PX) };
            }),
        [days, entries],
    );

    if (loading || !state) {
        return (
            <div>
                <PageTitle title="The week" area="execute" />
                <Skeleton className="h-96" />
            </div>
        );
    }
    if (error) return <EmptyModule title="The calendar couldn't load" body={error} />;

    const label = `${shortDate(days[0])} – ${shortDate(days[6])}`;

    return (
        <div>
            <PageTitle
                title="The week"
                sub={label}
                area="execute"
                actions={
                    <>
                        <ViewTabs />
                        {canAdd && <AddButton onClick={() => setDraft(sp.today)} />}
                    </>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <IconButton label="Previous week" size="md" onClick={() => setAnchor(addDaysIso(anchor, -7))}>
                    <ChevronLeft size={16} />
                </IconButton>
                <IconButton label="Next week" size="md" onClick={() => setAnchor(addDaysIso(anchor, 7))}>
                    <ChevronRight size={16} />
                </IconButton>
                <Button variant="outline" size="md" onClick={() => setAnchor(sp.today)}>
                    This week
                </Button>
                <span className="text-sm text-muted">{label}</span>
            </div>

            {full && (
                <div className="mb-4 space-y-3">
                    <MemberFilterChips picked={filter.picked} onToggle={filter.toggle} onClear={filter.clear} />
                    <OverlayToggles hidden={hidden} onToggle={(s) => setHidden((h) => (h.includes(s) ? h.filter((x) => x !== s) : [...h, s]))} />
                </div>
            )}

            <ClashNotice clashes={clashes} />

            <div className="overflow-x-auto rounded-xl bg-card p-2">
                <div className="min-w-[820px]">
                    {/* Day headings */}
                    <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-1">
                        <div />
                        {byDay.map((d) => {
                            const isToday = d.date === sp.today;
                            return (
                                <div key={d.date} className={cn("rounded-sm px-2 py-1.5 text-center", isToday && "bg-brand-soft")}>
                                    <div className="text-2xs uppercase tracking-[0.06em] text-caption">{new Date(`${d.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" })}</div>
                                    <div className={cn("text-lg font-semibold tabular-nums", isToday && "text-brand")}>{Number(d.date.slice(8))}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* All-day row */}
                    <div className="mt-1 grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-1 border-y border-line py-1.5">
                        <div className="pt-1 text-right text-2xs text-caption">All day</div>
                        {byDay.map((d) => (
                            <div key={d.date} className="space-y-1">
                                {d.allDay.map((e) => (
                                    <EntryPill key={e.id} entry={e} compact clash={clashSet.has(e.id)} />
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Time grid */}
                    <div className="relative mt-1 grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-1">
                        <div>
                            {HOURS.map((h) => (
                                <div key={h} className="relative text-right text-2xs text-caption" style={{ height: HOUR_PX }}>
                                    <span className="absolute -top-1.5 right-2">{String(h).padStart(2, "0")}:00</span>
                                </div>
                            ))}
                        </div>
                        {byDay.map((d) => (
                            <div key={d.date} className={cn("relative rounded-sm", d.date === sp.today && "bg-brand-soft/40")} style={{ height: HOURS.length * HOUR_PX }}>
                                {HOURS.map((h) => (
                                    <button
                                        key={h}
                                        type="button"
                                        disabled={!canAdd}
                                        onClick={() => setDraft(`${d.date}T${String(h).padStart(2, "0")}:00`)}
                                        aria-label={`Add something on ${shortDate(d.date)} at ${String(h).padStart(2, "0")}:00`}
                                        className="block w-full border-t border-line/70 first:border-t-0 hover:bg-page/60 disabled:cursor-default disabled:hover:bg-transparent"
                                        style={{ height: HOUR_PX }}
                                    />
                                ))}
                                {d.timed.map((p) => (
                                    <EntryPill
                                        key={p.entry.id}
                                        entry={p.entry}
                                        clash={clashSet.has(p.entry.id)}
                                        className="absolute"
                                        style={{
                                            top: p.top,
                                            height: p.height,
                                            left: `${(p.lane / p.lanes) * 100}%`,
                                            width: `${100 / p.lanes}%`,
                                        }}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-caption">
                Blocks in a person's colour are theirs; the softer ones are drawn live from Tasks, Goals, Curricula, Finance, Travel and People. Tap an empty hour to add something.
            </p>

            <EventDialog
                open={Boolean(draft)}
                onClose={() => setDraft(null)}
                event={null}
                defaultDate={draft ? isoDate(draft) : sp.today}
                defaultStart={draft && draft.includes("T") ? draft.slice(11, 16) : "09:00"}
                mutate={mutate}
            />
        </div>
    );
}
