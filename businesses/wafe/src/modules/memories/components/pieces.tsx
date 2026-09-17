import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Film, Heart, Images, Play, Star, Video } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { MemberChips } from "@/components/shared";
import { ProgressBar, Tag } from "@/components/ui/primitives";
import { albumCount, albumCover, albumDates, framesOf, gb, quota, reelCover, reelMs, runTime } from "../derive";
import { DEMO_MAX_BYTES, MAX_EDGE, MEDIA_PLANS, TIMELINE_EMOJI, UPLOAD_ACCEPT, type Album, type MemoriesState, type NewPhoto, type Photo, type Reel, type SourceFormat, type TimelineEvent } from "../types";

/**
 * The module's own furniture: a picture that is always a real <img> with real
 * dimensions, the tiles the grids are made of, the album and reel cards, and
 * the upload pipeline — which is the only place in Memories that touches a
 * File, so the rules about HEIC, resizing and the demo's size cap live once.
 */

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

/**
 * AC 3 — the reader's own preference, watched live rather than read once, so
 * turning it on in the OS pauses a reel that is already playing.
 */
export function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState<boolean>(() => (typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches));
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const on = (): void => setReduced(mq.matches);
        mq.addEventListener("change", on);
        return () => mq.removeEventListener("change", on);
    }, []);
    return reduced;
}

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
    return (
        <Link to={to} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft size={15} aria-hidden="true" /> {children}
        </Link>
    );
}

/** A picture with the alt text the family actually wrote. */
export function PhotoImg({ photo, className, sizes }: { photo: Photo; className?: string; sizes?: string }) {
    if (photo.needsConversion) {
        return (
            <span className={cn("grid place-items-center bg-create-soft px-3 text-center text-2xs leading-4 text-create-ink", className)}>
                HEIC — converting
            </span>
        );
    }
    return <img src={photo.posterUrl ?? photo.url} alt={photo.caption || `A picture from ${shortDate(photo.takenAt)}`} width={photo.width} height={photo.height} loading="lazy" sizes={sizes} className={className} />;
}

