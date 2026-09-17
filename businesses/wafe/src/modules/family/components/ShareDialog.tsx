import { useEffect, useState, type FormEvent } from "react";
import type { Invite, Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/format";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";
import { SHARE_TYPE, type NewShare, type ShareLevel, type ShareObjectType } from "../types";

/**
 * Granting a guest one named thing.
 *
 * Guests are never given a module; they are given a trip, a board, an album,
 * a wall, an event or a session — and optionally an end date, because a
 * birthday board should let itself out after the party.
 */
export function ShareDialog({ open, onClose, targets, onSave }: { open: boolean; onClose: () => void; targets: Array<Member | Invite>; onSave: (input: NewShare) => Promise<void> }) {
    const [memberId, setMemberId] = useState("");
    const [objectType, setObjectType] = useState<ShareObjectType>("album");
    const [label, setLabel] = useState("");
    const [href, setHref] = useState("/create/memories");
    const [level, setLevel] = useState<ShareLevel>("view");
    const [expires, setExpires] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setMemberId(targets[0]?.id ?? "");
        setObjectType("album");
        setLabel("");
        setHref("/create/memories");
        setLevel("view");
        setExpires("");
        setError(null);
    }, [open, targets]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!memberId) {
            setError("Choose who this is for");
            return;
        }
        if (!label.trim()) {
            setError("Give it the name they will see");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onSave({
                memberId,
                objectType,
                objectId: `${objectType}-${slugify(label) || Date.now().toString(36)}`,
                label: label.trim(),
                href: href.trim() || DEFAULT_HREF[objectType],
                level,
                expiresAt: expires ? new Date(`${expires}T23:59:00`).toISOString() : null,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't share that");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="Share one thing" wide>
            <form onSubmit={submit} className="grid gap-4">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">With</span>
                    <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        {targets.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                                {"code" in t ? " (invited)" : ""}
                            </option>
                        ))}
                    </select>
                </label>

                <div>
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">What</span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="What to share">
                        {(Object.keys(SHARE_TYPE) as ShareObjectType[]).map((t) => (
                            <button
                                key={t}
                                type="button"
                                role="radio"
                                aria-checked={objectType === t}
                                onClick={() => {
                                    setObjectType(t);
                                    setHref(DEFAULT_HREF[t]);
                                }}
                                className={cn("rounded-sm border px-3 py-2.5 text-left text-sm font-semibold", objectType === t ? "border-brand bg-brand-soft" : "border-line-strong hover:border-ink")}
                            >
                                <span aria-hidden="true">{SHARE_TYPE[t].emoji}</span> {SHARE_TYPE[t].label}
                            </button>
                        ))}
                    </div>
                </div>

                <Field label="Called" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Christmas in Lagos" hint="The name the guest sees on their dashboard." required />

                <div>
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">They can</span>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="What they can do">
                        {(["view", "contribute"] as ShareLevel[]).map((l) => (
                            <button key={l} type="button" role="radio" aria-checked={level === l} onClick={() => setLevel(l)} className={cn("rounded-sm border px-3 py-2.5 text-left", level === l ? "border-brand bg-brand-soft" : "border-line-strong hover:border-ink")}>
                                <span className="block text-sm font-semibold">{l === "view" ? "Look" : "Join in"}</span>
                                <span className="block text-2xs text-caption">{l === "view" ? "Read only — the guest default." : "Add photos, pins, packing items or prayers."}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <Field label="Until (optional)" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} hint="Leave empty to share for good. A party board can let itself out." />

                {error && <p className="text-sm text-danger-ink">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="brand" loading={busy}>
                        Share it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

const DEFAULT_HREF: Record<ShareObjectType, string> = {
    trip: "/live/travel",
    board: "/create/moodboards",
    course: "/grow/curricula",
    wall: "/grow/bible",
    album: "/create/memories",
    event: "/execute/calendar",
    session: "/family/people",
};
