import { useEffect, useState } from "react";
import type { Role, Visibility } from "@/data/core";
import { cn } from "@/lib/cn";
import { VisibilityPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";
import { TAGS, type NewPrayer, type Prayer, type PrayerTag } from "../types";

/**
 * Asking for prayer.
 *
 * The form is the privacy model made visible: pick who can see it, and the
 * consequences are spelled out underneath rather than hidden in a policy. A
 * guest sees a shorter form — their request goes on the wall as a guest post,
 * which is the only thing a guest may write here at all.
 */

export function PrayerDialog({
    open,
    onClose,
    onSave,
    initial,
    role,
}: {
    open: boolean;
    onClose: () => void;
    onSave: (input: NewPrayer) => Promise<void>;
    initial?: Prayer;
    role: Role;
}) {
    const guest = role === "guest";
    const child = role === "child";
    const [title, setTitle] = useState("");
    const [detail, setDetail] = useState("");
    const [tags, setTags] = useState<PrayerTag[]>([]);
    const [visibility, setVisibility] = useState<Visibility>("family");
    const [sharedWith, setSharedWith] = useState<string[]>([]);
    const [childSafe, setChildSafe] = useState(true);
    const [withGuests, setWithGuests] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setTitle(initial?.title ?? "");
        setDetail(initial?.detail ?? "");
        setTags(initial?.tags ?? []);
        setVisibility(initial?.visibility ?? "family");
        setSharedWith(initial?.sharedWith ?? []);
        setChildSafe(initial ? initial.childSafe : true);
        setWithGuests(initial ? initial.sharedWithGuests : false);
        setError(null);
    }, [open, initial]);

    const toggleTag = (t: PrayerTag): void => setTags((v) => (v.includes(t) ? v.filter((x) => x !== t) : [...v, t]));
    const notChildSafe = tags.some((t) => !TAGS.find((x) => x.id === t)?.childSafe);

    return (
        <Dialog open={open} onClose={onClose} title={initial ? "Edit this request" : "Ask for prayer"} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!title.trim()) {
                        setError("Give the request a title — a few words is plenty.");
                        return;
                    }
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({
                            title,
                            detail,
                            tags,
                            visibility,
                            sharedWith,
                            childSafe: notChildSafe ? false : childSafe,
                            sharedWithGuests: visibility === "private" ? false : withGuests,
                        });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Field label="What shall we pray for?" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mama Fọláké's knee" error={error} />

                <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">A little more (optional)</span>
                    <textarea
                        value={detail}
                        onChange={(e) => setDetail(e.target.value)}
                        rows={3}
                        placeholder="What is going on, and what you'd like God to do."
                        className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md leading-6 outline-none focus:border-brand"
                    />
                </label>

                <fieldset className="mt-4">
                    <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted">Tags</legend>
                    <div className="flex flex-wrap gap-2">
                        {TAGS.map((t) => {
                            const on = tags.includes(t.id);
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => toggleTag(t.id)}
                                    className={cn("h-9 rounded-full border px-3.5 text-sm font-medium", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                                >
                                    {t.label}
                                    {!t.childSafe && <span className="ml-1.5 text-2xs text-caption">adults</span>}
                                </button>
                            );
                        })}
                    </div>
                    {notChildSafe && <p className="mt-2 text-xs text-caption">Tagged for adults, so the children's wall will not show it.</p>}
                </fieldset>

                {guest ? (
                    <p className="mt-5 rounded-md bg-brand-soft px-4 py-3 text-sm leading-5 text-brand-ink">
                        This goes on the family's prayer wall as a guest request, with your name on it. Guests can ask and can pray; nothing else here is theirs to change.
                    </p>
                ) : (
                    <>
                        <VisibilityPicker className="mt-5" value={visibility} onChange={setVisibility} sharedWith={sharedWith} onSharedWith={setSharedWith} />
                        {visibility === "private" ? (
                            <p className="mt-2 text-xs leading-5 text-caption">A private prayer stays on your own list. It never appears on the wall, in a briefing, or in anything the companion says — to anyone, including a parent.</p>
                        ) : (
                            <div className="mt-4 flex flex-col gap-2.5">
                                {!child && (
                                    <label className="flex items-center gap-2.5 text-md">
                                        <input type="checkbox" checked={childSafe && !notChildSafe} disabled={notChildSafe} onChange={(e) => setChildSafe(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                                        The children may read this
                                    </label>
                                )}
                                <label className="flex items-center gap-2.5 text-md">
                                    <input type="checkbox" checked={withGuests} onChange={(e) => setWithGuests(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                                    Share with guests — it goes on “How to pray for us this week”
                                </label>
                            </div>
                        )}
                    </>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {initial ? "Save" : "Add to the wall"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

/** Marking a prayer answered: the date is automatic, the story is not. */
export function AnswerDialog({ open, onClose, prayer, onSave }: { open: boolean; onClose: () => void; prayer: Prayer | null; onSave: (testimony: string) => Promise<void> }) {
    const [testimony, setTestimony] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (open) setTestimony(prayer?.testimony ?? "");
    }, [open, prayer]);
    return (
        <Dialog open={open} onClose={onClose} title="Answered">
            <p className="text-md leading-6 text-muted">
                {prayer ? `“${prayer.title}” moves to the archive with today's date, and goes on the family timeline. The thread stays exactly as it is.` : ""}
            </p>
            <form
                className="mt-4"
                onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    try {
                        await onSave(testimony);
                        onClose();
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">What happened?</span>
                    <textarea
                        value={testimony}
                        onChange={(e) => setTestimony(e.target.value)}
                        rows={4}
                        placeholder="Say it plainly — this is what the children will read in ten years."
                        className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md leading-6 outline-none focus:border-brand"
                    />
                </label>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Mark answered
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
