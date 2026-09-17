import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Circle, Image as ImageIcon, Mic, Music, Pause, Play, Square, Type, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { clock, relative } from "@/lib/format";
import { useSpace } from "@/state/space";
import { MemberAvatar } from "@/components/shared";
import { Button, Card, Tag } from "@/components/ui/primitives";
import { CARD_PALETTES, lineMs, songLines } from "../generate";
import { coverOf, planOf, previewOf, capState } from "../derive";
import { PLANS, SONG_KIND_LABEL, type PlanTier, type SongData, type SongRecording, type StoryData, type StudioItem, type StudioState } from "../types";

/**
 * The studio's own furniture: a real lead sheet, a sing-along that moves at
 * the song's tempo, the browser's recorder (because Wàfè writes words and
 * chords, not audio — and a family singing it themselves is better than a
 * synthetic voice pretending to), the typographic card an unavailable image
 * becomes, the scene deck, and the allowance meter with the plan table the
 * rest of the product keeps referring to.
 */

// ---------------------------------------------------------------------------
// Songs
// ---------------------------------------------------------------------------

/** AC7: chords above the words, sections named, key and tempo on the sheet. */
export function LeadSheet({ song, title, className }: { song: SongData; title?: string; className?: string }) {
    return (
        <div className={cn("rounded-xl bg-card p-5 md:p-7", className)}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
                <div>
                    {title && <h2 className="font-display text-5xl leading-8">{title}</h2>}
                    <p className="mt-1 text-sm text-muted">
                        {SONG_KIND_LABEL[song.songKind]}
                        {song.theme ? ` · ${song.theme}` : ""}
                    </p>
                </div>
                <dl className="flex gap-5 text-sm">
                    <div>
                        <dt className="text-2xs font-semibold uppercase tracking-[0.06em] text-caption">Key</dt>
                        <dd className="font-display text-2xl leading-7">{song.key}</dd>
                    </div>
                    <div>
                        <dt className="text-2xs font-semibold uppercase tracking-[0.06em] text-caption">Tempo</dt>
                        <dd className="font-display text-2xl leading-7 tabular-nums">{song.tempo}</dd>
                    </div>
                </dl>
            </div>
            <div className="space-y-6">
                {song.structure.map((section, i) => (
                    <section key={`${section.section}-${i}`}>
                        <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-create-ink">{section.section}</h3>
                        <p className="font-mono text-sm font-semibold tracking-[0.06em] text-muted">{section.chords}</p>
                        <p className="mt-1 whitespace-pre-wrap text-lg leading-8">{section.lyrics}</p>
                    </section>
                ))}
            </div>
        </div>
    );
}

/** Big type, one line at a time, moving at the song's own tempo. */
export function SingAlong({ song, title, onClose }: { song: SongData; title: string; onClose: () => void }) {
    const lines = songLines(song);
    const [i, setI] = useState(0);
    const [playing, setPlaying] = useState(true);

    useEffect(() => {
        if (!playing) return;
        const t = window.setInterval(() => setI((v) => (v + 1 < lines.length ? v + 1 : v)), lineMs(song.tempo));
        return () => window.clearInterval(t);
    }, [playing, song.tempo, lines.length]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === " ") {
                e.preventDefault();
                setPlaying((v) => !v);
            }
            if (e.key === "ArrowRight") setI((v) => Math.min(lines.length - 1, v + 1));
            if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lines.length, onClose]);

    const current = lines[i];
    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-brand text-white" role="dialog" aria-modal="true" aria-label={`Sing along to ${title}`}>
            <header className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                    <p className="truncate font-display text-xl leading-6">{title}</p>
                    <p className="text-xs opacity-80">
                        {song.key} · {song.tempo} bpm · {current?.section}
                    </p>
                </div>
                <button type="button" onClick={onClose} aria-label="Close the sing-along" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25">
                    <X size={18} aria-hidden="true" />
                </button>
            </header>

            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="font-mono text-md font-semibold tracking-[0.14em] opacity-70">{current?.chords}</p>
                <p className="mt-4 max-w-3xl font-display text-7xl leading-[1.25] md:text-[46px]">{current?.line || "…"}</p>
                <p className="mt-6 max-w-2xl text-lg leading-7 opacity-60">{lines[i + 1]?.line ?? "the end"}</p>
            </div>

            <footer className="flex items-center justify-center gap-3 px-5 py-6">
                <button type="button" onClick={() => setI((v) => Math.max(0, v - 1))} aria-label="Previous line" className="grid size-11 place-items-center rounded-full bg-white/15 hover:bg-white/25">
                    <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pause" : "Play"} className="grid size-14 place-items-center rounded-full bg-white text-brand">
                    {playing ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
                </button>
                <button type="button" onClick={() => setI((v) => Math.min(lines.length - 1, v + 1))} aria-label="Next line" className="grid size-11 place-items-center rounded-full bg-white/15 hover:bg-white/25">
                    <ChevronRight size={20} aria-hidden="true" />
                </button>
            </footer>
        </div>
    );
}

