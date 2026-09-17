import { useEffect, useState } from "react";
import { Copy, PartyPopper } from "lucide-react";
import { cn } from "@/lib/cn";
import { longDate } from "@/lib/format";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { MemberMultiPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Sparkle } from "@/components/ui/primitives";
import type { Celebration, Goal } from "../types";

/**
 * Finishing is an event.
 *
 * When the last milestone goes green the goal finishes itself and this dialog
 * opens: a sentence for the card, a paragraph nobody else has to read, a photo
 * and who was there. Saving it writes the celebration AND puts it on the family
 * timeline — every member gets it in their notifications — because a thing that
 * only the person who did it knows about is not a family memory.
 */

const PHOTOS: Array<{ url: string; label: string }> = [
    { url: "/images/goals-celebrate.jpg", label: "Cake and candles" },
    { url: "/images/goals-vision.jpg", label: "The long view" },
    { url: "/images/family-hero.jpg", label: "All of us" },
    { url: "/images/goals-schoolyear.jpg", label: "Desk and books" },
    { url: "/images/goals-swim.jpg", label: "The pool" },
    { url: "/images/goals-mark.jpg", label: "The open book" },
];

const area = "w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-md leading-6 outline-none focus:border-brand";

export function CelebrateDialog({
    open,
    onClose,
    goal,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    goal: Goal;
    onSave: (input: { reflection: string; cardLine: string; photoUrl?: string; memberIds: string[] }) => Promise<void>;
}) {
    const { members, me } = useSpace();
    const [cardLine, setCardLine] = useState("");
    const [reflection, setReflection] = useState("");
    const [photoUrl, setPhotoUrl] = useState<string>(goal.coverUrl ?? PHOTOS[0].url);
    const [who, setWho] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setCardLine("");
        setReflection("");
        setPhotoUrl(goal.coverUrl ?? PHOTOS[0].url);
        setWho(members.filter((m) => m.role !== "guest").map((m) => m.id));
        setError(null);
    }, [open, goal, members]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await onSave({ reflection, cardLine: cardLine.trim() || goal.title, photoUrl, memberIds: who.length ? who : [me.id] });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="You finished it" wide>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="flex items-start gap-3 rounded-lg bg-live-soft px-4 py-3.5 text-live-ink">
                    <PartyPopper size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-sm leading-5">
                        <span className="font-semibold">{goal.title}</span> — every milestone is done. Write it down before it blurs; it goes on the family timeline, not into a report.
                    </p>
                </div>

                <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted">The line on the card</span>
                    <input value={cardLine} onChange={(e) => setCardLine(e.target.value)} maxLength={90} placeholder="Sixteen chapters. Forty evenings. One family, at one table." className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                    <span className="mt-1 block text-xs text-caption">One sentence, the kind you would actually say out loud.</span>
                </label>

                <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted">What happened</span>
                    <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={4} className={area} placeholder="Who was there, what was hard, what surprised you." />
                </label>

                <fieldset>
                    <legend className="mb-1.5 block text-xs font-medium text-muted">A picture</legend>
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {PHOTOS.map((p) => (
                            <li key={p.url}>
                                <button type="button" aria-pressed={photoUrl === p.url} onClick={() => setPhotoUrl(p.url)} className={cn("block w-full overflow-hidden rounded-sm border-2", photoUrl === p.url ? "border-brand" : "border-transparent")}>
                                    <img src={p.url} alt={p.label} width={120} height={80} loading="lazy" className="h-16 w-full object-cover" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </fieldset>

                <MemberMultiPicker value={who} onChange={setWho} label="Who was part of it" />

                {error && <p className="text-sm text-danger-ink">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={onClose}>
                        Later
                    </Button>
                    <Button type="submit" loading={busy}>
                        Celebrate it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

/** The shareable card: the family's own words, ready to send to Ibadan. */
export function ShareCardDialog({ open, onClose, celebration, goalTitle }: { open: boolean; onClose: () => void; celebration: Celebration | null; goalTitle: string }) {
    const { space } = useSpace();
    const { toast } = useToast();
    if (!celebration) return null;
    const words = `${celebration.cardLine}\n\n${goalTitle} — ${longDate(celebration.date)}\n${space.name}`;
    return (
        <Dialog open={open} onClose={onClose} title="A card to share">
            <div className="overflow-hidden rounded-xl bg-brand text-white">
                {celebration.photoUrl && <img src={celebration.photoUrl} alt="" width={640} height={280} loading="lazy" className="h-40 w-full object-cover" />}
                <div className="paper relative px-5 py-6">
                    <Sparkle className="absolute -right-5 -top-6 w-20 opacity-15" />
                    <p className="font-display text-3xl leading-7">{celebration.cardLine}</p>
                    <p className="mt-3 text-sm opacity-80">{goalTitle}</p>
                    <p className="mt-0.5 text-xs opacity-70">
                        {longDate(celebration.date)} · {space.name}
                    </p>
                </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                    Close
                </Button>
                <Button
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(words);
                            toast("Copied — paste it anywhere.", "success");
                        } catch {
                            toast("Your browser wouldn't let us copy that.", "danger");
                        }
                    }}
                >
                    <Copy size={15} /> Copy the words
                </Button>
            </div>
        </Dialog>
    );
}
