import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Cake, Gift, Heart, HeartHandshake, Mail, MapPin, Phone, Plus, Trash2, UserPlus } from "lucide-react";
import type { Invite } from "@/data/core";
import { relative, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, DateText, EmptyModule, MemberMultiPicker, Money, Section } from "@/components/shared";
import { Button, Card, EmptyState, Field, Inset, Tag } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import mod from "../module";
import { cadenceStatus, occasions, shortName } from "../derive";
import { CADENCE, CONTACT_CHANNEL, MENTOR_AREA, PERSON_KIND, type Cadence, type ContactChannel, type MentorArea } from "../types";
import { AskPanel, Detail, DraftMessageDialog, PersonPhoto } from "../components/pieces";

/**
 * One person.
 *
 * Everything a family actually keeps: how we know them, how to reach them,
 * what to pray for, what to give them, and when we last spoke.
 *
 * A gift idea becomes a request here and is decided here — approve or decline
 * — because People owns the row. `wishRows()` in derive.ts publishes the live
 * ones for a purchase pipeline to show alongside its own; this page never
 * claims a decision belongs somewhere the family would have to go looking.
 * The one thing that leaves the page is an invitation, to a scoped guest seat.
 */

/** What a guest invitation may be scoped to. The family picks from these. */
const SHAREABLE = ["The prayer wall", "The shared calendar", "Christmas in Lagos", "Album: Summer 2026", "Album: Ayo's first day", "Board: Tobi's 10th birthday", "Events they are tagged in", "Their mentor sessions"];

