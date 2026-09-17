import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Cake, Gift, HeartHandshake, PhoneCall, Plus, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { relative, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { EmptyModule, MemberMultiPicker, Money, PageTitle, Section } from "@/components/shared";
import { Button, Card, EmptyState, Field, SearchBox, Tag } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import mod from "../module";
import { givingLines, inTouchPct, mentorPerson, nextSession, occasions, overdueContacts, shortName, type Occasion } from "../derive";
import { CADENCE, COMMUNITY_TYPE, PERSON_KIND, type Cadence, type CommunityType, type Person, type PersonKind } from "../types";
import { AskPanel, CommunityCard, DraftMessageDialog, InTouchBar, MentorCard, OccasionRail, PersonCard, PersonPhoto } from "../components/pieces";

/**
 * People — the index.
 *
 * A parent gets the whole relational world: what is coming up, who has gone
 * quiet, the directory, the communities and the mentors. A child gets the
 * three things they are allowed: faces, birthdays and the places we go. A
 * guest gets their own record and whatever the family shared with them.
 */

type Tab = "directory" | "communities" | "mentors";

const KINDS: PersonKind[] = ["relative", "friend", "neighbour", "other"];

export default function PeoplePage() {
    const { state, mutate, loading, error } = useModule(mod);
    const sp = useSpace();
    const { toast } = useToast();
    const [tab, setTab] = useState<Tab>("directory");
    const [q, setQ] = useState("");
    const [kind, setKind] = useState<PersonKind | "all">("all");
    const [adding, setAdding] = useState(false);
    const [addingCommunity, setAddingCommunity] = useState(false);
    const [draft, setDraft] = useState<{ person: Person; occasion: Occasion } | null>(null);

    const today = sp.today;
    const soon = useMemo(() => (state ? occasions(state, today, 45) : []), [state, today]);
    const overdue = useMemo(() => (state ? overdueContacts(state, today) : []), [state, today]);
    const touch = useMemo(() => (state ? inTouchPct(state, today) : { pct: 0, kept: 0, total: 0 }), [state, today]);
    const giving = useMemo(() => (state ? givingLines(state, today) : []), [state, today]);

    const people = useMemo(() => {
        if (!state) return [];
        const needle = q.trim().toLowerCase();
        return state.people
            .filter((p) => (kind === "all" ? true : p.kind === kind))
            .filter((p) => (!needle ? true : [p.name, p.relationship, p.notes, ...p.tags].join(" ").toLowerCase().includes(needle)))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [state, q, kind]);

    if (loading || !state) return <p className="text-md text-muted">Gathering everybody…</p>;
    if (error) return <EmptyModule title="People couldn't load" body={error} />;

    const parent = sp.role === "parent";
    const child = sp.role === "child";
    const occasionFor = (id: string): Occasion | undefined => soon.find((o) => o.personId === id && o.inDays <= 30);

    // -----------------------------------------------------------------------
    // Child
    // -----------------------------------------------------------------------
    if (child) {
        const myMentors = state.mentors;
        return (
            <div>
                <PageTitle title="Our people" sub="The family and friends we love, and the places we go." area="family" />
                {soon.length > 0 && (
                    <Section title="Birthdays coming up">
                        <OccasionRail occasions={soon.slice(0, 6)} />
                    </Section>
                )}
                <Section title="Our family and friends">
                    {state.people.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {state.people.map((p) => (
                                <PersonCard key={p.id} person={p} today={today} occasion={occasionFor(p.id)} />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState icon={<Users size={20} aria-hidden="true" />} title="Nobody here yet" body="A parent adds the people we love." />
                    )}
                </Section>
                {state.communities.length > 0 && (
                    <Section title="Where we go">
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {state.communities.map((c) => (
                                <CommunityCard key={c.id} community={c} />
                            ))}
                        </ul>
                    </Section>
                )}
                {myMentors.length > 0 && (
                    <Section title="People who teach me">
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                            {myMentors.map((m) => (
                                <MentorCard key={m.id} mentor={m} person={mentorPerson(state, m)} next={nextSession(state, m, today)?.date ?? null} />
                            ))}
                        </ul>
                    </Section>
                )}
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Guest
    // -----------------------------------------------------------------------
    if (!parent) {
        const me = state.people.find((p) => p.linkedMemberId === sp.me.id);
        return (
            <div>
                <PageTitle title="You and the Adeyemis" sub="What the family keeps about you, and what they have shared with you." area="family" />
                {me ? (
                    <Section title="Your record">
                        <Card>
                            <div className="flex items-start gap-4">
                                <PersonPhoto person={me} size="lg" />
                                <div className="min-w-0">
                                    <h3 className="text-[17px] font-semibold">{me.name}</h3>
                                    <p className="text-sm text-muted">{me.relationship}</p>
                                    {me.sharedObjects.length > 0 && (
                                        <ul className="mt-3 flex flex-wrap gap-1.5">
                                            {me.sharedObjects.map((o) => (
                                                <li key={o}>
                                                    <Tag tone="family">{o}</Tag>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </Section>
                ) : (
                    <EmptyState icon={<Users size={20} aria-hidden="true" />} title="Nothing shared with you yet" body="When the family shares a trip, a board or the prayer wall, it appears here." />
                )}
                {state.communities.length > 0 && (
                    <Section title="Communities they shared with you">
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {state.communities.map((c) => (
                                <CommunityCard key={c.id} community={c} />
                            ))}
                        </ul>
                    </Section>
                )}
                {state.mentors.length > 0 && (
                    <Section title="Your sessions">
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                            {state.mentors.map((m) => (
                                <MentorCard key={m.id} mentor={m} person={mentorPerson(state, m)} next={nextSession(state, m, today)?.date ?? null} />
                            ))}
                        </ul>
                    </Section>
                )}
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Parent
    // -----------------------------------------------------------------------
    const pendingGifts = state.giftRequests.filter((g) => g.status === "pending");
    const givingDue = giving.filter((l) => l.outstandingCents > 0);

    return (
        <div>
            <PageTitle
                title="People"
                sub="Relatives and friends, the communities we belong to, and the people who guide us."
                area="family"
                actions={
                    <>
                        <Button variant="outline" size="md" onClick={() => setAddingCommunity(true)}>
                            <Users size={15} aria-hidden="true" /> Add a community
                        </Button>
                        <Button size="md" onClick={() => setAdding(true)}>
                            <Plus size={15} aria-hidden="true" /> Add a person
                        </Button>
                    </>
                }
            />

            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
                <InTouchBar {...touch} />
                <Card>
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Cake size={16} className="text-brand" aria-hidden="true" /> Coming up
                    </div>
                    <p className="mt-1 text-sm text-muted">{soon.filter((o) => o.inDays <= 30).length} birthdays and anniversaries in the next month.</p>
                    {soon[0] && (
                        <p className="mt-2 text-sm">
                            Next: <strong>{soon[0].personName}</strong> · {soon[0].inDays === 0 ? "today" : soon[0].inDays === 1 ? "tomorrow" : shortDate(soon[0].date)}
                        </p>
                    )}
                </Card>
                <Card>
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Gift size={16} className="text-brand" aria-hidden="true" /> Gifts in the pipeline
                    </div>
                    <p className="mt-1 text-sm text-muted">
                        {pendingGifts.length ? `${pendingGifts.length} waiting on a decision` : "Nothing waiting"}
                        {givingDue.length ? ` · ${givingDue.length} giving commitment${givingDue.length > 1 ? "s" : ""} unrecorded` : ""}
                    </p>
                    {pendingGifts[0] && (
                        <p className="mt-2 text-sm">
                            {pendingGifts[0].title} for {pendingGifts[0].forPersonName} · <Money cents={pendingGifts[0].estCents} />
                        </p>
                    )}
                </Card>
            </div>

            {soon.filter((o) => o.inDays <= 30).length > 0 && (
                <Section title="Birthdays and anniversaries" action={<span className="text-xs text-caption">Reminders go out 7 days and 1 day before</span>}>
                    <OccasionRail
                        occasions={soon.filter((o) => o.inDays <= 30).slice(0, 6)}
                        onDraft={(o) => {
                            const person = state.people.find((p) => p.id === o.personId);
                            if (person) setDraft({ person, occasion: o });
                        }}
                    />
                </Section>
            )}

            {overdue.length > 0 && (
                <Section title="You meant to call" action={<span className="text-xs text-caption">Raised weekly while it stays overdue</span>}>
                    <ul className="rounded-xl bg-card p-1.5">
                        {overdue.map(({ person, status }) => (
                            <li key={person.id} className="flex flex-wrap items-center gap-3 rounded-md px-3 py-2.5 hover:bg-page">
                                <PersonPhoto person={person} size="sm" />
                                <Link to={`/family/people/relatives/${person.id}`} className="min-w-0 flex-1 hover:underline">
                                    <span className="block truncate text-md font-medium">{person.name}</span>
                                    <span className="block text-xs text-caption">
                                        {CADENCE[status.cadence].label} · {status.daysSince === null ? "nothing logged yet" : `last spoke ${relative(status.lastContactedAt ?? today)}`}
                                    </span>
                                </Link>
                                <Tag tone="warn">{status.overdueBy}d overdue</Tag>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                        await mutate((r) => r.logContact(person.id, { channel: "call", note: "Called after the reminder" }));
                                        toast(`Logged a call with ${shortName(person.name)}`, "success");
                                    }}
                                >
                                    <PhoneCall size={13} aria-hidden="true" /> Log a call
                                </Button>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="People sections">
                {(["directory", "communities", "mentors"] as Tab[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        role="tab"
                        aria-selected={tab === t}
                        onClick={() => setTab(t)}
                        className={cn("h-9 rounded-full px-4 text-sm font-semibold capitalize transition-colors", tab === t ? "bg-brand text-white" : "bg-card text-muted hover:text-ink")}
                    >
                        {t === "directory" ? `Directory · ${state.people.length}` : t === "communities" ? `Communities · ${state.communities.length}` : `Mentors · ${state.mentors.length}`}
                    </button>
                ))}
            </div>

            {tab === "directory" && (
                <section>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <SearchBox value={q} onChange={setQ} placeholder="Search names, notes and tags…" className="min-w-0 flex-1 md:max-w-sm" />
                        <div className="flex flex-wrap gap-1.5">
                            <button type="button" onClick={() => setKind("all")} className={cn("h-9 rounded-full px-3 text-xs font-semibold", kind === "all" ? "bg-ink text-white" : "bg-card text-muted hover:text-ink")}>
                                Everyone
                            </button>
                            {KINDS.map((k) => (
                                <button key={k} type="button" onClick={() => setKind(k)} className={cn("h-9 rounded-full px-3 text-xs font-semibold", kind === k ? "bg-ink text-white" : "bg-card text-muted hover:text-ink")}>
                                    {PERSON_KIND[k]}
                                </button>
                            ))}
                        </div>
                    </div>
                    {people.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {people.map((p) => (
                                <PersonCard key={p.id} person={p} today={today} occasion={occasionFor(p.id)} />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState
                            icon={<Users size={20} aria-hidden="true" />}
                            title={q || kind !== "all" ? "Nobody matches that" : "Your directory is empty"}
                            body={q || kind !== "all" ? "Try a different search, or clear the filter." : "Add the people you want to remember to call — birthdays, prayer needs, gift ideas and all."}
                            action={<Button onClick={() => setAdding(true)}>Add the first person</Button>}
                        />
                    )}
                </section>
            )}

            {tab === "communities" && (
                <section>
                    {state.communities.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {state.communities.map((c) => (
                                <CommunityCard key={c.id} community={c} />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState icon={<Users size={20} aria-hidden="true" />} title="No communities yet" body="Church, the co-op, a club — the bodies your family belongs to." action={<Button onClick={() => setAddingCommunity(true)}>Add a community</Button>} />
                    )}
                </section>
            )}

            {tab === "mentors" && (
                <section>
                    {state.mentors.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                            {state.mentors.map((m) => (
                                <MentorCard key={m.id} mentor={m} person={mentorPerson(state, m)} next={nextSession(state, m, today)?.date ?? null} />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState icon={<HeartHandshake size={20} aria-hidden="true" />} title="No mentors yet" body="Open somebody in the directory and make them a mentor — a pastor, a coach, a teacher." />
                    )}
                </section>
            )}

            <div className="mt-8">
                <AskPanel
                    title="Ask about your people"
                    prompts={["Who haven't we called this month?", "Who should we pray for this week?", "What should we give the Okonkwos for their anniversary?"]}
                    extraContext={`Overdue contacts: ${overdue.map((o) => `${o.person.name} (${o.status.daysSince ?? "never"} days)`).join("; ") || "none"}.`}
                />
            </div>

            <AddPersonDialog open={adding} onClose={() => setAdding(false)} onSave={async (input) => mutate((r) => r.addPerson(input))} />
            <AddCommunityDialog open={addingCommunity} onClose={() => setAddingCommunity(false)} onSave={async (input) => mutate((r) => r.addCommunity(input))} />
            {draft && <DraftMessageDialog open person={draft.person} occasion={{ kind: draft.occasion.kind, years: draft.occasion.years }} onClose={() => setDraft(null)} />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

interface PersonDraft {
    name: string;
    relationship: string;
    kind: PersonKind;
    birthday: string;
    anniversary: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    prayerNeeds: string;
    cadence: Cadence;
}

const EMPTY_PERSON: PersonDraft = { name: "", relationship: "", kind: "relative", birthday: "", anniversary: "", phone: "", email: "", address: "", notes: "", prayerNeeds: "", cadence: "none" };

function AddPersonDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (input: PersonDraft) => Promise<void> }) {
    const { toast } = useToast();
    const [form, setForm] = useState<PersonDraft>(EMPTY_PERSON);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const set = <K extends keyof PersonDraft>(k: K, v: PersonDraft[K]) => setForm((f) => ({ ...f, [k]: v }));

    return (
        <Dialog open={open} onClose={onClose} title="Add someone" wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!form.name.trim()) {
                        setErr("They need a name");
                        return;
                    }
                    setBusy(true);
                    try {
                        await onSave(form);
                        toast(`${form.name.trim()} added`, "success");
                        setForm(EMPTY_PERSON);
                        setErr(null);
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "Couldn't save");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                    <Field label="Name" value={form.name} onChange={(e) => set("name", e.target.value)} error={err} placeholder="Aunty Bisi Ọlátúndé" className="md:col-span-2" />
                    <Field label="How we know them" value={form.relationship} onChange={(e) => set("relationship", e.target.value)} placeholder="Ifeoluwa's older sister · Lagos" className="md:col-span-2" />
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Kind</span>
                        <select value={form.kind} onChange={(e) => set("kind", e.target.value as PersonKind)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {KINDS.map((k) => (
                                <option key={k} value={k}>
                                    {PERSON_KIND[k]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Stay in touch</span>
                        <select value={form.cadence} onChange={(e) => set("cadence", e.target.value as Cadence)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {(Object.keys(CADENCE) as Cadence[]).map((c) => (
                                <option key={c} value={c}>
                                    {CADENCE[c].label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Field label="Birthday" type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} hint="Reminders come 7 days and 1 day before." />
                    <Field label="Anniversary" type="date" value={form.anniversary} onChange={(e) => set("anniversary", e.target.value)} />
                    <Field label="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                    <Field label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                    <Field label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} className="md:col-span-2" />
                    <label className="flex flex-col gap-1.5 md:col-span-2">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Notes</span>
                        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="rounded-md border border-line-strong bg-card p-3 text-md outline-none focus:border-brand" />
                    </label>
                    <label className="flex flex-col gap-1.5 md:col-span-2">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">How we pray for them</span>
                        <textarea value={form.prayerNeeds} onChange={(e) => set("prayerNeeds", e.target.value)} rows={2} className="rounded-md border border-line-strong bg-card p-3 text-md outline-none focus:border-brand" />
                    </label>
                </div>
                <p className="mt-3 text-xs text-caption">Children only ever see a name, a face and a birthday — never the details on this form.</p>
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Add them
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

interface CommunityDraft {
    name: string;
    type: CommunityType;
    meetingRhythm: string;
    meetsWhere: string;
    link: string;
    givingCommitmentCents: number;
    givingFrequency: "monthly" | "none";
    memberIds: string[];
    sharedWithGuests: boolean;
    notes: string;
}

const EMPTY_COMMUNITY: CommunityDraft = { name: "", type: "church", meetingRhythm: "", meetsWhere: "", link: "", givingCommitmentCents: 0, givingFrequency: "none", memberIds: [], sharedWithGuests: false, notes: "" };

function AddCommunityDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (input: CommunityDraft) => Promise<void> }) {
    const { toast } = useToast();
    const [form, setForm] = useState<CommunityDraft>(EMPTY_COMMUNITY);
    const [pounds, setPounds] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const set = <K extends keyof CommunityDraft>(k: K, v: CommunityDraft[K]) => setForm((f) => ({ ...f, [k]: v }));

    return (
        <Dialog open={open} onClose={onClose} title="Add a community" wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!form.name.trim()) {
                        setErr("It needs a name");
                        return;
                    }
                    const cents = Math.round((Number(pounds) || 0) * 100);
                    setBusy(true);
                    try {
                        await onSave({ ...form, givingCommitmentCents: cents, givingFrequency: cents > 0 ? "monthly" : "none" });
                        toast(`${form.name.trim()} added`, "success");
                        setForm(EMPTY_COMMUNITY);
                        setPounds("");
                        setErr(null);
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "Couldn't save");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                    <Field label="Name" value={form.name} onChange={(e) => set("name", e.target.value)} error={err} placeholder="Grace Chapel, Thornton Heath" className="md:col-span-2" />
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Kind</span>
                        <select value={form.type} onChange={(e) => set("type", e.target.value as CommunityType)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {(Object.keys(COMMUNITY_TYPE) as CommunityType[]).map((t) => (
                                <option key={t} value={t}>
                                    {COMMUNITY_TYPE[t]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Field label="Giving each month (£)" type="number" min={0} step="1" value={pounds} onChange={(e) => setPounds(e.target.value)} hint="It becomes giving only when you record it as paid." />
                    <Field label="When it meets" value={form.meetingRhythm} onChange={(e) => set("meetingRhythm", e.target.value)} placeholder="Sundays 10:00" />
                    <Field label="Where" value={form.meetsWhere} onChange={(e) => set("meetsWhere", e.target.value)} />
                    <Field label="Website" value={form.link} onChange={(e) => set("link", e.target.value)} className="md:col-span-2" />
                    <MemberMultiPicker value={form.memberIds} onChange={(ids) => set("memberIds", ids)} label="Who goes" className="md:col-span-2" />
                    <label className="flex items-center gap-2.5 md:col-span-2">
                        <input type="checkbox" checked={form.sharedWithGuests} onChange={(e) => set("sharedWithGuests", e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                        <span className="text-md">Guests may see this community</span>
                    </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Add it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
