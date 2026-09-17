import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2, Trash2, Upload } from "lucide-react";
import type { Visibility } from "@/data/core";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { MemberMultiPicker, Notice, VisibilityPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, Tag } from "@/components/ui/primitives";
import { albumsOf, grantsFor, linkLabel, linkState, linksFor, recentPhotos, shareUrl } from "../derive";
import { PhotoImg, PhotoTile, filesToPhotos, useFilePicker } from "./pieces";
import {
    REEL_MOOD,
    REEL_TRANSITION,
    SHARE_LINK_CHOICES,
    SHARE_LINK_DAYS,
    type Album,
    type MemoriesState,
    type NewPhoto,
    type Photo,
    type Reel,
    type ReelMood,
    type ReelTransition,
    type ShareLink,
    type ShareObjectType,
} from "../types";

/**
 * The module's forms. Every one is a real <form>, every label is a label, and
 * every destructive step is somewhere else (Confirm) — these only ever create
 * or change.
 */

// ---------------------------------------------------------------------------
// An album
// ---------------------------------------------------------------------------

export interface AlbumDraft {
    title: string;
    description: string;
    dateFrom: string;
    dateTo: string;
    visibility: Visibility;
    sharedWith: string[];
    childSafe: boolean;
    contributorIds: string[];
}

