import { useEffect, useState } from "react";
import { PenLine, Sparkles } from "lucide-react";
import { useAi } from "@/lib/ai";
import { useSpace } from "@/state/space";
import { Notice } from "@/components/shared";
import { Button, Field } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import { COURSE_TIMEOUT_MS, coursePrompt, courseTitleFrom, parseCourseWeeks, scaffoldWeeks } from "../courseAi";
import type { Book, NewCourse } from "../types";

/**
 * Turn this book into four weeks.
 *
 * The companion gets twenty seconds and no more; if it is capped, unavailable,
 * slow or unparseable the family still walks out of this dialog with a real
 * four-week draft to edit. Either way the course is a DRAFT — nobody can be
 * enrolled until a parent has read it through and pressed Publish.
 */

export function GenerateDialog({ open, onClose, book, onCreate }: { open: boolean; onClose: () => void; book: Book; onCreate: (input: NewCourse) => Promise<string> }) {
    const { ask } = useAi();
    const { members } = useSpace();
    const [audience, setAudience] = useState("");
    const [weeks, setWeeks] = useState("4");
    const [childSafe, setChildSafe] = useState(true);
    const [working, setWorking] = useState<null | "ai" | "manual">(null);
    const [note, setNote] = useState<{ tone: "warn" | "info" | "danger"; text: string } | null>(null);

    useEffect(() => {
        if (!open) return;
        const kids = members.filter((m) => m.role === "child");
        setAudience(kids.length ? `The whole family. ${kids.map((k) => `${k.name.split(" ")[0]} is ${k.ageBand === "little" ? "little" : k.ageBand === "junior" ? "at primary school" : "a teenager"}`).join(", ")}.` : "The two of us, one evening a week.");
        setWeeks("4");
        setChildSafe(true);
        setNote(null);
        setWorking(null);
    }, [open, members]);

    const count = Math.min(8, Math.max(1, Number(weeks) || 4));

    const create = async (input: NewCourse) => {
        const id = await onCreate(input);
        onClose();
        return id;
    };

    const writeItMyself = async () => {
        setWorking("manual");
        setNote(null);
        try {
            await create({ bookId: book.id, title: `${book.title} — four weeks for us`, audience, childSafe, model: "by hand", weeks: scaffoldWeeks(book, count) });
        } catch (e) {
            setNote({ tone: "danger", text: e instanceof Error ? e.message : "Couldn't create that." });
        } finally {
            setWorking(null);
        }
    };

    const generate = async () => {
        setWorking("ai");
        setNote(null);
        const started = Date.now();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            const raced = await Promise.race([
                ask<unknown>({
                    action: "book-course",
                    prompt: coursePrompt(book, audience, count),
                    payload: { title: book.title, author: book.author, weeks: count, audience, pages: book.pages, format: book.format, outline: book.notes },
                    extraContext: book.notes,
                }),
                new Promise<"timeout">((resolve) => {
                    timer = setTimeout(() => resolve("timeout"), COURSE_TIMEOUT_MS);
                }),
            ]);

            if (raced !== "timeout" && raced.unavailable) {
                // The plan or the allowance said no. Say so plainly and leave the manual path open.
                setNote({ tone: "warn", text: `${raced.unavailable} You can still write the course yourself — the four weeks below are yours to fill in.` });
                return;
            }

            const parsed = raced === "timeout" ? null : parseCourseWeeks(raced.data);
            const seconds = Math.round((Date.now() - started) / 100) / 10;
            if (!parsed) {
                // Still a four-week draft in under twenty seconds — but the tag
                // on the course says which path produced it, so nobody reads a
                // scaffold as the companion's work.
                await create({
                    bookId: book.id,
                    title: `${book.title} — four weeks for us`,
                    audience,
                    childSafe,
                    model: raced === "timeout" ? `scaffold · the companion ran out of time at ${COURSE_TIMEOUT_MS / 1000}s` : "scaffold · the companion had nothing usable",
                    weeks: scaffoldWeeks(book, count),
                });
                return;
            }
            await create({
                bookId: book.id,
                title: courseTitleFrom(raced === "timeout" ? null : raced.data, book),
                audience,
                childSafe,
                model: `companion · ${seconds}s`,
                weeks: parsed,
            });
        } catch (e) {
            setNote({ tone: "warn", text: `${e instanceof Error ? e.message : "The companion couldn't answer."} Write it yourself instead — nothing is lost.` });
        } finally {
            if (timer) clearTimeout(timer);
            setWorking(null);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="Turn this book into a course" wide>
            <div className="flex flex-col gap-4">
                <p className="text-md leading-6 text-muted">
                    <strong className="font-semibold text-ink">{book.title}</strong>
                    {book.author ? ` by ${book.author}` : ""} becomes {count} weeks: chapters to read, three questions for the table, one thing to do together, and a five-question quiz. It arrives as a draft you can change before anyone sees it.
                </p>

                <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Who is it for?</span>
                    <textarea value={audience} onChange={(e) => setAudience(e.target.value)} rows={3} className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" />
                </label>

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Field label="Weeks" type="number" min={1} max={8} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
                    <label className="flex items-center gap-3 self-end rounded-md border border-line-strong bg-card px-4 py-3">
                        <input type="checkbox" checked={childSafe} onChange={(e) => setChildSafe(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                        <span className="text-md">
                            Child-safe
                            <span className="block text-xs text-caption">Required before a child can be enrolled.</span>
                        </span>
                    </label>
                </div>

                {note && <Notice tone={note.tone}>{note.text}</Notice>}
                {working === "ai" && <p className="text-sm text-muted">Writing your course… this takes a few seconds, and never more than twenty.</p>}

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="outline" type="button" onClick={writeItMyself} loading={working === "manual"} disabled={working !== null}>
                        <PenLine size={15} aria-hidden="true" /> Write it myself
                    </Button>
                    <Button type="button" onClick={generate} loading={working === "ai"} disabled={working !== null}>
                        <Sparkles size={15} aria-hidden="true" /> Ask the companion
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
