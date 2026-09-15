import { ChevronLeft, Circle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { peopleLabel, type LiveLesson, type RoomSnapshot } from "@coir-six/core";
import { cn } from "@/lib/cn";
import { useElapsed } from "./useRoom";

/**
 * The bar across the top of the class: where you came from, what this is, how
 * many people are in it, and — for the host — the recorder.
 *
 * The emoji beside the title are the reactions people have just thrown, so the
 * room's mood is visible from the title bar without watching the stage.
 */
export function RoomHeader({
    lesson,
    snap,
    canHost,
    recording,
    recorderBusy,
    onToggleRecord,
    onAdd,
}: {
    lesson: LiveLesson;
    snap: RoomSnapshot;
    canHost: boolean;
    recording: boolean;
    recorderBusy: boolean;
    onToggleRecord: () => void;
    onAdd: () => void;
}) {
    const elapsed = useElapsed(snap.startedAt);
    const recent = snap.reactions.slice(-3);

    return (
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <Link
                to="/lessons"
                aria-label="Back to lessons"
                className="order-1 grid size-9 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-subtle"
            >
                <ChevronLeft size={22} />
            </Link>

            {/* On a phone the title gets its own line: squeezed between the back
                arrow and the buttons it truncates to "Offi…", which names nothing. */}
            <div className="order-3 flex min-w-0 flex-1 basis-full items-center gap-2 sm:order-2 sm:basis-auto">
                {/* leading-tight + the padding keep descenders off the clip edge. */}
                <h1 className="truncate py-0.5 text-[22px] font-semibold leading-tight md:text-[26px]">{lesson.title}</h1>
                <span className="flex shrink-0 gap-0.5 text-[18px]" aria-hidden="true">
                    {recent.map((r) => (
                        <span key={r.id} className="animate-[cs-pop_400ms_ease-out]">
                            {r.emoji}
                        </span>
                    ))}
                </span>
            </div>

            <div className="order-2 flex shrink-0 items-center gap-2 sm:order-3">
                {elapsed && (
                    <span className="hidden text-[13px] tabular-nums text-muted sm:inline" aria-label="Time in this class">
                        {elapsed}
                    </span>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-2 text-[13px] font-medium shadow-hover">
                    <Users size={14} aria-hidden="true" />
                    {peopleLabel(snap.participants.length)}
                </span>

                <button
                    type="button"
                    onClick={onAdd}
                    className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                    + Add People
                </button>

                {canHost ? (
                    <button
                        type="button"
                        onClick={onToggleRecord}
                        disabled={recorderBusy}
                        aria-pressed={recording}
                        className={cn(
                            "inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13px] font-medium transition-colors disabled:opacity-50",
                            recording ? "bg-danger-soft text-danger-ink" : "bg-card text-ink shadow-hover hover:bg-subtle",
                        )}
                    >
                        Recorder
                        <Circle
                            size={16}
                            aria-hidden="true"
                            className={cn(recording ? "animate-pulse fill-danger text-danger" : "fill-danger/25 text-danger/40")}
                        />
                    </button>
                ) : (
                    recording && (
                        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-danger-soft px-3 text-[13px] font-medium text-danger-ink">
                            <Circle size={14} className="animate-pulse fill-danger text-danger" aria-hidden="true" />
                            Recording
                        </span>
                    )
                )}
            </div>
        </header>
    );
}
