import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Headphones, Star, Tablet } from "lucide-react";
import { cn } from "@/lib/cn";
import { MemberAvatar } from "@/components/shared";
import { ProgressBar, Tag } from "@/components/ui/primitives";
import type { Book, BookFormat, BookStatus } from "../types";
import { FORMAT_LABEL, STATUS_LABEL } from "../types";

/** The small, repeated pieces of the shelf: a cover, a format tag, stars, a card. */

const FORMAT_ICON: Record<BookFormat, typeof BookOpen> = { physical: BookOpen, ebook: Tablet, audio: Headphones };
const STATUS_TONE: Record<BookStatus, "neutral" | "grow" | "ok"> = { want: "neutral", reading: "grow", done: "ok" };

/** A cover, or a lettered spine when the book has no picture. */
export function BookCover({ book, className, w = 88, h = 128 }: { book: Book; className?: string; w?: number; h?: number }) {
    if (book.coverUrl) {
        return <img src={book.coverUrl} alt={`Cover of ${book.title}`} width={w} height={h} loading="lazy" className={cn("shrink-0 rounded-sm object-cover shadow-hover", className)} style={{ width: w, height: h }} />;
    }
    return (
        <span
            className={cn("grid shrink-0 place-items-center rounded-sm bg-grow-soft p-2 text-center font-display text-sm leading-4 text-grow-ink", className)}
            style={{ width: w, height: h }}
            aria-hidden="true"
        >
            {book.title.slice(0, 28)}
        </span>
    );
}

export function FormatTag({ format }: { format: BookFormat }) {
    const Icon = FORMAT_ICON[format];
    return (
        <Tag tone="neutral" icon={<Icon size={11} aria-hidden="true" />}>
            {FORMAT_LABEL[format]}
        </Tag>
    );
}

export function StatusTag({ status }: { status: BookStatus }) {
    return <Tag tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Tag>;
}

/** Read-only stars, or a five-button rating when `onRate` is given. */
export function Stars({ value, onRate, label = "Rating" }: { value: number; onRate?: (n: number) => void; label?: string }) {
    if (!onRate) {
        if (!value) return null;
        return (
            <span className="inline-flex items-center gap-0.5 text-live" aria-label={`${value} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={14} fill={n <= value ? "currentColor" : "none"} strokeWidth={1.6} aria-hidden="true" />
                ))}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1" role="group" aria-label={label}>
            {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} star${n === 1 ? "" : "s"}`} aria-pressed={value === n} onClick={() => onRate(n === value ? 0 : n)} className="text-live transition-transform hover:scale-110">
                    <Star size={20} fill={n <= value ? "currentColor" : "none"} strokeWidth={1.6} aria-hidden="true" />
                </button>
            ))}
        </span>
    );
}

export function BookCard({ book, pct, readers, badge }: { book: Book; pct: number; readers?: string[]; badge?: ReactNode }) {
    return (
        <li>
            <Link to={`/grow/books/${book.id}`} className="flex h-full gap-4 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                <BookCover book={book} w={76} h={110} />
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <StatusTag status={book.status} />
                        {book.value && <Tag tone="brand">{book.value}</Tag>}
                        {badge}
                    </span>
                    <span className="clamp-2 mt-2 text-base font-semibold leading-5">{book.title}</span>
                    <span className="mt-0.5 text-sm text-muted">{book.author}</span>
                    <span className="mt-auto pt-3">
                        {book.status === "reading" && <ProgressBar value={pct} label={`${book.title} progress`} />}
                        <span className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-xs text-caption">{book.status === "reading" ? `${pct}% · ${book.pages || "?"} ${book.format === "audio" ? "min" : "pages"}` : book.status === "done" ? "Finished" : `${book.pages || "?"} ${book.format === "audio" ? "min" : "pages"}`}</span>
                            <span className="flex items-center gap-1.5">
                                <Stars value={book.rating} />
                                {(readers ?? (book.ownerMemberId ? [book.ownerMemberId] : [])).slice(0, 3).map((id) => (
                                    <MemberAvatar key={id} memberId={id} size="xs" />
                                ))}
                            </span>
                        </span>
                    </span>
                </span>
            </Link>
        </li>
    );
}
