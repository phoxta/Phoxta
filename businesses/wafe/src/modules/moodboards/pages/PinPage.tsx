import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { money, relative } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, MemberAvatar, Notice } from "@/components/shared";
import { Button, EmptyState, Field, IconButton, Kbd, Skeleton } from "@/components/ui/primitives";
import moodboardsModule from "../module";
import { useCtx } from "../hooks";
import { BASE, boardById, canPinTo, commentsOf, pinById, pinsOf } from "../derive";
import { CacheBadge } from "../components/pieces";
import { REACTIONS, REACTION_EMOJI, REACTION_LABEL, type Reaction } from "../types";

/**
 * One pin, on its own route.
 *
 * It is a lightbox that survives a refresh: previous and next are real links,
 * the arrow keys move between them, Escape goes back to the board, and the
 * address bar always says which pin you are looking at — so "look at this one"
 * is a link you can send someone rather than a set of instructions.
 */

export default function PinPage() {
    const { id = "", pinId = "" } = useParams();
    const { state, mutate, loading, error } = useModule(moodboardsModule);
    const sp = useSpace();
    const ctx = useCtx();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [text, setText] = useState("");
    const [reaction, setReaction] = useState<Reaction | null>(null);
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState("");
    const [note, setNote] = useState("");
    const [tags, setTags] = useState("");
    const [price, setPrice] = useState("");
    const [removing, setRemoving] = useState(false);
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);

    const board = state ? boardById(state, id) : undefined;
    const pin = state ? pinById(state, pinId) : undefined;
    const siblings = state && board ? pinsOf(state, board.id) : [];
    const index = siblings.findIndex((p) => p.id === pinId);
    const prev = index > 0 ? siblings[index - 1] : undefined;
    const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
            if (e.key === "ArrowLeft" && prev) navigate(`${BASE}/${id}/pins/${prev.id}`);
            if (e.key === "ArrowRight" && next) navigate(`${BASE}/${id}/pins/${next.id}`);
            if (e.key === "Escape") navigate(`${BASE}/${id}`);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [prev, next, id, navigate]);

    useEffect(() => {
        if (!pin) return;
        setTitle(pin.title);
        setNote(pin.note);
        setTags(pin.tags.join(", "));
        setPrice(pin.priceCents === null ? "" : (pin.priceCents / 100).toFixed(2));
        setEditing(false);
        setProblem(null);
    }, [pin]);

    if (loading && !state) return <Skeleton className="h-96" />;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    if (!board || !pin) {
        return <EmptyState title="That pin isn't here" body="It may have been removed, or moved to a board you can't see." action={<Button onClick={() => navigate(BASE)}>Back to the boards</Button>} />;
    }

    const mayWrite = canPinTo(board, ctx);
    const mine = sp.role === "parent" || pin.addedBy === sp.me.id || board.ownerMemberId === sp.me.id;
    const comments = commentsOf(state, pin.id);

    const submitComment = async (e: FormEvent) => {
        e.preventDefault();
        if (!text.trim() && !reaction) return;
        setBusy(true);
        setProblem(null);
        try {
            await mutate((r) => r.comment(pin.id, text, reaction));
            setText("");
            setReaction(null);
        } catch (err) {
            setProblem(err instanceof Error ? err.message : "That didn't send.");
        } finally {
            setBusy(false);
        }
    };

    const saveEdits = async (e: FormEvent) => {
        e.preventDefault();
        const cents = price.trim() ? Math.round(Number(price.replace(/[^0-9.]/g, "")) * 100) : null;
        if (price.trim() && (cents === null || Number.isNaN(cents))) return setProblem("That price doesn't look like a number.");
        setBusy(true);
        setProblem(null);
        try {
            await mutate((r) =>
                r.updatePin(pin.id, {
                    title: title.trim(),
                    note: note.trim(),
                    tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
                    priceCents: cents,
                }),
            );
            setEditing(false);
            toast("Saved", "success");
        } catch (err) {
            setProblem(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Link to={`${BASE}/${board.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                    <X size={14} aria-hidden="true" /> {board.title}
                </Link>
                <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-caption sm:inline">
                        {index + 1} of {siblings.length} · <Kbd>←</Kbd> <Kbd>→</Kbd> to move, <Kbd>Esc</Kbd> to close
                    </span>
                    {prev ? (
                        <Link to={`${BASE}/${board.id}/pins/${prev.id}`} aria-label="Previous pin" className="grid size-9 place-items-center rounded-full border border-line-strong bg-card hover:border-ink">
                            <ChevronLeft size={16} aria-hidden="true" />
                        </Link>
                    ) : (
                        <span className="grid size-9 place-items-center rounded-full border border-line text-caption" aria-hidden="true">
                            <ChevronLeft size={16} />
                        </span>
                    )}
                    {next ? (
                        <Link to={`${BASE}/${board.id}/pins/${next.id}`} aria-label="Next pin" className="grid size-9 place-items-center rounded-full border border-line-strong bg-card hover:border-ink">
                            <ChevronRight size={16} aria-hidden="true" />
                        </Link>
                    ) : (
                        <span className="grid size-9 place-items-center rounded-full border border-line text-caption" aria-hidden="true">
                            <ChevronRight size={16} />
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <figure className="overflow-hidden rounded-xl bg-card">
                    <img src={pin.imageUrl} alt={pin.title || "Pinned"} width={1200} height={1500} loading="eager" className="block h-auto max-h-[70vh] w-full object-contain" />
                    <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <CacheBadge pin={pin} />
                        {pin.sourceUrl && (
                            <a href={pin.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand underline-offset-4 hover:underline">
                                <ExternalLink size={12} aria-hidden="true" /> Open the original
                            </a>
                        )}
                        {pin.cachedFrom === "placeholder" && mine && mayWrite && pin.sourceUrl && (
                            <Button
                                size="sm"
                                variant="outline"
                                loading={busy}
                                onClick={async () => {
                                    setBusy(true);
                                    try {
                                        await mutate((r) => r.recachePin(pin.id));
                                        toast("Tried again", "success");
                                    } catch (err) {
                                        setProblem(err instanceof Error ? err.message : "It still wouldn't come.");
                                    } finally {
                                        setBusy(false);
                                    }
                                }}
                            >
                                <RefreshCw size={13} aria-hidden="true" /> Try again
                            </Button>
                        )}
                    </figcaption>
                </figure>

                <div className="flex flex-col gap-4">
                    <section className="rounded-xl bg-card p-4">
                        {editing ? (
                            <form onSubmit={saveEdits}>
                                <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                                <label className="mt-3 block">
                                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Note</span>
                                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" />
                                </label>
                                <Field label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} hint="Comma separated." className="mt-3" />
                                <Field label="Price" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="mt-3" />
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button variant="ghost" onClick={() => setEditing(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" variant="brand" loading={busy}>
                                        Save
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="flex items-start gap-2">
                                    <h1 className="min-w-0 flex-1 font-display text-3xl leading-7">{pin.title || "Untitled"}</h1>
                                    {mine && mayWrite && (
                                        <IconButton label="Remove this pin" size="md" onClick={() => setRemoving(true)}>
                                            <Trash2 size={15} />
                                        </IconButton>
                                    )}
                                </div>
                                {pin.note && <p className="mt-2 whitespace-pre-wrap text-md leading-6 text-muted">{pin.note}</p>}
                                {pin.priceCents !== null && <p className="mt-2 text-base font-semibold">{money(pin.priceCents, sp.space.currency)}</p>}
                                {pin.tags.length > 0 && (
                                    <ul className="mt-3 flex flex-wrap gap-1.5">
                                        {pin.tags.map((t) => (
                                            <li key={t} className="rounded-xs bg-page px-2 py-0.5 text-2xs font-medium uppercase tracking-[0.04em] text-muted">
                                                {t}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <p className="mt-3 flex items-center gap-2 text-xs text-caption">
                                    <MemberAvatar memberId={pin.addedBy} size="xs" showName /> pinned this {relative(pin.createdAt)}
                                </p>
                                {mine && mayWrite && (
                                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditing(true)}>
                                        Edit the note
                                    </Button>
                                )}
                            </>
                        )}
                    </section>

                    <section className="rounded-xl bg-card p-4">
                        <h2 className="mb-3 font-display text-xl">What we said</h2>
                        {comments.length ? (
                            <ul className="flex flex-col gap-3">
                                {comments.map((c) => (
                                    <li key={c.id} className="flex gap-2.5">
                                        <MemberAvatar memberId={c.memberId} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-caption">
                                                {sp.members.find((m) => m.id === c.memberId)?.name.split(" ")[0] ?? "Someone"} · {relative(c.at)}
                                            </p>
                                            <p className="text-md leading-5">
                                                {c.reaction && <span className="mr-1.5">{REACTION_EMOJI[c.reaction]}</span>}
                                                {c.text}
                                            </p>
                                        </div>
                                        {(sp.role === "parent" || c.memberId === sp.me.id) && (
                                            <button type="button" onClick={() => void mutate((r) => r.removeComment(c.id))} aria-label="Delete this comment" className="shrink-0 rounded-full p-1 text-caption hover:text-danger-ink">
                                                <Trash2 size={13} aria-hidden="true" />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted">Nothing said about this one yet.</p>
                        )}

                        {mayWrite ? (
                            <form onSubmit={submitComment} className="mt-4">
                                <div className="mb-2 flex flex-wrap gap-2" role="radiogroup" aria-label="React">
                                    {REACTIONS.map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            role="radio"
                                            aria-checked={reaction === r}
                                            aria-label={REACTION_LABEL[r]}
                                            title={REACTION_LABEL[r]}
                                            onClick={() => setReaction(reaction === r ? null : r)}
                                            className={cn("grid size-9 place-items-center rounded-full border text-base", reaction === r ? "border-brand bg-brand-soft" : "border-line-strong hover:border-ink")}
                                        >
                                            {REACTION_EMOJI[r]}
                                        </button>
                                    ))}
                                </div>
                                <Field label="Say something" value={text} onChange={(e) => setText(e.target.value)} placeholder="Chrome, not black." />
                                <div className="mt-3 flex justify-end">
                                    <Button type="submit" variant="brand" size="md" loading={busy} disabled={!text.trim() && !reaction}>
                                        Post
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <p className="mt-4 text-xs text-caption">Comments are for the people named on this board.</p>
                        )}

                        {problem && (
                            <Notice tone="danger" className="mt-3">
                                {problem}
                            </Notice>
                        )}
                    </section>
                </div>
            </div>

            <Confirm
                open={removing}
                title="Remove this pin?"
                body="It and its comments will go. The board keeps everything else."
                confirmLabel="Remove"
                danger
                onClose={() => setRemoving(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removePin(pin.id));
                    navigate(`${BASE}/${board.id}`);
                }}
            />
        </div>
    );
}
