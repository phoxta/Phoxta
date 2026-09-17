import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Notice, PageTitle } from "@/components/shared";
import { Button, IconButton, Skeleton } from "@/components/ui/primitives";
import { applyFilter, board, columnTasks, isDone } from "../derive";
import type { Task, TaskStatus } from "../types";
import { STATUS_LABEL, STATUS_ORDER } from "../types";
import { Celebration, FilterBar, TaskCard, ViewTabs } from "../components/pieces";
import { CompanionDialog } from "../components/CompanionDialog";
import { GuestTasks } from "../components/GuestTasks";
import { TaskDialog } from "../components/TaskDialog";
import { useFilters } from "../components/useFilters";
import { useTasks } from "../components/useTasks";

/**
 * The board: To do · Doing · Done · Waiting.
 *
 * Drag with a mouse, or move with the four buttons on every card — the order
 * inside a column is a real number on the row (`kanban_order`), so where you
 * put something is where it stays for everyone (AC 6). Dropping into Done is a
 * completion, ledger and Sprouts and the next recurrence and all, exactly as
 * if you had ticked it off in the list.
 */

const COLUMN_TONE: Record<TaskStatus, string> = {
    todo: "bg-page",
    doing: "bg-execute-soft",
    done: "bg-grow-soft",
    waiting: "bg-live-soft",
};

export default function BoardPage() {
    const { state, sp, loading, error, mutate, complete, celebration, clearCelebration, toast } = useTasks();
    const { filter, set, toggle, clear, active, qs } = useFilters();
    const [dragId, setDragId] = useState<string | null>(null);
    const [overKey, setOverKey] = useState<string | null>(null);
    /** null = closed; a status = open, and the new task lands in that column. */
    const [adding, setAdding] = useState<TaskStatus | null>(null);
    const [asking, setAsking] = useState(false);

    const columns = useMemo(() => (state ? board(applyFilter(state.tasks, filter, sp.today)) : []), [state, filter, sp.today]);

    // A guest is handed the tasks the family asked them to do, and nothing
    // else this module renders: not the family's board, not their month.
    if (sp.role === "guest") return <GuestTasks />;
    if (loading) return <Skeleton className="h-96" />;
    if (error) return <Notice tone="danger">{error}</Notice>;

    const move = async (task: Task, status: TaskStatus, index: number) => {
        try {
            if (status === "done" && !isDone(task)) {
                const res = await complete(task);
                if (res?.awaitingApproval) return;
            }
            await mutate((r) => r.moveTask(task.id, status, index));
        } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't move that", "danger");
        }
    };

    const drop = (status: TaskStatus, index: number) => {
        const task = state.tasks.find((t) => t.id === dragId);
        setDragId(null);
        setOverKey(null);
        if (!task) return;
        void move(task, status, index);
    };

    /** Where a card sits in its own column, for the keyboard buttons. */
    const positionOf = (task: Task): number => columnTasks(state.tasks, task.status).findIndex((t) => t.id === task.id);

    return (
        <div>
            {celebration && <Celebration sprouts={celebration.sprouts} title={celebration.title} onDone={clearCelebration} />}
            <PageTitle
                title="The board"
                sub="Drag a card, or move it with the arrows. Where you put it is where it stays."
                area="execute"
                actions={
                    <>
                        <Button variant="outline" onClick={() => setAsking(true)}>
                            <Sparkles size={16} aria-hidden="true" /> Ask the companion
                        </Button>
                        <Button onClick={() => setAdding("todo")}>
                            <Plus size={16} aria-hidden="true" /> New task
                        </Button>
                    </>
                }
            />

            <div className="mb-5">
                <ViewTabs qs={qs} />
            </div>
            <FilterBar state={state} members={sp.members.filter((m) => m.role !== "guest")} filter={filter} set={set} toggle={toggle} clear={clear} active={active} />

            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-4">
                {columns.map(({ status, tasks }) => (
                    <section
                        key={status}
                        aria-label={STATUS_LABEL[status]}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            setOverKey(`${status}:end`);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            drop(status, tasks.length);
                        }}
                        className={cn("flex min-h-40 flex-col rounded-lg p-2.5", COLUMN_TONE[status], overKey === `${status}:end` && "outline-2 outline-dashed outline-brand")}
                    >
                        <header className="mb-2 flex items-center gap-2 px-1">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.06em]">{STATUS_LABEL[status]}</h2>
                            <span className="text-xs tabular-nums text-caption">{tasks.length}</span>
                            <span className="flex-1" />
                            <button
                                type="button"
                                onClick={() => setAdding(status)}
                                aria-label={`Add a task to ${STATUS_LABEL[status]}`}
                                className="grid size-7 place-items-center rounded-full text-muted transition-colors hover:bg-card hover:text-ink"
                            >
                                <Plus size={15} aria-hidden="true" />
                            </button>
                        </header>
                        <ul className="flex flex-1 flex-col gap-2">
                            {tasks.map((t, i) => (
                                <TaskCard
                                    key={t.id}
                                    task={t}
                                    today={sp.today}
                                    dragging={dragId === t.id}
                                    over={overKey === `${status}:${i}`}
                                    onDragStart={() => setDragId(t.id)}
                                    onDragEnd={() => {
                                        setDragId(null);
                                        setOverKey(null);
                                    }}
                                    onDragOver={() => setOverKey(`${status}:${i}`)}
                                    onDrop={() => drop(status, i)}
                                    actions={
                                        <>
                                            <IconButton
                                                label={`Move ${t.title} to ${STATUS_LABEL[STATUS_ORDER[Math.max(0, STATUS_ORDER.indexOf(status) - 1)]]}`}
                                                size="sm"
                                                disabled={STATUS_ORDER.indexOf(status) === 0}
                                                onClick={() => void move(t, STATUS_ORDER[Math.max(0, STATUS_ORDER.indexOf(status) - 1)], 0)}
                                            >
                                                <ChevronLeft size={13} aria-hidden="true" />
                                            </IconButton>
                                            <IconButton label={`Move ${t.title} up`} size="sm" disabled={i === 0} onClick={() => void move(t, status, Math.max(0, positionOf(t) - 1))}>
                                                <ChevronUp size={13} aria-hidden="true" />
                                            </IconButton>
                                            <IconButton label={`Move ${t.title} down`} size="sm" disabled={i === tasks.length - 1} onClick={() => void move(t, status, positionOf(t) + 1)}>
                                                <ChevronDown size={13} aria-hidden="true" />
                                            </IconButton>
                                            <IconButton
                                                label={`Move ${t.title} to ${STATUS_LABEL[STATUS_ORDER[Math.min(STATUS_ORDER.length - 1, STATUS_ORDER.indexOf(status) + 1)]]}`}
                                                size="sm"
                                                disabled={STATUS_ORDER.indexOf(status) === STATUS_ORDER.length - 1}
                                                onClick={() => void move(t, STATUS_ORDER[Math.min(STATUS_ORDER.length - 1, STATUS_ORDER.indexOf(status) + 1)], 0)}
                                            >
                                                <ChevronRight size={13} aria-hidden="true" />
                                            </IconButton>
                                        </>
                                    }
                                />
                            ))}
                            {tasks.length === 0 && <li className="rounded-md border border-dashed border-line-strong px-3 py-6 text-center text-xs text-caption">Nothing here</li>}
                        </ul>
                    </section>
                ))}
            </div>

            <TaskDialog open={adding !== null} onClose={() => setAdding(null)} state={state} defaults={adding ? { status: adding } : undefined} />
            <CompanionDialog open={asking} onClose={() => setAsking(false)} state={state} />
        </div>
    );
}
