import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Plus, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, MemberAvatar, Notice, PageTitle, Points, Section } from "@/components/shared";
import { Button, Card, EmptyState, Tag } from "@/components/ui/primitives";
import bibleModule from "../module";
import { BASE, dueVerses, hideWords, masteryOf, nextVerseDate, versesOf } from "../derive";
import { ReadAloud, VerseRow } from "../components/pieces";
import { VerseDialog } from "../components/VerseDialog";
import { SCHEDULE, type MemoryVerse, type NewVerse, type ReviewResult } from "../types";

/**
 * Learning it by heart.
 *
 * The card is the product here: the words, then fewer and fewer of the words,
 * then two honest buttons. "I knew it" moves the verse up the 1-3-7-14-30
 * ladder; "Again" starts it over — no penalty, no streak to break, because a
 * verse you have to relearn is not a failure, it is a Tuesday.
 */

function PracticeCard({
    verse,
    mastery,
    overdueDays,
    onAnswer,
    points,
}: {
    verse: MemoryVerse;
    mastery: number;
    overdueDays: number;
    onAnswer: (result: ReviewResult) => Promise<void>;
    points: number;
}) {
    const [level, setLevel] = useState(Math.min(2, mastery));
    const [busy, setBusy] = useState<ReviewResult | null>(null);
    const words = hideWords(verse.text, level);

    const answer = async (result: ReviewResult): Promise<void> => {
        setBusy(result);
        try {
            await onAnswer(result);
        } finally {
            setBusy(null);
        }
    };

    return (
        <Card className="paper bg-grow-soft p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
                <Tag tone="grow">Due now</Tag>
                {overdueDays > 0 && <Tag tone="warn">{overdueDays}d late</Tag>}
                <MemberAvatar memberId={verse.memberId} size="xs" showName />
                <span className="flex-1" />
                <span className="text-xs text-muted">Step {Math.min(mastery + 1, SCHEDULE.length)} of {SCHEDULE.length}</span>
            </div>

            <h2 className="mt-3 font-display text-3xl leading-7 text-grow-ink">{verse.reference}</h2>
            <p className="mt-3 text-xl leading-8 text-grow-ink md:text-2xl md:leading-9">
                {words.map((w, i) => (
                    <span key={`${w.word}-${i}`}>
                        {w.hidden ? (
                            <>
                                {/* The word keeps its width so the sentence holds its shape; a screen reader hears a blank rather than the answer. */}
                                <span aria-hidden="true" className="mx-0.5 inline-block rounded-xs bg-grow/25 px-1 align-baseline text-transparent select-none">
                                    {w.word}
                                </span>
                                <span className="sr-only">blank</span>
                            </>
                        ) : (
                            w.word
                        )}
                        {i < words.length - 1 ? " " : ""}
                    </span>
                ))}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="md" onClick={() => setLevel((l) => Math.min(4, l + 1))} disabled={level >= 4}>
                    <EyeOff size={15} aria-hidden="true" /> Hide more
                </Button>
                <Button variant="outline" size="md" onClick={() => setLevel(0)} disabled={level === 0}>
                    <Eye size={15} aria-hidden="true" /> Show all
                </Button>
                {verse.readAloud && <ReadAloud text={`${verse.reference}. ${verse.text}`} label="Say it to me" />}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-grow/20 pt-4">
                <Button loading={busy === "knew"} onClick={() => answer("knew")}>
                    I knew it
                    {points > 0 && <Points n={points} />}
                </Button>
                <Button variant="outline" loading={busy === "again"} onClick={() => answer("again")}>
                    <RotateCcw size={15} aria-hidden="true" /> Again tomorrow
                </Button>
            </div>
        </Card>
    );
}

