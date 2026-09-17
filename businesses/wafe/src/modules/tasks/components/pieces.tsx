import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlarmClock, Camera, CalendarDays, Check, Filter, LayoutGrid, List, Repeat, Sprout, Target, X } from "lucide-react";
import type { Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { dueLabel, time } from "@/lib/format";
import { MemberChips } from "@/components/shared";
import { Avatar, Button, Tag } from "@/components/ui/primitives";
import { BASE, daysOverdue, dueDay, isDone, isDropped, isParked, recurLabel } from "../derive";
import type { TaskFilter } from "../derive";
import type { Task, TasksState } from "../types";
import { KIND_LABEL } from "../types";

/**
 * The small pieces the four screens share, so a task looks like the same thing
 * whether you meet it in a list, on the board, in a month grid or on the
 * dashboard: what it is, when it is due, whose it is, and what it is worth.
 */

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

export function SproutsPill({ n, className }: { n: number; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full bg-grow-soft px-2 py-[3px] text-2xs font-semibold text-grow-ink", className)}>
            <Sprout size={11} aria-hidden="true" /> {n}
        </span>
    );
}

export function DueTag({ task, today }: { task: Task; today: string }) {
    const d = dueDay(task);
    if (!d) return <span className="text-xs text-caption">No date</span>;
    if (isDone(task)) return <span className="text-xs text-caption">{isDropped(task) ? "Dropped" : "Done"}</span>;
    const { text, tone } = dueLabel(d, new Date(`${today}T00:00:00`));
    return (
        <span className={cn("inline-flex items-center gap-1 text-xs font-medium", tone === "danger" ? "text-danger-ink" : tone === "warn" ? "text-peach" : "text-muted")}>
            {tone === "danger" && <AlarmClock size={12} aria-hidden="true" />}
            {text}
            {!task.allDay && task.dueAt ? ` · ${time(task.dueAt)}` : ""}
        </span>
    );
}

/** The links a task carries: goal, value, trip, project. */
export function TaskLinks({ task, className }: { task: Task; className?: string }) {
    const bits: ReactNode[] = [];
    if (task.goalLabel) bits.push(<Tag key="goal" tone="execute" icon={<Target size={11} aria-hidden="true" />}>{task.goalLabel}</Tag>);
    if (task.valueId) bits.push(<Tag key="value" tone="grow">{task.valueId}</Tag>);
    if (task.tripId) bits.push(<Tag key="trip" tone="live">Trip</Tag>);
    if (task.projectId) bits.push(<Tag key="project" tone="neutral">Project</Tag>);
    if (task.rrule) bits.push(<Tag key="rrule" tone="neutral" icon={<Repeat size={11} aria-hidden="true" />}>{recurLabel(task.rrule)}</Tag>);
    if (!bits.length) return null;
    return <span className={cn("flex flex-wrap items-center gap-1.5", className)}>{bits}</span>;
}

/** The round tick: the one control that finishes a task. */
export function TickButton({ task, onTick, onUndo, big, disabled }: { task: Task; onTick: () => void; onUndo?: () => void; big?: boolean; disabled?: boolean }) {
    const done = isDone(task);
    const waiting = task.needsProof && Boolean(task.proofUrl) && !task.proofApprovedBy && !done;
    return (
        <button
            type="button"
            disabled={disabled}
            aria-label={done ? `Reopen ${task.title}` : waiting ? `${task.title} is waiting for a parent` : `Mark ${task.title} done`}
            onClick={() => (done ? onUndo?.() : onTick())}
            className={cn(
                "grid shrink-0 place-items-center rounded-full border-2 transition-colors disabled:opacity-45",
                big ? "size-9" : "size-6",
                done ? "border-brand bg-brand text-white" : waiting ? "border-live bg-live-soft text-live-ink" : "border-line-strong text-transparent hover:border-brand hover:text-brand-glow",
            )}
        >
            {waiting && !done ? <Camera size={big ? 16 : 12} aria-hidden="true" /> : <Check size={big ? 18 : 13} strokeWidth={2.6} aria-hidden="true" />}
        </button>
    );
}

// ---------------------------------------------------------------------------
// Rows and cards
// ---------------------------------------------------------------------------

export function TaskRow({ task, today, onTick, onUndo, canTick, selected, onSelect }: { task: Task; today: string; onTick: () => void; onUndo?: () => void; canTick: boolean; selected?: boolean; onSelect?: (on: boolean) => void }) {
    const late = daysOverdue(task, today);
    return (
        <li className={cn("flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-page", selected && "bg-brand-soft")}>
            {onSelect && (
                <label className="mt-1 flex cursor-pointer items-center">
                    <input type="checkbox" checked={Boolean(selected)} onChange={(e) => onSelect(e.target.checked)} className="size-4 accent-[var(--color-brand)]" aria-label={`Select ${task.title}`} />
                </label>
            )}
            <span className="mt-0.5">
                <TickButton task={task} onTick={onTick} onUndo={onUndo} disabled={!canTick} />
            </span>
            <span className="min-w-0 flex-1">
                <Link to={`${BASE}/${task.id}`} className="block">
                    <span className={cn("block text-md font-medium leading-5", isDone(task) && "text-muted line-through")}>{task.title}</span>
                </Link>
                <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <DueTag task={task} today={today} />
                    {task.isChore && task.sprouts > 0 && <SproutsPill n={task.sprouts} />}
                    {task.needsProof && !task.proofApprovedBy && <span className="inline-flex items-center gap-1 text-xs text-live-ink"><Camera size={11} aria-hidden="true" /> photo</span>}
                    {isParked(task, today) && !isDone(task) && <span className="text-xs font-semibold text-danger-ink">Needs a decision</span>}
                    {late > 0 && !isParked(task, today) && <span className="text-xs text-caption">{late === 1 ? "1 reminder sent" : `${late} reminders sent`}</span>}
                </span>
                <TaskLinks task={task} className="mt-1.5" />
            </span>
            <span className="mt-0.5 shrink-0">
                <MemberChips memberIds={task.assigneeMemberIds} max={3} />
            </span>
        </li>
    );
}

/** A card on the Kanban board. Draggable, and movable from the keyboard. */
export function TaskCard({
    task,
    today,
    dragging,
    over,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    actions,
}: {
    task: Task;
    today: string;
    dragging?: boolean;
    over?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onDragOver?: () => void;
    onDrop?: () => void;
    actions?: ReactNode;
}) {
    return (
        <li
            draggable
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", task.id);
                onDragStart?.();
            }}
            onDragEnd={onDragEnd}
            onDragOver={(e) => {
                if (!onDragOver) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                onDragOver();
            }}
            onDrop={(e) => {
                if (!onDrop) return;
                e.preventDefault();
                e.stopPropagation();
                onDrop();
            }}
            className={cn(
                "cursor-grab rounded-md bg-card p-3 shadow-[0_1px_0_rgba(46,40,30,0.06)] transition-opacity active:cursor-grabbing",
                dragging && "opacity-40",
                over && "ring-2 ring-brand",
            )}
        >
            <Link to={`${BASE}/${task.id}`} className="block">
                <span className={cn("block text-md font-medium leading-5", isDone(task) && "text-muted line-through")}>{task.title}</span>
            </Link>
            <div className="mt-1.5 flex items-center justify-between gap-2">
                <DueTag task={task} today={today} />
                <MemberChips memberIds={task.assigneeMemberIds} max={2} />
            </div>
            {(task.isChore || task.goalLabel) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {task.isChore && task.sprouts > 0 && <SproutsPill n={task.sprouts} />}
                    {task.goalLabel && <Tag tone="execute">{task.goalLabel}</Tag>}
                </div>
            )}
            {actions && <div className="mt-2 flex items-center gap-1">{actions}</div>}
        </li>
    );
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

