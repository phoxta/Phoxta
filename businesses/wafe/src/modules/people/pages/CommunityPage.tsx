import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, ExternalLink, HandCoins, Mail, MapPin, Phone, Trash2 } from "lucide-react";
import { shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, DateText, EmptyModule, MemberAvatar, Money, Section, Stat } from "@/components/shared";
import { Button, Card, EmptyState, Field, Inset, Tag } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import mod from "../module";
import { givingLines, givingTotal } from "../derive";
import { COMMUNITY_TYPE } from "../types";

/**
 * One community.
 *
 * The rhythm, the roles we hold, who to ring — and the money. A commitment on
 * this page is only a promise; it counts as given once it is marked paid,
 * which is what the "Record it as given" button does. `givingRows()` in
 * derive.ts publishes those payments for a giving ledger to fold in.
 *
 * A child sees the communities they attend and a guest the ones marked
 * shared, both without the contact book, the notes or the money — the filter
 * does that in derive.ts, so this page simply renders what it was handed.
 */

export default function CommunityPage() {
    const { id = "" } = useParams();
    const { state, mutate, loading } = useModule(mod);
    const sp = useSpace();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [paying, setPaying] = useState(false);
    const [removing, setRemoving] = useState(false);

    const community = state?.communities.find((c) => c.id === id);
    const line = useMemo(() => (state ? givingLines(state, sp.today).find((l) => l.community.id === id) : undefined), [state, sp.today, id]);
    const payments = useMemo(() => (state ? state.giving.filter((g) => g.communityId === id).sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1)) : []), [state, id]);

    if (loading || !state) return <p className="text-md text-muted">Opening…</p>;
    if (!community)
        return (
            <EmptyModule
                title="We can't find that community"
                body="It may have been removed."
                action={
                    <Link className="text-brand underline" to="/family/people">
                        Back to People
                    </Link>
                }
            />
        );

    const parent = sp.role === "parent";

    return (
        <div>
            <Link to="/family/people" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> People
            </Link>

            <header className="mb-8 overflow-hidden rounded-xl bg-card">
                {community.photoUrl && <img src={community.photoUrl} alt={community.name} width={1200} height={320} loading="lazy" className="h-40 w-full object-cover md:h-56" />}
                <div className="p-5 md:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <Tag tone="family">{COMMUNITY_TYPE[community.type]}</Tag>
                        {community.sharedWithGuests && <Tag tone="neutral">Shared with guests</Tag>}
                    </div>
                    <h1 className="mt-2.5 font-display text-6xl leading-9 md:text-[32px]">{community.name}</h1>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
                        {community.meetingRhythm && (
                            <span className="flex items-center gap-1.5">
                                <CalendarClock size={14} aria-hidden="true" /> {community.meetingRhythm}
                            </span>
                        )}
                        {community.meetsWhere && (
                            <span className="flex items-center gap-1.5">
                                <MapPin size={14} aria-hidden="true" /> {community.meetsWhere}
                            </span>
                        )}
                        {community.link && (
                            <a href={community.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-brand hover:underline">
                                <ExternalLink size={14} aria-hidden="true" /> Website
                            </a>
                        )}
                    </div>
                    {community.memberIds.length > 0 && (
                        <ul className="mt-4 flex flex-wrap items-center gap-2">
                            {community.memberIds.map((mid) => (
                                <li key={mid}>
                                    <MemberAvatar memberId={mid} size="sm" showName />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div>
                    {community.rolesHeld.length > 0 && (
                        <Section title="What we do here">
                            <ul className="rounded-xl bg-card p-1.5">
                                {community.rolesHeld.map((r) => (
                                    <li key={r} className="px-3 py-2.5 text-md leading-6">
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    {parent && (
                        <Section
                            title="Giving"
                            action={
                                line && line.committedCents > 0 ? (
                                    <Button size="sm" variant="outline" onClick={() => setPaying(true)}>
                                        <HandCoins size={13} aria-hidden="true" /> Record it as given
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="ghost" onClick={() => setPaying(true)}>
                                        Record a gift
                                    </Button>
                                )
                            }
                        >
                            <div className="mb-3 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                                <Stat label="Committed" value={<Money cents={line?.committedCents ?? 0} />} sub={community.givingFrequency === "monthly" ? "each month" : "no commitment set"} />
                                <Stat label="Given this month" value={<Money cents={line?.paidThisMonthCents ?? 0} />} tone={line && line.outstandingCents > 0 ? "warn" : "ok"} sub={line && line.outstandingCents > 0 ? `${(line.outstandingCents / 100).toFixed(0)} still to give` : "commitment met"} />
                                <Stat label="Given this year" value={<Money cents={line?.paidThisYearCents ?? 0} />} sub={`${payments.length} record${payments.length === 1 ? "" : "s"}`} />
                            </div>
                            {payments.length ? (
                                <ul className="rounded-xl bg-card p-1.5">
                                    {payments.map((p) => (
                                        <li key={p.id} className="flex items-center gap-3 rounded-md px-3 py-2.5">
                                            <HandCoins size={15} className="shrink-0 text-caption" aria-hidden="true" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-md font-medium">{p.note}</span>
                                                <span className="block text-xs text-caption">
                                                    <DateText iso={p.paidAt} /> · {sp.members.find((m) => m.id === p.byMemberId)?.name.split(" ")[0] ?? "the family"}
                                                </span>
                                            </span>
                                            <Money cents={p.amountCents} className="text-md font-semibold" />
                                        </li>
                                    ))}
                                    <li className="flex items-center justify-between gap-3 border-t border-line px-3 py-2.5 text-sm font-semibold">
                                        <span>Given in total</span>
                                        <Money cents={givingTotal(payments)} />
                                    </li>
                                </ul>
                            ) : (
                                <EmptyState icon={<HandCoins size={20} aria-hidden="true" />} title="Nothing recorded yet" body="A commitment is a promise. Record it as paid and it counts as given, here and in this year's total." action={<Button onClick={() => setPaying(true)}>Record a gift</Button>} />
                            )}
                        </Section>
                    )}
                </div>

                <aside>
                    {community.contacts.length > 0 && (
                        <Card className="mb-4">
                            <h2 className="mb-2 text-base font-semibold">Who to ring</h2>
                            <ul>
                                {community.contacts.map((c) => (
                                    <li key={c.name} className="border-t border-line py-3 first:border-0 first:pt-0">
                                        <p className="text-md font-medium">{c.name}</p>
                                        <p className="text-xs text-caption">{c.role}</p>
                                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                            {c.phone && (
                                                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:underline">
                                                    <Phone size={13} aria-hidden="true" /> {c.phone}
                                                </a>
                                            )}
                                            {c.email && (
                                                <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:underline">
                                                    <Mail size={13} aria-hidden="true" /> {c.email}
                                                </a>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {community.notes && (
                        <Card className="mb-4">
                            <h2 className="mb-2 text-base font-semibold">Notes</h2>
                            <p className="whitespace-pre-wrap text-md leading-6 text-muted">{community.notes}</p>
                        </Card>
                    )}

                    {parent && (
                        <>
                            <Card className="mb-4">
                                <h2 className="text-base font-semibold">Guests</h2>
                                <p className="mt-1 text-sm text-muted">{community.sharedWithGuests ? "Guests you have invited can see this community on their dashboard." : "Hidden from guests."}</p>
                                <Button
                                    className="mt-3"
                                    size="md"
                                    variant="outline"
                                    onClick={async () => {
                                        await mutate((r) => r.updateCommunity(community.id, { sharedWithGuests: !community.sharedWithGuests }));
                                        toast(community.sharedWithGuests ? "Hidden from guests" : "Shared with guests", "success");
                                    }}
                                >
                                    {community.sharedWithGuests ? "Stop sharing with guests" : "Share with guests"}
                                </Button>
                            </Card>
                            <Button variant="danger" size="md" onClick={() => setRemoving(true)}>
                                <Trash2 size={14} aria-hidden="true" /> Remove this community
                            </Button>
                        </>
                    )}
                </aside>
            </div>

            <RecordGivingDialog
                open={paying}
                suggested={line?.outstandingCents || community.givingCommitmentCents}
                name={community.name}
                onClose={() => setPaying(false)}
                onSave={async (cents, note, paidAt) => {
                    await mutate((r) => r.recordGiving(community.id, { amountCents: cents, note, paidAt }));
                    toast(`Recorded as given to ${community.name}`, "success");
                }}
            />

            <Confirm
                open={removing}
                title={`Remove ${community.name}?`}
                body="The giving you have recorded against it goes too. This can't be undone."
                confirmLabel="Remove it"
                danger
                onClose={() => setRemoving(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removeCommunity(community.id));
                    toast(`${community.name} removed`, "default");
                    navigate("/family/people");
                }}
            />
        </div>
    );
}

function RecordGivingDialog({ open, suggested, name, onClose, onSave }: { open: boolean; suggested: number; name: string; onClose: () => void; onSave: (cents: number, note: string, paidAt: string) => Promise<void> }) {
    const today = new Date().toISOString().slice(0, 10);
    const [pounds, setPounds] = useState(String(Math.round(suggested / 100) || ""));
    const [note, setNote] = useState("");
    const [date, setDate] = useState(today);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    return (
        <Dialog open={open} onClose={onClose} title={`Record giving to ${name}`}>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    const cents = Math.round((Number(pounds) || 0) * 100);
                    if (cents <= 0) {
                        setErr("Enter an amount");
                        return;
                    }
                    setBusy(true);
                    try {
                        await onSave(cents, note.trim(), new Date(`${date}T12:00:00`).toISOString());
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
                <Inset className="mb-3">
                    <p className="text-sm leading-6 text-muted">A commitment is a promise; this is the record. Once saved it counts as given on {shortDate(date)}, and against this month&apos;s commitment.</p>
                </Inset>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <Field label="Amount (£)" type="number" min={0} step="1" value={pounds} onChange={(e) => setPounds(e.target.value)} error={err} />
                    <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <Field label="What for" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tithe · September" className="mt-3" />
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Record it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
