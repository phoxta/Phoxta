import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Note } from "@/data/types";
import { clock, relative } from "@/lib/format";
import { Button } from "@/components/ui/primitives";

/**
 * Notes for the lesson on screen. A note taken during a video remembers the
 * timestamp, and clicking it jumps back there — the thing a paper notebook
 * cannot do.
 */
export function NotesPanel({ notes, currentSec, onAdd, onDelete, onSeek }: { notes: Note[]; currentSec: number | null; onAdd: (body: string, atSec: number | null) => Promise<void>; onDelete: (id: string) => Promise<void>; onSeek?: (sec: number) => void }) {
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        const body = draft.trim();
        if (!body) return;
        setBusy(true);
        await onAdd(body, currentSec == null ? null : Math.floor(currentSec));
        setDraft("");
        setBusy(false);
    };
    return (
        <div className="flex flex-col gap-3">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                }}
                className="flex flex-col gap-2"
            >
                <label htmlFor="note" className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">
                    New note {currentSec != null && <span className="normal-case tracking-normal text-caption">· at {clock(currentSec)}</span>}
                </label>
                <textarea
                    id="note"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
                    }}
                    placeholder="What's worth remembering?"
                    rows={3}
                    className="w-full resize-y rounded-md border border-line-strong bg-card px-3.5 py-2.5 text-[14px] outline-none placeholder:text-caption focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]"
                />
                <div className="flex items-center gap-3">
                    <Button type="submit" size="md" loading={busy} disabled={!draft.trim()}>
                        Save note
                    </Button>
                    <span className="text-[12px] text-caption">⌘/Ctrl + Enter</span>
                </div>
            </form>
            {notes.length === 0 ? (
                <p className="rounded-md bg-page px-4 py-6 text-center text-[13px] text-muted">No notes on this lesson yet.</p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {notes.map((n) => (
                        <li key={n.id} className="group rounded-md bg-page px-3.5 py-3">
                            <div className="flex items-center gap-2 text-[11px] text-caption">
                                {n.atSec != null && onSeek ? (
                                    <button type="button" onClick={() => onSeek(n.atSec!)} className="rounded-xs bg-brand-soft px-1.5 py-0.5 font-semibold text-brand-ink">
                                        {clock(n.atSec)}
                                    </button>
                                ) : n.atSec != null ? (
                                    <span className="font-semibold text-brand-ink">{clock(n.atSec)}</span>
                                ) : null}
                                <span>{relative(n.createdAt)}</span>
                                <button type="button" onClick={() => void onDelete(n.id)} className="ml-auto rounded-full p-1 text-caption opacity-0 hover:text-danger-ink focus:opacity-100 group-hover:opacity-100" aria-label="Delete note">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                            <p className="mt-1.5 whitespace-pre-wrap text-[14px]">{n.body}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