/** List · Board · Calendar, carrying the filters across. */
export function ViewTabs({ qs }: { qs: string }) {
    const { pathname } = useLocation();
    const views = [
        { to: BASE, label: "List", icon: List, end: true },
        { to: `${BASE}/board`, label: "Board", icon: LayoutGrid, end: false },
        { to: `${BASE}/calendar`, label: "Calendar", icon: CalendarDays, end: false },
    ];
    return (
        <nav aria-label="Task views" className="flex items-center gap-1 rounded-full bg-card p-1">
            {views.map((v) => {
                const active = v.end ? pathname === v.to : pathname.startsWith(v.to);
                const Icon = v.icon;
                return (
                    <Link
                        key={v.label}
                        to={`${v.to}${qs}`}
                        aria-current={active ? "page" : undefined}
                        className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors", active ? "bg-brand text-white" : "text-muted hover:text-ink")}
                    >
                        <Icon size={14} aria-hidden="true" />
                        {v.label}
                    </Link>
                );
            })}
        </nav>
    );
}

export function FilterBar({ state, members, filter, set, toggle, clear, active }: { state: TasksState; members: Member[]; filter: TaskFilter; set: (k: string, v: string | null) => void; toggle: (k: string, v: string) => void; clear: () => void; active: number }) {
    const values = [...new Set(state.tasks.map((t) => t.valueId).filter(Boolean))] as string[];
    return (
        <div className="mb-5 flex flex-col gap-3 rounded-lg bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-caption">
                    <Filter size={13} aria-hidden="true" /> Filter
                </span>
                {members.map((m) => {
                    const on = filter.memberId === m.id;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle("member", m.id)}
                            className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border pl-1 pr-2.5 text-xs font-medium", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                        >
                            <Avatar name={m.name} hue={m.hue} src={m.avatarUrl} size="xs" />
                            {m.name.split(" ")[0]}
                        </button>
                    );
                })}
                <button
                    type="button"
                    aria-pressed={filter.memberId === "unassigned"}
                    onClick={() => toggle("member", "unassigned")}
                    className={cn("h-8 rounded-full border px-3 text-xs font-medium", filter.memberId === "unassigned" ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                >
                    Nobody yet
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="task-kind">
                    Kind
                </label>
                <select id="task-kind" value={filter.kind ?? ""} onChange={(e) => set("kind", e.target.value || null)} className="h-8 rounded-full border border-line-strong bg-card px-3 text-xs font-medium text-muted outline-none focus:border-brand">
                    <option value="">Any kind</option>
                    {Object.entries(KIND_LABEL).map(([k, label]) => (
                        <option key={k} value={k}>
                            {label}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    aria-pressed={Boolean(filter.overdue)}
                    onClick={() => set("overdue", filter.overdue ? null : "1")}
                    className={cn("h-8 rounded-full border px-3 text-xs font-semibold", filter.overdue ? "border-danger bg-danger-soft text-danger-ink" : "border-line-strong text-muted hover:text-ink")}
                >
                    Overdue only
                </button>
                {values.map((v) => (
                    <button
                        key={v}
                        type="button"
                        aria-pressed={filter.valueId === v}
                        onClick={() => toggle("value", v)}
                        className={cn("h-8 rounded-full border px-3 text-xs font-medium", filter.valueId === v ? "border-grow bg-grow-soft text-grow-ink" : "border-line-strong text-muted hover:text-ink")}
                    >
                        {v}
                    </button>
                ))}
                {state.goalProgress.map((g) => (
                    <button
                        key={g.goalId}
                        type="button"
                        aria-pressed={filter.goalId === g.goalId}
                        onClick={() => toggle("goal", g.goalId)}
                        className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium", filter.goalId === g.goalId ? "border-execute bg-execute-soft text-execute-ink" : "border-line-strong text-muted hover:text-ink")}
                    >
                        <Target size={12} aria-hidden="true" />
                        {g.label}
                    </button>
                ))}
                {active > 0 && (
                    <Button variant="ghost" size="sm" onClick={clear} className="ml-auto">
                        <X size={13} aria-hidden="true" /> Clear {active}
                    </Button>
                )}
            </div>
        </div>
    );
}

/** The child's moment: Sprouts landed, and we say so. */
export function Celebration({ sprouts, title, onDone }: { sprouts: number; title: string; onDone: () => void }) {
    useEffect(() => {
        const t = window.setTimeout(onDone, 3200);
        return () => window.clearTimeout(t);
    }, [onDone]);
    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-backdrop/60 px-6" role="status" aria-live="polite">
            <div className="paper w-full max-w-xs rounded-2xl bg-card px-6 py-8 text-center shadow-app">
                <span className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-grow-soft text-grow">
                    <Sprout size={30} aria-hidden="true" />
                </span>
                <p className="font-display text-7xl leading-9 text-grow-ink">+{sprouts}</p>
                <p className="mt-1 text-base font-semibold">Sprouts!</p>
                <p className="mt-1 text-md leading-5 text-muted">{title} — well done.</p>
                <Button className="mt-5" block onClick={onDone}>
                    Lovely
                </Button>
            </div>
        </div>
    );
}