/**
 * The recorder. Wàfè does not generate audio — there is no licensed music
 * model behind it, and inventing one would put the family on the wrong side of
 * a rights question. What it can do costs nothing and is better: capture the
 * family actually singing the lead sheet, keep the take on the song, and let
 * Memories use it as a reel track.
 */
export function Recorder({ recording, onSave, onClear, disabled }: { recording: SongRecording | null; onSave: (r: SongRecording) => Promise<void> | void; onClear: () => Promise<void> | void; disabled?: boolean }) {
    const { me } = useSpace();
    const [state, setState] = useState<"idle" | "recording" | "saving">("idle");
    const [seconds, setSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const rec = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);
    const started = useRef(0);

    const supported = typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

    useEffect(() => {
        if (state !== "recording") return;
        const t = window.setInterval(() => setSeconds(Math.round((Date.now() - started.current) / 1000)), 500);
        return () => window.clearInterval(t);
    }, [state]);

    const stop = useCallback(() => {
        rec.current?.stop();
        rec.current?.stream.getTracks().forEach((t) => t.stop());
    }, []);

    const start = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            chunks.current = [];
            mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
            mr.onstop = () => {
                const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
                const secs = Math.max(1, Math.round((Date.now() - started.current) / 1000));
                setState("saving");
                const reader = new FileReader();
                reader.onload = async () => {
                    try {
                        await onSave({ url: String(reader.result), seconds: secs, byMemberId: me.id, recordedAt: new Date().toISOString(), mime: blob.type });
                    } catch (e) {
                        setError(e instanceof Error ? e.message : "That take could not be saved.");
                    } finally {
                        setState("idle");
                        setSeconds(0);
                    }
                };
                reader.onerror = () => {
                    setError("That take could not be read back.");
                    setState("idle");
                };
                reader.readAsDataURL(blob);
            };
            rec.current = mr;
            started.current = Date.now();
            setSeconds(0);
            setState("recording");
            mr.start();
        } catch {
            setError("Wàfè could not reach the microphone. Check the browser's permission and try again.");
        }
    };

    if (!supported) return <p className="text-sm text-muted">This browser cannot record audio, so the lead sheet is the whole of it here.</p>;

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3">
                {state === "recording" ? (
                    <Button variant="danger" size="md" onClick={stop}>
                        <Square size={14} aria-hidden="true" /> Stop · {clock(seconds)}
                    </Button>
                ) : (
                    <Button variant="outline" size="md" onClick={() => void start()} loading={state === "saving"} disabled={disabled}>
                        <Mic size={15} aria-hidden="true" /> {recording ? "Record it again" : "Record us singing it"}
                    </Button>
                )}
                {state === "recording" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-danger-ink">
                        <Circle size={9} className="animate-pulse fill-current" aria-hidden="true" /> Recording
                    </span>
                )}
            </div>
            {recording && (
                <div className="mt-3 rounded-lg bg-page p-3.5">
                    <p className="mb-2 text-xs text-muted">
                        Recorded {relative(recording.recordedAt)} · {clock(recording.seconds)} · this take can be the track under a Memories reel.
                    </p>
                    {/* A family singing their own song has no caption track to give. */}
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio controls src={recording.url} className="w-full" />
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => void onClear()}>
                        Delete this take
                    </Button>
                </div>
            )}
            {error && <p className="mt-2 text-xs text-danger-ink">{error}</p>}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

/**
 * AC8: no image model on this plan does not mean a broken card. The prompt is
 * kept and set properly, on one of the family's own grounds, so the family
 * still gets something to look at — and the moment images are switched on the
 * same row renders as a picture.
 */