export default function VersesPage() {
    const [params, setParams] = useSearchParams();
    const { state, mutate, loading, error } = useModule(bibleModule);
    const { me, role, can, members, today, mutateCore } = useSpace();
    const { toast } = useToast();
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<MemoryVerse | undefined>(undefined);
    const [removing, setRemoving] = useState<MemoryVerse | null>(null);

    const manage = can("bible.manage");
    const guest = role === "guest";

    if (loading && !state) return <p className="text-md text-muted">Fetching your cards…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    if (guest) {
        return (
            <div>
                <PageTitle title="Memory verses" sub="These belong to the family." area="grow" />
                <EmptyState title="Nothing here for a guest" body="Memory verses are personal to each member of the household." />
            </div>
        );
    }

    const learners = manage ? members.filter((m) => m.role !== "guest" && versesOf(state, m.id).length > 0) : [me];
    const wanted = params.get("who");
    const who = learners.find((m) => m.id === wanted) ?? (manage ? null : me);
    const shownIds = who ? [who.id] : learners.map((m) => m.id);
    const due = shownIds.flatMap((mid) => dueVerses(state, mid, today));
    const verses = shownIds.flatMap((mid) => versesOf(state, mid));
    const next = nextVerseDate(state, who?.id ?? me.id);

    const setWho = (id: string | null): void => {
        if (id) params.set("who", id);
        else params.delete("who");
        setParams(params, { replace: true });
    };

    async function review(verse: MemoryVerse, result: ReviewResult): Promise<void> {
        let earned = 0;
        await mutate(async (r) => {
            const res = await r.reviewVerse(verse.id, verse.memberId, result);
            earned = res.points;
        });
        if (earned > 0) {
            await mutateCore((r) => r.addPoints(verse.memberId, earned, `Memory verse: ${verse.reference}`));
            toast(`${earned} Sprouts. ${result === "knew" ? "Well remembered." : "Good try — again tomorrow."}`, "success");
        } else {
            toast(result === "knew" ? `Next card in ${SCHEDULE[Math.min(masteryOf(state, verse.id) + 1, SCHEDULE.length - 1)]} days.` : "It comes back tomorrow.", "success");
        }
    }

    return (
        <div>
            <Link to={BASE} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> Bible
            </Link>

            <PageTitle
                title="Learning by heart"
                sub="A card comes up the day after you add it, then after 3, 7, 14 and 30 days. Cards for today appear from 07:00."
                area="grow"
                actions={
                    <Button onClick={() => { setEditing(undefined); setAddOpen(true); }}>
                        <Plus size={16} aria-hidden="true" /> Add a verse
                    </Button>
                }
            />

            {manage && learners.length > 1 && (
                <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar">
                    <button type="button" aria-pressed={!who} onClick={() => setWho(null)} className={cn("h-9 shrink-0 rounded-full border px-4 text-sm font-semibold", !who ? "border-ink bg-ink text-white" : "border-line-strong text-muted hover:text-ink")}>
                        Everyone
                    </button>
                    {learners.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            aria-pressed={who?.id === m.id}
                            onClick={() => setWho(m.id)}
                            className={cn("inline-flex h-9 shrink-0 items-center gap-2 rounded-full border pl-1 pr-4 text-sm font-semibold", who?.id === m.id ? "border-ink bg-ink text-white" : "border-line-strong text-muted hover:text-ink")}
                        >
                            <MemberAvatar member={m} size="xs" />
                            {m.name.split(" ")[0]}
                            <span className="tabular-nums opacity-70">{dueVerses(state, m.id, today).length || ""}</span>
                        </button>
                    ))}
                </div>
            )}

            <Section title={due.length ? `Due now · ${due.length}` : "Nothing due"}>
                {due.length ? (
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
                        {due.map((card) => (
                            <PracticeCard
                                key={card.verse.id}
                                verse={card.verse}
                                mastery={card.mastery}
                                overdueDays={card.overdueDays}
                                points={members.find((m) => m.id === card.verse.memberId)?.role === "child" ? 5 : 0}
                                onAnswer={(result) => review(card.verse, result)}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        title="Nothing to practise right now"
                        body={next ? `The next card comes up on ${shortDate(next)}.` : "Add a verse and the first card arrives tomorrow."}
                        action={<Button onClick={() => { setEditing(undefined); setAddOpen(true); }}>Add a verse</Button>}
                    />
                )}
            </Section>

            <Section title={who ? `${who.name.split(" ")[0]}'s verses` : "Everyone's verses"}>
                {verses.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {verses.map((v) => (
                            <VerseRow
                                key={v.id}
                                state={state}
                                verse={v}
                                today={today}
                                action={
                                    manage || v.memberId === me.id ? (
                                        <span className="flex gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => { setEditing(v); setAddOpen(true); }}>
                                                Edit
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setRemoving(v)} aria-label={`Remove ${v.reference}`}>
                                                <Trash2 size={14} aria-hidden="true" />
                                            </Button>
                                        </span>
                                    ) : undefined
                                }
                            />
                        ))}
                    </ul>
                ) : (
                    <EmptyState title="No verses yet" body="Start with one everybody already half knows." />
                )}
            </Section>

            <VerseDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                initial={editing}
                onSave={async (input: NewVerse) => {
                    if (editing) {
                        await mutate((r) => r.updateVerse(editing.id, { reference: input.reference, text: input.text, readAloud: input.readAloud }));
                        toast("Saved.", "success");
                    } else {
                        await mutate((r) => r.addVerse(input));
                        toast("Added — the first card comes up tomorrow.", "success");
                    }
                }}
            />
            <Confirm
                open={removing !== null}
                onClose={() => setRemoving(null)}
                title="Remove this verse?"
                body={removing ? `${removing.reference} and its review history go.` : undefined}
                confirmLabel="Remove"
                danger
                onConfirm={async () => {
                    if (removing) await mutate((r) => r.removeVerse(removing.id));
                }}
            />
        </div>
    );
}
