import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Loader2, Link as LinkIcon } from "lucide-react";
import { useSpace } from "@/state/space";
import { useModule } from "@/state/data";
import { useToast } from "@/state/toast";
import { clock, duration } from "@/lib/format";
import { youtubeId, youtubeThumb } from "@/components/player/YouTubePlayer";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";
import learning from "../module";
import { lookupVideo } from "../probe";
import { IMPORT_BUDGET_MS } from "../types";

/**
 * Import a lesson from a public YouTube link.
 *
 * Paste the URL and the form fills itself: YouTube's oEmbed endpoint gives the
 * title and channel, the player gives the length, and the thumbnail is a plain
 * i.ytimg.com URL. Everything is raced against a three-second budget and every
 * field stays editable, so a slow network costs a parent typing rather than a
 * spinner that never ends.
 *
 * There is no search box here and no browse: a lesson enters the family's
 * shelf because a parent pasted a link, which is the whole of the child-safety
 * story on the import side.
 */

/** "12:34" or "754" → seconds. */
function parseLength(v: string): number {
    const t = v.trim();
    if (!t) return 0;
    if (/^\d+$/.test(t)) return Number(t);
    const parts = t.split(":").map((x) => Number(x));
    if (parts.some((x) => !Number.isFinite(x))) return 0;
    return parts.reduce((acc, x) => acc * 60 + x, 0);
}

export function ImportDialog({ open, onClose, playlistId = null }: { open: boolean; onClose: () => void; playlistId?: string | null }) {
    const { space } = useSpace();
    const { state, mutate } = useModule(learning);
    const { toast } = useToast();

    const [url, setUrl] = useState("");
    const [title, setTitle] = useState("");
    const [channel, setChannel] = useState("");
    const [length, setLength] = useState("");
    const [description, setDescription] = useState("");
    const [transcript, setTranscript] = useState("");
    const [childSafe, setChildSafe] = useState(true);
    const [valueId, setValueId] = useState("");
    const [target, setTarget] = useState(playlistId ?? "");
    const [status, setStatus] = useState<"idle" | "looking" | "found" | "manual">("idle");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastLooked = useRef("");

    const yt = youtubeId(url.trim());

    useEffect(() => {
        if (!open) return;
        setTarget(playlistId ?? "");
    }, [open, playlistId]);

    const reset = useCallback(() => {
        setUrl("");
        setTitle("");
        setChannel("");
        setLength("");
        setDescription("");
        setTranscript("");
        setChildSafe(true);
        setValueId("");
        setStatus("idle");
        setError(null);
        lastLooked.current = "";
    }, []);

    // The moment the link is a real video id, ask YouTube — once per id.
    useEffect(() => {
        if (!open || !yt || lastLooked.current === yt) return;
        lastLooked.current = yt;
        let alive = true;
        setStatus("looking");
        lookupVideo(yt).then((found) => {
            if (!alive) return;
            if (found.title) setTitle((t) => t || found.title);
            if (found.channel) setChannel((c) => c || found.channel);
            if (found.durationS) setLength((l) => l || clock(found.durationS));
            setStatus(found.found ? "found" : "manual");
        });
        return () => {
            alive = false;
        };
    }, [open, yt]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!yt) {
            setError("Paste a YouTube link — youtube.com/watch?v=… or youtu.be/…");
            return;
        }
        setBusy(true);
        try {
            await mutate((r) =>
                r.importVideo({
                    url: url.trim(),
                    title: title.trim(),
                    channel: channel.trim(),
                    durationS: parseLength(length),
                    description: description.trim(),
                    captionsAvailable: Boolean(transcript.trim()),
                    childSafe,
                    valueId: valueId || null,
                    transcript: transcript.trim(),
                    playlistId: target || null,
                }),
            );
            toast(`Saved "${title.trim() || "the lesson"}"`, "success");
            reset();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save that lesson.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => {
                reset();
                onClose();
            }}
            title="Add a lesson"
            wide
        >
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field
                    label="YouTube link"
                    leading={<LinkIcon size={16} aria-hidden="true" />}
                    placeholder="https://www.youtube.com/watch?v=…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    hint={
                        status === "looking"
                            ? "Asking YouTube…"
                            : status === "found"
                              ? "Title, channel, length and thumbnail came from YouTube."
                              : status === "manual"
                                ? `YouTube didn't answer within ${Math.round(IMPORT_BUDGET_MS / 1000)}s — type the details below.`
                                : "Any public video. Nothing here searches YouTube."
                    }
                />

                {yt && (
                    <div className="flex items-center gap-3 rounded-lg bg-page p-3">
                        <img src={youtubeThumb(yt)} alt="" width={128} height={72} loading="lazy" className="h-[54px] w-24 rounded-sm object-cover" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{title || "Untitled lesson"}</p>
                            <p className="truncate text-xs text-caption">
                                {channel || "Unknown channel"}
                                {parseLength(length) > 0 ? ` · ${duration(parseLength(length))}` : ""}
                            </p>
                        </div>
                        <span className="shrink-0 text-caption" aria-hidden="true">
                            {status === "looking" ? <Loader2 size={16} className="animate-spin" /> : status === "found" ? <Check size={16} /> : null}
                        </span>
                    </div>
                )}

                <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="What the lesson is called" />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Field label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Who made it" />
                    <Field label="Length" value={length} onChange={(e) => setLength(e.target.value)} placeholder="12:34" hint="Filled from the player; the first watch confirms it." />
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">What it&apos;s about</span>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder="A line for the family — and what the companion works from when there are no captions." />
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Captions (optional)</span>
                    <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={3} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder="Paste the transcript if the video has one. With it, a summary is labelled “captions”; without it, “AI from description”." />
                </label>

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">A value it serves</span>
                        <select value={valueId} onChange={(e) => setValueId(e.target.value)} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            <option value="">None in particular</option>
                            {space.values.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Add to</span>
                        <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            <option value="">No playlist yet</option>
                            {state.playlists.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="rounded-lg bg-page p-3">
                    <label className="flex items-center gap-3 text-sm font-semibold leading-5">
                        <input type="checkbox" checked={childSafe} onChange={(e) => setChildSafe(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                        Safe for the children
                    </label>
                    <p className="mt-1 pl-7 text-xs text-caption">Off means it never appears on a child&apos;s screen, whatever playlist it sits in.</p>
                </div>

                {error && (
                    <p className="text-sm text-danger-ink" role="alert">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            reset();
                            onClose();
                        }}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!yt || !title.trim()}>
                        Save lesson
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
