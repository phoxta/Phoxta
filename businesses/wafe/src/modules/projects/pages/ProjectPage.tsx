import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Archive, ArrowLeft, ArrowRight, Banknote, CalendarDays, Check, Gavel, Library, Pencil, Plus, Scissors, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { dueLabel, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, EmptyModule, MemberChips, Money, Notice, PageTitle, Section } from "@/components/shared";
import { Button, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import projectsModule from "../module";
import {
    BASE,
    boardProgress,
    clipsOf,
    columns,
    comparisonsOf,
    costsOf,
    daysLeft,
    decisionsOf,
    elapsedPct,
    canWorkOnProject,
    headlineDecision,
    notesOf,
    projectById,
    timeline,
} from "../derive";
import { BudgetBar, ClipTile, DecisionCard, KindTag, NoteTile, PrivateTag, StatusTag, TagRow, useBudgetLine, useLinkedTasks } from "../components/pieces";
import { CardDialog, ComparisonDialog, CostDialog, DecisionDialog, ProjectDialog } from "../components/dialogs";
import { ComparisonTable } from "../components/ComparisonTable";
import { AskCompanion } from "../components/AskCompanion";
import { CARD_STATUS, CARD_STATUS_LABEL, PROJECT_ROLE_LABEL, type CardStatus, type Comparison, type ProjectCard, type ProjectRole } from "../types";

/**
 * One project: its board, its dates, its money, its research and the decision
 * that closed it.
 *
 * The board is one board. The cards are the project's own; the rows tagged
 * "From Tasks" are the very Task rows that name this project, read from the
 * Tasks slice and shown here read-only — this module writes its own tables
 * and nobody else's.
 *
 * When the project is archived, `readOnly` is true for everyone and every
 * control that would write is simply not rendered. The repo refuses the write
 * as well, so the screen and the rule agree.
 */

const TABS = [
    { id: "board", label: "Board" },
    { id: "timeline", label: "Timeline" },
    { id: "vault", label: "Research" },
    { id: "compare", label: "Compare" },
    { id: "decisions", label: "Decisions" },
    { id: "money", label: "Money" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ProjectPage() {
    const { id = "" } = useParams();
    const { state, mutate, loading, error } = useModule(projectsModule);
    const { me, role, members, today, mutateCore } = useSpace();
    const [params, setParams] = useSearchParams();
    const [editOpen, setEditOpen] = useState(false);
    const [cardOpen, setCardOpen] = useState<CardStatus | null>(null);
    const [editCard, setEditCard] = useState<ProjectCard | null>(null);
    const [compareOpen, setCompareOpen] = useState(false);
    const [decideFor, setDecideFor] = useState<Comparison | "free" | null>(null);
    const [costOpen, setCostOpen] = useState(false);
    const [confirmArchive, setConfirmArchive] = useState(false);
    const [removeCard, setRemoveCard] = useState<ProjectCard | null>(null);

    const linked = useLinkedTasks(id);
    const project = useMemo(() => (state ? projectById(state, id) : undefined), [state, id]);
    const line = useBudgetLine(state, project);

    if (loading && !state) return <p className="text-md text-muted">Opening the project…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;
    if (!project) {
        return (
            <div>
                <PageTitle title="Not here" sub="This project has been removed, or it was never yours to see." area="execute" />
                <EmptyState icon={<Library size={20} aria-hidden="true" />} title="Nothing to show" body="Projects reach you only when you are on them, or when they were shared with you by name." action={<Link to={BASE} className="text-sm font-semibold text-brand underline">Back to projects</Link>} />
            </div>
        );
    }

    const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "board") as TabId;
    const setTab = (t: TabId) => setParams(t === "board" ? {} : { tab: t }, { replace: true });

    const parent = role === "parent";
    const onProject = canWorkOnProject(project, me.id);
    const readOnly = project.archived || role === "guest" || !(parent || onProject);
    const canRun = !project.archived && (parent || project.ownerMemberId === me.id);
    const canWork = !readOnly;

    const cols = columns(state, project.id);
    const prog = boardProgress(state, project.id, today, linked);
    const decision = headlineDecision(state, project);
    const clips = clipsOf(state, project.id);
    const notes = notesOf(state, project.id);
    const comparisons = comparisonsOf(state, project.id);
    const decisions = decisionsOf(state, project.id);
    const costs = costsOf(state, project.id);
    const left = daysLeft(project, today);
    const visibleTabs = TABS.filter((t) => t.id !== "money" || parent);

    /** Completing a card credits a child's points through the core, once. */
    const complete = async (card: ProjectCard, done: boolean) => {
        let result: { memberIds: string[]; points: number } = { memberIds: [], points: 0 };
        await mutate(async (r) => {
            result = await r.completeCard(card.id, done);
        });
        if (result.points > 0) {
            for (const memberId of result.memberIds) {
                await mutateCore((core) => core.addPoints(memberId, result.points, `${card.title} · ${project.title}`));
            }
        }
    };

    const move = (card: ProjectCard, dir: -1 | 1) => {
        const at = CARD_STATUS.indexOf(card.status);
        const next = CARD_STATUS[Math.max(0, Math.min(CARD_STATUS.length - 1, at + dir))];
        if (next === card.status) return;
        if (next === "done" || card.status === "done") return void complete(card, next === "done");
        void mutate((r) => r.moveCard(card.id, next, 0));
    };

    return (
        <div>
            <Link to={BASE} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> All projects
            </Link>

            <PageTitle
                title={project.title}
                sub={project.summary}
                area="execute"
                actions={
                    canRun ? (
                        <>
                            <Button variant="outline" size="md" onClick={() => setEditOpen(true)}>
                                <Pencil size={14} aria-hidden="true" /> Edit
                            </Button>
                            <Button variant="ghost" size="md" onClick={() => setConfirmArchive(true)}>
                                <Archive size={14} aria-hidden="true" /> Archive
                            </Button>
                        </>
                    ) : project.archived && parent ? (
                        <Button variant="outline" size="md" onClick={() => void mutate((r) => r.setArchived(project.id, false))}>
                            Restore
                        </Button>
                    ) : undefined
                }
            />

            {project.archived && (
                <Notice tone="info" className="mb-6">
                    This project is archived and read-only — for everyone. {parent ? "Restore it to make changes." : "A parent can restore it."}
                </Notice>
            )}

            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[1fr_320px]">
                <div className="rounded-xl bg-card p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <StatusTag project={project} />
                        <KindTag project={project} />
                        <PrivateTag visibility={project.visibility} />
                        {project.goalLabel && <Tag tone="brand">{project.goalLabel}</Tag>}
                        {project.valueId && <Tag tone="live">{project.valueId}</Tag>}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
                        <span className="flex items-center gap-1.5">
                            <CalendarDays size={14} aria-hidden="true" /> {shortDate(project.startDate)}
                            {project.endDate ? ` → ${shortDate(project.endDate)}` : " → open-ended"}
                        </span>
                        {left !== null && !project.archived && <span className={cn(left < 0 ? "text-danger-ink" : left <= 7 ? "text-peach" : "")}>{left < 0 ? `${-left} days over` : left === 0 ? "Lands today" : `${left} days left`}</span>}
                        <span className="flex items-center gap-1.5">
                            <Users size={14} aria-hidden="true" />
                            <MemberChips memberIds={[...new Set([project.ownerMemberId, ...project.members.map((m) => m.memberId)])]} max={5} />
                        </span>
                    </div>

                    <div className="mt-4">
                        <div className="flex items-baseline justify-between text-sm">
                            <span className="font-semibold">
                                {prog.done} of {prog.total} done
                            </span>
                            <span className="tabular-nums text-caption">{prog.pct}%</span>
                        </div>
                        <ProgressBar value={prog.pct} className="mt-2" label="Board progress" />
                        {project.endDate && <p className="mt-1.5 text-2xs text-caption">{elapsedPct(project, today)}% of the time has gone.</p>}
                    </div>

                    <TagRow tags={project.tags} className="mt-4" />
                </div>

                <div className="flex flex-col gap-4">
                    {decision ? <DecisionCard decision={decision} /> : canRun ? (
                        <div className="rounded-lg border border-dashed border-line-strong p-4">
                            <p className="text-sm leading-5 text-muted">No decision recorded yet. When you choose, write down why — it is the part everyone forgets.</p>
                            <Button size="sm" variant="outline" className="mt-3" onClick={() => setDecideFor("free")}>
                                <Gavel size={14} aria-hidden="true" /> Record a decision
                            </Button>
                        </div>
                    ) : null}

                    {parent && line && line.budgetCents > 0 && (
                        <div className="rounded-xl bg-card p-4">
                            <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold">
                                <Banknote size={14} aria-hidden="true" /> Budget
                            </h2>
                            <BudgetBar line={line} />
                            {line.over && <p className="mt-2 text-xs text-danger-ink">Over by <Money cents={line.spentCents - line.budgetCents} />.</p>}
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line no-scrollbar" role="tablist" aria-label="Project sections">
                {visibleTabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={cn("shrink-0 border-b-2 px-3.5 pb-2.5 pt-1 text-md font-medium", tab === t.id ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink")}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ---- Board ---------------------------------------------------- */}
            {tab === "board" && (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
                    {CARD_STATUS.map((status) => {
                        const list = cols[status];
                        const linkedHere = linked.filter((t) => (status === "done" ? t.done : status === "doing" ? !t.done && t.status === "doing" : !t.done && t.status !== "doing"));
                        return (
                            <section key={status} className="rounded-xl bg-card p-3">
                                <header className="mb-2.5 flex items-center justify-between px-1">
                                    <h2 className="text-md font-semibold">
                                        {CARD_STATUS_LABEL[status]} <span className="ml-1 text-caption">{list.length + linkedHere.length}</span>
                                    </h2>
                                    {canWork && (
                                        <button type="button" onClick={() => setCardOpen(status)} aria-label={`Add a card to ${CARD_STATUS_LABEL[status]}`} className="grid size-7 place-items-center rounded-full text-muted hover:bg-page hover:text-ink">
                                            <Plus size={15} aria-hidden="true" />
                                        </button>
                                    )}
                                </header>
                                <ul className="flex flex-col gap-2">
                                    {list.map((c) => {
                                        const due = c.dueAt ? dueLabel(c.dueAt, new Date(today)) : null;
                                        const checks = c.checklist.filter((i) => i.done).length;
                                        return (
                                            <li key={c.id} className="rounded-lg bg-page p-3">
                                                <div className="flex items-start gap-2.5">
                                                    {canWork ? (
                                                        <input type="checkbox" checked={c.status === "done"} onChange={(e) => void complete(c, e.target.checked)} aria-label={`Done: ${c.title}`} className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]" />
                                                    ) : (
                                                        <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-[4px] border", c.status === "done" ? "border-brand bg-brand text-white" : "border-line-strong")} aria-hidden="true">
                                                            {c.status === "done" && <Check size={10} strokeWidth={3} />}
                                                        </span>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className={cn("text-md font-medium leading-5", c.status === "done" && "text-muted line-through")}>{c.title}</p>
                                                        {c.notes && <p className="clamp-2 mt-1 text-xs leading-5 text-muted">{c.notes}</p>}
                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            {due && c.status !== "done" && <span className={cn("text-2xs font-medium", due.tone === "danger" ? "text-danger-ink" : due.tone === "warn" ? "text-peach" : "text-caption")}>{due.text}</span>}
                                                            {c.checklist.length > 0 && (
                                                                <span className="text-2xs text-caption">
                                                                    {checks}/{c.checklist.length} ticked
                                                                </span>
                                                            )}
                                                            <MemberChips memberIds={c.assigneeMemberIds} max={3} />
                                                        </div>
                                                    </div>
                                                </div>
                                                {canWork && (
                                                    <div className="mt-2 flex items-center justify-end gap-0.5">
                                                        <button type="button" onClick={() => move(c, -1)} disabled={status === "todo"} aria-label={`Move ${c.title} left`} className="grid size-7 place-items-center rounded-full text-caption hover:text-ink disabled:opacity-30">
                                                            <ArrowLeft size={14} aria-hidden="true" />
                                                        </button>
                                                        <button type="button" onClick={() => move(c, 1)} disabled={status === "done"} aria-label={`Move ${c.title} right`} className="grid size-7 place-items-center rounded-full text-caption hover:text-ink disabled:opacity-30">
                                                            <ArrowRight size={14} aria-hidden="true" />
                                                        </button>
                                                        <button type="button" onClick={() => setEditCard(c)} aria-label={`Edit ${c.title}`} className="grid size-7 place-items-center rounded-full text-caption hover:text-ink">
                                                            <Pencil size={13} aria-hidden="true" />
                                                        </button>
                                                        <button type="button" onClick={() => setRemoveCard(c)} aria-label={`Delete ${c.title}`} className="grid size-7 place-items-center rounded-full text-caption hover:text-danger-ink">
                                                            <Trash2 size={13} aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}

                                    {linkedHere.map((t) => (
                                        <li key={t.id} className="rounded-lg border border-dashed border-line-strong p-3">
                                            <Link to={`/execute/tasks/${t.id}`} className="block">
                                                <span className="flex items-center gap-2">
                                                    <Tag tone="neutral">From Tasks</Tag>
                                                    {t.dueAt && <span className="text-2xs text-caption">{shortDate(t.dueAt)}</span>}
                                                </span>
                                                <span className={cn("mt-1.5 block text-md font-medium leading-5", t.done && "text-muted line-through")}>{t.title}</span>
                                            </Link>
                                            <MemberChips memberIds={t.assigneeMemberIds} max={3} className="mt-2" />
                                        </li>
                                    ))}

                                    {list.length === 0 && linkedHere.length === 0 && <li className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-caption">Nothing here</li>}
                                </ul>
                            </section>
                        );
                    })}
                </div>
            )}

            {/* ---- Timeline ------------------------------------------------- */}
            {tab === "timeline" && (
                <div>
                    {project.endDate && (
                        <div className="mb-5 rounded-xl bg-card p-4">
                            <div className="flex items-baseline justify-between text-sm">
                                <span>{shortDate(project.startDate)}</span>
                                <span className="text-caption">{elapsedPct(project, today)}% elapsed</span>
                                <span>{shortDate(project.endDate)}</span>
                            </div>
                            <ProgressBar value={elapsedPct(project, today)} className="mt-2" label="Time elapsed" />
                        </div>
                    )}
                    {timeline(state, project.id, linked).length ? (
                        <ol className="flex flex-col gap-5">
                            {timeline(state, project.id, linked).map((wk) => (
                                <li key={wk.week}>
                                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.06em] text-muted">{wk.week}</h2>
                                    <ul className="flex flex-col gap-1.5">
                                        {wk.items.map((it) => (
                                            <li key={it.id} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3">
                                                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", it.done ? "border-brand bg-brand text-white" : "border-line-strong")} aria-hidden="true">
                                                    {it.done && <Check size={11} strokeWidth={3} />}
                                                </span>
                                                <span className={cn("min-w-0 flex-1 text-md", it.done && "text-muted line-through")}>{it.title}</span>
                                                {it.linked && <Tag tone="neutral">From Tasks</Tag>}
                                                <span className="shrink-0 text-xs tabular-nums text-caption">{shortDate(it.dueAt)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <EmptyModule title="Nothing is dated yet" body="Put a date on a card and it lands on the timeline." />
                    )}
                </div>
            )}

            {/* ---- Research ------------------------------------------------- */}
            {tab === "vault" && (
                <div className="flex flex-col gap-8">
                    <AskCompanion
                        project={project}
                        clips={clips}
                        folder={clips[0]?.folder ?? project.title}
                        readOnly={!canWork}
                        onAddCards={async (cards) => {
                            for (const c of cards) await mutate((r) => r.addCard(c));
                        }}
                        onCreateComparison={async (input) => void (await mutate((r) => r.createComparison(input)))}
                    />

                    <Section
                        title={`Clips (${clips.length})`}
                        action={
                            canWork ? (
                                <Link to={`${BASE}/clip?project=${project.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                                    <Scissors size={14} aria-hidden="true" /> Clip a page
                                </Link>
                            ) : undefined
                        }
                    >
                        {clips.length ? (
                            <ul className="flex flex-col gap-3">
                                {clips.map((c) => (
                                    <ClipTile
                                        key={c.id}
                                        clip={c}
                                        action={
                                            canWork ? (
                                                <button type="button" onClick={() => void mutate((r) => r.removeClip(c.id))} aria-label={`Delete ${c.title}`} className="grid size-8 shrink-0 place-items-center rounded-full text-caption hover:text-danger-ink">
                                                    <Trash2 size={14} aria-hidden="true" />
                                                </button>
                                            ) : undefined
                                        }
                                    />
                                ))}
                            </ul>
                        ) : (
                            <EmptyModule title="Nothing clipped yet" body="Save the page you keep re-finding, with a readable snapshot so it survives the link rotting." action={canWork ? <Link to={`${BASE}/clip?project=${project.id}`} className="text-sm font-semibold text-brand underline">Clip a page</Link> : undefined} />
                        )}
                    </Section>

                    <Section
                        title={`Notes (${notes.length})`}
                        action={
                            canWork ? (
                                <button type="button" onClick={() => void mutate(async (r) => { const n = await r.createNote({ projectId: project.id, title: "Untitled note", folder: project.title }); return n; })} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                                    New note
                                </button>
                            ) : undefined
                        }
                    >
                        {notes.length ? (
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                                {notes.map((n) => (
                                    <NoteTile key={n.id} note={n} to={`${BASE}/${project.id}/notes/${n.id}`} />
                                ))}
                            </ul>
                        ) : (
                            <EmptyModule title="No notes on this project" body="A notes canvas for the call you just had, the method, the measurements." />
                        )}
                    </Section>
                </div>
            )}

            {/* ---- Compare -------------------------------------------------- */}
            {tab === "compare" && (
                <div className="flex flex-col gap-5">
                    {canWork && (
                        <div>
                            <Button variant="outline" onClick={() => setCompareOpen(true)}>
                                <Plus size={15} aria-hidden="true" /> New comparison
                            </Button>
                        </div>
                    )}
                    {comparisons.length ? (
                        comparisons.map((c) => (
                            <ComparisonTable
                                key={c.id}
                                state={state}
                                comparison={c}
                                readOnly={!canWork}
                                decided={decisions.find((d) => d.comparisonId === c.id)?.decision}
                                onScore={(optionKey, criterionKey, score) => void mutate((r) => r.setScore(c.id, optionKey, criterionKey, score))}
                                onDecide={canRun ? () => setDecideFor(c) : undefined}
                                onRemove={canWork ? () => void mutate((r) => r.removeComparison(c.id)) : undefined}
                            />
                        ))
                    ) : (
                        <EmptyModule title="Nothing to weigh up yet" body="A comparison is options down the side, what matters across the top, and a weight on each. The ranking follows the scores." action={canWork ? <Button onClick={() => setCompareOpen(true)}>Build one</Button> : undefined} />
                    )}
                </div>
            )}

            {/* ---- Decisions ------------------------------------------------ */}
            {tab === "decisions" && (
                <div className="flex flex-col gap-4">
                    {canRun && (
                        <div>
                            <Button variant="outline" onClick={() => setDecideFor("free")}>
                                <Gavel size={15} aria-hidden="true" /> Record a decision
                            </Button>
                        </div>
                    )}
                    {decisions.length ? (
                        <ul className="flex flex-col gap-3">
                            {decisions.map((d) => (
                                <li key={d.id}>
                                    <DecisionCard decision={d} />
                                    {canRun && (
                                        <div className="mt-1.5 flex justify-end gap-3">
                                            {project.decisionId !== d.id && (
                                                <button type="button" onClick={() => void mutate((r) => r.updateProject(project.id, { decisionId: d.id }))} className="text-xs font-semibold text-brand underline-offset-4 hover:underline">
                                                    Show on the header
                                                </button>
                                            )}
                                            <button type="button" onClick={() => void mutate((r) => r.removeDecision(d.id))} className="text-xs font-semibold text-caption underline-offset-4 hover:text-danger-ink hover:underline">
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyModule title="Nothing decided yet" body="'We chose X because…' — written at the time, it is worth more than the whole comparison in a year." />
                    )}
                </div>
            )}

            {/* ---- Money ---------------------------------------------------- */}
            {tab === "money" && parent && (
                <div className="flex flex-col gap-6">
                    {line && line.budgetCents > 0 && (
                        <div className="rounded-xl bg-card p-4">
                            <BudgetBar line={line} />
                        </div>
                    )}
                    <Section
                        title="Cost lines"
                        action={
                            !project.archived ? (
                                <Button size="sm" variant="outline" onClick={() => setCostOpen(true)}>
                                    <Plus size={14} aria-hidden="true" /> Add a cost
                                </Button>
                            ) : undefined
                        }
                    >
                        {costs.length ? (
                            <div className="overflow-x-auto rounded-xl bg-card">
                                <table className="w-full min-w-[420px] text-sm">
                                    <caption className="sr-only">Costs booked against {project.title}</caption>
                                    <thead>
                                        <tr className="border-b border-line text-left text-muted">
                                            <th scope="col" className="px-4 py-2.5 font-medium">What for</th>
                                            <th scope="col" className="px-4 py-2.5 font-medium">Stage</th>
                                            <th scope="col" className="px-4 py-2.5 font-medium">Dated</th>
                                            <th scope="col" className="px-4 py-2.5 text-right font-medium">Amount</th>
                                            <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {costs.map((c) => (
                                            <tr key={c.id} className="border-b border-line last:border-0">
                                                <td className="px-4 py-2.5">{c.label}</td>
                                                <td className="px-4 py-2.5 capitalize text-muted">{c.stage}</td>
                                                <td className="px-4 py-2.5 text-muted">{shortDate(c.paidOn)}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums">
                                                    <Money cents={c.amountCents} />
                                                </td>
                                                <td className="px-2 py-2.5 text-right">
                                                    {!project.archived && (
                                                        <button type="button" onClick={() => void mutate((r) => r.removeCost(c.id))} aria-label={`Delete ${c.label}`} className="grid size-8 place-items-center rounded-full text-caption hover:text-danger-ink">
                                                            <Trash2 size={14} aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyModule title="No costs booked here" body={line?.source === "finance" ? "Spending is coming from Finance for this project." : "Add the quotes and invoices as they land, so the budget line is real."} />
                        )}
                    </Section>

                    <Section title="The team">
                        <ul className="flex flex-col gap-2">
                            {[...new Set([project.ownerMemberId, ...project.members.map((m) => m.memberId)])].map((memberId) => {
                                const m = members.find((x) => x.id === memberId);
                                if (!m) return null;
                                const pr = project.members.find((x) => x.memberId === memberId)?.role ?? (memberId === project.ownerMemberId ? "owner" : "member");
                                return (
                                    <li key={memberId} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3">
                                        <span className="min-w-0 flex-1 text-md font-medium">{m.name}</span>
                                        {canRun && memberId !== project.ownerMemberId ? (
                                            <>
                                                <label className="sr-only" htmlFor={`role-${memberId}`}>
                                                    {m.name}&apos;s part
                                                </label>
                                                <select id={`role-${memberId}`} value={pr} onChange={(e) => void mutate((r) => r.setMemberRole(project.id, memberId, e.target.value as ProjectRole))} className="h-9 rounded-sm border border-line-strong bg-card px-2 text-sm">
                                                    {(Object.keys(PROJECT_ROLE_LABEL) as ProjectRole[]).map((x) => (
                                                        <option key={x} value={x}>
                                                            {PROJECT_ROLE_LABEL[x]}
                                                        </option>
                                                    ))}
                                                </select>
                                            </>
                                        ) : (
                                            <span className="text-sm text-muted">{PROJECT_ROLE_LABEL[pr]}</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </Section>
                </div>
            )}

            {/* ---- Dialogs -------------------------------------------------- */}
            <ProjectDialog open={editOpen} onClose={() => setEditOpen(false)} project={project} onSave={async (input) => void (await mutate((r) => r.updateProject(project.id, { title: input.title, summary: input.summary ?? "", kind: input.kind, status: input.status, ownerMemberId: input.ownerMemberId, startDate: input.startDate, endDate: input.endDate ?? null, budgetCents: input.budgetCents ?? null, financeCategoryId: input.financeCategoryId ?? null, financeCategoryLabel: input.financeCategoryLabel ?? "", goalLabel: input.goalLabel ?? "", valueId: input.valueId ?? null, tags: input.tags, visibility: input.visibility, sharedWith: input.sharedWith, childSafe: input.childSafe, members: (input.memberIds ?? []).map((memberId) => ({ memberId, role: memberId === input.ownerMemberId ? "owner" : "member" })) })))} />

            {cardOpen && <CardDialog open onClose={() => setCardOpen(null)} projectId={project.id} onSave={async (input) => void (await mutate((r) => r.addCard({ ...input, status: cardOpen })))} />}
            {editCard && <CardDialog open onClose={() => setEditCard(null)} projectId={project.id} card={editCard} onSave={async (input) => void (await mutate((r) => r.updateCard(editCard.id, { title: input.title, notes: input.notes, assigneeMemberIds: input.assigneeMemberIds, dueAt: input.dueAt ?? null })))} />}

            <ComparisonDialog open={compareOpen} onClose={() => setCompareOpen(false)} projectId={project.id} onSave={async (input) => void (await mutate((r) => r.createComparison(input)))} />

            {decideFor && (
                <DecisionDialog
                    open
                    onClose={() => setDecideFor(null)}
                    state={state}
                    projectId={project.id}
                    comparison={decideFor === "free" ? undefined : decideFor}
                    onSave={async (input) => void (await mutate((r) => r.recordDecision(input)))}
                />
            )}

            <CostDialog open={costOpen} onClose={() => setCostOpen(false)} onSave={async (input) => void (await mutate((r) => r.addCost(project.id, input)))} />

            <Confirm open={confirmArchive} onClose={() => setConfirmArchive(false)} title="Archive this project?" body="It stays here, with its decisions and its research — but nobody can change it again until a parent restores it." confirmLabel="Archive" onConfirm={() => mutate((r) => r.setArchived(project.id, true))} />

            <Confirm open={Boolean(removeCard)} onClose={() => setRemoveCard(null)} title="Delete this card?" body={removeCard?.title} confirmLabel="Delete" danger onConfirm={() => (removeCard ? mutate((r) => r.removeCard(removeCard.id)) : Promise.resolve())} />
        </div>
    );
}
