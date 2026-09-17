import { useEffect, useState } from "react";
import { useSpace } from "@/state/space";
import { MemberPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";
import { SCHEDULE, type MemoryVerse, type NewVerse } from "../types";

/**
 * A verse to learn by heart.
 *
 * Adding one schedules the first card for tomorrow and starts the
 * 1-3-7-14-30 ladder; the dialog says so, because a review schedule the
 * learner cannot see is just a surprise.
 */
export function VerseDialog({
    open,
    onClose,
    onSave,
    initial,
}: {
    open: boolean;
    onClose: () => void;
    onSave: (input: NewVerse) => Promise<void>;
    initial?: MemoryVerse;
}) {
    const { me, can, members } = useSpace();
    const manage = can("bible.manage");
    const [reference, setReference] = useState("");
    const [text, setText] = useState("");
    const [memberId, setMemberId] = useState<string | null>(me.id);
    const [readAloud, setReadAloud] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setReference(initial?.reference ?? "");
        setText(initial?.text ?? "");
        setMemberId(initial?.memberId ?? me.id);
        setReadAloud(initial?.readAloud ?? false);
        setError(null);
    }, [open, initial, me.id]);

    const learner = members.find((m) => m.id === memberId);

    return (
        <Dialog open={open} onClose={onClose} title={initial ? "Edit this verse" : "Learn a verse by heart"}>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!reference.trim() || !text.trim()) {
                        setError("A reference and the words, please.");
                        return;
                    }
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({ memberId: memberId ?? me.id, reference, text, readAloud });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Field label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Psalm 23:1" error={error} />
                <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">The words</span>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={3}
                        placeholder="Yahweh is my shepherd: I shall lack nothing."
                        className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md leading-6 outline-none focus:border-brand"
                    />
                </label>

                {manage && !initial && <MemberPicker className="mt-4" label="Who is learning it" value={memberId} onChange={setMemberId} roles={["parent", "child"]} />}

                <label className="mt-4 flex items-center gap-2.5 text-md">
                    <input type="checkbox" checked={readAloud} onChange={(e) => setReadAloud(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                    Read it aloud on the card{learner?.ageBand === "little" ? " — Ayo learns by hearing it" : ""}
                </label>

                {!initial && (
                    <p className="mt-4 rounded-md bg-brand-soft px-4 py-3 text-sm leading-5 text-brand-ink">
                        The first card comes up tomorrow, then after {SCHEDULE.slice(1).join(", ")} days. Say “I knew it” and it moves up the ladder; say “Again” and it starts over — no penalty, no streak to break.
                    </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {initial ? "Save" : "Add the verse"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
