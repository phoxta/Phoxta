import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookMarked, BookOpen, CalendarClock, GraduationCap, Plus, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { pct as pctOf } from "@/lib/format";
import { useData, useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, EmptyModule, MemberAvatar, MemberChips, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Button, Card, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import booksModule from "../module";
import { bookPct, courseProgress, coursesForBook, finishedThisYear, planRows, readersOf, unitWord } from "../derive";
import { BookCard, BookCover } from "../components/pieces";
import { BookDialog } from "../components/BookDialog";
import { PlanDialog } from "../components/PlanDialog";
import type { BookStatus, ReadingPlan } from "../types";

/**
 * The shelf.
 *
 * A parent sees the whole library, the plans running and every course. A child
 * sees their own books, their own plan and the course they are enrolled in,
 * in bigger type and with fewer controls. A mentor guest sees the one course
 * the family handed them and nothing else — no shelf, no plans, no progress.
 */

const FILTERS: Array<{ v: BookStatus | "all"; label: string }> = [
    { v: "all", label: "Everything" },
    { v: "reading", label: "Reading" },
    { v: "want", label: "Want to read" },
    { v: "done", label: "Finished" },
];

export default function BooksPage() {
    const { state, mutate, loading, error } = useModule(booksModule);
    const { ctx } = useData();
    const { me, role, can, members, today } = useSpace();
    const [filter, setFilter] = useState<BookStatus | "all">("all");
    const [who, setWho] = useState<string>("");
    const [q, setQ] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [planOpen, setPlanOpen] = useState(false);
    const [editPlan, setEditPlan] = useState<ReadingPlan | undefined>(undefined);
    const [removePlan, setRemovePlan] = useState<ReadingPlan | null>(null);

    const manage = can("books.manage");
    const child = role === "child";
    const guest = role === "guest";

    const books = useMemo(() => {
        if (!state) return [];
        const needle = q.trim().toLowerCase();
        return state.books
            .filter((b) => (filter === "all" ? true : b.status === filter))
            .filter((b) => (who ? b.ownerMemberId === who || state.progress.some((p) => p.bookId === b.id && p.memberId === who) : true))
            .filter((b) => (needle ? `${b.title} ${b.author} ${b.tags.join(" ")}`.toLowerCase().includes(needle) : true))
            .sort((a, b) => {
                const rank = { reading: 0, want: 1, done: 2 } as const;
                return rank[a.status] - rank[b.status] || a.title.localeCompare(b.title);
            });
    }, [state, filter, who, q]);

    if (loading && !state) return <p className="text-md text-muted">Opening the shelf…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const rows = planRows(state, ctx);
    const dueToday = rows.filter((r) => r.dueToday && r.book);
    const finished = finishedThisYear(state, today);
    const reading = state.books.filter((b) => b.status === "reading");

    // ---- Guest: one course, and the door closed behind it --------------------
    if (guest) {
        return (
            <div>
                <PageTitle title="Shared with you" sub="What this family has explicitly given you to read. Nothing else on their shelf is here — and nothing here is yours to tick off." area="grow" />
                {state.courses.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {state.courses.map((c) => {
                            const book = state.books.find((b) => b.id === c.bookId);
                            const { done, total, pct } = courseProgress(state, c, me.id);
                            return (
                                <li key={c.id}>
                                    <Link to={`/grow/books/${c.bookId}/course?c=${c.id}`} className="flex h-full gap-4 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                                        {book && <BookCover book={book} w={76} h={110} />}
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <Tag tone="grow">Mentor copy</Tag>
                                            <span className="clamp-2 mt-2 text-lg font-semibold leading-5">{c.title}</span>
                                            <span className="mt-1 text-sm text-muted">{total} weeks{book ? ` · ${book.author}` : ""}</span>
                                            <span className="mt-auto pt-3">
                                                <ProgressBar value={pct} label={`${c.title} progress`} />
                                                <span className="mt-2 block text-xs text-caption">The family is on week {Math.min(done + 1, total || 1)} of {total}.</span>
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <EmptyState icon={<GraduationCap size={20} aria-hidden="true" />} title="Nothing has been shared with you yet" body="When the family shares a course, it will appear here — and only that course." />
                )}
            </div>
        );
    }

    // ---- Child: my books, my plan, my course --------------------------------
    if (child) {
        const myPlans = rows.filter((r) => r.memberId === me.id && r.active);
        const myCourses = state.courses.filter((c) => c.enrolled.includes(me.id));
        return (
            <div>
                <PageTitle title="My books" sub="What you're reading, what's next, and the course you're on." area="grow" />

                {myPlans.length > 0 && (
                    <Section title="Today's reading">
                        <ul className="flex flex-col gap-3">
                            {myPlans.map((r) => (
                                <li key={r.plan.id}>
                                    <Link to={`/grow/books/${r.book!.id}`} className="flex items-center gap-4 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                                        <BookCover book={r.book!} w={54} h={78} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-lg font-semibold">{r.book!.title}</span>
                                            <span className="mt-0.5 block text-md text-muted">
                                                {r.plan.pace.amount} {r.plan.pace.unit === "minutes" ? "minutes" : r.plan.pace.unit} today · you're on {r.actual} of {r.book!.pages || "?"}
                                            </span>
                                            <ProgressBar value={r.pct} className="mt-2.5" label={`${r.book!.title} progress`} />
                                        </span>
                                        {r.doneToday ? <Tag tone="ok">Done today</Tag> : r.behindDays >= 2 ? <Tag tone="warn">{r.behindDays}d behind</Tag> : <Tag tone="grow">To do</Tag>}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {myCourses.length > 0 && (
                    <Section title="My course">
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                            {myCourses.map((c) => {
                                const { done, total, pct, currentWeek } = courseProgress(state, c, me.id);
                                return (
                                    <li key={c.id}>
                                        <Link to={`/grow/books/${c.bookId}/course?c=${c.id}`} className="block rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                                            <span className="text-[17px] font-semibold">{c.title.split("—")[0].trim()}</span>
                                            <span className="mt-1 block text-md text-muted">
                                                Week {Math.min(done + 1, total || 1)} of {total}
                                                {currentWeek?.theme ? ` · ${currentWeek.theme}` : ""}
                                            </span>
                                            <ProgressBar value={pct} className="mt-3" label={`${c.title} progress`} />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </Section>
                )}

                <Section title="On my shelf">
                    {books.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                            {books.map((b) => (
                                <BookCard key={b.id} book={b} pct={bookPct(state, b, me.id)} readers={readersOf(state, b.id).map((p) => p.memberId)} />
                            ))}
                        </ul>
                    ) : (
                        <EmptyModule title="No books here yet" body="A parent can add books to your shelf." />
                    )}
                </Section>
            </div>
        );
    }

    // ---- Parent -------------------------------------------------------------
    return (
        <div>
            <PageTitle
                title="Library"
                sub="What we're reading, who is on which page, and the books we turned into four weeks the family actually finished."
                area="grow"
                actions={
                    manage && (
                        <>
                            <Button variant="outline" onClick={() => { setEditPlan(undefined); setPlanOpen(true); }}>
                                <CalendarClock size={15} aria-hidden="true" /> Reading plan
                            </Button>
                            <Button onClick={() => setAddOpen(true)}>
                                <Plus size={15} aria-hidden="true" /> Add a book
                            </Button>
                        </>
                    )
                }
            />

            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                <Stat label="Reading now" value={reading.length} sub={reading.length ? reading.slice(0, 2).map((b) => b.title.split(":")[0]).join(" · ") : "Nothing on the go"} tone="grow" />
                <Stat label="Finished this year" value={`${finished.length} / ${state.yearGoal}`} sub={`${pctOf(finished.length, state.yearGoal)}% of our number`} tone="ok" />
                <Stat label="Courses" value={state.courses.length} sub={`${state.courses.filter((c) => c.status === "published").length} published, ${state.courses.filter((c) => c.status === "draft").length} draft`} tone="neutral" />
            </div>

            {dueToday.length > 0 && (
                <Section title="Today's reading">
                    <ul className="flex flex-col gap-2">
                        {dueToday.map((r) => (
                            <li key={`${r.plan.id}-${r.memberId}`}>
                                <Link to={`/grow/books/${r.book!.id}`} className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 transition-shadow hover:shadow-hover">
                                    <MemberAvatar memberId={r.memberId} size="sm" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-md font-semibold">{r.book!.title}</span>
                                        <span className="block text-xs text-caption">
                                            {r.plan.pace.amount} {r.plan.pace.unit === "minutes" ? "minutes" : r.plan.pace.unit} today · on {r.actual} of {r.expected} expected
                                        </span>
                                    </span>
                                    {r.doneToday ? <Tag tone="ok">Done today</Tag> : r.behindDays >= 2 ? <Tag tone="warn">{r.behindDays}d behind</Tag> : <Tag tone="grow">Due</Tag>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <Section title="The shelf">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
                        {FILTERS.map((f) => (
                            <button
                                key={f.v}
                                type="button"
                                aria-pressed={filter === f.v}
                                onClick={() => setFilter(f.v)}
                                className={cn("h-8 rounded-full px-3.5 text-sm font-medium transition-colors", filter === f.v ? "bg-brand text-white" : "bg-card text-muted hover:text-ink")}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <label className="ml-auto flex h-9 items-center gap-2 rounded-full border border-line-strong bg-card px-3.5">
                        <Search size={15} aria-hidden="true" />
                        <span className="sr-only">Search the shelf</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, authors, tags" className="w-40 bg-transparent text-sm outline-none placeholder:text-caption md:w-56" />
                    </label>
                    <label className="flex h-9 items-center gap-2 rounded-full border border-line-strong bg-card px-3.5 text-sm">
                        <span className="text-caption">Whose</span>
                        <select value={who} onChange={(e) => setWho(e.target.value)} className="bg-transparent outline-none">
                            <option value="">Everyone</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name.split(" ")[0]}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {books.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {books.map((b) => (
                            <BookCard
                                key={b.id}
                                book={b}
                                pct={bookPct(state, b, me.id)}
                                readers={readersOf(state, b.id).map((p) => p.memberId)}
                                badge={coursesForBook(state, b.id).length ? <Tag tone="grow">Course</Tag> : undefined}
                            />
                        ))}
                    </ul>
                ) : (
                    <EmptyModule
                        title={q || who || filter !== "all" ? "Nothing matches that" : "The shelf is empty"}
                        body={q || who || filter !== "all" ? "Try a wider filter." : "Add the book you are reading now — the rest of this module hangs off it."}
                        action={manage && !q && filter === "all" ? <Button onClick={() => setAddOpen(true)}>Add a book</Button> : undefined}
                    />
                )}
            </Section>

            {state.plans.length > 0 && (
                <Section title="Reading plans">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {state.plans.map((p) => {
                            const book = state.books.find((b) => b.id === p.bookId);
                            const status = rows.find((r) => r.plan.id === p.id);
                            if (!book) return null;
                            return (
                                <Card key={p.id} as="li" className="flex gap-4">
                                    <BookCover book={book} w={54} h={78} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-base font-semibold">{book.title}</p>
                                        <p className="mt-0.5 text-sm text-muted">
                                            {p.pace.amount} {p.pace.unit === "minutes" ? "minutes" : p.pace.unit} · {p.pace.daysPerWeek} days a week · until {p.endDate}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <MemberChips memberIds={p.assigneeMemberIds} />
                                            {status && (status.behindDays >= 2 ? <Tag tone="warn">{status.behindDays}d behind</Tag> : <Tag tone="ok">On track</Tag>)}
                                        </div>
                                        {status && <ProgressBar value={status.pct} className="mt-3" label={`${book.title} plan progress`} />}
                                        {manage && (
                                            <div className="mt-3 flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => { setEditPlan(p); setPlanOpen(true); }}>
                                                    Edit
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setRemovePlan(p)}>
                                                    Remove
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </ul>
                </Section>
            )}

            <Section title="Courses from our books">
                {state.courses.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {state.courses.map((c) => {
                            const book = state.books.find((b) => b.id === c.bookId);
                            const { done, total, pct } = courseProgress(state, c, me.id);
                            return (
                                <li key={c.id}>
                                    <Link to={`/grow/books/${c.bookId}/course?c=${c.id}`} className="flex h-full gap-4 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                                        {book && <BookCover book={book} w={70} h={102} />}
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="flex flex-wrap gap-1.5">
                                                <Tag tone={c.status === "published" ? "ok" : "warn"}>{c.status === "published" ? "Published" : "Draft"}</Tag>
                                                {c.childSafe && <Tag tone="grow">Child-safe</Tag>}
                                                {c.sharedWithGuestIds.length > 0 && <Tag tone="neutral">Shared</Tag>}
                                            </span>
                                            <span className="clamp-2 mt-2 text-base font-semibold leading-5">{c.title}</span>
                                            <span className="mt-1 text-sm text-muted">
                                                {total} weeks · {c.enrolled.length ? `${c.enrolled.length} enrolled` : "nobody enrolled yet"}
                                            </span>
                                            <span className="mt-auto pt-3">
                                                <ProgressBar value={pct} label={`${c.title} progress`} />
                                                <span className="mt-2 flex items-center justify-between">
                                                    <span className="text-xs text-caption">Week {Math.min(done + 1, total || 1)} of {total}</span>
                                                    <MemberChips memberIds={c.enrolled} />
                                                </span>
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <EmptyState
                        icon={<GraduationCap size={20} aria-hidden="true" />}
                        title="No courses yet"
                        body="Open a book you loved and turn it into four weeks — chapters, questions for the table, one thing to do together and a quiz."
                        action={state.books[0] ? <Link to={`/grow/books/${state.books[0].id}`} className="text-sm font-semibold text-brand underline underline-offset-4">Start with {state.books[0].title}</Link> : undefined}
                    />
                )}
            </Section>

            {state.units.length > 0 && (
                <Section title="Exported to Curricula">
                    <ul className="flex flex-col gap-2">
                        {state.units.map((u) => (
                            <Card key={u.id} as="li" className="flex flex-wrap items-center gap-3">
                                <BookMarked size={18} className="text-grow" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-md font-semibold">{u.title}</span>
                                    <span className="block text-xs text-caption">
                                        {u.subject} · {u.assignments.length} assignments, each linking back to its week
                                    </span>
                                </span>
                                <Link to="/grow/curricula" className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                                    Open in Curricula
                                </Link>
                            </Card>
                        ))}
                    </ul>
                </Section>
            )}

            <p className="mt-8 flex items-center gap-2 text-xs text-caption">
                <BookOpen size={14} aria-hidden="true" />
                {reading.length ? `${reading.map((b) => `${b.title} (${bookPct(state, b, b.ownerMemberId ?? me.id)}%, ${b.pages || "?"} ${unitWord(b)})`).join(" · ")}` : "Nothing on the go."}
            </p>

            <BookDialog open={addOpen} onClose={() => setAddOpen(false)} onSave={async (input) => { await mutate((r) => r.addBook(input)); }} />
            <PlanDialog
                open={planOpen}
                onClose={() => setPlanOpen(false)}
                books={state.books}
                plan={editPlan}
                onSave={async (input) => {
                    if (editPlan) await mutate((r) => r.updatePlan(editPlan.id, input));
                    else await mutate((r) => r.addPlan(input));
                }}
            />
            <Confirm
                open={Boolean(removePlan)}
                title="Remove this reading plan?"
                body="The book and everyone's progress stay; only the pace and the reminders go."
                confirmLabel="Remove plan"
                danger
                onClose={() => setRemovePlan(null)}
                onConfirm={async () => {
                    if (removePlan) await mutate((r) => r.removePlan(removePlan.id));
                }}
            />
        </div>
    );
}
