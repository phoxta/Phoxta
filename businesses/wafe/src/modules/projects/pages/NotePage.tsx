import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, Trash2 } from "lucide-react";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, Notice, PageTitle } from "@/components/shared";
import { Button, EmptyState, Tag } from "@/components/ui/primitives";
import projectsModule from "../module";
import { BASE, noteById, projectById } from "../derive";
import { NoteEditor } from "../components/NoteEditor";
import { Select } from "../components/dialogs";
import { SENSITIVITY_LABEL, type Sensitivity } from "../types";

/**
 * One note, open on the canvas.
 *
 * A note belonging to an archived project is shown but not editable, like
 * everything else on an archived project. The sensitivity class is a parent's
 * to set: filing something as financial, health, documents or private is what
 * keeps it out of a child's slice altogether, so it is not a label a child can
 * remove from their own work.
 */

export default function NotePage() {
    const { id = "", noteId = "" } = useParams();
    const navigate = useNavigate();
    const { state, mutate, loading, error } = useModule(projectsModule);
    const { me, role } = useSpace();
    const [killOpen, setKillOpen] = useState(false);
    const [titleDraft, setTitleDraft] = useState<string | null>(null);

    if (loading && !state) return <p className="text-md text-muted">Opening the note…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const note = noteById(state, noteId);
    const backTo = id === "vault" || !note?.projectId ? `${BASE}/vault` : `${BASE}/${note.projectId}?tab=vault`;

    if (!note) {
        return (
            <div>
                <PageTitle title="Not here" sub="This note has been deleted, or it was never yours to read." area="execute" />
                <EmptyState title="Nothing to show" body="Notes classed as anything but general stay with the parents, whatever the project says." action={<Link to={`${BASE}/vault`} className="text-sm font-semibold text-brand underline">Back to the vault</Link>} />
            </div>
        );
    }

    const project = note.projectId ? projectById(state, note.projectId) : undefined;
    const parent = role === "parent";
    const readOnly = role === "guest" || Boolean(project?.archived) || !(parent || note.ownerMemberId === me.id);

    return (
        <div className="max-w-3xl">
            <Link to={backTo} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> {project ? project.title : "Research vault"}
            </Link>

            <PageTitle
                title={note.title}
                sub={`${note.folder}${project ? ` · ${project.title}` : ""}`}
                area="execute"
                actions={
                    readOnly ? undefined : (
                        <Button variant="ghost" size="md" onClick={() => setKillOpen(true)}>
                            <Trash2 size={14} aria-hidden="true" /> Delete
                        </Button>
                    )
                }
            />

            {project?.archived && (
                <Notice tone="info" className="mb-6">
                    This note belongs to an archived project, so it is read-only.
                </Notice>
            )}

            {note.sensitivity !== "general" && (
                <p className="mb-6 flex items-center gap-2 rounded-lg bg-peach-soft px-4 py-3 text-sm text-peach">
                    <Lock size={14} aria-hidden="true" /> Classed {SENSITIVITY_LABEL[note.sensitivity].toLowerCase()} — this never reaches a child or a guest, whatever the project's visibility says.
                </p>
            )}

            {!readOnly && (
                <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Title</span>
                        <input
                            value={titleDraft ?? note.title}
                            onChange={(e) => setTitleDraft(e.target.value)}
                            onBlur={() => {
                                if (titleDraft !== null && titleDraft.trim() && titleDraft !== note.title) void mutate((r) => r.updateNote(note.id, { title: titleDraft.trim() }));
                                setTitleDraft(null);
                            }}
                            className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                        />
                    </label>
                    {parent ? (
                        <Select label="Sensitivity" value={note.sensitivity} onChange={(v) => void mutate((r) => r.updateNote(note.id, { sensitivity: v as Sensitivity }))}>
                            {(Object.keys(SENSITIVITY_LABEL) as Sensitivity[]).map((s) => (
                                <option key={s} value={s}>
                                    {SENSITIVITY_LABEL[s]}
                                </option>
                            ))}
                        </Select>
                    ) : (
                        <div>
                            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Sensitivity</span>
                            <Tag tone="neutral">{SENSITIVITY_LABEL[note.sensitivity]}</Tag>
                        </div>
                    )}
                </div>
            )}

            <div className="rounded-xl bg-card p-4 md:p-5">
                <NoteEditor blocks={note.blocks} readOnly={readOnly} onSave={async (blocks) => void (await mutate((r) => r.updateNote(note.id, { blocks })))} />
            </div>

            {note.tags.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                    {note.tags.map((t) => (
                        <li key={t} className="rounded-full bg-page px-2.5 py-1 text-2xs font-medium text-muted">
                            #{t}
                        </li>
                    ))}
                </ul>
            )}

            <Confirm
                open={killOpen}
                onClose={() => setKillOpen(false)}
                title="Delete this note?"
                body={note.title}
                confirmLabel="Delete"
                danger
                onConfirm={async () => {
                    await mutate((r) => r.removeNote(note.id));
                    navigate(backTo);
                }}
            />
        </div>
    );
}
