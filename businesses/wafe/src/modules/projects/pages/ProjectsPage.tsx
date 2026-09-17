import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, FolderKanban, Gavel, Library, Plus, Scissors } from "lucide-react";
import { cn } from "@/lib/cn";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Button, EmptyState, SearchBox } from "@/components/ui/primitives";
import projectsModule from "../module";
import { BASE, activeProjects, boardProgress, headlineDecision, tagCounts } from "../derive";
import { ProjectTile, TagRow } from "../components/pieces";
import { ProjectDialog } from "../components/dialogs";
import type { ProjectStatus } from "../types";

/**
 * The shelf of projects.
 *
 * A parent sees everything the family is building, with the archive folded
 * away underneath. A child sees the projects they are actually on, in bigger
 * type. A guest sees the one or two things that were handed to them by name,
 * and is told plainly that this is all there is.
 */

const FILTERS: Array<{ v: ProjectStatus | "all"; label: string }> = [
    { v: "all", label: "Everything" },
    { v: "active", label: "Active" },
    { v: "planning", label: "Planning" },
    { v: "paused", label: "Paused" },
    { v: "done", label: "Finished" },
];

export default function ProjectsPage() {
    const { state, mutate, loading, error } = useModule(projectsModule);
    const { me, role, today } = useSpace();
    const [filter, setFilter] = useState<ProjectStatus | "all">("all");
    const [tag, setTag] = useState("");
    const [q, setQ] = useState("");
    const [showArchive, setShowArchive] = useState(false);
    const [newOpen, setNewOpen] = useState(false);

    const child = role === "child";
    const guest = role === "guest";
    const canCreate = role === "parent" || (child && me.ageBand === "young-adult");

    const live = useMemo(() => {
        if (!state) return [];
        const needle = q.trim().toLowerCase();
        return activeProjects(state)
            .filter((p) => (filter === "all" ? true : p.status === filter))
            .filter((p) => (tag ? p.tags.includes(tag) : true))
            .filter((p) => (needle ? `${p.title} ${p.summary} ${p.tags.join(" ")}`.toLowerCase().includes(needle) : true))
            .sort((a, b) => {
                const rank = { active: 0, planning: 1, paused: 2, done: 3 } as const;
                return rank[a.status] - rank[b.status] || a.title.localeCompare(b.title);
            });
    }, [state, filter, tag, q]);

    if (loading && !state) return <p className="text-md text-muted">Opening the workshop…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const archived = state.projects.filter((p) => p.archived);
    const tags = tagCounts(state).slice(0, 12);

    // ---- Guest: named objects only ----------------------------------------
    if (guest) {
        return (
            <div>
                <PageTitle title="Shared with you" sub="The projects this family has handed you by name. Nothing else of theirs is here — and nothing here is yours to change." area="execute" />
                {state.projects.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {state.projects.map((p) => (
                            <ProjectTile key={p.id} project={p} state={state} />
                        ))}
                    </ul>
                ) : (
                    <EmptyState icon={<FolderKanban size={20} aria-hidden="true" />} title="Nothing has been shared with you yet" body="When the family shares a project, it will appear here — and only that project." />
                )}
            </div>
        );
    }

    // ---- Child: the projects I'm actually on -------------------------------
    if (child) {
        return (
            <div>
                <PageTitle
                    title="My projects"
                    sub="The bigger things you're part of, and what's next on each."
                    area="execute"
                    actions={canCreate ? <Button onClick={() => setNewOpen(true)}><Plus size={16} aria-hidden="true" /> New project</Button> : undefined}
                />
                {live.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                        {live.map((p) => (
                            <ProjectTile key={p.id} project={p} state={state} />
                        ))}
                    </ul>
                ) : (
                    <EmptyModule title="You're not on a project yet" body={canCreate ? "Start one of your own — a website, a bake sale, a bike rebuild." : "When a parent adds you to one, it will show up here."} action={canCreate ? <Button onClick={() => setNewOpen(true)}>Start a project</Button> : undefined} />
                )}
                <ProjectDialog open={newOpen} onClose={() => setNewOpen(false)} onSave={async (input) => void (await mutate((r) => r.createProject(input)))} />
            </div>
        );
    }

    // ---- Parent ------------------------------------------------------------
    const dueThisWeek = activeProjects(state).reduce((n, p) => n + boardProgress(state, p.id, today).overdue, 0);
    const decisions = state.decisions.length;
    const clips = state.clips.length;

    return (
        <div>
            <PageTitle
                title="Projects & research vault"
                sub="The bigger pieces of work — with their boards, budgets, clippings, comparisons and the decisions they led to, all in one place."
                area="execute"
                actions={
                    <Button onClick={() => setNewOpen(true)}>
                        <Plus size={16} aria-hidden="true" /> New project
                    </Button>
                }
            />

            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Running" value={activeProjects(state).length} sub={`${archived.length} archived`} tone="execute" />
                <Stat label="Slipped" value={dueThisWeek} sub="cards past their date" tone={dueThisWeek ? "warn" : "neutral"} />
                <Stat label="Decisions" value={decisions} sub="written down and kept" />
                <Stat label="In the vault" value={clips} sub={`${state.notes.length} notes`} />
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <SearchBox value={q} onChange={setQ} placeholder="Search projects…" className="min-w-[220px] flex-1" />
                <Link to={`${BASE}/vault`} className="inline-flex h-[46px] items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-sm font-semibold hover:border-ink">
                    <Library size={15} aria-hidden="true" /> Research vault
                </Link>
                <Link to={`${BASE}/clip`} className="inline-flex h-[46px] items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-sm font-semibold hover:border-ink">
                    <Scissors size={15} aria-hidden="true" /> Clip a page
                </Link>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                    <button key={f.v} type="button" onClick={() => setFilter(f.v)} aria-pressed={filter === f.v} className={cn("h-9 rounded-full border px-4 text-sm font-medium", filter === f.v ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}>
                        {f.label}
                    </button>
                ))}
            </div>

            {tags.length > 0 && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    <TagRow tags={tags.map((t) => t.tag)} onPick={(t) => setTag(t === tag ? "" : t)} active={tag} />
                    {tag && (
                        <button type="button" onClick={() => setTag("")} className="text-xs font-semibold text-brand underline-offset-4 hover:underline">
                            Clear
                        </button>
                    )}
                </div>
            )}

            {live.length ? (
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {live.map((p) => (
                        <ProjectTile key={p.id} project={p} state={state} />
                    ))}
                </ul>
            ) : (
                <EmptyModule
                    title={state.projects.length ? "Nothing matches that" : "No projects yet"}
                    body={state.projects.length ? "Try another filter, or clear the search." : "A project is anything bigger than a task: a kitchen, a school search, a trip, a client job."}
                    action={<Button onClick={() => setNewOpen(true)}>Start a project</Button>}
                />
            )}

            {state.decisions.length > 0 && (
                <Section title="Decisions we made" className="mt-10">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {state.decisions
                            .slice()
                            .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
                            .slice(0, 4)
                            .map((d) => {
                                const p = state.projects.find((x) => x.id === d.projectId);
                                return (
                                    <li key={d.id}>
                                        <Link to={`${BASE}/${d.projectId}`} className="flex h-full flex-col rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                                            <span className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.06em] text-execute-ink">
                                                <Gavel size={12} aria-hidden="true" /> {p?.title ?? "Project"}
                                            </span>
                                            <span className="mt-2 font-display text-[17px] leading-6">{d.decision}</span>
                                            <span className="clamp-2 mt-1.5 text-sm leading-5 text-muted">{d.because}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                    </ul>
                </Section>
            )}

            {archived.length > 0 && (
                <Section
                    title="Archive"
                    className="mt-10"
                    action={
                        <button type="button" onClick={() => setShowArchive((v) => !v)} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                            {showArchive ? "Hide" : `Show ${archived.length}`}
                        </button>
                    }
                >
                    {showArchive ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {archived.map((p) => (
                                <ProjectTile key={p.id} project={p} state={state} />
                            ))}
                        </ul>
                    ) : (
                        <p className="rounded-xl bg-card px-4 py-3 text-sm text-muted">
                            <Archive size={14} className="mr-1.5 inline align-[-2px]" aria-hidden="true" />
                            {archived.length} finished project{archived.length === 1 ? "" : "s"}, kept read-only for the reasons in them:{" "}
                            {archived
                                .slice(0, 3)
                                .map((p) => headlineDecision(state, p)?.decision ?? p.title)
                                .join(" · ")}
                        </p>
                    )}
                </Section>
            )}

            {state.clips.length > 0 && (
                <Section
                    title="Latest from the vault"
                    className="mt-10"
                    action={
                        <Link to={`${BASE}/vault`} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                            Open the vault
                        </Link>
                    }
                >
                    <ul className="flex flex-wrap gap-2">
                        {state.clips
                            .slice()
                            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                            .slice(0, 6)
                            .map((c) => (
                                <li key={c.id}>
                                    <a href={c.url} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-[280px] items-center gap-2 rounded-full bg-card px-3.5 py-2 text-sm hover:shadow-hover">
                                        <span className="truncate">{c.title}</span>
                                    </a>
                                </li>
                            ))}
                    </ul>
                </Section>
            )}

            <ProjectDialog open={newOpen} onClose={() => setNewOpen(false)} onSave={async (input) => void (await mutate((r) => r.createProject(input)))} />
        </div>
    );
}
