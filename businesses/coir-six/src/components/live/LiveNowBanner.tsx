import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Radio } from "lucide-react";
import { liveNow, liveOpensAt, liveSoon, time, type LiveLesson } from "@coir-six/core";
import { cn } from "@/lib/cn";
import { useData } from "@/state/data";
import { Avatar } from "@/components/ui/primitives";

/**
 * "There is a class on right now."
 *
 * Without this the classroom is only reachable from one button on one page,
 * which is only a button for the ~90 minutes a class is open — so the whole
 * feature reads as missing for most of the day. This is the signal: on the
 * dashboard and at the top of Lessons, whenever something is live, and a
 * countdown when the next one is close enough to be worth waiting for.
 *
 * Renders nothing the rest of the time. A banner that is always there stops
 * being a signal.
 */
export function LiveNowBanner({ className }: { className?: string }) {
    const { catalogue } = useData();
    // Re-evaluate on a timer: a class opening while the tab is already sitting
    // there should make the banner appear, not wait for a navigation.
    const now = useNow(30000);
    const live = liveNow(catalogue, now);
    const soon = live ? null : liveSoon(catalogue, now);
    const lesson = live ?? soon;
    if (!lesson) return null;

    const mentor = catalogue.mentors.find((m) => m.id === lesson.mentorId);
    const opens = liveOpensAt(lesson);

    return (
        <section
            aria-label={live ? "A class is live now" : "Next live class"}
            className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl px-4 py-3.5",
                live ? "bg-brand text-white" : "bg-brand-soft text-brand-ink",
                className,
            )}
        >
            <span className={cn("flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.04em]", live ? "text-white" : "text-brand-ink")}>
                <Radio size={15} className={live ? "animate-pulse" : undefined} aria-hidden="true" />
                {live ? "Live now" : "Starting soon"}
            </span>

            {mentor && <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} size="sm" className="max-sm:hidden" />}

            <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{lesson.title}</span>
                <span className={cn("block text-[12px]", live ? "text-white/80" : "text-brand-ink/75")}>
                    {mentor?.name}
                    {live ? ` · ends ${time(new Date(new Date(lesson.startsAt).getTime() + lesson.durationMin * 60000).toISOString())}` : ` · doors open ${time(opens.toISOString())}`}
                </span>
            </span>

            {live ? (
                <Link
                    to={`/room/${lesson.id}`}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-brand-ink transition-colors hover:bg-white/90"
                >
                    Join now <ArrowRight size={14} />
                </Link>
            ) : (
                <span className="shrink-0 text-[13px] font-semibold tabular-nums">opens in {until(opens, now)}</span>
            )}
        </section>
    );
}

/** A clock that ticks only as often as the thing it drives needs. */
export function useNow(everyMs: number): Date {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), everyMs);
        return () => clearInterval(t);
    }, [everyMs]);
    return now;
}

/** "in 2h 15m" / "in 14m" — coarse on purpose; a seconds countdown is noise. */
export function until(when: Date, now: Date): string {
    const mins = Math.max(0, Math.round((when.getTime() - now.getTime()) / 60000));
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

/** The status a lesson row shows when the class is not open yet. */
export function opensLabel(lesson: LiveLesson, now: Date): string {
    const opens = liveOpensAt(lesson);
    return opens.getTime() - now.getTime() <= 6 * 60 * 60000 ? `Opens ${time(opens.toISOString())}` : "";
}