export function PhotoTile({ photo, onOpen, selected, onSelect, small }: { photo: Photo; onOpen?: () => void; selected?: boolean; onSelect?: () => void; small?: boolean }) {
    const body = (
        <>
            <PhotoImg photo={photo} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            {photo.kind === "video" && (
                <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/55 text-white" aria-hidden="true">
                    <Video size={12} />
                </span>
            )}
            {photo.favourite && (
                <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/45 text-white" aria-hidden="true">
                    <Heart size={12} fill="currentColor" />
                </span>
            )}
            {photo.caption && !small && <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-2xs leading-4 text-white clamp-2">{photo.caption}</span>}
        </>
    );
    const cls = cn("group relative block aspect-square w-full overflow-hidden rounded-sm bg-subtle", selected && "ring-2 ring-brand ring-offset-2 ring-offset-page");
    if (onSelect) {
        return (
            <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={photo.caption || `Picture from ${shortDate(photo.takenAt)}`} className={cls}>
                {body}
            </button>
        );
    }
    return (
        <button type="button" onClick={onOpen} aria-label={photo.caption || `Picture from ${shortDate(photo.takenAt)}`} className={cls}>
            {body}
        </button>
    );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export function AlbumCard({ state, album, to }: { state: MemoriesState; album: Album; to: string }) {
    const cover = albumCover(state, album);
    const n = albumCount(state, album.id);
    return (
        <li>
            <Link to={to} className="group block overflow-hidden rounded-lg bg-card transition-shadow hover:shadow-hover">
                <span className="relative block aspect-[4/3] overflow-hidden bg-subtle">
                    {cover ? <PhotoImg photo={cover} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" /> : <span className="grid size-full place-items-center text-caption"><Images size={22} aria-hidden="true" /></span>}
                    {album.auto && <span className="absolute left-2 top-2 rounded-xs bg-black/55 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.04em] text-white">Made for us</span>}
                    {album.visibility === "shared" && <span className="absolute right-2 top-2 rounded-xs bg-black/55 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.04em] text-white">Private</span>}
                </span>
                <span className="block p-3.5">
                    <span className="block text-base font-semibold leading-5 clamp-2">{album.title}</span>
                    <span className="mt-1 block text-xs text-caption">
                        {n} {n === 1 ? "picture" : "pictures"} · {albumDates(album)}
                    </span>
                </span>
            </Link>
        </li>
    );
}

export function ReelCard({ state, reel, to }: { state: MemoriesState; reel: Reel; to: string }) {
    const cover = reelCover(state, reel);
    const n = framesOf(state, reel.id).length;
    return (
        <li className="w-[248px] md:w-auto">
            <Link to={to} className="group block overflow-hidden rounded-lg bg-card transition-shadow hover:shadow-hover">
                <span className="relative block aspect-[16/10] overflow-hidden bg-ink">
                    {cover ? <PhotoImg photo={cover} className="size-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.04]" /> : <span className="grid size-full place-items-center text-white/60"><Film size={22} aria-hidden="true" /></span>}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
                    <span className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between gap-2">
                        <span className="min-w-0">
                            <span className="block truncate text-md font-semibold text-white">{reel.title}</span>
                            <span className="block text-2xs text-white/75">
                                {n} frames · {runTime(reelMs(state, reel))}
                            </span>
                        </span>
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-ink" aria-hidden="true">
                            <Play size={13} fill="currentColor" />
                        </span>
                    </span>
                    {reel.status === "draft" && <span className="absolute left-2 top-2 rounded-xs bg-live px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.04em] text-white">Draft</span>}
                </span>
            </Link>
        </li>
    );
}

export function QuotaBar({ state }: { state: MemoriesState }) {
    const q = quota(state);
    const plan = MEDIA_PLANS[state.plan];
    return (
        <div className="rounded-lg bg-card p-4">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">The library</span>
                <span className="text-xs text-caption">{plan.name}</span>
            </div>
            <p className="mt-1 font-display text-3xl leading-7">
                {q.used} <span className="text-md font-normal text-caption">of {q.limit}</span>
            </p>
            <ProgressBar value={q.pct} label="Storage used" className="mt-2.5" />
            <p className="mt-2 text-xs leading-5 text-caption">
                {state.totalPhotos} pictures · reels up to {plan.maxFrames} frames · {plan.maxLinks} live links.
                {q.tight ? " Nearly full — tidy the duplicates or move up a plan." : ""}
            </p>
        </div>
    );
}

export function TimelineRow({ event, photo, last }: { event: TimelineEvent; photo?: Photo; last?: boolean }) {
    return (
        <li className="relative grid grid-cols-[26px_1fr] gap-3 pb-5">
            {!last && <span className="absolute left-[12px] top-7 h-full w-px bg-line" aria-hidden="true" />}
            <span className="z-10 grid size-[26px] place-items-center rounded-full bg-create-soft text-sm" aria-hidden="true">
                {TIMELINE_EMOJI[event.type]}
            </span>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <Link to={event.href} className="text-base font-semibold leading-5 underline-offset-4 hover:underline">
                        {event.title}
                    </Link>
                    <span className="text-xs text-caption">{shortDate(event.date)}</span>
                </div>
                {event.body && <p className="mt-0.5 text-sm leading-5 text-muted">{event.body}</p>}
                <div className="mt-1.5 flex items-center gap-3">
                    {event.memberIds.length > 0 && <MemberChips memberIds={event.memberIds} max={5} />}
                    {event.imported && <Tag tone="neutral">Merged</Tag>}
                </div>
                {photo && (
                    <Link to={event.href} className="mt-2.5 block w-full max-w-[220px] overflow-hidden rounded-sm">
                        <PhotoImg photo={photo} className="aspect-[4/3] w-full object-cover" />
                    </Link>
                )}
            </div>
        </li>
    );
}

export function Blank({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-card px-6 py-12 text-center">
            {icon && <span className="mb-1 grid size-12 place-items-center rounded-full bg-create-soft text-create-ink">{icon}</span>}
            <h3 className="text-[17px] font-semibold">{title}</h3>
            {body && <p className="max-w-sm text-md text-muted">{body}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

export function Starred({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button type="button" onClick={onToggle} aria-pressed={on} aria-label={on ? "Remove from favourites" : "Add to favourites"} className={cn("grid size-9 place-items-center rounded-full border transition-colors", on ? "border-live bg-live-soft text-live-ink" : "border-line-strong text-muted hover:text-ink")}>
            <Star size={15} fill={on ? "currentColor" : "none"} aria-hidden="true" />
        </button>
    );
}

// ---------------------------------------------------------------------------
// Uploads — AC 6
// ---------------------------------------------------------------------------

export interface UploadResult {
    photos: NewPhoto[];
    /** Files that could not be taken, and why, in the family's words. */
    rejected: Array<{ name: string; why: string }>;
}

function formatOf(file: File): SourceFormat | null {
    const name = file.name.toLowerCase();
    if (file.type === "video/mp4" || name.endsWith(".mp4")) return "mp4";
    if (file.type === "image/png" || name.endsWith(".png")) return "png";
    if (file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpeg";
    if (file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif")) return "heic";
    return null;
}

const readAsDataUrl = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("Could not read the file"));
        r.readAsDataURL(file);
    });

/** Longest edge down to MAX_EDGE, re-encoded as JPEG. Returns null if undecodable. */
async function resize(file: File): Promise<{ url: string; width: number; height: number; bytes: number } | null> {
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
        const w = Math.max(1, Math.round(bitmap.width * scale));
        const h = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const g = canvas.getContext("2d");
        if (!g) return null;
        g.drawImage(bitmap, 0, 0, w, h);
        bitmap.close?.();
        const url = canvas.toDataURL("image/jpeg", 0.82);
        return { url, width: w, height: h, bytes: Math.round((url.length * 3) / 4) };
    } catch {
        return null;
    }
}

/** A video's own first frame, so a clip is never a grey rectangle in a grid. */
async function posterOf(url: string): Promise<{ poster: string | null; width: number; height: number }> {
    return new Promise((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.muted = true;
        v.src = url;
        const done = (poster: string | null): void => resolve({ poster, width: v.videoWidth || 1280, height: v.videoHeight || 720 });
        v.onloadeddata = () => {
            try {
                const canvas = document.createElement("canvas");
                const scale = Math.min(1, MAX_EDGE / Math.max(v.videoWidth || 1, v.videoHeight || 1));
                canvas.width = Math.round((v.videoWidth || 1280) * scale);
                canvas.height = Math.round((v.videoHeight || 720) * scale);
                const g = canvas.getContext("2d");
                if (!g) return done(null);
                g.drawImage(v, 0, 0, canvas.width, canvas.height);
                done(canvas.toDataURL("image/jpeg", 0.75));
            } catch {
                done(null);
            }
        };
        v.onerror = () => done(null);
        v.currentTime = 0.1;
    });
}

/**
 * Files → pictures, with the four formats the brief names.
 *
 * JPEG and PNG are decoded and resized to MAX_EDGE. MP4 is kept whole and gets
 * a poster frame taken from itself. HEIC is the honest case: no browser but
 * Safari will decode it, so the original is kept, `needsConversion` is set,
 * and the interface says "converting" rather than showing a broken picture —
 * the live app converts it server-side on upload.
 */
export async function filesToPhotos(files: File[], takenAt: string, place: string): Promise<UploadResult> {
    const photos: NewPhoto[] = [];
    const rejected: Array<{ name: string; why: string }> = [];
    for (const file of files) {
        const format = formatOf(file);
        if (!format) {
            rejected.push({ name: file.name, why: "We take HEIC, JPEG, PNG and MP4." });
            continue;
        }
        if (file.size > DEMO_MAX_BYTES && format !== "heic") {
            rejected.push({ name: file.name, why: `${gb(file.size)} is more than the demo can hold in the browser (${gb(DEMO_MAX_BYTES)}). The live app has no such limit.` });
            continue;
        }
        const taken = file.lastModified ? new Date(file.lastModified).toISOString().slice(0, 10) : takenAt;
        const base = { caption: "", takenAt: taken, place, peopleIds: [], tags: [] };
        if (format === "mp4") {
            const url = await readAsDataUrl(file);
            const { poster, width, height } = await posterOf(url);
            photos.push({ ...base, url, posterUrl: poster, kind: "video", format, width, height, bytes: file.size });
            continue;
        }
        const resized = await resize(file);
        if (resized) {
            photos.push({ ...base, url: resized.url, kind: "photo", format, width: resized.width, height: resized.height, bytes: resized.bytes });
            continue;
        }
        if (file.size > DEMO_MAX_BYTES) {
            rejected.push({ name: file.name, why: "This browser can't open HEIC, and the original is too big for the demo to keep." });
            continue;
        }
        const url = await readAsDataUrl(file);
        photos.push({ ...base, url, kind: "photo", format, width: 1600, height: 1200, bytes: file.size, needsConversion: true });
    }
    return { photos, rejected };
}

/** The file picker, as a hook: open it, get pictures back. */
export function useFilePicker(onFiles: (files: File[]) => void): { input: ReactNode; open: () => void } {
    const ref = useRef<HTMLInputElement>(null);
    const open = useCallback(() => ref.current?.click(), []);
    const input = (
        <input
            ref={ref}
            type="file"
            multiple
            accept={UPLOAD_ACCEPT}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length) onFiles(files);
            }}
        />
    );
    return { input, open };
}
