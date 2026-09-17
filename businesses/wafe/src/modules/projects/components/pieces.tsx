import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Archive, ExternalLink, Gavel, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { MemberChips, Money } from "@/components/shared";
import { ProgressBar, Tag } from "@/components/ui/primitives";
import { BASE, boardProgress, budgetLine, hostOf, notePreview, noteTodos } from "../derive";
import { KIND_LABEL, STATUS_LABEL, type BudgetLine, type Clip, type Decision, type LinkedTask, type Note, type Project, type ProjectsState } from "../types";

/**
 * The module's own small pieces: the two cross-module reads (tasks, finance),
 * the tiles the lists are built from, and the badges that say what a thing is.
 *
 * The cross-module reads are deliberately structural. We read another
 * module's loaded slice through `useModuleState` — never its repo, never its
 * types — so a project's board can show the very Task rows that name it, and
 * the budget line can show what Finance says was spent, without either module
 * knowing this one exists.
 */

// ---------------------------------------------------------------------------
// Cross-module reads (read-only, by shape)
// ---------------------------------------------------------------------------

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * The Tasks rows that name this project (AC 3): the same rows the Tasks
 * module shows, read from its slice and rendered read-only on this board.
 */
export function useLinkedTasks(projectId: string | undefined): LinkedTask[] {
    const slice = useModuleState<{ tasks?: unknown[] }>("tasks");
    return useMemo(() => {
        if (!projectId || !slice?.tasks) return [];
        return slice.tasks
            .map((raw) => raw as Record<string, unknown>)
            .filter((t) => str(t.projectId) === projectId)
            .map((t) => ({
                id: str(t.id),
                title: str(t.title),
                status: str(t.status) || "todo",
                dueAt: str(t.dueAt) || null,
                assigneeMemberIds: strs(t.assigneeMemberIds),
                done: str(t.status) === "done",
            }))
            .filter((t) => t.id && t.title);
    }, [slice, projectId]);
}

/**
 * What Finance says has been spent in this project's category (AC 8). Null
 * when Finance is not loaded or does not hold the category — the budget line
 * then falls back to the project's own cost lines and says so.
 */
export function useFinanceSpent(categoryId: string | null): number | null {
    const slice = useModuleState<{ budgets?: unknown[] }>("finance");
    return useMemo(() => {
        if (!categoryId || !slice?.budgets) return null;
        const row = slice.budgets.map((b) => b as Record<string, unknown>).find((b) => str(b.id) === categoryId);
        if (!row) return null;
        return num(row.spentCents) ?? num(row.spent) ?? num(row.actualCents) ?? num(row.usedCents);
    }, [slice, categoryId]);
}

