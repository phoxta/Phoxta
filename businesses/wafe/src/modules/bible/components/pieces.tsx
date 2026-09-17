import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Flame, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { MemberAvatar } from "@/components/shared";
import { Button, Card, ProgressBar, Tag } from "@/components/ui/primitives";
import { BASE, masteryOf, pendingReview, prayedCount, sessionsOf, studyProgress } from "../derive";
import { MASTERY_LABEL, SCHEDULE, STUDY_TYPE_LABEL, TAG_LABEL, type BibleState, type DailyScripture, type MemoryVerse, type Prayer, type Study } from "../types";

/**
 * The module's own furniture: a scripture card that can read itself aloud, a
 * study card, a prayer card and a verse card. They are here rather than in the
 * shared library because their shapes are particular to this module — a
 * prayer that has been answered looks different from one that has not, and
 * that difference is the point of the wall.
 */

// ---------------------------------------------------------------------------
// Read aloud — for Ayo, and for anyone whose eyes are tired
// ---------------------------------------------------------------------------

export function useSpeech(): { speak: (text: string) => void; stop: () => void; speaking: boolean; supported: boolean } {
    const [speaking, setSpeaking] = useState(false);
    const supported = typeof window !== "undefined" && "speechSynthesis" in window;
    useEffect(() => () => (supported ? window.speechSynthesis.cancel() : undefined), [supported]);
    return {
        supported,
        speaking,
        stop: () => {
            if (!supported) return;
            window.speechSynthesis.cancel();
            setSpeaking(false);
        },
        speak: (text: string) => {
            if (!supported) return;
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 0.9;
            u.lang = "en-GB";
            u.onend = () => setSpeaking(false);
            u.onerror = () => setSpeaking(false);
            setSpeaking(true);
            window.speechSynthesis.speak(u);
        },
    };
}

export function ReadAloud({ text, label = "Read it to me", className }: { text: string; label?: string; className?: string }) {
    const { speak, stop, speaking, supported } = useSpeech();
    if (!supported) return null;
    return (
        <Button variant="outline" size="md" className={className} onClick={() => (speaking ? stop() : speak(text))}>
            <Volume2 size={15} aria-hidden="true" />
            {speaking ? "Stop" : label}
        </Button>
    );
}

// ---------------------------------------------------------------------------
// Scripture
// ---------------------------------------------------------------------------

export function ScriptureCard({ verse, planTitle, big, action }: { verse: DailyScripture; planTitle?: string; big?: boolean; action?: ReactNode }) {
    return (
        <Card className={cn("paper bg-grow-soft", big ? "p-6 md:p-8" : "p-5")}>
            <div className="flex flex-wrap items-center gap-2">
                <Tag tone="grow">Today's scripture</Tag>
                <span className="text-xs text-muted">{verse.source === "plan" ? `${planTitle ?? "Reading plan"} · day ${verse.day}` : "From our family verse list"}</span>
            </div>
            <blockquote className={cn("mt-3 font-display leading-[1.25] text-grow-ink", big ? "text-4xl md:text-7xl" : "text-2xl")}>“{verse.text}”</blockquote>
            <p className="mt-2.5 text-md font-semibold text-grow-ink">{verse.reference}</p>
            <div className="mt-4 flex flex-wrap gap-2">
                <ReadAloud text={`${verse.reference}. ${verse.text}`} />
                {action}
            </div>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Studies
// ---------------------------------------------------------------------------

export function StudyCard({ state, study, memberId }: { state: BibleState; study: Study; memberId: string }) {
    const p = studyProgress(state, study, memberId);
    const total = sessionsOf(state, study.id).length;
    return (
        <li>
            <Link to={`${BASE}/studies/${study.id}`} className="flex h-full gap-4 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                {study.coverUrl ? (
                    <img src={study.coverUrl} alt="" width={84} height={112} className="h-28 shrink-0 rounded-md object-cover" style={{ width: 84 }} loading="lazy" />
                ) : null}
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <Tag tone={study.childSafe ? "ok" : "grow"}>{study.childSafe ? "For children" : STUDY_TYPE_LABEL[study.type]}</Tag>
                        {study.value && <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-caption">{study.value}</span>}
                    </span>
                    <span className="clamp-2 mt-2 text-lg font-semibold leading-5">{study.title}</span>
                    <span className="clamp-2 mt-1 text-sm leading-5 text-muted">{study.description}</span>
                    <span className="mt-auto pt-3">
                        <ProgressBar value={p.pct} label={`${study.title} progress`} />
                        <span className="mt-2 block text-xs text-caption">
                            {p.done} of {total} sessions{p.next ? ` · next: ${p.next.passage}` : " · finished"}
                        </span>
                    </span>
                </span>
            </Link>
        </li>
    );
}

// ---------------------------------------------------------------------------
// Prayer
// ---------------------------------------------------------------------------

export function PrayerTags({ tags }: { tags: Prayer["tags"] }) {
    if (!tags.length) return null;
    return (
        <span className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
                <span key={t} className="rounded-xs bg-page px-2 py-[3px] text-2xs font-semibold uppercase tracking-[0.02em] text-muted">
                    {TAG_LABEL[t]}
                </span>
            ))}
        </span>
    );
}

