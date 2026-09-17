import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Heart, Lock, Pencil, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { useAi } from "@/lib/ai";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, EmptyModule, MemberAvatar, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Button, Card, EmptyState, Spinner, Tag } from "@/components/ui/primitives";
import bibleModule from "../module";
import { BASE, answeredPrayers, howToPrayThisWeek, openPrayers, prayerStreak, privatePrayers } from "../derive";
import { PrayerCard, StreakPill } from "../components/pieces";
import { AnswerDialog, PrayerDialog } from "../components/PrayerDialog";
import { TAGS, type NewPrayer, type Prayer, type PrayerTag } from "../types";

/**
 * The wall, the archive, the private list and — for a parent — the grants.
 *
 * The four tabs are the four different things "prayer" means in a household:
 * what we are asking together, what we have seen answered, what one person is
 * carrying alone, and who outside the family we have let in. Every one of them
 * is filtered before it reaches the browser, not after.
 */

type Tab = "wall" | "answered" | "mine" | "grants";

export default function PrayerPage() {
    const [params, setParams] = useSearchParams();
    const { state, mutate, loading, error } = useModule(bibleModule);
    const { me, role, can, members, today } = useSpace();
    const { toast } = useToast();
    const { ask, busy: aiBusy } = useAi();
    const [askOpen, setAskOpen] = useState(false);
    const [editing, setEditing] = useState<Prayer | undefined>(undefined);
    const [answering, setAnswering] = useState<Prayer | null>(null);
    const [removing, setRemoving] = useState<Prayer | null>(null);
    const [tag, setTag] = useState<PrayerTag | "all">("all");
    const [summary, setSummary] = useState<string | null>(null);
    const [aiNote, setAiNote] = useState<string | null>(null);
    const [graceDate, setGraceDate] = useState(today);

    const manage = can("bible.manage");
    const guest = role === "guest";
    const requested = (params.get("tab") ?? "wall") as Tab;
    const setTab = (t: Tab): void => {
        params.set("tab", t);
        setParams(params, { replace: true });
    };

    const open = useMemo(() => (state ? openPrayers(state).filter((p) => p.visibility !== "private") : []), [state]);
    const filtered = useMemo(() => (tag === "all" ? open : open.filter((p) => p.tags.includes(tag))), [open, tag]);

    if (loading && !state) return <p className="text-md text-muted">Opening the wall…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    if (guest && !state.wallGuestIds.includes(me.id)) {
        return (
            <div>
                <PageTitle title="Prayer" sub="Guests are given named things, never whole modules." area="grow" />
                <EmptyModule title="The prayer wall hasn't been shared with you" body="Ask the family to share it, and it will appear here. There is no list behind this page waiting to be unlocked — your copy of it simply does not exist yet." />
            </div>
        );
    }

    const answered = answeredPrayers(state);
    const priv = privatePrayers(state, me.id);
    const streak = prayerStreak(state, me.id, today);
    const forGuests = howToPrayThisWeek(state);
    const guests = members.filter((m) => m.role === "guest");

    const togglePrayed = async (p: Prayer, on: boolean): Promise<void> => {
        await mutate((r) => r.togglePrayed(p.id, me.id, on));
    };
    const canEdit = (p: Prayer): boolean => manage || p.authorMemberId === me.id;

    async function weeklySummary(): Promise<void> {
        setAiNote(null);
        setSummary(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: "Summarise our prayer wall for Sunday planning: three or four sentences on what we are carrying this week, what has been answered recently, and one thing worth thanking God for at the table tonight. Use only what is in the grounding, and name the requests you used.",
            });
            if (r.unavailable) setAiNote(r.unavailable);
            else setSummary(r.text);
        } catch {
            setAiNote("The companion couldn't answer just now.");
        }
    }

    const TABS: Array<{ id: Tab; label: string; count: number; show: boolean }> = [
        { id: "wall", label: "The wall", count: open.length, show: true },
        { id: "answered", label: "Answered", count: answered.length, show: true },
        { id: "mine", label: "My private list", count: priv.length, show: !guest },
        { id: "grants", label: "Guests & grace", count: state.wallGuestIds.length, show: manage },
    ];

    /**
     * A deep link may name a tab this member has no business on (?tab=grants
     * as a child, ?tab=mine as a guest). We fall back to the wall and say so,
     * rather than rendering a header above an empty page.
     */
    const openTabs = TABS.filter((t) => t.show);
    const tab: Tab = openTabs.some((t) => t.id === requested) ? requested : "wall";
    const redirected = tab !== requested;

    /**
     * A child's rail offers only the tags a child may ever read, exactly as a
     * guest's does — otherwise it advertises the categories the family keeps
     * from them, and every one of those chips can only reach an empty state.
     */
    const railTags = role === "parent" ? TAGS : TAGS.filter((t) => t.childSafe);

    return (
        <div>
            <Link to={BASE} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> Bible
            </Link>

            <PageTitle
                title="Prayer"
                sub="What we are asking for, what we have seen, and what one of us is carrying quietly."
                area="grow"
                actions={
                    <>
                        <StreakPill days={streak.days} graceUsed={streak.graceUsed} />
                        <Button onClick={() => { setEditing(undefined); setAskOpen(true); }}>
                            <Plus size={16} aria-hidden="true" /> Ask for prayer
                        </Button>
                    </>
                }
            />

            {!guest && (
                <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Stat label="Open" value={open.length} sub="On the wall now" />
                    <Stat label="Answered" value={answered.length} sub="In the archive" tone="ok" />
                    <Stat label="Prayed today" value={state.reactions.filter((r) => r.date === today).length} sub="Across the family" />
                    <Stat label="For guests" value={forGuests.length} sub="Shared this week" tone="grow" />
                </div>
            )}

            <div role="tablist" aria-label="Prayer" className="mb-6 flex gap-2 overflow-x-auto no-scrollbar">
                {openTabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={cn("h-9 shrink-0 rounded-full border px-4 text-sm font-semibold", tab === t.id ? "border-brand bg-brand text-white" : "border-line-strong text-muted hover:text-ink")}
                    >
                        {t.label}
                        <span className="ml-1.5 tabular-nums opacity-70">{t.count}</span>
                    </button>
                ))}
            </div>

            {redirected && (
                <Notice className="mb-6">
                    {requested === "grants" ? "Who has the wall, and the family's grace days, are a parent's to set." : requested === "mine" ? "A private list belongs to someone in the family; a guest doesn't have one here." : "That part of Prayer isn't yours to open."} Here is the wall instead.
                </Notice>
            )}

            {/* ---- The wall --------------------------------------------------- */}
            {tab === "wall" && (
                <>
                    {forGuests.length > 0 && (
                        <Card className="mb-6 bg-grow-soft">
                            <div className="flex flex-wrap items-center gap-2">
                                <Tag tone="grow">How to pray for us this week</Tag>
                                {/* Only a parent holds the grant list (visibleTo blanks it for everyone else), so only a parent is told a number. */}
                                <span className="text-xs text-muted">
                                    {guest
                                        ? "What the family asked guests to carry."
                                        : manage
                                          ? `Shared with ${state.wallGuestIds.length} guest${state.wallGuestIds.length === 1 ? "" : "s"}.`
                                          : "What we've asked the guests in our family to pray with us about."}
                                </span>
                            </div>
                            <ul className="mt-3 flex flex-col gap-1.5">
                                {forGuests.map((p) => (
                                    <li key={p.id} className="text-md leading-6 text-grow-ink">
                                        · {p.title}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
                        {(["all", ...railTags.map((t) => t.id)] as Array<PrayerTag | "all">).map((t) => (
                            <button
                                key={t}
                                type="button"
                                aria-pressed={tag === t}
                                onClick={() => setTag(t)}
                                className={cn("h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold", tag === t ? "border-ink bg-ink text-white" : "border-line-strong text-muted hover:text-ink")}
                            >
                                {t === "all" ? "Everything" : TAGS.find((x) => x.id === t)?.label}
                            </button>
                        ))}
                    </div>

                    {filtered.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                            {filtered.map((p) => (
                                <PrayerCard
                                    key={p.id}
                                    state={state}
                                    prayer={p}
                                    meId={me.id}
                                    onPrayed={(on) => togglePrayed(p, on)}
                                    actions={
                                        canEdit(p) ? (
                                            <span className="flex gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => setAnswering(p)}>
                                                    <CheckCircle2 size={14} aria-hidden="true" /> Answered
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setAskOpen(true); }} aria-label={`Edit ${p.title}`}>
                                                    <Pencil size={14} aria-hidden="true" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setRemoving(p)} aria-label={`Delete ${p.title}`}>
                                                    <Trash2 size={14} aria-hidden="true" />
                                                </Button>
                                            </span>
                                        ) : undefined
                                    }
                                />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState icon={<Heart size={20} aria-hidden="true" />} title={tag === "all" ? "Nothing open on the wall" : "Nothing with that tag"} body="Ask for something — the wall is how this family carries things together." action={<Button onClick={() => { setEditing(undefined); setAskOpen(true); }}>Ask for prayer</Button>} />
                    )}

                    {manage && (
                        <Section className="mt-10" title="For Sunday planning">
                            <Card>
                                <p className="text-md leading-6 text-muted">A summary of the wall, grounded only in what you can see. Private prayers are not in it — not yours, not anyone's.</p>
                                <Button className="mt-3" variant="outline" onClick={weeklySummary} disabled={aiBusy}>
                                    {aiBusy ? <Spinner /> : <Sparkles size={15} aria-hidden="true" />}
                                    Summarise the week
                                </Button>
                                {aiNote && <Notice className="mt-3">{aiNote}</Notice>}
                                {summary && <p className="mt-4 whitespace-pre-line rounded-md bg-brand-soft px-4 py-3.5 text-md leading-6 text-brand-ink">{summary}</p>}
                            </Card>
                        </Section>
                    )}
                </>
            )}

            {/* ---- Answered ---------------------------------------------------- */}
            {tab === "answered" && (
                <>
                    {answered.length ? (
                        <ol className="flex flex-col gap-3">
                            {answered.map((p) => (
                                <PrayerCard
                                    key={p.id}
                                    state={state}
                                    prayer={p}
                                    meId={me.id}
                                    actions={
                                        canEdit(p) ? (
                                            <Button size="sm" variant="ghost" onClick={() => mutate((r) => r.reopenPrayer(p.id))}>
                                                <RotateCcw size={14} aria-hidden="true" /> Still praying
                                            </Button>
                                        ) : undefined
                                    }
                                />
                            ))}
                        </ol>
                    ) : (
                        <EmptyState icon={<CheckCircle2 size={20} aria-hidden="true" />} title="Nothing in the archive yet" body="When a prayer is answered, mark it — the date and the story stay for good." />
                    )}
                </>
            )}

            {/* ---- Private list ------------------------------------------------ */}
            {tab === "mine" && !guest && (
                <>
                    <Notice tone="info" className="mb-4">
                        Your private list is yours alone. It is filtered out before the data leaves storage, so it is not on any wall, in any briefing, or in anything the companion says — to anyone.
                    </Notice>
                    {priv.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                            {priv.map((p) => (
                                <PrayerCard
                                    key={p.id}
                                    state={state}
                                    prayer={p}
                                    meId={me.id}
                                    actions={
                                        <span className="flex gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => setAnswering(p)}>
                                                <CheckCircle2 size={14} aria-hidden="true" /> Answered
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setAskOpen(true); }} aria-label={`Edit ${p.title}`}>
                                                <Pencil size={14} aria-hidden="true" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setRemoving(p)} aria-label={`Delete ${p.title}`}>
                                                <Trash2 size={14} aria-hidden="true" />
                                            </Button>
                                        </span>
                                    }
                                />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState icon={<Lock size={20} aria-hidden="true" />} title="Your list is empty" body="Some things are not for the wall yet. Write them here." action={<Button onClick={() => { setEditing(undefined); setAskOpen(true); }}>Write one</Button>} />
                    )}
                </>
            )}

            {/* ---- Grants and grace -------------------------------------------- */}
            {tab === "grants" && manage && (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
                    <Card>
                        <h2 className="font-display text-xl">Who has the wall</h2>
                        <p className="mt-1 text-sm leading-5 text-muted">A guest is granted the wall as a named object. Without it they cannot read a single request, and they cannot post one either.</p>
                        <ul className="mt-4 flex flex-col gap-2">
                            {guests.map((g) => {
                                const on = state.wallGuestIds.includes(g.id);
                                return (
                                    <li key={g.id} className="flex items-center gap-3 rounded-md bg-page px-3.5 py-3">
                                        <MemberAvatar member={g} size="sm" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-md font-medium">{g.name}</span>
                                            <span className="block text-xs text-caption">{g.relation}</span>
                                        </span>
                                        <Button size="sm" variant={on ? "tonal" : "outline"} onClick={() => mutate((r) => r.setWallGuest(g.id, !on))} aria-pressed={on}>
                                            {on ? "Granted" : "Grant the wall"}
                                        </Button>
                                    </li>
                                );
                            })}
                            {guests.length === 0 && <li className="text-sm text-caption">No guests in this family yet.</li>}
                        </ul>
                    </Card>

                    <Card>
                        <h2 className="font-display text-xl">Grace days</h2>
                        <p className="mt-1 text-sm leading-5 text-muted">Days the family has agreed to rest. A prayer streak steps over them rather than breaking — rituals, not loss aversion.</p>
                        <form
                            className="mt-4 flex flex-wrap items-end gap-2"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                await mutate((r) => r.setGraceDay(graceDate, true));
                                toast("Grace day added.", "success");
                            }}
                        >
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Date</span>
                                <input type="date" value={graceDate} onChange={(e) => setGraceDate(e.target.value)} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                            </label>
                            <Button type="submit" size="md" variant="outline">
                                Add a grace day
                            </Button>
                        </form>
                        <ul className="mt-4 flex flex-wrap gap-2">
                            {state.graceDays.length ? (
                                state.graceDays.map((d) => (
                                    <li key={d}>
                                        <button type="button" onClick={() => mutate((r) => r.setGraceDay(d, false))} className="inline-flex h-8 items-center gap-2 rounded-full border border-line-strong px-3 text-xs font-medium hover:border-ink" aria-label={`Remove grace day ${shortDate(d)}`}>
                                            {shortDate(d)}
                                            <Trash2 size={12} aria-hidden="true" />
                                        </button>
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm text-caption">No grace days set.</li>
                            )}
                        </ul>
                    </Card>
                </div>
            )}

            <PrayerDialog
                open={askOpen}
                onClose={() => setAskOpen(false)}
                initial={editing}
                role={role}
                onSave={async (input: NewPrayer) => {
                    if (editing) {
                        await mutate((r) => r.updatePrayer(editing.id, input));
                        toast("Saved.", "success");
                    } else {
                        await mutate((r) => r.addPrayer(input));
                        toast("On the wall.", "success");
                    }
                }}
            />
            <AnswerDialog
                open={answering !== null}
                prayer={answering}
                onClose={() => setAnswering(null)}
                onSave={async (testimony) => {
                    if (!answering) return;
                    await mutate((r) => r.markAnswered(answering.id, testimony));
                    toast("Answered — and on the family timeline.", "success");
                }}
            />
            <Confirm
                open={removing !== null}
                onClose={() => setRemoving(null)}
                title="Delete this request?"
                body={removing ? `"${removing.title}" and everyone's prayers for it go. This cannot be undone.` : undefined}
                confirmLabel="Delete"
                danger
                onConfirm={async () => {
                    if (removing) await mutate((r) => r.removePrayer(removing.id));
                }}
            />
        </div>
    );
}
