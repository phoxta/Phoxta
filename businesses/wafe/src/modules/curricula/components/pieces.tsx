import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ExternalLink, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { dueLabel, shortDate } from "@/lib/format";
import { Tag } from "@/components/ui/primitives";
import { STATUS_LABEL, type Assignment, type Badge, type Grade, type Subject, type SubjectColour } from "../types";
import { STATUS_TONE } from "../derive";

/**
 * The module's own small vocabulary: a subject's tint, the status tag, one
 * assignment as a row, a badge as a chip, and the read-aloud button that makes
 * the Little band's screen usable by someone who cannot read yet.
 *
 * Every tint is written out in full rather than composed at runtime — Tailwind
 * only ships the classes it can see in the source.
 */

export const SUBJECT_BG: Record<SubjectColour, string> = {
    grow: "bg-grow-soft",
    execute: "bg-execute-soft",
    live: "bg-live-soft",
    create: "bg-create-soft",
    terra: "bg-terra-soft",
    ochre: "bg-ochre-soft",
    plum: "bg-plum-soft",
    sage: "bg-sage-soft",
    mint: "bg-mint-soft",
};

export const SUBJECT_INK: Record<SubjectColour, string> = {
    grow: "text-grow-ink",
    execute: "text-execute-ink",
    live: "text-live-ink",
    create: "text-create-ink",
    terra: "text-terra",
    ochre: "text-ochre",
    plum: "text-plum",
    sage: "text-sage",
    mint: "text-mint",
};

export const SUBJECT_DOT: Record<SubjectColour, string> = {
    grow: "bg-grow",
    execute: "bg-execute",
    live: "bg-live",
    create: "bg-create",
    terra: "bg-terra",
    ochre: "bg-ochre",
    plum: "bg-plum",
    sage: "bg-sage",
    mint: "bg-mint",
};

export function SubjectPill({ subject, className }: { subject?: Subject; className?: string }) {
    if (!subject) return null;
    return (
        <span className={cn("inline-flex w-max items-center gap-1.5 rounded-xs px-2.5 py-[5px] text-2xs font-semibold uppercase tracking-[0.02em]", SUBJECT_BG[subject.colour], SUBJECT_INK[subject.colour], className)}>
            {subject.name}
        </span>
    );
}

export function StatusTag({ status, className }: { status: Assignment["status"]; className?: string }) {
    return (
        <Tag tone={STATUS_TONE[status]} className={className}>
            {STATUS_LABEL[status]}
        </Tag>
    );
}

export function ScorePill({ score, letter, className }: { score: number; letter: string; className?: string }) {
    const tone = score >= 80 ? "bg-mint-soft text-mint" : score >= 60 ? "bg-grow-soft text-grow-ink" : score >= 40 ? "bg-peach-soft text-peach" : "bg-danger-soft text-danger-ink";
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums", tone, className)}>
            {score}% <span className="opacity-70">{letter}</span>
        </span>
    );
}

/**
 * Read-aloud.
 *
 * The brief's Little band rule is that every tile reads itself: a five-year-old
 * navigates by pictures and by voice, never by typing. Nothing here throws when
 * the browser has no speech engine — the button simply does not render.
 */
export function useSpeech() {
    const [speaking, setSpeaking] = useState(false);
    const supported = typeof window !== "undefined" && "speechSynthesis" in window;
    const ref = useRef(supported);
    ref.current = supported;

    useEffect(() => {
        return () => {
            if (ref.current) window.speechSynthesis.cancel();
        };
    }, []);

    const speak = useCallback((text: string) => {
        if (!ref.current || !text.trim()) return;
        const synth = window.speechSynthesis;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-GB";
        u.rate = 0.9;
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        synth.cancel();
        setSpeaking(true);
        synth.speak(u);
    }, []);

    const stop = useCallback(() => {
        if (!ref.current) return;
        window.speechSynthesis.cancel();
        setSpeaking(false);
    }, []);

    return { supported, speaking, speak, stop };
}

export function SpeakButton({ text, label = "Read it to me", big, className }: { text: string; label?: string; big?: boolean; className?: string }) {
    const { supported, speaking, speak, stop } = useSpeech();
    if (!supported) return null;
    return (
        <button
            type="button"
            onClick={() => (speaking ? stop() : speak(text))}
            className={cn(
                "inline-flex items-center gap-2 rounded-full border border-line-strong bg-card font-semibold text-ink transition-colors hover:border-ink",
                big ? "h-11 px-4 text-base" : "h-9 px-3.5 text-sm",
                speaking && "border-brand bg-brand-soft text-brand-ink",
                className,
            )}
            aria-label={speaking ? "Stop reading" : label}
        >
            <Volume2 size={big ? 18 : 15} aria-hidden="true" />
            {speaking ? "Stop" : label}
        </button>
    );
}

/** One piece of work, as a row in a list. */
export function AssignmentRow({ a, subject, grade, to, showChild, childName }: { a: Assignment; subject?: Subject; grade?: Grade; to: string; showChild?: boolean; childName?: string }) {
    const due = dueLabel(a.dueDate);
    const late = a.status !== "graded" && a.status !== "submitted" && due.tone === "danger";
    return (
        <li>
            <Link to={to} className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-page">
                <span className={cn("h-9 w-1 shrink-0 rounded-full", subject ? SUBJECT_DOT[subject.colour] : "bg-line-strong")} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-md font-semibold">{a.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-caption">
                        {showChild && childName && <span className="font-medium text-muted">{childName}</span>}
                        {subject && <span>{subject.name}</span>}
                        <span className={cn("inline-flex items-center gap-1", late && "font-semibold text-danger-ink")}>
                            <CalendarDays size={11} aria-hidden="true" /> {due.text}
                        </span>
                        {a.sprouts > 0 && <span>{a.sprouts} Sprouts</span>}
                    </span>
                </span>
                {grade ? <ScorePill score={grade.score} letter={grade.letter} /> : <StatusTag status={a.status} />}
            </Link>
        </li>
    );
}

export function BadgeChip({ badge, level, earned, note, when, onClick }: { badge: Badge; level?: string; earned?: boolean; note?: string; when?: string; onClick?: () => void }) {
    const inner = (
        <>
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-3xl", earned ? "bg-live-soft" : "bg-page opacity-45 grayscale")} aria-hidden="true">
                {badge.icon}
            </span>
            <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-md font-semibold">
                    {badge.name}
                    {level ? <span className="ml-1.5 text-xs font-medium text-muted">{level}</span> : null}
                </span>
                <span className="clamp-2 block text-xs leading-4 text-caption">{note || badge.criteria}</span>
                {when && <span className="mt-0.5 block text-2xs text-caption">Earned {shortDate(when)}</span>}
            </span>
        </>
    );
    if (onClick) {
        return (
            <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg bg-card p-3 text-left transition-shadow hover:shadow-hover">
                {inner}
            </button>
        );
    }
    return <div className="flex items-center gap-3 rounded-lg bg-card p-3">{inner}</div>;
}

/** The "this came from the Library" line a unit keeps forever. */
export function SourceLink({ href, label }: { href?: string | null; label?: string | null }) {
    if (!href) return null;
    return (
        <Link to={href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand underline-offset-4 hover:underline">
            <ExternalLink size={12} aria-hidden="true" /> {label || "Open the course it came from"}
        </Link>
    );
}