export function AlbumDialog({ open, onClose, initial, today, onSave }: { open: boolean; onClose: () => void; initial?: Album; today: string; onSave: (draft: AlbumDraft) => Promise<void> }) {
    const [draft, setDraft] = useState<AlbumDraft>(() => blank(initial, today));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (open) setDraft(blank(initial, today));
    }, [open, initial, today]);

    const set = <K extends keyof AlbumDraft>(k: K, v: AlbumDraft[K]): void => setDraft((d) => ({ ...d, [k]: v }));

    return (
        <Dialog open={open} onClose={onClose} title={initial ? "Edit the album" : "A new album"} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!draft.title.trim()) return setError("An album needs a name.");
                    if (draft.dateTo < draft.dateFrom) return setError("The last day can't come before the first.");
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({ ...draft, title: draft.title.trim() });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Field label="Name" value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Christmas in Lagos" required />
                <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">What it is</span>
                    <textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={2} className="w-full rounded-md border border-line-strong bg-card p-3 text-md outline-none focus:border-brand" placeholder="Three weeks at Grandma's, and the first time all five of us were there at once." />
                </label>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <Field label="First day" type="date" value={draft.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} />
                    <Field label="Last day" type="date" value={draft.dateTo} onChange={(e) => set("dateTo", e.target.value)} />
                </div>
                <VisibilityPicker className="mt-5" value={draft.visibility} onChange={(v) => set("visibility", v)} sharedWith={draft.sharedWith} onSharedWith={(ids) => set("sharedWith", ids)} />
                <MemberMultiPicker className="mt-5" label="Who may add to it" value={draft.contributorIds} onChange={(ids) => set("contributorIds", ids)} />
                <p className="mt-1.5 text-xs text-caption">Contributors can add pictures and captions to this album without being able to touch anything else.</p>
                {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {initial ? "Save" : "Create the album"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function blank(a: Album | undefined, today: string): AlbumDraft {
    return {
        title: a?.title ?? "",
        description: a?.description ?? "",
        dateFrom: a?.dateFrom ?? today,
        dateTo: a?.dateTo ?? today,
        visibility: a?.visibility ?? "child",
        sharedWith: a?.sharedWith ?? [],
        childSafe: a?.childSafe ?? true,
        contributorIds: a?.contributorIds ?? [],
    };
}

// ---------------------------------------------------------------------------
// One picture
// ---------------------------------------------------------------------------

export function PhotoDialog({
    open,
    onClose,
    photo,
    canEdit,
    onSave,
    onFavourite,
    onRemove,
    albumTitle,
}: {
    open: boolean;
    onClose: () => void;
    photo: Photo | null;
    canEdit: boolean;
    onSave: (patch: { caption: string; place: string; takenAt: string; peopleIds: string[] }) => Promise<void>;
    onFavourite: () => Promise<void>;
    onRemove?: () => void;
    albumTitle?: string;
}) {
    const [caption, setCaption] = useState("");
    const [place, setPlace] = useState("");
    const [takenAt, setTakenAt] = useState("");
    const [people, setPeople] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!photo) return;
        setCaption(photo.caption);
        setPlace(photo.place);
        setTakenAt(photo.takenAt);
        setPeople(photo.peopleIds);
    }, [photo]);

    if (!photo) return null;
    return (
        <Dialog open={open} onClose={onClose} title={albumTitle ? `In "${albumTitle}"` : "This picture"} wide>
            <div className="overflow-hidden rounded-md bg-ink">
                {photo.kind === "video" && !photo.needsConversion ? (
                    // A clip plays where it lives; a reel never contains one.
                    <video src={photo.url} controls playsInline poster={photo.posterUrl ?? undefined} className="max-h-[52vh] w-full object-contain">
                        <track kind="captions" />
                    </video>
                ) : (
                    <PhotoImg photo={photo} className="max-h-[52vh] w-full object-contain" />
                )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-caption">
                <Tag tone="neutral">{photo.kind === "video" ? "Video" : photo.format.toUpperCase()}</Tag>
                <span>{shortDate(photo.takenAt)}</span>
                {photo.place && <span>· {photo.place}</span>}
                {photo.needsConversion && <span className="text-create-ink">· HEIC, converting on upload</span>}
            </div>

            {canEdit ? (
                <form
                    className="mt-4"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        setBusy(true);
                        try {
                            await onSave({ caption: caption.trim(), place: place.trim(), takenAt, peopleIds: people });
                            onClose();
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    <Field label="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Tobi swims a width on his own" />
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <Field label="Where" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Grasmere, Cumbria" />
                        <Field label="When" type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
                    </div>
                    <MemberMultiPicker className="mt-4" label="Who's in it" value={people} onChange={setPeople} />
                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                        {onRemove && (
                            <Button variant="danger" type="button" onClick={onRemove}>
                                <Trash2 size={15} aria-hidden="true" /> Remove
                            </Button>
                        )}
                        <Button variant="outline" type="button" onClick={() => void onFavourite()}>
                            {photo.favourite ? "Unfavourite" : "Favourite"}
                        </Button>
                        <Button type="submit" loading={busy}>
                            Save
                        </Button>
                    </div>
                </form>
            ) : (
                <p className="mt-4 text-md leading-6 text-muted">{photo.caption || "No caption on this one."}</p>
            )}
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Uploading
// ---------------------------------------------------------------------------

export function UploadDialog({ open, onClose, today, albums, defaultAlbumId, onAdd }: { open: boolean; onClose: () => void; today: string; albums: Album[]; defaultAlbumId?: string | null; onAdd: (photos: NewPhoto[], albumId: string | null) => Promise<void> }) {
    const [albumId, setAlbumId] = useState<string | null>(defaultAlbumId ?? null);
    const [place, setPlace] = useState("");
    const [staged, setStaged] = useState<NewPhoto[]>([]);
    const [rejected, setRejected] = useState<Array<{ name: string; why: string }>>([]);
    const [busy, setBusy] = useState(false);
    const [reading, setReading] = useState(false);

    useEffect(() => {
        if (open) {
            setAlbumId(defaultAlbumId ?? null);
            setStaged([]);
            setRejected([]);
        }
    }, [open, defaultAlbumId]);

    const { input, open: pick } = useFilePicker(async (files) => {
        setReading(true);
        try {
            const r = await filesToPhotos(files, today, place);
            setStaged((s) => [...s, ...r.photos]);
            setRejected(r.rejected);
        } finally {
            setReading(false);
        }
    });

    return (
        <Dialog open={open} onClose={onClose} title="Add pictures" wide>
            {input}
            <p className="text-sm leading-5 text-muted">HEIC, JPEG, PNG and MP4. Pictures are resized on the way in; a clip keeps its own first frame as its cover.</p>
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Into</span>
                    <select value={albumId ?? ""} onChange={(e) => setAlbumId(e.target.value || null)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        <option value="">The library, unfiled</option>
                        {albums.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.title}
                            </option>
                        ))}
                    </select>
                </label>
                <Field label="Where (optional)" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Croydon" />
            </div>

            <Button className="mt-4" variant="outline" onClick={pick} loading={reading} block>
                <Upload size={15} aria-hidden="true" /> Choose files
            </Button>

            {staged.length > 0 && (
                <ul className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-6">
                    {staged.map((p, i) => (
                        <li key={i} className="aspect-square overflow-hidden rounded-sm bg-subtle">
                            {p.needsConversion ? (
                                <span className="grid size-full place-items-center px-1 text-center text-[10px] leading-3 text-create-ink">HEIC</span>
                            ) : (
                                <img src={p.posterUrl ?? p.url} alt="" width={p.width} height={p.height} loading="lazy" className="size-full object-cover" />
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {rejected.length > 0 && (
                <Notice tone="warn" className="mt-4">
                    <ul className="space-y-1">
                        {rejected.map((r) => (
                            <li key={r.name}>
                                <strong>{r.name}</strong> — {r.why}
                            </li>
                        ))}
                    </ul>
                </Notice>
            )}

            <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    loading={busy}
                    disabled={!staged.length}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            await onAdd(staged, albumId);
                            onClose();
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    Add {staged.length || ""} {staged.length === 1 ? "picture" : "pictures"}
                </Button>
            </div>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Choosing pictures (for a reel, or to add to an album)
// ---------------------------------------------------------------------------

export function PickPhotosDialog({ open, onClose, state, title, max, initial, onDone }: { open: boolean; onClose: () => void; state: MemoriesState; title: string; max: number; initial?: string[]; onDone: (photoIds: string[]) => Promise<void> }) {
    const [picked, setPicked] = useState<string[]>(initial ?? []);
    const [albumId, setAlbumId] = useState<string>("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (open) setPicked(initial ?? []);
        // The caller's list is the starting point each time it opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const pool = useMemo(() => {
        const photos = albumId ? state.albumPhotos.filter((ap) => ap.albumId === albumId).map((ap) => state.photos.find((p) => p.id === ap.photoId)).filter((p): p is Photo => Boolean(p)) : recentPhotos(state, 200);
        return photos.filter((p) => p.kind === "photo" && !p.needsConversion);
    }, [state, albumId]);

    const toggle = (id: string): void => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= max ? cur : [...cur, id]));

    return (
        <Dialog open={open} onClose={onClose} title={title} wide>
            <div className="flex flex-wrap items-center gap-3">
                <label className="min-w-0 flex-1">
                    <span className="sr-only">Which album to choose from</span>
                    <select value={albumId} onChange={(e) => setAlbumId(e.target.value)} className="h-10 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        <option value="">Everything, newest first</option>
                        {albumsOf(state).map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.title}
                            </option>
                        ))}
                    </select>
                </label>
                <span className="text-sm font-semibold text-muted">
                    {picked.length} / {max}
                </span>
            </div>
            <ul className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-5">
                {pool.map((p) => (
                    <li key={p.id}>
                        <PhotoTile photo={p} small selected={picked.includes(p.id)} onSelect={() => toggle(p.id)} />
                    </li>
                ))}
            </ul>
            {!pool.length && <p className="mt-6 text-center text-md text-muted">Nothing here yet.</p>}
            <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    loading={busy}
                    disabled={!picked.length}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            await onDone(picked);
                            onClose();
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    Use {picked.length} {picked.length === 1 ? "picture" : "pictures"}
                </Button>
            </div>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// A reel's settings
// ---------------------------------------------------------------------------

export interface ReelDraft {
    title: string;
    subtitle: string;
    mood: ReelMood;
    transition: ReelTransition;
    slideMs: number;
    trackTitle: string;
    trackNote: string;
    visibility: Visibility;
    sharedWith: string[];
}

export function ReelDialog({ open, onClose, initial, onSave }: { open: boolean; onClose: () => void; initial?: Reel; onSave: (draft: ReelDraft) => Promise<void> }) {
    const [draft, setDraft] = useState<ReelDraft>(() => reelBlank(initial));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (open) setDraft(reelBlank(initial));
    }, [open, initial]);
    const set = <K extends keyof ReelDraft>(k: K, v: ReelDraft[K]): void => setDraft((d) => ({ ...d, [k]: v }));

    return (
        <Dialog open={open} onClose={onClose} title={initial ? "The reel" : "A new reel"} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!draft.title.trim()) return setError("A reel needs a name.");
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({ ...draft, title: draft.title.trim() });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Field label="Name" value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Summer 2026" required />
                <Field className="mt-3" label="One line under it" value={draft.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Six weeks, one long golden afternoon" />

                <fieldset className="mt-5">
                    <legend className="mb-1.5 text-xs font-medium text-muted">Mood</legend>
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-3" role="radiogroup" aria-label="Mood">
                        {(Object.keys(REEL_MOOD) as ReelMood[]).map((m) => (
                            <button key={m} type="button" role="radio" aria-checked={draft.mood === m} onClick={() => setDraft((d) => ({ ...d, mood: m, slideMs: REEL_MOOD[m].slideMs }))} className={cn("rounded-sm border px-3 py-2 text-left", draft.mood === m ? "border-brand bg-brand-soft" : "border-line-strong hover:border-line")}>
                                <span className="block text-sm font-semibold">{REEL_MOOD[m].label}</span>
                                <span className="block text-2xs leading-4 text-caption">{REEL_MOOD[m].note}</span>
                            </button>
                        ))}
                    </div>
                </fieldset>

                <fieldset className="mt-5">
                    <legend className="mb-1.5 text-xs font-medium text-muted">Between the pictures</legend>
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-3" role="radiogroup" aria-label="Transition">
                        {(Object.keys(REEL_TRANSITION) as ReelTransition[]).map((t) => (
                            <button key={t} type="button" role="radio" aria-checked={draft.transition === t} onClick={() => set("transition", t)} className={cn("rounded-sm border px-3 py-2 text-left", draft.transition === t ? "border-brand bg-brand-soft" : "border-line-strong hover:border-line")}>
                                <span className="block text-sm font-semibold">{REEL_TRANSITION[t].label}</span>
                                <span className="block text-2xs leading-4 text-caption">{REEL_TRANSITION[t].note}</span>
                            </button>
                        ))}
                    </div>
                </fieldset>

                <label className="mt-5 block">
                    <span className="mb-1.5 block text-xs font-medium text-muted">
                        How long each picture holds — {(draft.slideMs / 1000).toFixed(1)} seconds
                    </span>
                    <input type="range" min={1200} max={9000} step={200} value={draft.slideMs} onChange={(e) => set("slideMs", Number(e.target.value))} className="w-full accent-[var(--color-brand)]" />
                </label>

                <Field className="mt-4" label="Track" value={draft.trackTitle} onChange={(e) => set("trackTitle", e.target.value)} placeholder="Ayo's Song" hint="A family recording or a licensed track. Nothing is downloaded — the reel plays in the app." />
                <Field className="mt-3" label="Credit" value={draft.trackNote} onChange={(e) => set("trackNote", e.target.value)} placeholder="Recorded at the kitchen table in August" />

                <VisibilityPicker className="mt-5" value={draft.visibility} onChange={(v) => set("visibility", v)} sharedWith={draft.sharedWith} onSharedWith={(ids) => set("sharedWith", ids)} />

                {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Save
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function reelBlank(r: Reel | undefined): ReelDraft {
    return {
        title: r?.title ?? "",
        subtitle: r?.subtitle ?? "",
        mood: r?.mood ?? "warm",
        transition: r?.transition ?? "crossfade",
        slideMs: r?.slideMs ?? 4000,
        trackTitle: r?.trackTitle ?? "",
        trackNote: r?.trackNote ?? "",
        visibility: r?.visibility ?? "child",
        sharedWith: r?.sharedWith ?? [],
    };
}

// ---------------------------------------------------------------------------
// Sharing — grants and links
// ---------------------------------------------------------------------------

export function ShareDialog({
    open,
    onClose,
    state,
    objectType,
    objectId,
    name,
    today,
    onGrant,
    onCreateLink,
    onRevokeLink,
}: {
    open: boolean;
    onClose: () => void;
    state: MemoriesState;
    objectType: ShareObjectType;
    objectId: string;
    name: string;
    today: string;
    onGrant: (memberIds: string[]) => Promise<void>;
    onCreateLink: (days: number) => Promise<ShareLink>;
    onRevokeLink: (linkId: string) => Promise<void>;
}) {
    const [granted, setGranted] = useState<string[]>([]);
    const [days, setDays] = useState<number>(SHARE_LINK_DAYS);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setGranted(grantsFor(state, objectType, objectId));
            setCopied(null);
            setError(null);
        }
        // Re-reading on every state tick would fight the picker mid-edit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, objectType, objectId]);

    const links = linksFor(state, objectType, objectId);
    const copy = async (link: ShareLink): Promise<void> => {
        const url = shareUrl(objectType, objectId, link.token);
        try {
            await navigator.clipboard.writeText(url);
            setCopied(link.id);
        } catch {
            setError(url);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={`Share "${name}"`} wide>
            <p className="text-sm leading-5 text-muted">
                Two ways in, and no third. Name someone in the family — a grandmother, a mentor — and they see this one thing and nothing else. Or make a link anybody can open: it expires, and you can stop it at any moment.
            </p>

            <div className="mt-5">
                <MemberMultiPicker label="People in the family" value={granted} onChange={setGranted} />
                <Button
                    className="mt-3"
                    variant="outline"
                    size="md"
                    loading={busy}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            await onGrant(granted);
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    Save who can see it
                </Button>
            </div>

            <div className="mt-7 border-t border-line pt-5">
                <div className="flex flex-wrap items-end gap-3">
                    <label className="min-w-0 flex-1">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">A link that lasts</span>
                        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {SHARE_LINK_CHOICES.map((d) => (
                                <option key={d} value={d}>
                                    {d === 1 ? "1 day" : `${d} days`}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Button
                        loading={busy}
                        onClick={async () => {
                            setBusy(true);
                            setError(null);
                            try {
                                const link = await onCreateLink(days);
                                await copy(link);
                            } catch (err) {
                                setError(err instanceof Error ? err.message : "That link didn't get made.");
                            } finally {
                                setBusy(false);
                            }
                        }}
                    >
                        <Link2 size={15} aria-hidden="true" /> Make a link
                    </Button>
                </div>

                {links.length > 0 && (
                    <ul className="mt-4 space-y-2">
                        {links.map((l) => {
                            const s = linkState(l);
                            return (
                                <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-sm bg-page px-3 py-2.5">
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-mono text-xs">…/{l.token}</span>
                                        <span className="block text-2xs text-caption">
                                            {linkLabel(l, today)} · opened {l.views} {l.views === 1 ? "time" : "times"}
                                        </span>
                                    </span>
                                    <Tag tone={s === "live" ? "ok" : s === "expired" ? "warn" : "danger"}>{s === "live" ? "Live" : s === "expired" ? "Expired" : "Revoked"}</Tag>
                                    {s === "live" && (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => void copy(l)}>
                                                {copied === l.id ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                                                {copied === l.id ? "Copied" : "Copy"}
                                            </Button>
                                            <Button size="sm" variant="danger" onClick={() => void onRevokeLink(l.id)}>
                                                Revoke
                                            </Button>
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {error && (
                    <Notice tone="info" className="mt-3">
                        Copy it by hand: <span className="break-all font-mono text-xs">{error}</span>
                    </Notice>
                )}
            </div>
        </Dialog>
    );
}
