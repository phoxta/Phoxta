import { useState } from "react";
import { MessageSquareQuote } from "lucide-react";
import { useAi } from "@/lib/ai";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Button } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import { proposeFromText, type EventProposal } from "../derive";
import type { CalendarRepo } from "../types";

/**
 * "Propose an event from a message or note."
 *
 * Paste what the school (or your sister) sent and the calendar reads it: a
 * day, a time, a place, a name for the thing. It PROPOSES — the fields are
 * yours to correct and nothing is written until you press the button, which is
 * the companion's rule everywhere in Wàfè. When the companion is reachable it
 * improves the title; when it is not, the reader still works, because a family
 * should never be blocked by a model being down.
 */

const SAMPLE = "Hi Ifeoluwa — parents' evening is on Thursday at 5.30pm at Harris Academy. Please let us know if you can come.";

const labelCls = "mb-1.5 block text-xs font-medium text-muted";
const inputCls = "h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand";

export function ProposeDialog({
    open,
    onClose,
    mutate,
}: {
    open: boolean;
    onClose: () => void;
    mutate: (fn: (repo: CalendarRepo) => Promise<unknown>) => Promise<void>;
}) {
    const sp = useSpace();
    const { toast } = useToast();
    const { ask, busy, available } = useAi();
    const [text, setText] = useState("");
    const [proposal, setProposal] = useState<EventProposal | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const read = async (): Promise<void> => {
        const body = text.trim();
        if (!body) return;
        const p = proposeFromText(body, sp.today);
        setProposal(p);
        setNote(p.confident ? null : "I couldn't find a date in that, so I have guessed. Change anything that is wrong.");
        if (!available) return;
        try {
            const r = await ask({ action: "ask", prompt: `Reply with a short calendar title (six words at most) for this message, and nothing else: ${body}` });
            if (r.unavailable) setNote(r.unavailable);
            else if (r.text.trim()) setProposal((prev) => (prev ? { ...prev, title: r.text.trim().replace(/^["']|["']$/g, "").slice(0, 70) } : prev));
        } catch {
            setNote("The companion couldn't help just now — this is what the calendar read on its own.");
        }
    };

    const set = <K extends keyof EventProposal>(k: K, v: EventProposal[K]): void => setProposal((p) => (p ? { ...p, [k]: v } : p));

    return (
        <Dialog open={open} onClose={onClose} title="Read a message into the calendar" wide>
            <label className={labelCls} htmlFor="propose-text">
                Paste the message or the note
            </label>
            <textarea
                id="propose-text"
                className="min-h-28 w-full rounded-sm border border-line-strong bg-card p-3 text-md outline-none focus:border-brand"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={SAMPLE}
            />
            <div className="mt-2 flex flex-wrap gap-2">
                <Button onClick={() => void read()} loading={busy} disabled={!text.trim()}>
                    <MessageSquareQuote size={15} aria-hidden="true" /> Read it
                </Button>
                <Button variant="ghost" onClick={() => setText(SAMPLE)}>
                    Use the example
                </Button>
            </div>
            {note && <p className="mt-2 text-sm text-muted">{note}</p>}

            {proposal && (
                <div className="mt-5 rounded-lg bg-page p-3.5">
                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">I used</span>
                        {proposal.used.length ? (
                            proposal.used.map((u) => (
                                <span key={u} className="rounded-xs bg-card px-2 py-0.5 text-2xs font-medium">
                                    {u}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-caption">nothing I could be sure of</span>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className={labelCls} htmlFor="propose-title">
                                Title
                            </label>
                            <input id="propose-title" className={inputCls} value={proposal.title} onChange={(e) => set("title", e.target.value)} />
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                            <div>
                                <label className={labelCls} htmlFor="propose-date">
                                    Date
                                </label>
                                <input id="propose-date" type="date" className={inputCls} value={proposal.date} onChange={(e) => set("date", e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls} htmlFor="propose-start">
                                    From
                                </label>
                                <input id="propose-start" type="time" className={inputCls} value={proposal.start} onChange={(e) => set("start", e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls} htmlFor="propose-end">
                                    To
                                </label>
                                <input id="propose-end" type="time" className={inputCls} value={proposal.end} onChange={(e) => set("end", e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls} htmlFor="propose-where">
                                Where
                            </label>
                            <input id="propose-where" className={inputCls} value={proposal.location} onChange={(e) => set("location", e.target.value)} />
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-caption">Nothing is saved until you press this.</p>
                        <Button
                            loading={saving}
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    await mutate((r) =>
                                        r.createEvent({
                                            title: proposal.title,
                                            notes: text.trim(),
                                            startAt: new Date(`${proposal.date}T${proposal.start}:00`).toISOString(),
                                            endAt: new Date(`${proposal.date}T${proposal.end}:00`).toISOString(),
                                            location: proposal.location,
                                        }),
                                    );
                                    toast("In the diary");
                                    setText("");
                                    setProposal(null);
                                    onClose();
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            Add to the calendar
                        </Button>
                    </div>
                </div>
            )}
        </Dialog>
    );
}
