import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, PageTitle, Section } from "@/components/shared";
import { Button, IconButton, Skeleton } from "@/components/ui/primitives";
import mod from "../module";
import { canCreateEvent, conflictIds, dayLabel, entriesOnDay, hasFullView, monthLabel, monthMatrix, startOfDay, type EntrySource } from "../derive";
import { useCalendarWindow, useDateParam, useMemberFilter } from "../hooks";
import { AddButton, ClashNotice, EntryPill, EntryRow, EventDialog, MemberFilterChips, OverlayToggles, ViewTabs } from "../components/pieces";

/**
 * The month — six weeks of dots and labels, and the day you tapped underneath.
 *
 * A month grid is for shape, not detail: how heavy a week is, where the trip
 * sits, which Saturday is free. The list below it is the detail, so the grid
 * never has to shout.
 */

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthPage() {
    const sp = useSpace();
    const { state, mutate, loading, error } = useModule(mod);
    const filter = useMemberFilter();
    const [hidden, setHidden] = useState<EntrySource[]>([]);
    // The month lives in the URL, so it survives a refresh and can be linked to.
    const [anchor, setAnchor] = useDateParam(sp.today);
    const [chosen, setPicked] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);

    const matrix = useMemo(() => monthMatrix(anchor), [anchor]);
    const first = matrix[0][0];
    const last = matrix[5][6];
    // The day shown underneath follows the month you are looking at, so a link
    // to October does not open with a day in September under it.
    const inView = (d: string): boolean => d >= first && d <= last;
    const picked = chosen && inView(chosen) ? chosen : inView(sp.today) ? sp.today : `${anchor.slice(0, 8)}01`;
    const { entries, clashes } = useCalendarWindow(first, last, filter.picked, hidden);
    const clashSet = useMemo(() => conflictIds(clashes), [clashes]);
    const month = startOfDay(anchor).getMonth();
    const canAdd = canCreateEvent(sp);
    const full = hasFullView(sp);
    const dayItems = useMemo(() => entriesOnDay(entries, picked), [entries, picked]);

    const shift = (months: number): void => {
        const d = startOfDay(anchor);
        d.setDate(1);
        d.setMonth(d.getMonth() + months);
        setAnchor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    };

    if (loading || !state) {
        return (
            <div>
                <PageTitle title="The month" area="execute" />
                <Skeleton className="h-96" />
            </div>
        );
    }
    if (error) return <EmptyModule title="The calendar couldn't load" body={error} />;

    return (
        <div>
            <PageTitle
                title="The month"
                sub={monthLabel(anchor)}
                area="execute"
                actions={
                    <>
                        <ViewTabs />
                        {canAdd && <AddButton onClick={() => setAdding(true)} />}
                    </>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <IconButton label="Previous month" size="md" onClick={() => shift(-1)}>
                    <ChevronLeft size={16} />
                </IconButton>
                <IconButton label="Next month" size="md" onClick={() => shift(1)}>
                    <ChevronRight size={16} />
                </IconButton>
                <Button
                    variant="outline"
                    size="md"
                    onClick={() => {
                        setAnchor(sp.today);
                        setPicked(sp.today);
                    }}
                >
                    This month
                </Button>
                <span className="text-sm text-muted">{monthLabel(anchor)}</span>
            </div>

            {full && (
                <div className="mb-4 space-y-3">
                    <MemberFilterChips picked={filter.picked} onToggle={filter.toggle} onClear={filter.clear} />
                    <OverlayToggles hidden={hidden} onToggle={(s) => setHidden((h) => (h.includes(s) ? h.filter((x) => x !== s) : [...h, s]))} />
                </div>
            )}

            <ClashNotice clashes={clashes} />

            <div className="overflow-x-auto rounded-xl bg-card p-2">
                <div className="min-w-[680px]">
                    <div className="grid grid-cols-7 gap-1 pb-1">
                        {DOW.map((d) => (
                            <div key={d} className="px-1 text-2xs font-semibold uppercase tracking-[0.06em] text-caption">
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {matrix.flat().map((date) => {
                            const items = entriesOnDay(entries, date);
                            const isToday = date === sp.today;
                            const isPicked = date === picked;
                            const other = startOfDay(date).getMonth() !== month;
                            return (
                                <button
                                    key={date}
                                    type="button"
                                    onClick={() => setPicked(date)}
                                    aria-pressed={isPicked}
                                    aria-label={`${shortDate(date)}, ${items.length} things`}
                                    className={cn(
                                        "flex min-h-[92px] flex-col gap-1 rounded-sm border p-1.5 text-left transition-colors",
                                        isPicked ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong",
                                        other && "opacity-45",
                                    )}
                                >
                                    <span className={cn("text-xs font-semibold tabular-nums", isToday && "grid size-6 place-items-center rounded-full bg-brand text-white")}>{Number(date.slice(8))}</span>
                                    <span className="flex flex-col gap-1">
                                        {items.slice(0, 3).map((e) => (
                                            <EntryPill key={e.id} entry={e} compact clash={clashSet.has(e.id)} />
                                        ))}
                                        {items.length > 3 && <span className="px-1 text-2xs text-caption">+{items.length - 3} more</span>}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Section title={dayLabel(picked, sp.today)} className="mt-6">
                {dayItems.length ? (
                    <ul className="rounded-xl bg-card p-1.5">
                        {dayItems.map((e) => (
                            <EntryRow key={e.id} entry={e} clash={clashSet.has(e.id)} />
                        ))}
                    </ul>
                ) : (
                    <EmptyModule
                        title="Nothing that day"
                        body={`${shortDate(picked)} is clear.`}
                        action={canAdd ? <Button onClick={() => setAdding(true)}>Add something</Button> : undefined}
                    />
                )}
            </Section>

            <EventDialog open={adding} onClose={() => setAdding(false)} event={null} defaultDate={picked || sp.today} mutate={mutate} />
        </div>
    );
}
