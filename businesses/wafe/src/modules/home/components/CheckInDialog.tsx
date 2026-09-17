import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Sparkles, Trash2, UserRoundPlus } from "lucide-react";
import type { AgendaItem, Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { addDays, isoDate } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { Dialog } from "@/components/ui/overlay";
import { Button, Tag } from "@/components/ui/primitives";
import { moodLabel } from "../derive";
import type { CheckIn, Decision, NewCheckIn } from "../types";
import { MoodHearts } from "./bits";

/**
 * The evening check-in, in three taps.
 *
 * Mood, one thing you're grateful for, and then the honest bit: the things
 * you did not finish. Each one gets a decision on the spot — move it, hand it
 * over, or let it go — because a list that only ever grows is how a family
 * stops trusting the app. Nothing is applied until you save, so every choice
 * here is undoable.
 */

type Draft = Record<string, Decision>;

/**
 * What a little one is grateful for, as things to tap.
 *
 * The brief is explicit that the little band gets a prompt-picker and no free
 * typing: a five-year-old with a blank textarea simply does not check in.
 */
const GRATITUDE_CHIPS = ["My family", "My friends", "Playing outside", "Something yummy", "A story at bedtime", "Our home", "Bella the dog", "Church"];

export function CheckInDialog({
    open,
    onClose,
    today,
    existing,
    openItems,
    members,
    meId,
    questions,
    tapOnly = false,
    startStep = 1,
    startMood,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    today: string;
    existing?: CheckIn;
    openItems: AgendaItem[];
    members: Member[];
    meId: string;
    questions: string[];
    /** Little band: tap a feeling rather than type one. */
    tapOnly?: boolean;
    /**
     * Where to open. Tapping one of the five hearts ON Home opens the dialog
     * straight at gratitude with that mood already set — the 21:00 ritual in
     * one thumb — while mood, gratitude and prayer keep their usual order for
     * anyone who opens it the ordinary way.
     */
    startStep?: number;
    startMood?: number;
    onSave: (input: NewCheckIn) => Promise<void>;
}) {
    const { ask } = useAi();
    const [step, setStep] = useState(startStep);
    const [mood, setMood] = useState(startMood ?? existing?.mood ?? 4);
    const [gratitude, setGratitude] = useState(existing?.gratitude ?? "");
    const [prayer, setPrayer] = useState(existing?.prayer ?? "");
    const [prompts, setPrompts] = useState<string[]>(existing?.questions.length ? existing.questions : questions);
    const [drafts, setDrafts] = useState<Draft>({});
    const [busy, setBusy] = useState(false);
    const [asking, setAsking] = useState(false);
    const [note, setNote] = useState<string | null>(null);

    // Re-open on a fresh evening: start from what is stored, not from before.
    useEffect(() => {
        if (!open) return;
        setStep(startStep);
        setMood(startMood ?? existing?.mood ?? 4);
        setGratitude(existing?.gratitude ?? "");
        setPrayer(existing?.prayer ?? "");
        setPrompts(existing?.questions.length ? existing.questions : questions);
        setDrafts(Object.fromEntries((existing?.decisions ?? []).map((d) => [d.taskId, d])));
        setNote(null);
    }, [open, existing, questions, startStep, startMood]);

    const tomorrow = isoDate(addDays(`${today}T12:00:00`, 1));
    const others = useMemo(() => members.filter((m) => m.id !== meId && m.role !== "guest"), [members, meId]);

    const set = (item: AgendaItem, action: Decision["action"], toMemberId: string | null = null) => {
        const to = toMemberId ? members.find((m) => m.id === toMemberId) : undefined;
        setDrafts((d) => ({
            ...d,
            [item.id]: {
                taskId: item.id,
                title: item.title,
                action,
                toMemberId,
                toDate: action === "reschedule" ? tomorrow : null,
                note: action === "reschedule" ? "Moved to tomorrow" : action === "delegate" ? `Handed to ${to?.name.split(" ")[0] ?? "someone else"}` : "Dropped at check-in",
                applied: false,
            },
        }));
    };
    const clear = (id: string) =>
        setDrafts((d) => {
            const next = { ...d };
            delete next[id];
            return next;
        });

    const askForPrompts = async () => {
        setAsking(true);
        setNote(null);
        try {
            const r = await ask<{ questions?: string[]; summary?: string }>({ action: "reflect", payload: { date: today, mood } });
            if (r.unavailable) setNote(r.unavailable);
            else if (Array.isArray(r.data?.questions) && r.data.questions.length) setPrompts(r.data.questions.slice(0, 3));
            else if (r.text.trim()) setNote(r.text.trim());
        } catch {
            setNote("The companion couldn't answer just now — these are our own questions.");
        } finally {
            setAsking(false);
        }
    };

    const decisions = Object.values(drafts);

    const save = async () => {
        setBusy(true);
        try {
            const moved = decisions.filter((d) => d.action === "reschedule").length;
            const dropped = decisions.filter((d) => d.action === "drop").length;
            const handed = decisions.filter((d) => d.action === "delegate").length;
            const tail = [moved && `${moved} moved to tomorrow`, handed && `${handed} handed over`, dropped && `${dropped} let go`].filter(Boolean).join(", ");
            const summary = [moodLabel(mood), gratitude.trim() && `grateful for "${gratitude.trim()}"`, tail].filter(Boolean).join(" · ");
            await onSave({ date: today, mood, gratitude, prayer, questions: prompts, decisions, summary });
            onClose();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={existing ? "Update tonight's check-in" : "Evening check-in"} wide>
            <ol className="mb-4 flex items-center gap-2 text-xs font-semibold" aria-label="Progress">
                {[1, 2, 3].map((s) => (
                    <li key={s} className={cn("flex items-center gap-2 rounded-full px-2.5 py-1", step === s ? "bg-brand text-white" : step > s ? "bg-brand-soft text-brand-ink" : "bg-page text-caption")}>
                        {step > s ? <Check size={12} aria-hidden="true" /> : s}
                        {s === 1 ? "Mood" : s === 2 ? "Gratitude" : "What's left"}
                    </li>
                ))}
            </ol>

            {step === 1 && (
                <div>
                    <p className="mb-3 text-base font-medium">How was today?</p>
                    <MoodHearts value={mood} onChange={setMood} />
                    <p className="mt-3 text-sm text-muted">{moodLabel(mood)}.</p>
                </div>
            )}

            {step === 2 && tapOnly && (
                <div className="space-y-4">
                    <ul className="space-y-1 text-base leading-7">
                        {prompts.map((q) => (
                            <li key={q}>· {q}</li>
                        ))}
                    </ul>
                    <div>
                        <p className="mb-2 text-base font-medium">Tap what you are thankful for.</p>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="What you are thankful for">
                            {GRATITUDE_CHIPS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    aria-pressed={gratitude === c}
                                    onClick={() => setGratitude(gratitude === c ? "" : c)}
                                    className={cn(
                                        "rounded-full border px-4 py-2.5 text-base font-semibold transition-colors",
                                        gratitude === c ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-card hover:border-ink",
                                    )}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => void askForPrompts()} loading={asking}>
                            <Sparkles size={14} aria-hidden="true" /> Ask for different questions
                        </Button>
                        {note && <span className="text-xs text-muted">{note}</span>}
                    </div>
                </div>
            )}

            {step === 2 && !tapOnly && (
                <div className="space-y-4">
                    <ul className="space-y-1 text-sm text-muted">
                        {prompts.map((q) => (
                            <li key={q}>· {q}</li>
                        ))}
                    </ul>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">One thing you&apos;re grateful for</span>
                        <textarea
                            value={gratitude}
                            onChange={(e) => setGratitude(e.target.value)}
                            rows={2}
                            placeholder="Ayo read a whole page…"
                            className="w-full rounded-md border border-line-strong bg-card px-3.5 py-2.5 text-md leading-6 outline-none focus:border-brand"
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Anything to pray about</span>
                        <textarea
                            value={prayer}
                            onChange={(e) => setPrayer(e.target.value)}
                            rows={2}
                            placeholder="Optional"
                            className="w-full rounded-md border border-line-strong bg-card px-3.5 py-2.5 text-md leading-6 outline-none focus:border-brand"
                        />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => void askForPrompts()} loading={asking}>
                            <Sparkles size={14} aria-hidden="true" /> Ask for prompts
                        </Button>
                        {note && <span className="text-xs text-muted">{note}</span>}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div>
                    <p className="mb-3 text-md leading-6 text-muted">
                        {openItems.length ? "These are still open. Move them, hand them over, or let them go — nothing is applied until you save." : "Everything on today's list is done. That is worth noticing."}
                    </p>
                    <ul className="space-y-2">
                        {openItems.map((item) => {
                            const d = drafts[item.id];
                            return (
                                <li key={item.id} className="rounded-lg bg-page p-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="min-w-0 flex-1 text-md font-medium">{item.title}</span>
                                        {d && <Tag tone={d.action === "drop" ? "danger" : d.action === "delegate" ? "brand" : "warn"}>{d.note}</Tag>}
                                    </div>
                                    {d ? (
                                        <button type="button" onClick={() => clear(item.id)} className="mt-2 text-xs font-semibold text-brand underline underline-offset-4">
                                            Undo
                                        </button>
                                    ) : (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <Button variant="outline" size="sm" onClick={() => set(item, "reschedule")}>
                                                <CalendarClock size={13} aria-hidden="true" /> Tomorrow
                                            </Button>
                                            {others.length > 0 && (
                                                <label className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line-strong bg-card px-3 text-xs font-semibold">
                                                    <UserRoundPlus size={13} aria-hidden="true" />
                                                    <span className="sr-only">Hand {item.title} to</span>
                                                    <select value="" onChange={(e) => e.target.value && set(item, "delegate", e.target.value)} className="bg-transparent text-xs font-semibold outline-none">
                                                        <option value="">Hand over…</option>
                                                        {others.map((m) => (
                                                            <option key={m.id} value={m.id}>
                                                                {m.name.split(" ")[0]}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            )}
                                            <Button variant="danger" size="sm" onClick={() => set(item, "drop")}>
                                                <Trash2 size={13} aria-hidden="true" /> Let it go
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => (step === 1 ? onClose() : setStep(step - 1))}>
                    {step === 1 ? "Not now" : "Back"}
                </Button>
                {step < 3 ? (
                    <Button variant="brand" onClick={() => setStep(step + 1)}>
                        Next
                    </Button>
                ) : (
                    <Button variant="brand" loading={busy} onClick={() => void save()}>
                        {existing ? "Update check-in" : "Save check-in"}
                    </Button>
                )}
            </div>
        </Dialog>
    );
}