export function TypographicCard({ prompt, palette, title, className }: { prompt: string; palette: number; title?: string; className?: string }) {
    const p = CARD_PALETTES[Math.abs(palette) % CARD_PALETTES.length];
    return (
        <figure className={cn("flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-lg p-6", className)} style={{ background: p.bg, color: p.ink }}>
            <span className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em]" style={{ color: p.tint }}>
                <Type size={12} aria-hidden="true" /> Set, not drawn
            </span>
            <figcaption className="font-display text-2xl leading-[1.3] md:text-5xl">{prompt}</figcaption>
            {title && (
                <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: p.tint }}>
                    {title}
                </span>
            )}
        </figure>
    );
}

// ---------------------------------------------------------------------------
// Storyboards
// ---------------------------------------------------------------------------

export function SceneArt({ scene, className }: { scene: StoryData["scenes"][number]; className?: string }) {
    if (scene.imageUrl) {
        return <img src={scene.imageUrl} alt={scene.visual} width={640} height={480} loading="lazy" className={cn("aspect-[4/3] w-full rounded-lg object-cover", className)} />;
    }
    return (
        <div className={cn("flex aspect-[4/3] w-full flex-col justify-end rounded-lg bg-create-soft p-4", className)}>
            <ImageIcon size={18} className="mb-auto text-create-ink" aria-hidden="true" />
            <p className="text-xs leading-5 text-create-ink">{scene.visual}</p>
        </div>
    );
}

/** One scene per screen, arrows and the keyboard, nothing else on the page. */
export function PresentDeck({ story, title, onClose }: { story: StoryData; title: string; onClose: () => void }) {
    const [i, setI] = useState(0);
    const last = story.scenes.length - 1;
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight" || e.key === " ") setI((v) => Math.min(last, v + 1));
            if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [last, onClose]);

    const scene = story.scenes[i];
    if (!scene) return null;
    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink text-white" role="dialog" aria-modal="true" aria-label={`${title}, scene ${scene.n} of ${story.scenes.length}`}>
            <header className="flex items-center justify-between gap-3 px-5 py-4">
                <p className="truncate font-display text-xl leading-6">{title}</p>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25">
                    <X size={18} aria-hidden="true" />
                </button>
            </header>
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-4 md:flex-row md:gap-10 md:px-12">
                <div className="w-full max-w-md">
                    {scene.imageUrl ? (
                        <img src={scene.imageUrl} alt={scene.visual} width={800} height={600} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
                    ) : (
                        <div className="flex aspect-[4/3] w-full items-end rounded-xl bg-white/10 p-5">
                            <p className="text-sm leading-5 opacity-70">{scene.visual}</p>
                        </div>
                    )}
                </div>
                <div className="w-full max-w-md">
                    <p className="text-2xs font-semibold uppercase tracking-[0.1em] opacity-60">
                        {scene.n} of {story.scenes.length} · {scene.caption}
                    </p>
                    <p className="mt-3 font-display text-4xl leading-[1.35] md:text-[32px]">{scene.narration}</p>
                </div>
            </div>
            <footer className="flex items-center justify-center gap-3 px-5 py-6">
                <button type="button" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0} aria-label="Previous scene" className="grid size-11 place-items-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30">
                    <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <span className="text-sm tabular-nums opacity-70">
                    {i + 1} / {story.scenes.length}
                </span>
                <button type="button" onClick={() => setI((v) => Math.min(last, v + 1))} disabled={i === last} aria-label="Next scene" className="grid size-11 place-items-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30">
                    <ChevronRight size={20} aria-hidden="true" />
                </button>
            </footer>
        </div>
    );
}

// ---------------------------------------------------------------------------
// The gallery card
// ---------------------------------------------------------------------------

const KIND_TAG: Record<"song" | "story" | "image" | "chat", string> = { song: "Song", story: "Storyboard", image: "Picture", chat: "Conversation" };

