import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { longDate } from "@/lib/format";
import { Notice, PageTitle } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Card, IconButton, Skeleton } from "@/components/ui/primitives";
import { applyFilter, isDone, isOverdue, monthGrid, tasksOnDay } from "../derive";
import { Celebration, FilterBar, TaskRow, ViewTabs } from "../components/pieces";
import { GuestTasks } from "../components/GuestTasks";
import { TaskDialog } from "../components/TaskDialog";
import { useFilters } from "../components/useFilters";
import { useTasks } from "../components/useTasks";

/**
 * The month, so a family can see the shape of it: where the week is heavy,
 * where the empty Saturday is, and what is already late. The same filter chips
 * as the list and the board (AC 9) — pick "Oluwafemi" and the grid becomes his.
 */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
    const { state, sp, loading, error, complete, mutate, celebration, clearCelebration } = useTasks();
    const { filter, set, toggle, clear, active, qs } = useFilters();
    const [anchor, setAnchor] = useState(sp.today);
    const [open, setOpen] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);

    const filtered = useMemo(() => (state ? applyFilter(state.tasks, filter, sp.today) : []), [state, filter, sp.today]);
    const days = useMemo(() => monthGrid(anchor), [anchor]);

    // A guest is handed the tasks the family asked them to do, and nothing
    // else this module renders: not the family's board, not their month.
    if (sp.role === "guest") return <GuestTasks />;
    if (loading) return <Skeleton className="h-96" />;
    if (error) return <Notice tone="danger">{error}</Notice>;

    const month = new Date(`${anchor.slice(0, 8)}01T00:00:00`);
    const monthKey = anchor.slice(0, 7);
    const shift = (n: number) => {
        const d = new Date(`${anchor.slice(0, 8)}01T00:00:00`);
        d.setMonth(d.getMonth() + n);
        setAnchor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    };

    return (
        <div>
            {celebration && <Celebration sprouts={celebration.sprouts} title={celebration.title} onDone={clearCelebration} />}
            <PageTitle
                title="The month"
                sub="Where the week is heavy, and where there is room to breathe."
                area="execute"
                actions={
                    <Button onClick={() => setAdding(true)}>
                        <Plus size={16} aria-hidden="true" /> New task
                    </Button>
                }
            />

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <ViewTabs qs={qs} />
                <div className="flex items-center gap-2">
                    <IconButton label="Previous month" size="md" onClick={() => shift(-1)}>
                        <ChevronLeft size={16} aria-hidden="true" />
                    </IconButton>
                    <span className="min-w-40 text-center text-base font-semibold">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
                    <IconButton label="Next month" size="md" onClick={() => shift(1)}>
                        <ChevronRight size={16} aria-hidden="true" />
                    </IconButton>
                    <Button size="sm" variant="ghost" onClick={() => setAnchor(sp.today)}>
                        Today
                    </Button>
                </div>
            </div>

            <FilterBar state={state} members={sp.members.filter((m) => m.role !== "guest")} filter={filter} set={set} toggle={toggle} clear={clear} active={active} />

            <Card className="overflow-x-auto p-2">
                <div className="min-w-[640px]">
                    <div className="grid grid-cols-7 gap-1 pb-1">
                        {WEEKDAYS.map((d) => (
                            <div key={d} className="px-2 py-1 text-2xs font-semibold uppercase tracking-[0.06em] text-caption">
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day) => {
                            const list = tasksOnDay(filtered, day);
                            const outside = !day.startsWith(monthKey);
                            const isToday = day === sp.today;
                            const late = list.some((t) => isOverdue(t, sp.today));
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => setOpen(day)}
                                    aria-label={`${longDate(day)} — ${list.length} task${list.length === 1 ? "" : "s"}`}
                                    className={cn(
                                        "flex min-h-24 flex-col items-stretch rounded-md border p-1.5 text-left transition-colors hover:border-brand",
                                        isToday ? "border-brand bg-brand-soft" : "border-line bg-card",
                                        outside && "opacity-45",
                                    )}
                                >
                                    <span className={cn("mb-1 text-xs font-semibold tabular-nums", late && "text-danger-ink")}>{Number(day.slice(8, 10))}</span>
                                    <span className="flex flex-col gap-0.5">
                                        {list.slice(0, 3).map((t) => (
                                            <span key={t.id} className={cn("truncate rounded-xs px-1 py-0.5 text-2xs leading-4", isDone(t) ? "bg-page text-caption line-through" : t.isChore ? "bg-grow-soft text-grow-ink" : "bg-execute-soft text-execute-ink")}>
                                                {t.title}
                                            </span>
                                        ))}
                                        {list.length > 3 && <span className="px-1 text-2xs text-caption">+{list.length - 3} more</span>}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Card>

            <Dialog open={Boolean(open)} onClose={() => setOpen(null)} title={open ? longDate(open) : ""} wide>
                {open && tasksOnDay(filtered, open).length === 0 ? (
                    <p className="text-md text-muted">Nothing due that day.</p>
                ) : (
                    <ul>
                        {open &&
                            tasksOnDay(filtered, open).map((t) => (
                                <TaskRow key={t.id} task={t} today={sp.today} canTick={!isDone(t)} onTick={() => void complete(t)} onUndo={() => void mutate((r) => r.reopenTask(t.id))} />
                            ))}
                    </ul>
                )}
            </Dialog>

            <TaskDialog open={adding} onClose={() => setAdding(false)} state={state} defaults={{ dueAt: `${anchor}T09:00:00.000Z` }} />
        </div>
    );
}
