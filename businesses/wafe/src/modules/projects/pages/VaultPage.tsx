import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Library, Scissors, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, EmptyModule, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Button, SearchBox } from "@/components/ui/primitives";
import projectsModule from "../module";
import { BASE, folders, tagCounts } from "../derive";
import { ClipTile, NoteTile, TagRow } from "../components/pieces";
import type { Clip, Note } from "../types";

/**
 * The research vault: everything clipped and everything written, across every
 * project, in folders and tags rather than in a hierarchy nobody maintains.
 *
 * What is here is already filtered for the person looking — a child's vault
 * holds the child-safe clips on their own projects and the notes classed
 * `general`, and never sees that anything else exists.
 */

export default function VaultPage() {
    const { state, mutate, loading, error } = useModule(projectsModule);
    const { role } = useSpace();
    const navigate = useNavigate();
    const [folder, setFolder] = useState("");
    const [tag, setTag] = useState("");
    const [q, setQ] = useState("");
    const [killClip, setKillClip] = useState<Clip | null>(null);
    const [killNote, setKillNote] = useState<Note | null>(null);
    const [creating, setCreating] = useState(false);

    const guest = role === "guest";

    const { clips, notes } = useMemo(() => {
        if (!state) return { clips: [] as Clip[], notes: [] as Note[] };
        const needle = q.trim().toLowerCase();
        return {
            clips: state.clips
                .filter((c) => (folder ? c.folder === folder : true))
                .filter((c) => (tag ? c.tags.includes(tag) : true))
                .filter((c) => (needle ? `${c.title} ${c.excerpt} ${c.snapshotText} ${c.tags.join(" ")}`.toLowerCase().includes(needle) : true))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
            notes: state.notes
                .filter((n) => (folder ? n.folder === folder : true))
                .filter((n) => (tag ? n.tags.includes(tag) : true))
                .filter((n) => (needle ? `${n.title} ${n.blocks.map((b) => b.text).join(" ")} ${n.tags.join(" ")}`.toLowerCase().includes(needle) : true))
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        };
    }, [state, folder, tag, q]);

    if (loading && !state) return <p className="text-md text-muted">Opening the vault…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const allFolders = folders(state);
    const tags = tagCounts(state).slice(0, 14);

    return (
        <div>
            <Link to={BASE} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> All projects
            </Link>

            <PageTitle
                title="Research vault"
                sub="Every clipping and every note, in one place — with the readable snapshot kept beside the link so nothing is lost when a page disappears."
                area="execute"
                actions={
                    guest ? undefined : (
                        <>
                            <Link to={`${BASE}/clip`} className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-md font-semibold text-white hover:bg-brand-hover">
                                <Scissors size={15} aria-hidden="true" /> Clip a page
                            </Link>
                            <Button
                                variant="outline"
                                loading={creating}
                                onClick={async () => {
                                    setCreating(true);
                                    try {
                                        let id = "";
                                        await mutate(async (r) => {
                                            const n = await r.createNote({ title: "Untitled note", folder: folder || "Inbox" });
                                            id = n.id;
                                            return n;
                                        });
                                        if (id) navigate(`${BASE}/vault/notes/${id}`);
                                    } finally {
                                        setCreating(false);
                                    }
                                }}
                            >
                                <FileText size={15} aria-hidden="true" /> New note
                            </Button>
                        </>
                    )
                }
            />

            <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                <Stat label="Clips" value={state.clips.length} sub={`${allFolders.length} folders`} tone="execute" />
                <Stat label="Notes" value={state.notes.length} />
                <Stat label="Tags" value={tagCounts(state).length} />
            </div>

            <div className="mb-5">
                <SearchBox value={q} onChange={setQ} placeholder="Search the vault…" />
            </div>

            {allFolders.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setFolder("")} aria-pressed={folder === ""} className={cn("h-9 rounded-full border px-4 text-sm font-medium", folder === "" ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}>
                        All folders
                    </button>
                    {allFolders.map((f) => (
                        <button key={f} type="button" onClick={() => setFolder(f === folder ? "" : f)} aria-pressed={folder === f} className={cn("h-9 rounded-full border px-4 text-sm font-medium", folder === f ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}>
                            {f}
                        </button>
                    ))}
                </div>
            )}

            {tags.length > 0 && <TagRow tags={tags.map((t) => t.tag)} onPick={(t) => setTag(t === tag ? "" : t)} active={tag} className="mb-8" />}

            <Section title={`Clips (${clips.length})`}>
                {clips.length ? (
                    <ul className="flex flex-col gap-3">
                        {clips.map((c) => (
                            <ClipTile
                                key={c.id}
                                clip={c}
                                action={
                                    guest ? undefined : (
                                        <button type="button" onClick={() => setKillClip(c)} aria-label={`Delete ${c.title}`} className="grid size-8 shrink-0 place-items-center rounded-full text-caption hover:text-danger-ink">
                                            <Trash2 size={14} aria-hidden="true" />
                                        </button>
                                    )
                                }
                            />
                        ))}
                    </ul>
                ) : (
                    <EmptyModule
                        title={state.clips.length ? "Nothing matches that" : "Nothing clipped yet"}
                        body={state.clips.length ? "Try another folder, tag or search." : "The vault is where the reading goes: a link, a picture, and a snapshot that outlives the page."}
                        action={guest ? undefined : <Link to={`${BASE}/clip`} className="text-sm font-semibold text-brand underline">Clip your first page</Link>}
                    />
                )}
            </Section>

            <Section title={`Notes (${notes.length})`}>
                {notes.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {notes.map((n) => (
                            <NoteTile
                                key={n.id}
                                note={n}
                                to={`${BASE}/${n.projectId ?? "vault"}/notes/${n.id}`}
                                action={
                                    guest ? undefined : (
                                        <button type="button" onClick={() => setKillNote(n)} aria-label={`Delete ${n.title}`} className="grid size-8 shrink-0 place-items-center rounded-full text-caption hover:text-danger-ink">
                                            <Trash2 size={14} aria-hidden="true" />
                                        </button>
                                    )
                                }
                            />
                        ))}
                    </ul>
                ) : (
                    <EmptyModule
                        title={state.notes.length ? "No notes match that" : "No notes yet"}
                        body="A note is a canvas: headings, bullets, checkboxes and the odd quote — for the call you just had or the method you worked out."
                    />
                )}
            </Section>

            {!guest && state.clips.length > 0 && (
                <p className="mt-8 flex items-center gap-2 text-xs text-caption">
                    <Library size={14} aria-hidden="true" /> Clips keep a readable snapshot, so they still make sense when the link stops working.
                </p>
            )}

            <Confirm open={Boolean(killClip)} onClose={() => setKillClip(null)} title="Delete this clip?" body={killClip?.title} confirmLabel="Delete" danger onConfirm={() => (killClip ? mutate((r) => r.removeClip(killClip.id)) : Promise.resolve())} />
            <Confirm open={Boolean(killNote)} onClose={() => setKillNote(null)} title="Delete this note?" body={killNote?.title} confirmLabel="Delete" danger onConfirm={() => (killNote ? mutate((r) => r.removeNote(killNote.id)) : Promise.resolve())} />
        </div>
    );
}