export default function PersonPage() {
    const { id = "" } = useParams();
    const { state, mutate, loading } = useModule(mod);
    const sp = useSpace();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [draft, setDraft] = useState<{ kind: "birthday" | "anniversary"; years?: number } | null>(null);
    const [logging, setLogging] = useState(false);
    const [addingGift, setAddingGift] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [makingMentor, setMakingMentor] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [removeGift, setRemoveGift] = useState<string | null>(null);
    const [declineGift, setDeclineGift] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);

    const person = state?.people.find((p) => p.id === id);
    const history = useMemo(() => (state ? state.contacts.filter((c) => c.personId === id).sort((a, b) => (a.at < b.at ? 1 : -1)) : []), [state, id]);
    const mentor = state?.mentors.find((m) => m.personId === id);
    const soon = useMemo(() => (state ? occasions(state, sp.today, 400).filter((o) => o.personId === id) : []), [state, sp.today, id]);

    if (loading || !state) return <p className="text-md text-muted">Looking them up…</p>;
    if (!person) return <EmptyModule title="We can't find that person" body="They may have been removed from the directory." action={<Link className="text-brand underline" to="/family/people">Back to People</Link>} />;

    const parent = sp.role === "parent";
    const status = cadenceStatus(person, sp.today);
    const requests = state.giftRequests.filter((g) => g.personId === person.id);
    const pendingCents = requests.filter((g) => g.status === "pending").reduce((n, g) => n + g.estCents, 0);

    return (
        <div>
            <Link to="/family/people" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> People
            </Link>

            <header className="mb-8 flex flex-wrap items-start gap-5">
                <PersonPhoto person={person} size="xl" />
                <div className="min-w-0 flex-1">
                    <h1 className="font-display text-7xl leading-9 md:text-8xl">{person.name}</h1>
                    <p className="mt-1 max-w-2xl text-md leading-6 text-muted">{person.relationship || PERSON_KIND[person.kind]}</p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                        <li>
                            <Tag tone="family">{PERSON_KIND[person.kind]}</Tag>
                        </li>
                        {person.tags.map((t) => (
                            <li key={t}>
                                <Tag tone="neutral">{t}</Tag>
                            </li>
                        ))}
                        {mentor && (
                            <li>
                                <Tag tone="grow">{MENTOR_AREA[mentor.area]} mentor</Tag>
                            </li>
                        )}
                        {person.inviteCode && (
                            <li>
                                <Tag tone="ok">Guest · {person.inviteCode}</Tag>
                            </li>
                        )}
                    </ul>
                </div>
                {parent && (
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="md" onClick={() => setLogging(true)}>
                            <Phone size={14} aria-hidden="true" /> Log contact
                        </Button>
                        <Button variant="outline" size="md" onClick={() => setEditing(true)}>
                            Edit
                        </Button>
                    </div>
                )}
            </header>

            {person.redacted && (
                <p className="mb-6 rounded-md bg-brand-soft px-4 py-3 text-sm text-brand-ink">
                    You can see {shortName(person.name)}&apos;s name, face and birthday. Phone numbers, addresses and notes are for the grown-ups.
                </p>
            )}

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div>
                    {soon.length > 0 && (
                        <Section title="Dates we keep">
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                                {soon.map((o) => (
                                    <li key={o.key}>
                                        <Card className="flex h-full flex-col gap-2">
                                            <span className="flex items-center gap-2 text-sm font-semibold">
                                                {o.kind === "birthday" ? <Cake size={14} className="text-brand" aria-hidden="true" /> : <Heart size={14} className="text-brand" aria-hidden="true" />}
                                                {o.kind === "birthday" ? "Birthday" : "Anniversary"}
                                            </span>
                                            <span className="font-display text-3xl">{shortDate(o.date)}</span>
                                            <span className="text-xs text-caption">
                                                {o.inDays === 0 ? "Today" : o.inDays === 1 ? "Tomorrow" : `In ${o.inDays} days`}
                                                {o.years ? ` · ${o.kind === "birthday" ? `turns ${o.years}` : `${o.years} years`}` : ""}
                                            </span>
                                            {parent && (
                                                <Button size="sm" variant="outline" className="mt-auto self-start" onClick={() => setDraft({ kind: o.kind, years: o.years })}>
                                                    Draft a message
                                                </Button>
                                            )}
                                        </Card>
                                    </li>
                                ))}
                            </ul>
                            {parent && <p className="mt-2 text-xs text-caption">Reminders go out seven days and one day before, with a message already written.</p>}
                        </Section>
                    )}

                    {parent && (
                        <Section title="Gift ideas" action={<Button size="sm" variant="outline" onClick={() => setAddingGift(true)}>
                            <Plus size={13} aria-hidden="true" /> Add
                        </Button>}>
                            {person.giftIdeas.length ? (
                                <ul className="rounded-xl bg-card p-1.5">
                                    {person.giftIdeas.map((g) => {
                                        const req = requests.find((r) => r.giftIdeaId === g.id && r.status !== "declined");
                                        return (
                                            <li key={g.id} className="flex flex-wrap items-center gap-3 rounded-md px-3 py-3 hover:bg-page">
                                                <Gift size={16} className="shrink-0 text-caption" aria-hidden="true" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-md font-medium">{g.title}</span>
                                                    <span className="block text-xs text-caption">
                                                        {g.occasion || "Any time"}
                                                        {g.estCents ? " · " : ""}
                                                        {g.estCents ? <Money cents={g.estCents} /> : null}
                                                        {g.note ? ` · ${g.note}` : ""}
                                                    </span>
                                                </span>
                                                {req ? (
                                                    <span className="flex flex-wrap items-center gap-2">
                                                        <Tag tone={req.status === "bought" ? "ok" : req.status === "approved" ? "ok" : "brand"}>{req.status === "pending" ? "Waiting on a decision" : req.status === "approved" ? "Approved" : "Bought"}</Tag>
                                                        {req.status === "pending" && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={async () => {
                                                                        await mutate((r) => r.setGiftRequestStatus(req.id, "approved"));
                                                                        toast(`"${g.title}" approved for ${shortName(person.name)}`, "success");
                                                                    }}
                                                                >
                                                                    Approve
                                                                </Button>
                                                                <Button size="sm" variant="ghost" onClick={() => setDeclineGift(req.id)}>
                                                                    Decline
                                                                </Button>
                                                            </>
                                                        )}
                                                        {req.status === "approved" && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={async () => {
                                                                    await mutate((r) => r.setGiftRequestStatus(req.id, "bought"));
                                                                    toast(`"${g.title}" marked as bought`, "success");
                                                                }}
                                                            >
                                                                Mark as bought
                                                            </Button>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={async () => {
                                                            await mutate((r) => r.pushGiftToWishes(person.id, g.id));
                                                            toast(`"${g.title}" is waiting on a decision for ${shortName(person.name)}`, "success");
                                                        }}
                                                    >
                                                        Ask to buy it
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost" onClick={() => setRemoveGift(g.id)} aria-label={`Remove ${g.title}`}>
                                                    <Trash2 size={13} aria-hidden="true" />
                                                </Button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <EmptyState icon={<Gift size={20} aria-hidden="true" />} title="No gift ideas yet" body="Write them down when you think of them — a year later you won't." action={<Button onClick={() => setAddingGift(true)}>Add an idea</Button>} />
                            )}
                            {requests.length > 0 && (
                                <p className="mt-2 text-xs text-caption">
                                    A gift request is a wish with {person.name} as the recipient. Either parent approves or declines it here, and the estimate — <Money cents={pendingCents} /> waiting — is what the family is being asked to spend.
                                </p>
                            )}
                        </Section>
                    )}

                    {parent && (
                        <Section title="When we last spoke" action={<Button size="sm" variant="outline" onClick={() => setLogging(true)}>Log contact</Button>}>
                            <Card className="mb-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm text-muted">{CADENCE[person.cadence].label}</p>
                                        <p className="font-display text-3xl">{person.lastContactedAt ? relative(person.lastContactedAt) : "Never logged"}</p>
                                    </div>
                                    {status.cadence !== "none" && <Tag tone={status.overdue ? "warn" : "ok"}>{status.overdue ? `${status.overdueBy} days overdue` : `Due ${status.dueOn ? shortDate(status.dueOn) : "—"}`}</Tag>}
                                </div>
                            </Card>
                            {history.length ? (
                                <ul className="rounded-xl bg-card p-1.5">
                                    {history.slice(0, 8).map((c) => (
                                        <li key={c.id} className="flex items-start gap-3 rounded-md px-3 py-2.5">
                                            <span className="mt-0.5 text-2xs font-semibold uppercase tracking-[0.06em] text-caption">{CONTACT_CHANNEL[c.channel]}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm leading-5">{c.note || "No note"}</span>
                                                <span className="block text-2xs text-caption">
                                                    <DateText iso={c.at} /> · {sp.members.find((m) => m.id === c.byMemberId)?.name.split(" ")[0] ?? "someone"}
                                                </span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState title="Nothing logged yet" body="Log a call and the stay-in-touch clock starts here." />
                            )}
                        </Section>
                    )}
                </div>

                <aside>
                    {parent && (person.phone || person.email || person.address) && (
                        <Card className="mb-4">
                            <h2 className="mb-1 text-base font-semibold">How to reach them</h2>
                            {person.phone && (
                                <Detail label="Phone" icon={<Phone size={14} />}>
                                    <a className="hover:underline" href={`tel:${person.phone.replace(/\s/g, "")}`}>
                                        {person.phone}
                                    </a>
                                </Detail>
                            )}
                            {person.email && (
                                <Detail label="Email" icon={<Mail size={14} />}>
                                    <a className="hover:underline" href={`mailto:${person.email}`}>
                                        {person.email}
                                    </a>
                                </Detail>
                            )}
                            {person.address && (
                                <Detail label="Address" icon={<MapPin size={14} />}>
                                    {person.address}
                                </Detail>
                            )}
                        </Card>
                    )}

                    {parent && person.notes && (
                        <Card className="mb-4">
                            <h2 className="mb-2 text-base font-semibold">Notes</h2>
                            <p className="whitespace-pre-wrap text-md leading-6 text-muted">{person.notes}</p>
                        </Card>
                    )}

                    {parent && person.prayerNeeds && (
                        <Card className="mb-4 bg-grow-soft">
                            <h2 className="mb-2 text-base font-semibold">How we pray for them</h2>
                            <p className="whitespace-pre-wrap text-md leading-6 text-grow-ink">{person.prayerNeeds}</p>
                        </Card>
                    )}

                    {parent && (
                        <Card className="mb-4">
                            <h2 className="text-base font-semibold">Bring them closer</h2>
                            {person.inviteCode ? (
                                <Inset className="mt-3">
                                    <p className="text-sm font-semibold">Invited as a guest</p>
                                    <p className="mt-0.5 text-xs text-caption">Code {person.inviteCode}</p>
                                    <ul className="mt-2 flex flex-wrap gap-1.5">
                                        {person.sharedObjects.map((o) => (
                                            <li key={o}>
                                                <Tag tone="family">{o}</Tag>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-2 text-2xs text-caption">A guest sees these named things and nothing else — never a module.</p>
                                </Inset>
                            ) : (
                                <>
                                    <p className="mt-1 text-sm text-muted">Give them a seat scoped to named things — a trip, a board, the prayer wall.</p>
                                    <Button className="mt-3" size="md" variant="outline" onClick={() => setInviting(true)}>
                                        <UserPlus size={14} aria-hidden="true" /> Invite as a guest
                                    </Button>
                                </>
                            )}
                            {mentor ? (
                                <Link to={`/family/people/mentors/${mentor.id}`} className="mt-3 flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
                                    <HeartHandshake size={14} aria-hidden="true" /> Open their mentor sessions
                                </Link>
                            ) : (
                                <Button className="mt-3" size="md" variant="ghost" onClick={() => setMakingMentor(true)}>
                                    <HeartHandshake size={14} aria-hidden="true" /> Make them a mentor
                                </Button>
                            )}
                        </Card>
                    )}

                    {parent && (
                        <Button variant="danger" size="md" onClick={() => setRemoving(true)}>
                            <Trash2 size={14} aria-hidden="true" /> Remove from the directory
                        </Button>
                    )}
                </aside>
            </div>

            {parent && (
                <div className="mt-8">
                    <AskPanel
                        title={`Ask about ${shortName(person.name)}`}
                        prompts={[`What should we say to ${shortName(person.name)} this week?`, `What have we been praying for ${shortName(person.name)}?`]}
                        extraContext={`${person.name} — ${person.relationship}. Notes: ${person.notes}. Prayer: ${person.prayerNeeds}. Last contact: ${person.lastContactedAt ? relative(person.lastContactedAt) : "never logged"}.`}
                    />
                </div>
            )}

            {draft && <DraftMessageDialog open person={person} occasion={draft} onClose={() => setDraft(null)} />}

            <LogContactDialog
                open={logging}
                name={person.name}
                onClose={() => setLogging(false)}
                onSave={async (channel, note) => {
                    await mutate((r) => r.logContact(person.id, { channel, note }));
                    toast(`Logged with ${shortName(person.name)}`, "success");
                }}
            />

            <AddGiftDialog
                open={addingGift}
                onClose={() => setAddingGift(false)}
                onSave={async (title, occasion, cents, note) => {
                    await mutate((r) => r.addGiftIdea(person.id, { title, occasion, estCents: cents, note }));
                    toast("Gift idea saved", "success");
                }}
            />

            <EditPersonDialog
                open={editing}
                person={{ birthday: person.birthday ?? "", anniversary: person.anniversary ?? "", phone: person.phone, email: person.email, address: person.address, notes: person.notes, prayerNeeds: person.prayerNeeds, cadence: person.cadence, relationship: person.relationship }}
                onClose={() => setEditing(false)}
                onSave={async (patch) => {
                    await mutate((r) => r.updatePerson(person.id, { ...patch, birthday: patch.birthday || null, anniversary: patch.anniversary || null }));
                    toast("Saved", "success");
                }}
            />

            <InviteGuestDialog
                open={inviting}
                name={person.name}
                email={person.email}
                relationship={person.relationship}
                onClose={() => setInviting(false)}
                onSave={async (email, objects) => {
                    const holder: { invite: Invite | null } = { invite: null };
                    await sp.mutateCore(async (core) => {
                        holder.invite = await core.invite({ email, name: person.name, role: "guest", relation: person.relationship || "Guest" });
                    });
                    const code = holder.invite?.code ?? "";
                    await mutate((r) => r.linkGuestInvite(person.id, { code, objects }));
                    toast(`Invitation created · ${code}`, "success");
                }}
            />

            <MakeMentorDialog
                open={makingMentor}
                name={person.name}
                linkedMemberId={person.linkedMemberId}
                onClose={() => setMakingMentor(false)}
                onSave={async (area, title, mentees) => {
                    await mutate((r) => r.addMentor({ personId: person.id, area, title, menteeMemberIds: mentees, memberId: person.linkedMemberId }));
                    toast(`${person.name} is now a mentor`, "success");
                }}
            />

            <Confirm
                open={Boolean(declineGift)}
                title="Decline this gift?"
                body="The idea stays on their record — it just stops waiting on a decision. You can ask again later."
                confirmLabel="Decline it"
                onClose={() => setDeclineGift(null)}
                onConfirm={async () => {
                    if (declineGift) {
                        await mutate((r) => r.setGiftRequestStatus(declineGift, "declined"));
                        toast("Gift declined — the idea is still there", "default");
                    }
                }}
            />

            <Confirm
                open={Boolean(removeGift)}
                title="Remove this gift idea?"
                body="It disappears from the list, and from the gift pipeline if it was waiting on a decision."
                confirmLabel="Remove"
                danger
                onClose={() => setRemoveGift(null)}
                onConfirm={async () => {
                    if (removeGift) await mutate((r) => r.removeGiftIdea(person.id, removeGift));
                }}
            />

            <Confirm
                open={removing}
                title={`Remove ${person.name}?`}
                body="Their contact history, gift ideas and any mentor sessions go with them. This can't be undone."
                confirmLabel="Remove them"
                danger
                onClose={() => setRemoving(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removePerson(person.id));
                    toast(`${person.name} removed`, "default");
                    navigate("/family/people");
                }}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------

function LogContactDialog({ open, name, onClose, onSave }: { open: boolean; name: string; onClose: () => void; onSave: (channel: ContactChannel, note: string) => Promise<void> }) {
    const [channel, setChannel] = useState<ContactChannel>("call");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    return (
        <Dialog open={open} onClose={onClose} title={`Log contact with ${name}`}>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    try {
                        await onSave(channel, note);
                        setNote("");
                        onClose();
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">How</span>
                    <select value={channel} onChange={(e) => setChannel(e.target.value as ContactChannel)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        {(Object.keys(CONTACT_CHANNEL) as ContactChannel[]).map((c) => (
                            <option key={c} value={c}>
                                {CONTACT_CHANNEL[c]}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="mt-3 flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">What was said</span>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="rounded-md border border-line-strong bg-card p-3 text-md outline-none focus:border-brand" placeholder="She sounded tired. The shop lease is up in November." />
                </label>
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Log it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function AddGiftDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (title: string, occasion: string, cents: number, note: string) => Promise<void> }) {
    const [title, setTitle] = useState("");
    const [occasion, setOccasion] = useState("Birthday");
    const [pounds, setPounds] = useState("");
    const [note, setNote] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    return (
        <Dialog open={open} onClose={onClose} title="Add a gift idea">
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!title.trim()) {
                        setErr("Give it a name");
                        return;
                    }
                    setBusy(true);
                    try {
                        await onSave(title.trim(), occasion.trim(), Math.round((Number(pounds) || 0) * 100), note.trim());
                        setTitle("");
                        setPounds("");
                        setNote("");
                        setErr(null);
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "Couldn't save");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <div className="grid gap-3">
                    <Field label="The gift" value={title} onChange={(e) => setTitle(e.target.value)} error={err} placeholder="Wax print head-tie set" />
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                        <Field label="Occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} />
                        <Field label="Roughly (£)" type="number" min={0} step="1" value={pounds} onChange={(e) => setPounds(e.target.value)} />
                    </div>
                    <Field label="Where or why" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ìyá Sade's stall on Rye Lane" />
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Save the idea
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

interface EditDraft {
    relationship: string;
    birthday: string;
    anniversary: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    prayerNeeds: string;
    cadence: Cadence;
}

function EditPersonDialog({ open, person, onClose, onSave }: { open: boolean; person: EditDraft; onClose: () => void; onSave: (patch: EditDraft) => Promise<void> }) {
    const [form, setForm] = useState<EditDraft>(person);
    const [busy, setBusy] = useState(false);
    const set = <K extends keyof EditDraft>(k: K, v: EditDraft[K]) => setForm((f) => ({ ...f, [k]: v }));
    return (
        <Dialog open={open} onClose={onClose} title="Edit their details" wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    try {
                        await onSave(form);
                        onClose();
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                    <Field label="How we know them" value={form.relationship} onChange={(e) => set("relationship", e.target.value)} className="md:col-span-2" />
                    <Field label="Birthday" type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} />
                    <Field label="Anniversary" type="date" value={form.anniversary} onChange={(e) => set("anniversary", e.target.value)} />
                    <Field label="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                    <Field label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                    <Field label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} className="md:col-span-2" />
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
                    <label className="flex flex-col gap-1.5 md:col-span-2">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Notes</span>
                        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="rounded-md border border-line-strong bg-card p-3 text-md outline-none focus:border-brand" />
                    </label>
                    <label className="flex flex-col gap-1.5 md:col-span-2">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">How we pray for them</span>
                        <textarea value={form.prayerNeeds} onChange={(e) => set("prayerNeeds", e.target.value)} rows={2} className="rounded-md border border-line-strong bg-card p-3 text-md outline-none focus:border-brand" />
                    </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Save
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function InviteGuestDialog({ open, name, email, relationship, onClose, onSave }: { open: boolean; name: string; email: string; relationship: string; onClose: () => void; onSave: (email: string, objects: string[]) => Promise<void> }) {
    const [addr, setAddr] = useState(email);
    const [objects, setObjects] = useState<string[]>([]);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const toggle = (o: string) => setObjects((v) => (v.includes(o) ? v.filter((x) => x !== o) : [...v, o]));
    return (
        <Dialog open={open} onClose={onClose} title={`Invite ${name} as a guest`} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!addr.trim()) {
                        setErr("An invitation needs an email address");
                        return;
                    }
                    if (!objects.length) {
                        setErr("Choose at least one thing to share — a guest is granted objects, never modules");
                        return;
                    }
                    setBusy(true);
                    try {
                        await onSave(addr.trim(), objects);
                        setErr(null);
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "Couldn't create the invitation");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <p className="text-sm leading-6 text-muted">
                    {name} joins as a guest ({relationship || "guest"}). Their whole dashboard is the list you tick below — nothing else is rendered, and nothing else is fetchable.
                </p>
                <Field label="Email" type="email" value={addr} onChange={(e) => setAddr(e.target.value)} error={err} className="mt-3" />
                <fieldset className="mt-4">
                    <legend className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">What they may see</legend>
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                        {SHAREABLE.map((o) => (
                            <label key={o} className="flex items-center gap-2.5 rounded-sm border border-line-strong px-3 py-2.5 text-sm">
                                <input type="checkbox" checked={objects.includes(o)} onChange={() => toggle(o)} className="size-4 accent-[var(--color-brand)]" />
                                {o}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Create the invitation
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function MakeMentorDialog({ open, name, linkedMemberId, onClose, onSave }: { open: boolean; name: string; linkedMemberId: string | null; onClose: () => void; onSave: (area: MentorArea, title: string, mentees: string[]) => Promise<void> }) {
    const [area, setArea] = useState<MentorArea>("faith");
    const [title, setTitle] = useState("");
    const [mentees, setMentees] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    return (
        <Dialog open={open} onClose={onClose} title={`${name} as a mentor`} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!mentees.length) {
                        setErr("Choose who they mentor");
                        return;
                    }
                    setBusy(true);
                    try {
                        await onSave(area, title.trim(), mentees);
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
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Area of life</span>
                        <select value={area} onChange={(e) => setArea(e.target.value as MentorArea)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {(Object.keys(MENTOR_AREA) as MentorArea[]).map((a) => (
                                <option key={a} value={a}>
                                    {MENTOR_AREA[a]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Field label="What we call them" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pastor · Piano teacher · Coach" error={err} />
                </div>
                <MemberMultiPicker value={mentees} onChange={setMentees} label="Who they mentor" className="mt-4" />
                {linkedMemberId && <p className="mt-3 text-xs text-caption">They already have a guest seat, so they will see their own sessions — and only the notes you explicitly share.</p>}
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Make them a mentor
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
