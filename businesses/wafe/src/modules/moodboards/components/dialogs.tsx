import { useMemo, useState, type FormEvent } from "react";
import { Globe, Info, Search, Upload } from "lucide-react";
import type { Visibility } from "@/data/core";
import { cn } from "@/lib/cn";
import { useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { MemberMultiPicker, MemberPicker, Notice, VisibilityPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, EmptyState, Field } from "@/components/ui/primitives";
import { LIBRARY, TEMPLATES, type LibraryItem } from "../library";
import { cacheUpload } from "../images";
import { BOARD_KINDS, KIND_LABEL, type Board, type BoardKind, type MoodboardsState, type NewBoard, type NewPin } from "../types";

/**
 * The two sheets that create things, and the one that moves them.
 *
 * The add-a-pin sheet has three sources and says plainly why there is no
 * fourth: we search the family's own pictures, not the web's. A URL is still
 * welcome — we fetch it and keep a copy — but nobody in this house is shown a
 * grid of strangers' photographs they did not ask for.
 */

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null;

/** Image-ish rows from another module's slice, found without knowing its shape. */
function scavenge(slice: unknown, moduleLabel: string): LibraryItem[] {
    if (!isRec(slice)) return [];
    const out: LibraryItem[] = [];
    for (const value of Object.values(slice)) {
        if (!Array.isArray(value)) continue;
        for (const raw of value) {
            if (!isRec(raw)) continue;
            const url = [raw.imageUrl, raw.url, raw.coverUrl, raw.photoUrl].find((v) => typeof v === "string" && /^(\/|data:image|https?:)/.test(v));
            if (typeof url !== "string") continue;
            const id = typeof raw.id === "string" ? raw.id : url;
            const title = [raw.title, raw.caption, raw.name, raw.label].find((v) => typeof v === "string" && v) as string | undefined;
            out.push({ id: `${moduleLabel}:${id}`, title: title ?? moduleLabel, url, tags: [moduleLabel.toLowerCase()], kinds: [] });
        }
    }
    return out.slice(0, 60);
}

/** Everything this family already owns a picture of. */
function useOwnLibrary(state: MoodboardsState): LibraryItem[] {
    const memories = useModuleState<unknown>("memories");
    const studio = useModuleState<unknown>("studio");
    return useMemo(() => {
        const seen = new Set<string>();
        const items: LibraryItem[] = [];
        const push = (i: LibraryItem) => {
            if (seen.has(i.url)) return;
            seen.add(i.url);
            items.push(i);
        };
        for (const p of state.pins) push({ id: `pin:${p.id}`, title: p.title || "Pinned", url: p.imageUrl, tags: p.tags, kinds: [] });
        scavenge(memories, "Memories").forEach(push);
        scavenge(studio, "Studio").forEach(push);
        LIBRARY.forEach(push);
        return items;
    }, [state.pins, memories, studio]);
}

// ---------------------------------------------------------------------------
// Add a pin
// ---------------------------------------------------------------------------

export function AddPinDialog({
    open,
    onClose,
    board,
    sections,
    defaultTitle,
    state,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    board: Board;
    sections: Array<{ id: string; title: string }>;
    defaultTitle?: string;
    state: MoodboardsState;
    onSave: (input: NewPin) => Promise<void>;
}) {
    const [tab, setTab] = useState<"url" | "upload" | "library">("library");
    const [url, setUrl] = useState("");
    const [title, setTitle] = useState(defaultTitle ?? "");
    const [note, setNote] = useState("");
    const [tags, setTags] = useState("");
    const [price, setPrice] = useState("");
    const [sectionId, setSectionId] = useState<string>("");
    const [uploaded, setUploaded] = useState<string>("");
    const [picked, setPicked] = useState<LibraryItem | null>(null);
    const [q, setQ] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const own = useOwnLibrary(state);
    const results = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const pool = needle ? own.filter((i) => `${i.title} ${i.tags.join(" ")}`.toLowerCase().includes(needle)) : own.filter((i) => !i.kinds.length || i.kinds.includes(board.kind));
        return (pool.length ? pool : own).slice(0, 36);
    }, [own, q, board.kind]);

    const reset = () => {
        setUrl("");
        setTitle("");
        setNote("");
        setTags("");
        setPrice("");
        setUploaded("");
        setPicked(null);
        setQ("");
        setError(null);
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        const cents = price.trim() ? Math.round(Number(price.replace(/[^0-9.]/g, "")) * 100) : null;
        if (price.trim() && (cents === null || Number.isNaN(cents))) return setError("That price doesn't look like a number.");
        const common = {
            boardId: board.id,
            sectionId: sectionId || null,
            title: title.trim() || picked?.title || "Pinned",
            note: note.trim(),
            tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
            priceCents: cents,
        };
        let input: NewPin;
        if (tab === "url") {
            if (!/^https?:\/\//i.test(url.trim())) return setError("Paste a full web address, starting http:// or https://");
            input = { ...common, source: "url", sourceUrl: url.trim() };
        } else if (tab === "upload") {
            if (!uploaded) return setError("Choose a picture first.");
            input = { ...common, source: "upload", imageUrl: uploaded };
        } else {
            if (!picked) return setError("Pick a picture from the library.");
            input = { ...common, source: "library", imageUrl: picked.url, tags: [...new Set([...(common.tags ?? []), ...picked.tags])] };
        }
        setBusy(true);
        try {
            await onSave(input);
            reset();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    const TABS: Array<{ id: typeof tab; label: string; icon: typeof Globe }> = [
        { id: "library", label: "Our library", icon: Search },
        { id: "url", label: "From a web page", icon: Globe },
        { id: "upload", label: "Upload", icon: Upload },
    ];

    return (
        <Dialog open={open} onClose={onClose} title={`Add a pin to ${board.title}`} wide>
            <form onSubmit={submit}>
                <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Where is the picture from?">
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        const on = t.id === tab;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => setTab(t.id)}
                                className={cn("inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                            >
                                <Icon size={14} aria-hidden="true" /> {t.label}
                            </button>
                        );
                    })}
                </div>

                {tab === "library" && (
                    <div className="mb-4">
                        <Field label="Search our pictures" value={q} onChange={(e) => setQ(e.target.value)} placeholder="dinosaurs, kitchen, lagos…" leading={<Search size={16} aria-hidden="true" />} />
                        <div className="mt-3 flex items-start gap-2 rounded-md bg-page px-3 py-2 text-xs leading-[18px] text-muted">
                            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span>
                                This searches what your family already has — your memories, your studio work, every pin on a board you can see, and the starter set. We don't search the web: paste an address on the next tab
                                instead and we'll keep a copy of the picture.
                            </span>
                        </div>
                        {results.length ? (
                            <ul className="mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                                {results.map((item) => (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            aria-pressed={picked?.id === item.id}
                                            onClick={() => {
                                                setPicked(item);
                                                if (!title.trim()) setTitle(item.title);
                                            }}
                                            className={cn("block w-full overflow-hidden rounded-sm border-2", picked?.id === item.id ? "border-brand" : "border-transparent hover:border-line-strong")}
                                        >
                                            <img src={item.url} alt={item.title} width={200} height={200} loading="lazy" className="block aspect-square w-full object-cover" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState title="Nothing matches that" body="Try a different word, or paste a web address instead." className="mt-3 py-8" />
                        )}
                    </div>
                )}

                {tab === "url" && (
                    <div className="mb-4">
                        <Field label="Web address" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" hint="We fetch the picture and keep our own copy, so the pin still works if the page disappears." />
                    </div>
                )}

                {tab === "upload" && (
                    <div className="mb-4">
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted" htmlFor="pin-file">
                            Choose a picture
                        </label>
                        <input
                            id="pin-file"
                            type="file"
                            accept="image/*"
                            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setError(null);
                                try {
                                    const cached = await cacheUpload(file);
                                    setUploaded(cached.dataUrl);
                                    if (!title.trim()) setTitle(file.name.replace(/\.[a-z0-9]+$/i, ""));
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : "That picture wouldn't open.");
                                }
                            }}
                        />
                        {uploaded && <img src={uploaded} alt="What you are about to pin" width={240} height={300} loading="lazy" className="mt-3 h-40 w-auto rounded-sm object-cover" />}
                    </div>
                )}

                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Shaker doors, warm wood" />
                    <Field label="Price (optional)" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="214.00" inputMode="decimal" />
                </div>
                <label className="mt-3 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Note</span>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Why this one, and what we'd change."
                        className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand"
                    />
                </label>
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <Field label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="kitchen, brass" hint="Comma separated." />
                    {sections.length > 0 && (
                        <label className="block">
                            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Section</span>
                            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                <option value="">No section</option>
                                {sections.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.title}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>

                {error && (
                    <Notice tone="danger" className="mt-4">
                        {error}
                    </Notice>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="brand" loading={busy}>
                        Pin it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Create / edit a board
// ---------------------------------------------------------------------------

export function BoardDialog({ open, onClose, board, onSave }: { open: boolean; onClose: () => void; board?: Board; onSave: (input: NewBoard) => Promise<void> }) {
    const { role, me, members } = useSpace();
    const child = role === "child";
    const [title, setTitle] = useState(board?.title ?? "");
    const [description, setDescription] = useState(board?.description ?? "");
    const [kind, setKind] = useState<BoardKind>(board?.kind ?? "ideas");
    const [template, setTemplate] = useState<string>(board?.template ?? "");
    const [visibility, setVisibility] = useState<Visibility>(board?.visibility ?? "family");
    const [sharedWith, setSharedWith] = useState<string[]>(board?.sharedWith ?? []);
    const [collaborators, setCollaborators] = useState<string[]>(board?.collaboratorIds ?? []);
    const [tags, setTags] = useState((board?.tags ?? []).join(", "));
    const [owner, setOwner] = useState<string>(board?.ownerMemberId ?? me.id);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const chosen = TEMPLATES.find((t) => t.id === template);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return setError("Give the board a name.");
        setBusy(true);
        setError(null);
        try {
            await onSave({
                title,
                description,
                kind: chosen?.kind ?? kind,
                template: template || null,
                ownerMemberId: owner,
                collaboratorIds: collaborators,
                visibility: child && visibility === "private" ? "family" : visibility,
                sharedWith,
                childSafe: child ? true : undefined,
                tags: [...tags.split(",").map((t) => t.trim()).filter(Boolean), ...(chosen?.tags ?? [])],
                sections: board ? undefined : chosen?.sections,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={board ? "Board settings" : "Start a board"} wide>
            <form onSubmit={submit}>
                <Field label="Name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tobi's 10th birthday" />
                <label className="mt-3 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">What it's for</span>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        placeholder="Saturday the 26th, 2–4pm, ours."
                        className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand"
                    />
                </label>

                {!board && (
                    <div className="mt-4">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Start from a template</span>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                aria-pressed={!template}
                                onClick={() => setTemplate("")}
                                className={cn("h-9 rounded-full border px-3.5 text-sm font-semibold", !template ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                            >
                                Blank
                            </button>
                            {TEMPLATES.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    aria-pressed={template === t.id}
                                    onClick={() => setTemplate(t.id)}
                                    className={cn("h-9 rounded-full border px-3.5 text-sm font-semibold", template === t.id ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        {chosen && <p className="mt-2 text-xs text-caption">{chosen.blurb} Sections: {chosen.sections.join(" · ")}.</p>}
                    </div>
                )}

                {!chosen && (
                    <label className="mt-3 block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Kind</span>
                        <select value={kind} onChange={(e) => setKind(e.target.value as BoardKind)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {BOARD_KINDS.map((k) => (
                                <option key={k} value={k}>
                                    {KIND_LABEL[k]}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                <Field label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="party, dinosaurs" hint="Comma separated. Tags are how you find a pin across every board." className="mt-3" />

                {role === "parent" && members.length > 1 && <MemberPicker value={owner} onChange={(id) => setOwner(id ?? me.id)} label="Whose board is this?" className="mt-4" />}

                <MemberMultiPicker value={collaborators} onChange={setCollaborators} label="Who may pin and comment here" className="mt-4" />
                <p className="mt-1.5 text-xs text-caption">
                    Everyone named here can add pins and leave comments. A child or a guest also needs "Pin to moodboards" switched on for them in Family → People — being named is necessary, not sufficient.
                </p>

                {child ? (
                    <Notice tone="info" className="mt-4">
                        Boards you start are always visible to your parents, and always marked safe for the whole family. That's how it works for everyone under eighteen.
                    </Notice>
                ) : (
                    <VisibilityPicker value={visibility} onChange={setVisibility} sharedWith={sharedWith} onSharedWith={setSharedWith} className="mt-4" />
                )}

                {error && (
                    <Notice tone="danger" className="mt-4">
                        {error}
                    </Notice>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="brand" loading={busy}>
                        {board ? "Save" : "Start the board"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Move or copy a pin
// ---------------------------------------------------------------------------

export function MovePinDialog({
    open,
    onClose,
    boards,
    currentBoardId,
    onMove,
    onCopy,
}: {
    open: boolean;
    onClose: () => void;
    boards: Board[];
    currentBoardId: string;
    onMove: (boardId: string) => Promise<void>;
    onCopy: (boardId: string) => Promise<void>;
}) {
    const options = boards.filter((b) => b.id !== currentBoardId);
    const [target, setTarget] = useState(options[0]?.id ?? "");
    const [busy, setBusy] = useState(false);
    const run = async (fn: (id: string) => Promise<void>) => {
        if (!target) return;
        setBusy(true);
        try {
            await fn(target);
            onClose();
        } finally {
            setBusy(false);
        }
    };
    return (
        <Dialog open={open} onClose={onClose} title="Move or copy this pin">
            {options.length ? (
                <>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Which board?</span>
                        <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {options.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.title}
                                </option>
                            ))}
                        </select>
                    </label>
                    <p className="mt-2 text-xs text-caption">Copying leaves this one where it is. Moving takes it with its note, tags and price.</p>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button variant="outline" loading={busy} onClick={() => void run(onCopy)}>
                            Copy
                        </Button>
                        <Button variant="brand" loading={busy} onClick={() => void run(onMove)}>
                            Move
                        </Button>
                    </div>
                </>
            ) : (
                <EmptyState title="There's nowhere else to put it" body="You'd need another board you're allowed to pin to." />
            )}
        </Dialog>
    );
}