export function GalleryCard({ item }: { item: StudioItem }) {
    const cover = coverOf(item);
    return (
        <li>
            <Link to={`/create/studio/gallery/${item.id}`} className="flex h-full flex-col overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-hover">
                {cover ? (
                    <img src={cover} alt="" width={480} height={360} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                ) : item.kind === "image" ? (
                    <TypographicCard prompt={item.data.prompt} palette={item.data.palette} className="rounded-none" />
                ) : (
                    <div className="grid aspect-[4/3] w-full place-items-center bg-create-soft text-create-ink">
                        {item.kind === "song" ? <Music size={28} aria-hidden="true" /> : <ImageIcon size={28} aria-hidden="true" />}
                    </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                    <Tag tone="create" className="mb-2">
                        {KIND_TAG[item.kind]}
                    </Tag>
                    <h3 className="text-lg font-semibold leading-6">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted">{previewOf(item)}</p>
                    <div className="mt-3 flex items-center gap-2 pt-1 text-xs text-caption">
                        <MemberAvatar memberId={item.memberId} size="xs" />
                        <span>{relative(item.createdAt)}</span>
                    </div>
                </div>
            </Link>
        </li>
    );
}

// ---------------------------------------------------------------------------
// The allowance and the plans
// ---------------------------------------------------------------------------

const money = (cents: number): string => `£${(cents / 100).toFixed(2)}`;

/**
 * AC10, and the gap the brief left: what a plan actually is. The meter shows
 * the month, the 80% warning is said once and plainly, and the hard stop is a
 * sentence rather than a broken screen. A parent can move plan here, which is
 * also how the hard stop is reachable in the demo: drop to Seed and the month
 * is already over its allowance.
 */
export function UsageMeter({ state, onPlan }: { state: StudioState; onPlan?: (plan: PlanTier) => Promise<void> | void }) {
    const cap = capState(state.usage);
    const plan = planOf(state);
    const [busy, setBusy] = useState<PlanTier | null>(null);
    const choose = async (tier: PlanTier) => {
        if (!onPlan || tier === state.plan) return;
        setBusy(tier);
        try {
            await onPlan(tier);
        } finally {
            setBusy(null);
        }
    };
    return (
        <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="font-display text-2xl leading-7">This month&apos;s companion allowance</h2>
                    <p className="mt-1 text-sm text-muted">
                        {money(cap.usedCents)} of {money(cap.capCents)} on the {plan.name} plan · resets on the 1st
                    </p>
                </div>
                <span className={cn("font-display text-6xl leading-8 tabular-nums", cap.blocked ? "text-danger-ink" : cap.warn ? "text-peach" : "text-ink")}>{cap.pct}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.min(100, cap.pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Companion allowance used">
                <span className={cn("block h-full rounded-full transition-[width] duration-500", cap.blocked ? "bg-danger" : cap.warn ? "bg-peach" : "bg-brand")} style={{ width: `${Math.min(100, cap.pct)}%` }} />
            </div>
            {cap.message && <p className={cn("mt-3 rounded-md px-3.5 py-2.5 text-sm leading-5", cap.blocked ? "bg-danger-soft text-danger-ink" : "bg-peach-soft text-peach")}>{cap.message}</p>}

            {onPlan && (
                <div className="mt-5">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">What each plan includes</h3>
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5 md:grid-cols-3">
                        {(Object.keys(PLANS) as PlanTier[]).map((tier) => {
                            const p = PLANS[tier];
                            const current = tier === state.plan;
                            return (
                                <li key={tier}>
                                    <button
                                        type="button"
                                        onClick={() => void choose(tier)}
                                        aria-pressed={current}
                                        disabled={busy !== null}
                                        className={cn("h-full w-full rounded-lg border p-4 text-left transition-colors disabled:opacity-60", current ? "border-brand bg-brand-soft" : "border-line-strong hover:border-ink")}
                                    >
                                        <span className="flex items-baseline justify-between gap-2">
                                            <span className="text-base font-semibold">{p.name}</span>
                                            <span className="text-xs text-muted">{p.price}</span>
                                        </span>
                                        <span className="mt-1.5 block text-xs leading-5 text-muted">{p.note}</span>
                                        <span className="mt-2 block text-xs leading-5 text-caption">
                                            {money(p.aiCapCents)} of companion a month · {p.images ? "image generation on" : "typographic cards instead of pictures"} · {p.reelMinutes} reel minutes · {p.mediaMb >= 1000 ? `${p.mediaMb / 1000} GB` : `${p.mediaMb} MB`} of media ·{" "}
                                            {p.seats} sign-ins
                                        </span>
                                        {current && <span className="mt-2 block text-2xs font-semibold uppercase tracking-[0.06em] text-brand-ink">Your plan</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </Card>
    );
}
