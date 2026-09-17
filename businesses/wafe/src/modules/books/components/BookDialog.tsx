import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Visibility } from "@/data/core";
import { useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { MemberPicker, VisibilityPicker } from "@/components/shared";
import { Button, Field } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import type { Book, BookFormat, BookStatus, LinkedGoal, NewBook } from "../types";
import { FORMAT_LABEL, STATUS_LABEL } from "../types";

/**
 * Add a book, or change one. The same form both ways, because the fields are
 * the fields — and because "who can see this" belongs next to the title, not
 * three screens away in a settings page.
 *
 * The goal field is a PICKER over the goals this member can actually see, read
 * from the Goals module's loaded slice. It used to be a text box that minted
 * `goal-a-calmer-unhurried-home` out of whatever was typed — an id no goal in
 * the product has, so "move the bookmark and the goal moves" was true of
 * nothing but this book's own card.
 */

const FORMATS: BookFormat[] = ["physical", "ebook", "audio"];
const STATUSES: BookStatus[] = ["want", "reading", "done"];
const SELECT = "h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand";

export function BookDialog({ open, onClose, book, onSave }: { open: boolean; onClose: () => void; book?: Book; onSave: (input: NewBook) => Promise<void> }) {
    const { space } = useSpace();
    const goalsSlice = useModuleState<{ goals?: LinkedGoal[] }>("goals");
    // The goals this member can see, plus — so editing never quietly drops a
    // link — whatever this book is already pointing at.
    const goals = useMemo<LinkedGoal[]>(() => {
        const live = (goalsSlice?.goals ?? []).filter((g) => g.status !== "done");
        if (book?.goalId && !live.some((g) => g.id === book.goalId)) return [...live, { id: book.goalId, title: book.goalLabel || "The goal this book is linked to" }];
        return live;
    }, [goalsSlice, book?.goalId, book?.goalLabel]);
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [format, setFormat] = useState<BookFormat>("physical");
    const [pages, setPages] = useState("");
    const [owner, setOwner] = useState<string | null>(null);
    const [status, setStatus] = useState<BookStatus>("want");
    const [visibility, setVisibility] = useState<Visibility>("family");
    const [sharedWith, setSharedWith] = useState<string[]>([]);
    const [value, setValue] = useState("");
    const [goalId, setGoalId] = useState("");
    const [tags, setTags] = useState("");
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setTitle(book?.title ?? "");
        setAuthor(book?.author ?? "");
        setFormat(book?.format ?? "physical");
        setPages(book?.pages ? String(book.pages) : "");
        setOwner(book?.ownerMemberId ?? null);
        setStatus(book?.status ?? "want");
        setVisibility(book?.visibility ?? "family");
        setSharedWith(book?.sharedWith ?? []);
        setValue(book?.value ?? "");
        setGoalId(book?.goalId ?? "");
        setTags((book?.tags ?? []).join(", "));
        setNotes(book?.notes ?? "");
        setError(null);
    }, [open, book]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("A book needs a title.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            // Only ever a goal that exists: the label is the goal's own title,
            // kept alongside the id so the shelf can name it without reading
            // another module's rows.
            const goal = goals.find((g) => g.id === goalId);
            await onSave({
                title,
                author,
                format,
                pages: Number(pages) || 0,
                ownerMemberId: owner,
                status,
                visibility,
                sharedWith,
                value: value || undefined,
                goalId: goal?.id,
                goalLabel: goal?.title,
                tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
                notes,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save that.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={book ? "Edit book" : "Add a book"} wide>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Habits of the Household" required />
                <Field label="Author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Justin Whitmer Earley" />

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Format</span>
                        <select value={format} onChange={(e) => setFormat(e.target.value as BookFormat)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {FORMATS.map((f) => (
                                <option key={f} value={f}>
                                    {FORMAT_LABEL[f]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Field label={format === "audio" ? "Minutes" : "Pages"} type="number" min={0} value={pages} onChange={(e) => setPages(e.target.value)} placeholder={format === "audio" ? "330" : "224"} />
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <MemberPicker label="Whose book" value={owner} onChange={setOwner} allowFamily roles={["parent", "child"]} />
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Status</span>
                        <select value={status} onChange={(e) => setStatus(e.target.value as BookStatus)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {STATUSES.map((st) => (
                                <option key={st} value={st}>
                                    {STATUS_LABEL[st]}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Which value does it serve?</span>
                        <select value={value} onChange={(e) => setValue(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            <option value="">Not linked</option>
                            {space.values.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Goal this reading feeds</span>
                        <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className={SELECT} disabled={!goals.length}>
                            <option value="">Not linked to a goal</option>
                            {goals.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.title}
                                </option>
                            ))}
                        </select>
                        <span className="mt-1.5 block text-2xs text-caption">
                            {goals.length ? "Moving the bookmark moves this book's contribution to that goal." : "No goals you can see yet — add one in Goals & vision first."}
                        </span>
                    </label>
                </div>

                <Field label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="faith, parenting, GCSE" hint="Comma separated." />

                <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Notes</span>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder="Why we're reading it, and what to talk about." />
                </label>

                <VisibilityPicker value={visibility} onChange={setVisibility} sharedWith={sharedWith} onSharedWith={setSharedWith} />

                {error && <p className="text-sm text-danger-ink">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {book ? "Save changes" : "Add to the shelf"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