/** The whole budget line for a project, with its source resolved. */
export function useBudgetLine(state: ProjectsState | undefined, project: Project | undefined): BudgetLine | null {
    const spent = useFinanceSpent(project?.financeCategoryId ?? null);
    return useMemo(() => (state && project ? budgetLine(state, project, spent) : null), [state, project, spent]);
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const STATUS_TONE = { planning: "neutral", active: "execute", paused: "warn", done: "ok" } as const;

export function StatusTag({ project }: { project: Project }) {
    if (project.archived)
        return (
            <Tag tone="neutral" icon={<Archive size={11} aria-hidden="true" />}>
                Archived
            </Tag>
        );
    return <Tag tone={STATUS_TONE[project.status]}>{STATUS_LABEL[project.status]}</Tag>;
}

export function KindTag({ project }: { project: Project }) {
    return <Tag tone="neutral">{KIND_LABEL[project.kind]}</Tag>;
}

export function PrivateTag({ visibility }: { visibility: Project["visibility"] }) {
    if (visibility !== "private") return null;
    return (
        <Tag tone="neutral" icon={<Lock size={11} aria-hidden="true" />}>
            Private
        </Tag>
    );
}

export function TagRow({ tags, onPick, active, className }: { tags: string[]; onPick?: (t: string) => void; active?: string; className?: string }) {
    if (!tags.length) return null;
    return (
        <ul className={cn("flex flex-wrap gap-1.5", className)}>
            {tags.map((t) => (
                <li key={t}>
                    {onPick ? (
                        <button type="button" onClick={() => onPick(t)} aria-pressed={active === t} className={cn("rounded-full px-2.5 py-1 text-2xs font-medium", active === t ? "bg-brand text-white" : "bg-page text-muted hover:text-ink")}>
                            #{t}
                        </button>
                    ) : (
                        <span className="rounded-full bg-page px-2.5 py-1 text-2xs font-medium text-muted">#{t}</span>
                    )}
                </li>
            ))}
        </ul>
    );
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

export function BudgetBar({ line, compact }: { line: BudgetLine; compact?: boolean }) {
    if (!line.budgetCents) return null;
    return (
        <div>
            <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold tabular-nums">
                    <Money cents={line.spentCents} /> <span className="font-normal text-muted">of <Money cents={line.budgetCents} /></span>
                </span>
                <span className={cn("text-xs tabular-nums", line.over ? "text-danger-ink" : "text-caption")}>{line.pct}%</span>
            </div>
            <ProgressBar value={Math.min(100, line.pct)} className="mt-2" label="Budget used" />
            {!compact && <p className="mt-1.5 text-2xs text-caption">{line.label}</p>}
        </div>
    );
}

export function DecisionCard({ decision, className }: { decision: Decision; className?: string }) {
    const { members } = useSpace();
    const who = members.find((m) => m.id === decision.decidedBy);
    return (
        <div className={cn("rounded-lg bg-execute-soft p-4", className)}>
            <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.06em] text-execute-ink">
                <Gavel size={13} aria-hidden="true" /> Decision record
            </div>
            <p className="mt-2 font-display text-[19px] leading-7 text-execute-ink">{decision.decision}</p>
            {decision.because && <p className="mt-2 text-sm leading-6 text-muted">{decision.because}</p>}
            <p className="mt-2.5 text-2xs text-caption">
                {who ? `${who.name.split(" ")[0]} · ` : ""}
                {shortDate(decision.decidedAt)}
            </p>
        </div>
    );
}

export function ProjectTile({ project, state, linkedDone = 0, linkedTotal = 0 }: { project: Project; state: ProjectsState; linkedDone?: number; linkedTotal?: number }) {
    const { today } = useSpace();
    const prog = boardProgress(state, project.id, today);
    const done = prog.done + linkedDone;
    const total = prog.total + linkedTotal;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const memberIds = [...new Set([project.ownerMemberId, ...project.members.map((m) => m.memberId)])];
    return (
        <li>
            <Link to={`${BASE}/${project.id}`} className={cn("flex h-full flex-col overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-hover", project.archived && "opacity-75")}>
                {project.coverUrl && <img src={project.coverUrl} alt="" width={480} height={200} loading="lazy" className="h-32 w-full object-cover" />}
                <span className="flex flex-1 flex-col p-4">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <StatusTag project={project} />
                        <KindTag project={project} />
                        <PrivateTag visibility={project.visibility} />
                    </span>
                    <span className="clamp-2 mt-2.5 text-[17px] font-semibold leading-6">{project.title}</span>
                    <span className="clamp-2 mt-1 text-sm leading-5 text-muted">{project.summary}</span>
                    <span className="mt-auto pt-4">
                        <ProgressBar value={pct} label={`${project.title} progress`} />
                        <span className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-xs text-caption">{total ? `${done} of ${total} done` : "Nothing on the board yet"}</span>
                            <MemberChips memberIds={memberIds} max={3} />
                        </span>
                    </span>
                </span>
            </Link>
        </li>
    );
}

export function ClipTile({ clip, action }: { clip: Clip; action?: ReactNode }) {
    return (
        <li className="flex gap-3 rounded-xl bg-card p-3.5">
            {clip.imageUrl ? (
                <img src={clip.imageUrl} alt="" width={112} height={84} loading="lazy" className="hidden size-[84px] shrink-0 rounded-md object-cover sm:block" />
            ) : (
                <span className="hidden size-[84px] shrink-0 place-items-center rounded-md bg-page text-caption sm:grid" aria-hidden="true">
                    <ExternalLink size={18} />
                </span>
            )}
            <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                    <a href={clip.url} target="_blank" rel="noreferrer noopener" className="clamp-2 flex-1 text-base font-semibold leading-5 hover:underline">
                        {clip.title}
                    </a>
                    {action}
                </div>
                <p className="mt-1 text-xs text-caption">
                    {hostOf(clip.url)} · {clip.folder} · {shortDate(clip.createdAt)}
                </p>
                <p className="clamp-2 mt-1.5 text-sm leading-5 text-muted">{clip.snapshotText || clip.excerpt}</p>
                <TagRow tags={clip.tags} className="mt-2" />
            </div>
        </li>
    );
}

export function NoteTile({ note, to, action }: { note: Note; to: string; action?: ReactNode }) {
    const todos = noteTodos(note);
    return (
        <li className="rounded-xl bg-card p-4">
            <div className="flex items-start gap-2">
                <Link to={to} className="min-w-0 flex-1">
                    <span className="block text-base font-semibold leading-5 hover:underline">{note.title}</span>
                    <span className="clamp-2 mt-1 block text-sm leading-5 text-muted">{notePreview(note)}</span>
                </Link>
                {action}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-2xs text-caption">
                <span>{note.folder}</span>
                <span aria-hidden="true">·</span>
                <span>{shortDate(note.updatedAt)}</span>
                {todos.total > 0 && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span>
                            {todos.done}/{todos.total} ticked
                        </span>
                    </>
                )}
                {note.sensitivity !== "general" && (
                    <Tag tone="warn" icon={<Lock size={11} aria-hidden="true" />}>
                        {note.sensitivity}
                    </Tag>
                )}
            </div>
            <TagRow tags={note.tags} className="mt-2.5" />
        </li>
    );
}

/** The little "the companion said" panel every AI answer lands in. */
export function CompanionAnswer({ text, sources, onClose }: { text: string; sources: string[]; onClose?: () => void }) {
    return (
        <div className="rounded-lg bg-brand-soft p-4">
            <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.06em] text-brand-ink">
                <Sparkles size={13} aria-hidden="true" /> The companion
            </div>
            <p className="mt-2 whitespace-pre-wrap text-md leading-6 text-ink">{text}</p>
            {sources.length > 0 && <p className="mt-3 text-2xs leading-5 text-muted">I used: {sources.join(" · ")}</p>}
            {onClose && (
                <button type="button" onClick={onClose} className="mt-3 text-xs font-semibold text-brand underline-offset-4 hover:underline">
                    Dismiss
                </button>
            )}
        </div>
    );
}
