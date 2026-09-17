import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GraduationCap, Pencil, Sparkles, Target, Trash2 } from "lucide-react";
import { relative } from "@/lib/format";
import { useData, useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, DateText, MemberAvatar, MemberChips, Notice, PageTitle, Section } from "@/components/shared";
import { Button, Card, EmptyState, Field, ProgressBar, Tag } from "@/components/ui/primitives";
import booksModule from "../module";
import { bookPct, courseProgress, coursesForBook, planRows, readersOf, unitWord } from "../derive";
import { BookCover, FormatTag, Stars, StatusTag } from "../components/pieces";
import { BookDialog } from "../components/BookDialog";
import { GenerateDialog } from "../components/GenerateDialog";
import { AskCompanion } from "../components/AskCompanion";
import type { BookStatus } from "../types";
import { STATUS_LABEL } from "../types";

/**
 * One book: where everyone is in it, what it is for, and the course it became.
 *
 * The bookmark is the important control — a page number, moved by the person
 * reading — because everything else on this screen is computed from it: the
 * plan's "behind by", the ring on the dashboard, and the percentage the linked
 * family goal shows.
 */

const STATUSES: BookStatus[] = ["want", "reading", "done"];

export default function BookPage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const { state, mutate, loading, error } = useModule(booksModule);
    const { ctx } = useData();
    const { me, can, role, members, mutateCore } = useSpace();
    const [page, setPage] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [genOpen, setGenOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const book = state?.books.find((b) => b.id === id);
    const mine = state?.progress.find((p) => p.bookId === id && p.memberId === me.id);

    useEffect(() => {
        setPage(mine?.page != null ? String(mine.page) : "");
    }, [mine?.page, id]);

    if (loading && !state) return <p className="text-md text-muted">Finding the book…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    if (!book) {
        return (
            <div>
                <PageTitle title="Not on your shelf" sub="Either this book has gone, or it isn't yours to see." area="grow" />
                <EmptyState title="We can't show you that book" body="Ask a parent if you think you should be able to see it." action={<Link to="/grow/books" className="text-sm font-semibold text-brand underline underline-offset-4">Back to the library</Link>} />
            </div>
        );
    }

    const manage = can("books.manage");
    const guest = role === "guest";
    const canMarkMine = !guest;
    const readers = readersOf(state, book.id);
    const myPct = bookPct(state, book, me.id);
    const courses = coursesForBook(state, book.id);
    const plans = planRows(state, ctx).filter((r) => r.plan.bookId === book.id);
    const goal = state.goalReading.find((g) => g.bookId === book.id);
    const unit = unitWord(book);

    // What the companion is allowed to know about this book: only what is on
    // this page, in this member's already-filtered slice.
    const askContext = [
        `Book: "${book.title}"${book.author ? ` by ${book.author}` : ""} (${book.format}, ${book.pages || "unknown"} ${unit === "min" ? "minutes" : "pages"}, ${book.status}).`,
        book.notes ? `What the family wrote about it: ${book.notes}` : "",
        book.tags.length ? `Tags: ${book.tags.join(", ")}.` : "",
        readers.length ? `Where people are: ${readers.map((p) => `${members.find((m) => m.id === p.memberId)?.name.split(" ")[0] ?? "someone"} ${p.pct}%`).join(", ")}.` : "",
        goal ? `This reading feeds the family goal "${goal.goalLabel}".` : "",
        courses.length ? `Courses built on it: ${courses.map((c) => `"${c.title}" (${c.status})`).join("; ")}.` : "",
    ]
        .filter(Boolean)
        .join(" ");

    const askSources = [
        "this book's title, author and the notes you wrote",
        readers.length ? "where each of you has got to" : "the shelf",
        plans.length ? "the reading plan" : "",
        courses.length ? "the course built on it" : "",
    ].filter(Boolean);

    const saveProgress = async (e: FormEvent) => {
        e.preventDefault();
        const n = Number(page);
        if (!Number.isFinite(n) || n < 0) {
            setSaveError(`Give a ${unit === "min" ? "minute" : "page"} number.`);
            return;
        }
        setSaving(true);
        setSaveError(null);
        try {
            await mutate((r) => r.setProgress(book.id, me.id, Math.round(n), 0));
            if (book.pages > 0 && Math.round(n) >= book.pages && me.role === "child") {
                await mutateCore((r) => r.addPoints(me.id, 20, `Finished ${book.title}`));
            }
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Couldn't save that.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <Link to="/grow/books" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> Library
            </Link>

            <PageTitle
                title={book.title}
                sub={book.author ? `by ${book.author}` : undefined}
                area="grow"
                actions={
                    manage && (
                        <>
                            <Button variant="outline" onClick={() => setEditOpen(true)}>
                                <Pencil size={15} aria-hidden="true" /> Edit
                            </Button>
                            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                                <Trash2 size={15} aria-hidden="true" /> Remove
                            </Button>
                        </>
                    )
                }
            />

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[300px_1fr]">
                <div>
                    <Card className="flex flex-col items-center gap-4 text-center">
                        <BookCover book={book} w={160} h={232} />
                        <div className="flex flex-wrap justify-center gap-1.5">
                            <StatusTag status={book.status} />
                            <FormatTag format={book.format} />
                            {book.value && <Tag tone="brand">{book.value}</Tag>}
                        </div>
                        <p className="text-sm text-muted">
                            {book.pages ? `${book.pages} ${unit === "min" ? "minutes" : "pages"}` : "Length not set"}
                            {book.startedAt ? ` · started ${book.startedAt}` : ""}
                        </p>
                        <Stars value={book.rating} onRate={manage || book.ownerMemberId === me.id ? (n) => void mutate((r) => r.updateBook(book.id, { rating: n })) : undefined} />
                        {book.ownerMemberId ? (
                            <p className="flex items-center gap-2 text-sm text-muted">
                                <MemberAvatar memberId={book.ownerMemberId} size="xs" /> {members.find((m) => m.id === book.ownerMemberId)?.name}
                            </p>
                        ) : (
                            <p className="text-sm text-muted">The family's book</p>
                        )}
                    </Card>

                    {manage && (
                        <Card className="mt-3">
                            <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Status</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {STATUSES.map((st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        aria-pressed={book.status === st}
                                        onClick={() => void mutate((r) => r.updateBook(book.id, { status: st }))}
                                        className={book.status === st ? "h-8 rounded-full bg-brand px-3.5 text-sm font-medium text-white" : "h-8 rounded-full bg-page px-3.5 text-sm font-medium text-muted hover:text-ink"}
                                    >
                                        {STATUS_LABEL[st]}
                                    </button>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                <div className="min-w-0">
                    {canMarkMine && (
                        <Card className="mb-6">
                            <h2 className="text-lg font-semibold">Where are you?</h2>
                            <p className="mt-0.5 text-sm text-muted">
                                {mine ? `Last moved ${relative(mine.updatedAt)} — ${mine.pct}% through.` : "Move the bookmark and everything else on this page follows."}
                            </p>
                            <ProgressBar value={myPct} className="mt-3.5" label={`${book.title} progress`} />
                            <form onSubmit={saveProgress} className="mt-4 flex flex-wrap items-end gap-3">
                                <Field
                                    label={unit === "min" ? "Minutes listened" : "Page"}
                                    type="number"
                                    min={0}
                                    max={book.pages || undefined}
                                    value={page}
                                    onChange={(e) => setPage(e.target.value)}
                                    className="w-40"
                                />
                                <Button type="submit" loading={saving}>
                                    Save my place
                                </Button>
                                {book.pages > 0 && (
                                    <span className="text-xs text-caption">
                                        of {book.pages} {unit === "min" ? "minutes" : "pages"}
                                    </span>
                                )}
                            </form>
                            {saveError && <p className="mt-2 text-sm text-danger-ink">{saveError}</p>}
                        </Card>
                    )}

                    {goal && (
                        <Card className="mb-6 bg-grow-soft">
                            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.06em] text-grow-ink">
                                <Target size={14} aria-hidden="true" /> Feeds a goal
                            </p>
                            <Link to={`/execute/goals/${goal.goalId}`} className="mt-1.5 block text-lg font-semibold text-grow-ink underline-offset-4 hover:underline">
                                {goal.goalLabel}
                            </Link>
                            <ProgressBar value={goal.pct} className="mt-3" label={`${goal.goalLabel} from reading`} />
                            <p className="mt-2 text-sm text-grow-ink/90">
                                This book is {goal.pct}% read, and that reading counts towards the goal. Move the bookmark above and this moves with it.
                            </p>
                        </Card>
                    )}

                    {readers.length > 1 && (
                        <Section title="Who's reading it">
                            <ul className="flex flex-col gap-2">
                                {readers.map((p) => (
                                    <Card key={p.memberId} as="li" className="flex items-center gap-3">
                                        <MemberAvatar memberId={p.memberId} size="sm" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-md font-medium">{members.find((m) => m.id === p.memberId)?.name ?? "Someone"}</span>
                                            <span className="block text-xs text-caption">
                                                {p.page != null ? `${p.page} ${unit === "min" ? "minutes" : "pages"} · ` : ""}
                                                {p.pct}% · moved {relative(p.updatedAt)}
                                            </span>
                                        </span>
                                        <ProgressBar value={p.pct} className="w-24" label={`${members.find((m) => m.id === p.memberId)?.name ?? "Someone"} progress`} />
                                    </Card>
                                ))}
                            </ul>
                        </Section>
                    )}

                    {plans.length > 0 && (
                        <Section title="Reading plan">
                            <ul className="flex flex-col gap-2">
                                {plans.map((r) => (
                                    <Card key={`${r.plan.id}-${r.memberId}`} as="li" className="flex flex-wrap items-center gap-3">
                                        <MemberAvatar memberId={r.memberId} size="sm" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-md font-medium">
                                                {r.plan.pace.amount} {r.plan.pace.unit === "minutes" ? "minutes" : r.plan.pace.unit}, {r.plan.pace.daysPerWeek} days a week
                                            </span>
                                            <span className="block text-xs text-caption">
                                                On {r.actual} of {r.expected} expected · finish by <DateText iso={r.plan.endDate} />
                                            </span>
                                        </span>
                                        {r.behindDays >= 2 ? <Tag tone="warn">{r.behindDays} days behind</Tag> : r.active ? <Tag tone="ok">On track</Tag> : <Tag tone="neutral">Finished</Tag>}
                                    </Card>
                                ))}
                            </ul>
                        </Section>
                    )}

                    <Section
                        title="Book to course"
                        action={manage && <Button size="sm" variant="outline" onClick={() => setGenOpen(true)}><Sparkles size={14} aria-hidden="true" /> {courses.length ? "Another course" : "Make a course"}</Button>}
                    >
                        {courses.length ? (
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                                {courses.map((c) => {
                                    const { done, total, pct } = courseProgress(state, c, me.id);
                                    return (
                                        <li key={c.id}>
                                            <Link to={`/grow/books/${book.id}/course?c=${c.id}`} className="block h-full rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                                                <span className="flex flex-wrap gap-1.5">
                                                    <Tag tone={c.status === "published" ? "ok" : "warn"}>{c.status === "published" ? "Published" : "Draft"}</Tag>
                                                    {c.childSafe && <Tag tone="grow">Child-safe</Tag>}
                                                </span>
                                                <span className="mt-2 block text-base font-semibold">{c.title}</span>
                                                <span className="mt-1 block text-sm text-muted">
                                                    {total} weeks · week {Math.min(done + 1, total || 1)} in front of us
                                                </span>
                                                <ProgressBar value={pct} className="mt-3" label={`${c.title} progress`} />
                                                <span className="mt-2 block">
                                                    <MemberChips memberIds={c.enrolled} />
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={<GraduationCap size={20} aria-hidden="true" />}
                                title="No course from this book yet"
                                body={manage ? "Four weeks: chapters, three questions for the table, one thing to do together, and a quiz. It arrives as a draft you can rewrite." : "A parent can turn this book into a family course."}
                                action={manage ? <Button onClick={() => setGenOpen(true)}>Make a course</Button> : undefined}
                            />
                        )}
                    </Section>

                    {/* The companion is the household's: a guest holds no `ai.ask`,
                        so the section would render as a heading over nothing. */}
                    {!guest && (
                    <Section title="Ask about this book">
                        <AskCompanion
                            blurb={`Grounded in what you already wrote about ${book.title} — nothing is saved, and nothing is invented.`}
                            sources={askSources}
                            extraContext={askContext}
                            payload={{ title: book.title, author: book.author, format: book.format, pages: book.pages, notes: book.notes }}
                            prompts={[
                                {
                                    label: "Summarise chapter 3 for the children",
                                    action: "summarize",
                                    prompt: `Summarise chapter 3 of "${book.title}"${book.author ? ` by ${book.author}` : ""} for the children: short sentences, nothing frightening, and three things we could talk about afterwards.`,
                                    payload: { chapter: 3, forKids: true },
                                },
                                {
                                    label: "Questions for the table tonight",
                                    prompt: `Give us three questions about "${book.title}" we could actually ask at dinner tonight, using only what this family has written about it.`,
                                },
                                {
                                    label: "Who else here would like it?",
                                    prompt: `Looking at "${book.title}" and what the family is already reading, who in this house would enjoy it next, and why? Say so plainly if you can't tell.`,
                                },
                            ]}
                        />
                    </Section>
                    )}

                    {book.notes && (
                        <Section title="Notes">
                            <Card>
                                <p className="whitespace-pre-wrap text-md leading-6 text-muted">{book.notes}</p>
                            </Card>
                        </Section>
                    )}

                    {book.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {book.tags.map((t) => (
                                <Tag key={t} tone="neutral">
                                    {t}
                                </Tag>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <BookDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                book={book}
                onSave={async (input) => {
                    await mutate((r) => r.updateBook(book.id, input));
                }}
            />
            <GenerateDialog
                open={genOpen}
                onClose={() => setGenOpen(false)}
                book={book}
                onCreate={async (input) => {
                    let id = "";
                    await mutate(async (r) => {
                        const created = await r.createCourse(input);
                        id = created.id;
                    });
                    navigate(`/grow/books/${book.id}/course?c=${id}`);
                    return id;
                }}
            />
            <Confirm
                open={confirmDelete}
                title={`Remove "${book.title}"?`}
                body="Progress, plans, any course built on it and every quiz attempt go with it. This cannot be undone."
                confirmLabel="Remove the book"
                danger
                onClose={() => setConfirmDelete(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removeBook(book.id));
                    navigate("/grow/books");
                }}
            />
        </div>
    );
}