export function PrayerCard({
    state,
    prayer,
    meId,
    onPrayed,
    actions,
    compact,
}: {
    state: BibleState;
    prayer: Prayer;
    meId: string;
    onPrayed?: (on: boolean) => void;
    actions?: ReactNode;
    compact?: boolean;
}) {
    const count = prayedCount(state, prayer.id);
    const mine = state.reactions.some((r) => r.prayerId === prayer.id && r.memberId === meId);
    const answered = prayer.status === "answered";
    return (
        <Card as="li" className={cn("flex flex-col gap-3", answered && "bg-mint-soft")}>
            <div className="flex items-start gap-3">
                <MemberAvatar memberId={prayer.authorMemberId} size="sm" />
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-5">{prayer.title}</h3>
                    <p className="mt-0.5 text-xs text-caption">
                        {answered && prayer.answeredAt ? `Answered ${shortDate(prayer.answeredAt)}` : `Asked ${shortDate(prayer.createdAt)}`}
                        {prayer.fromGuest && " · from a guest"}
                        {prayer.visibility === "private" && " · private to you"}
                        {prayer.visibility === "shared" && " · shared with a few"}
                    </p>
                </div>
                {answered ? (
                    <Tag tone="ok" icon={<CheckCircle2 size={12} aria-hidden="true" />}>
                        Answered
                    </Tag>
                ) : prayer.sharedWithGuests ? (
                    <Tag tone="neutral">Shared with guests</Tag>
                ) : null}
            </div>

            {!compact && prayer.detail && <p className="text-md leading-6 text-muted">{prayer.detail}</p>}
            {answered && prayer.testimony && (
                <p className="rounded-md bg-card px-3.5 py-3 text-md leading-6 text-mint">
                    <span className="font-semibold">What happened: </span>
                    {prayer.testimony}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <PrayerTags tags={prayer.tags} />
                <span className="flex-1" />
                {onPrayed && !answered && (
                    <Button variant={mine ? "tonal" : "outline"} size="sm" onClick={() => onPrayed(!mine)} aria-pressed={mine}>
                        <span aria-hidden="true">🙏</span>
                        {mine ? "You prayed" : "I prayed"}
                        {count > 0 && <span className="tabular-nums text-caption">{count}</span>}
                    </Button>
                )}
                {actions}
            </div>
        </Card>
    );
}

export function StreakPill({ days, graceUsed }: { days: number; graceUsed: number }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-live-soft px-3 py-1.5 text-xs font-semibold text-live-ink">
            <Flame size={13} aria-hidden="true" />
            {days === 0 ? "Start again today" : `${days} day${days === 1 ? "" : "s"} of prayer`}
            {graceUsed > 0 && <span className="font-normal text-muted">· {graceUsed} grace day{graceUsed === 1 ? "" : "s"} rested</span>}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Memory verses
// ---------------------------------------------------------------------------

export function VerseRow({ state, verse, today, action }: { state: BibleState; verse: MemoryVerse; today: string; action?: ReactNode }) {
    const mastery = masteryOf(state, verse.id);
    const pending = pendingReview(state, verse.id);
    const due = pending && pending.dueAt <= today;
    return (
        <Card as="li" className="flex flex-col gap-2.5">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold">{verse.reference}</h3>
                    <p className="mt-1 text-md leading-6 text-muted">{verse.text}</p>
                </div>
                <MemberAvatar memberId={verse.memberId} size="xs" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Tag tone={due ? "warn" : mastery >= SCHEDULE.length ? "ok" : "grow"}>{MASTERY_LABEL[Math.min(mastery, MASTERY_LABEL.length - 1)]}</Tag>
                <span className="text-xs text-caption">{pending ? (due ? "Due now" : `Next on ${shortDate(pending.dueAt)}`) : "No card scheduled"}</span>
                {verse.readAloud && <Tag tone="neutral">Read aloud</Tag>}
                <span className="flex-1" />
                {action}
            </div>
            <ProgressBar value={(Math.min(mastery, SCHEDULE.length) / SCHEDULE.length) * 100} label={`${verse.reference} mastery`} />
        </Card>
    );
}
