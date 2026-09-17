import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Captions, Check, Lock, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { duration } from "@/lib/format";
import { MemberChips } from "@/components/shared";
import { ProgressBar, Tag } from "@/components/ui/primitives";
import { playlistProgress, videoDone, videoPct } from "../derive";
import type { LearningState, LessonVideo, Playlist, TranscriptSource } from "../types";
import { SOURCE_LABEL } from "../types";

/** Where a summary came from — shown wherever a summary is (AC 2). */
export function SourceTag({ source, className }: { source: TranscriptSource; className?: string }) {
    return (
        <Tag tone={source === "captions" ? "ok" : "neutral"} className={className} icon={source === "captions" ? <Captions size={12} aria-hidden="true" /> : <Sparkles size={12} aria-hidden="true" />}>
            {SOURCE_LABEL[source]}
        </Tag>
    );
}

const VIS_ICON: Record<Playlist["visibility"], ReactNode> = {
    private: <Lock size={12} aria-hidden="true" />,
    shared: <Users size={12} aria-hidden="true" />,
    family: <Users size={12} aria-hidden="true" />,
    child: <Users size={12} aria-hidden="true" />,
};
const VIS_LABEL: Record<Playlist["visibility"], string> = { private: "Private", shared: "Shared", family: "Family", child: "Everyone" };

export function VisibilityTag({ p }: { p: Playlist }) {
    return (
        <Tag tone={p.visibility === "private" ? "warn" : "neutral"} icon={VIS_ICON[p.visibility]}>
            {VIS_LABEL[p.visibility]}
        </Tag>
    );
}

/** One lesson in a list: thumbnail, title, channel, length and my progress. */
export function LessonRow({ state, video, memberId, meta, action, big }: { state: LearningState; video: LessonVideo; memberId: string; meta?: ReactNode; action?: ReactNode; big?: boolean }) {
    const done = videoDone(state, video.id, memberId);
    const pct = videoPct(state, video.id, memberId);
    return (
        <li className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-page">
            <Link to={`/grow/learning/lessons/${video.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="relative shrink-0">
                    <img src={video.thumbnailUrl} alt="" width={160} height={90} loading="lazy" className={cn("rounded-sm object-cover", big ? "h-[72px] w-32" : "h-[54px] w-24")} />
                    {done && (
                        <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full border-2 border-card bg-mint text-white" aria-hidden="true">
                            <Check size={12} strokeWidth={3} />
                        </span>
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span className={cn("block font-semibold clamp-2", big ? "text-base leading-5" : "text-md leading-5")}>{video.title}</span>
                    <span className="mt-0.5 block text-xs text-caption">
                        {video.channel}
                        {video.durationS ? ` · ${duration(video.durationS)}` : ""}
                        {video.valueId ? ` · ${video.valueId}` : ""}
                    </span>
                    {meta && <span className="mt-1 block text-xs text-muted">{meta}</span>}
                    {!done && pct > 0 && <ProgressBar value={pct} className="mt-2" label={`${video.title} progress`} />}
                </span>
            </Link>
            {action && <span className="shrink-0">{action}</span>}
        </li>
    );
}

/** A course on the hub: cover, progress for this member, who it is set for. */
export function PlaylistCard({ state, p, memberId }: { state: LearningState; p: Playlist; memberId: string }) {
    const pr = playlistProgress(state, p, memberId);
    return (
        <li>
            <Link to={`/grow/learning/playlists/${p.id}`} className="group flex h-full flex-col overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-hover">
                <span className="relative block aspect-[16/7] w-full overflow-hidden bg-grow-soft">
                    {p.coverUrl ? (
                        <img src={p.coverUrl} alt="" width={480} height={210} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                        <span className="grid size-full place-items-center font-display text-3xl text-grow-ink">{p.name}</span>
                    )}
                </span>
                <span className="flex flex-1 flex-col p-4">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <VisibilityTag p={p} />
                        {p.childSafe && <Tag tone="grow">Child-safe</Tag>}
                        {p.valueId && <Tag tone="neutral">{p.valueId}</Tag>}
                    </span>
                    <span className="mt-2.5 block text-lg font-semibold leading-6">{p.name}</span>
                    {p.note && <span className="mt-1 block text-sm leading-5 text-muted clamp-2">{p.note}</span>}
                    <span className="mt-auto pt-3">
                        <ProgressBar value={pr.pct} label={`${p.name} progress`} />
                        <span className="mt-2 flex items-center justify-between text-xs text-caption">
                            <span>
                                {pr.done} of {pr.total} watched
                            </span>
                            <MemberChips memberIds={p.assignedTo} max={3} />
                        </span>
                    </span>
                </span>
            </Link>
        </li>
    );
}
