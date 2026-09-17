import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Camera, FolderKanban, Globe, Image as ImageIcon, Lock, MessageCircle, Plane, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { money, shortDate } from "@/lib/format";
import { useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { MemberAvatar } from "@/components/shared";
import { Tag } from "@/components/ui/primitives";
import { BASE, boardStats, commentsOf, coverOf } from "../derive";
import { hostOf } from "../images";
import { CACHE_LABEL, KIND_EMOJI, KIND_LABEL, REACTION_EMOJI } from "../types";
import type { Board, MoodboardsState, Pin } from "../types";

/**
 * The small pieces every moodboards screen is built from. Anything that reads
 * another module does it through that module's LOADED SLICE
 * (`useModuleState`) — never its repo, never its types — so a board still
 * renders perfectly when Projects or Travel is not in the build.
 */

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null;

/** The title another module gave a row we only hold the id of. */
function useLinkedTitle(moduleId: string, key: string, id: string | null): string | null {
    const slice = useModuleState<Rec>(moduleId);
    if (!id || !isRec(slice)) return null;
    const rows = slice[key];
    if (!Array.isArray(rows)) return null;
    for (const raw of rows) {
        if (!isRec(raw)) continue;
        if (raw.id === id && typeof raw.title === "string") return raw.title;
    }
    return null;
}

/** "Kitchen refresh" / "Christmas in Lagos", linked, when we can resolve it. */
export function BoardLinks({ board, className }: { board: Board; className?: string }) {
    const project = useLinkedTitle("projects", "projects", board.projectId);
    const trip = useLinkedTitle("travel", "trips", board.tripId);
    const projectLabel = project ?? (board.projectId ? board.projectLabel : "");
    const tripLabel = trip ?? (board.tripId ? board.tripLabel : "");
    if (!projectLabel && !tripLabel) return null;
    return (
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
            {projectLabel && (
                <Link to={`/execute/projects/${board.projectId}`} className="inline-flex items-center gap-1.5 rounded-full bg-execute-soft px-3 py-1 text-xs font-semibold text-execute-ink">
                    <FolderKanban size={13} aria-hidden="true" /> {projectLabel}
                </Link>
            )}
            {tripLabel && (
                <Link to={`/live/travel/${board.tripId}`} className="inline-flex items-center gap-1.5 rounded-full bg-live-soft px-3 py-1 text-xs font-semibold text-live-ink">
                    <Plane size={13} aria-hidden="true" /> {tripLabel}
                </Link>
            )}
        </div>
    );
}

/** How this picture came to be ours. Always shown; never guessed. */
export function CacheBadge({ pin, className }: { pin: Pin; className?: string }) {
    const placeholder = pin.cachedFrom === "placeholder";
    return (
        <span className={cn("inline-flex items-center gap-1.5 text-2xs", placeholder ? "text-peach" : "text-caption", className)}>
            {pin.source === "url" ? <Globe size={12} aria-hidden="true" /> : pin.source === "upload" ? <Camera size={12} aria-hidden="true" /> : <ImageIcon size={12} aria-hidden="true" />}
            {CACHE_LABEL[pin.cachedFrom]}
            {pin.sourceUrl ? ` · ${hostOf(pin.sourceUrl)}` : ""}
        </span>
    );
}

export function VisibilityChip({ board }: { board: Board }) {
    const { members } = useSpace();
    if (board.visibility === "private") {
        return (
            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-muted">
                <Lock size={12} aria-hidden="true" /> Just me
            </span>
        );
    }
    if (board.visibility === "shared") {
        const names = board.collaboratorIds
            .map((id) => members.find((m) => m.id === id)?.name.split(" ")[0])
            .filter(Boolean)
            .slice(0, 3);
        return (
            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-muted">
                <Users size={12} aria-hidden="true" /> {names.length ? names.join(", ") : "Shared"}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-2xs font-semibold text-muted">
            <Users size={12} aria-hidden="true" /> {board.visibility === "child" ? "Everyone" : "The family"}
        </span>
    );
}

/** One board on the shelf. */
export function BoardTile({ board, state }: { board: Board; state: MoodboardsState }) {
    const cover = coverOf(state, board);
    const stats = boardStats(state, board.id);
    return (
        <li>
            <Link to={`${BASE}/${board.id}`} className="group flex h-full flex-col overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-hover">
                <span className="relative block aspect-[4/3] w-full overflow-hidden bg-subtle">
                    {cover ? (
                        <img src={cover} alt="" width={800} height={600} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                        <span className="grid size-full place-items-center text-6xl" aria-hidden="true">
                            {KIND_EMOJI[board.kind]}
                        </span>
                    )}
                    <span className="absolute left-3 top-3">
                        <Tag tone="create">{KIND_LABEL[board.kind]}</Tag>
                    </span>
                </span>
                <span className="flex flex-1 flex-col gap-1.5 p-4">
                    <span className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 text-lg font-semibold leading-6 clamp-2">{board.title}</span>
                        <MemberAvatar memberId={board.ownerMemberId} size="xs" />
                    </span>
                    {board.description && <span className="block text-sm leading-5 text-muted clamp-2">{board.description}</span>}
                    <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-caption">
                        <span>
                            {stats.pins} pin{stats.pins === 1 ? "" : "s"}
                        </span>
                        {stats.comments > 0 && (
                            <span className="inline-flex items-center gap-1">
                                <MessageCircle size={12} aria-hidden="true" /> {stats.comments}
                            </span>
                        )}
                        <VisibilityChip board={board} />
                    </span>
                </span>
            </Link>
        </li>
    );
}

/** The masonry: CSS columns, so a tall pin never leaves a hole. */
export function Masonry({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("columns-2 gap-3 md:columns-3 md:gap-4 xl:columns-4 [&>*]:mb-3 md:[&>*]:mb-4", className)}>{children}</div>;
}

/**
 * One pin in the masonry. It is a link to the pin's own route, so the lightbox
 * survives a refresh and can be shared.
 */
export function PinCard({ pin, state, boardId, actions }: { pin: Pin; state: MoodboardsState; boardId: string; actions?: ReactNode }) {
    const { space } = useSpace();
    const comments = commentsOf(state, pin.id);
    const reaction = comments.find((c) => c.reaction)?.reaction ?? null;
    return (
        <article className="break-inside-avoid overflow-hidden rounded-lg bg-card">
            <Link to={`${BASE}/${boardId}/pins/${pin.id}`} className="group block" aria-label={pin.title || "Open pin"}>
                <span className="relative block overflow-hidden bg-subtle">
                    <img src={pin.imageUrl} alt={pin.title || "Pinned"} width={800} height={1000} loading="lazy" className="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]" />
                    {reaction && (
                        <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-card/90 text-sm" title="Someone reacted" aria-hidden="true">
                            {REACTION_EMOJI[reaction]}
                        </span>
                    )}
                </span>
            </Link>
            <div className="flex flex-col gap-1.5 p-3">
                <div className="flex items-start gap-2">
                    <Link to={`${BASE}/${boardId}/pins/${pin.id}`} className="min-w-0 flex-1 text-sm font-semibold leading-5 clamp-2 hover:underline">
                        {pin.title || "Untitled"}
                    </Link>
                    {actions}
                </div>
                {pin.note && <p className="text-xs leading-[18px] text-muted clamp-2">{pin.note}</p>}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-2xs text-caption">
                    <MemberAvatar memberId={pin.addedBy} size="xs" />
                    <span>{shortDate(pin.createdAt)}</span>
                    {pin.priceCents !== null && <span className="font-semibold text-ink">{money(pin.priceCents, space.currency)}</span>}
                    {comments.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                            <MessageCircle size={11} aria-hidden="true" /> {comments.length}
                        </span>
                    )}
                </div>
                {pin.tags.length > 0 && (
                    <ul className="flex flex-wrap gap-1">
                        {pin.tags.slice(0, 3).map((t) => (
                            <li key={t} className="rounded-xs bg-page px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] text-muted">
                                {t}
                            </li>
                        ))}
                    </ul>
                )}
                <CacheBadge pin={pin} />
            </div>
        </article>
    );
}

/** The tag filter, used on the shelf and inside a board (AC 3). */
export function TagRow({ tags, active, onPick, className }: { tags: Array<{ tag: string; n: number }>; active: string; onPick: (t: string) => void; className?: string }) {
    if (!tags.length) return null;
    return (
        <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Filter by tag">
            {tags.map((t) => {
                const on = t.tag === active;
                return (
                    <li key={t.tag}>
                        <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => onPick(on ? "" : t.tag)}
                            className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                        >
                            {t.tag}
                            <span className="text-2xs font-normal opacity-70">{t.n}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
