import { useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarPlus, Lock, Pencil, Ruler, Stethoscope, Syringe, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { ageOf } from "@/lib/format";
import { Confirm, DateText, MemberAvatar, Notice, PageTitle, Section } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Card, EmptyState, Field, IconButton, Skeleton } from "@/components/ui/primitives";
import { dayNumber, healthFor, latestMeasurement, upcomingAppointments } from "../derive";
import type { HealthNote, WellnessRepo } from "../types";
import { useWellness } from "../components/useWellness";

/**
 * Health notes — the most private screen in the module, and the one a parent
 * reaches for at 7am when the school asks whether the inhaler is in the bag.
 *
 * `visibleTo()` has already decided what arrived here (AC 4): a parent gets
 * every note, a granted young adult gets exactly their own, everybody else
 * gets an empty array and this page says so plainly rather than pretending the
 * notes do not exist.
 */
export default function HealthPage() {
    const { state, loading, error, sp, run } = useWellness();
    const [params, setParams] = useSearchParams();
    const [editing, setEditing] = useState<string | null>(null);
    const [appointment, setAppointment] = useState<string | null>(null);
    const [measurement, setMeasurement] = useState<string | null>(null);
    const [vaccination, setVaccination] = useState<string | null>(null);
    const [removing, setRemoving] = useState<{ memberId: string; id: string; what: string } | null>(null);

    if (loading) return <Skeleton className="h-96" />;
    if (error) return <Notice tone="danger">{error}</Notice>;

    // The same rule `canSeeHealth` applies in the repos and `sql/wellness.sql`
    // applies at the API: a parent sees every note, anybody else sees their own
    // and only when a parent has granted it (AC 4).
    const canSee = (memberId: string) => sp.role === "parent" || (sp.me.id === memberId && sp.can("wellness.manage"));
    const readable = sp.members.filter((m) => m.role !== "guest" && canSee(m.id));

    if (!state?.visible || readable.length === 0) {
        return (
            <div>
                <PageTitle title="Health notes" area="live" />
                <EmptyState
                    icon={<Lock size={20} aria-hidden="true" />}
                    title="Health notes are a parent's"
                    body="Allergies, medicines and appointments are the sharpest thing this app holds. A parent can grant an older child sight of their own — until then, this stays closed."
                />
            </div>
        );
    }

    const focus = params.get("member");
    const soon = upcomingAppointments(state, sp.today, 30);

    return (
        <div>
            <PageTitle
                title="Health notes"
                sub="Allergies, medicines, who the GP is, what is due and how everyone is growing. Parents only — and it stays that way at the API, not just on this screen."
                area="live"
            />

            {soon.length > 0 && (
                <Section title="Coming up">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                        {soon.map(({ note, appt }) => (
                            <li key={appt.id} className="flex items-start gap-3 rounded-xl bg-card px-4 py-3">
                                <MemberAvatar memberId={note.memberId} size="sm" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-md font-semibold">{appt.what}</span>
                                    <span className="block text-xs text-caption">
                                        <DateText iso={appt.at} withTime /> · {appt.who}
                                        {appt.place ? ` · ${appt.place}` : ""}
                                    </span>
                                    {appt.note && <span className="mt-1 block text-xs leading-4 text-muted">{appt.note}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <ul className="flex flex-col gap-4">
                {readable.map((member) => {
                    const note = healthFor(state, member.id);
                    const latest = note ? latestMeasurement(note) : undefined;
                    const flagged = note?.allergies && !/^none/i.test(note.allergies.trim());
                    return (
                        <li key={member.id}>
                            <Card className={cn(focus === member.id && "outline-2 outline-brand")}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <MemberAvatar member={member} size="md" />
                                        <div>
                                            <h2 className="font-display text-2xl leading-7">{member.name}</h2>
                                            <p className="text-xs text-caption">
                                                {member.relation}
                                                {member.birthday ? ` · ${ageOf(member.birthday)}` : ""}
                                                {note ? ` · updated ${dayNumber(note.updatedAt.slice(0, 10))}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="md" onClick={() => setEditing(member.id)}>
                                            <Pencil size={14} aria-hidden="true" /> {note ? "Edit" : "Start a note"}
                                        </Button>
                                        <Button variant="ghost" size="md" onClick={() => setAppointment(member.id)}>
                                            <CalendarPlus size={14} aria-hidden="true" /> Appointment
                                        </Button>
                                    </div>
                                </div>

                                {!note ? (
                                    <p className="mt-4 text-md text-muted">Nothing written down yet. Allergies and medicines first — they are the two a stranger might need.</p>
                                ) : (
                                    <>
                                        {flagged && (
                                            <div className="mt-4 flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-sm leading-5 text-danger-ink">
                                                <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                                <span>
                                                    <strong className="font-semibold">Allergies:</strong> {note.allergies}
                                                </span>
                                            </div>
                                        )}

                                        <dl className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-3 sm:grid-cols-2">
                                            {!flagged && <Detail label="Allergies" value={note.allergies || "None recorded"} />}
                                            <Detail label="Medicines" value={note.medications || "None"} />
                                            <Detail label="Conditions" value={note.conditions || "None recorded"} />
                                            <Detail label="GP" value={note.gp || "Not recorded"} />
                                            <Detail label="Dentist" value={note.dentist || "Not recorded"} />
                                            {note.nhsNumber && <Detail label="NHS number" value={note.nhsNumber} />}
                                        </dl>

                                        {note.notes && <p className="mt-4 rounded-md bg-page px-4 py-3 text-sm leading-5 text-muted">{note.notes}</p>}

                                        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
                                            <Panel
                                                title="Appointments"
                                                empty="Nothing booked."
                                                rows={note.appointments.map((a) => ({
                                                    id: a.id,
                                                    main: a.what,
                                                    sub: `${dayNumber(a.at.slice(0, 10))} · ${a.who}${a.place ? ` · ${a.place}` : ""}`,
                                                    onRemove: () => setRemoving({ memberId: member.id, id: a.id, what: a.what }),
                                                }))}
                                            />
                                            <Panel
                                                title="Vaccinations"
                                                empty="None recorded."
                                                action={
                                                    <IconButton label={`Add a vaccination for ${member.name}`} size="sm" onClick={() => setVaccination(member.id)}>
                                                        <Syringe size={13} aria-hidden="true" />
                                                    </IconButton>
                                                }
                                                rows={note.vaccinations.map((v) => ({ id: v.id, main: v.name, sub: `${dayNumber(v.date)}${v.dueAgain ? ` · due again ${dayNumber(v.dueAgain)}` : ""}` }))}
                                            />
                                            <Panel
                                                title="Growth"
                                                empty="No measurements yet."
                                                action={
                                                    <IconButton label={`Add a measurement for ${member.name}`} size="sm" onClick={() => setMeasurement(member.id)}>
                                                        <Ruler size={13} aria-hidden="true" />
                                                    </IconButton>
                                                }
                                                rows={note.measurements
                                                    .slice()
                                                    .reverse()
                                                    .map((m) => ({
                                                        id: m.id,
                                                        main: [m.heightCm ? `${m.heightCm} cm` : "", m.weightKg ? `${m.weightKg} kg` : ""].filter(Boolean).join(" · ") || "—",
                                                        sub: `${dayNumber(m.date)}${m.note ? ` · ${m.note}` : ""}`,
                                                    }))}
                                            />
                                        </div>

                                        {latest && (
                                            <p className="mt-3 flex items-center gap-2 text-xs text-caption">
                                                <Stethoscope size={13} aria-hidden="true" /> Last measured {dayNumber(latest.date)}.
                                            </p>
                                        )}
                                    </>
                                )}
                            </Card>
                        </li>
                    );
                })}
            </ul>

            {editing && <NoteDialog memberId={editing} note={healthFor(state, editing)} onClose={() => setEditing(null)} run={run} />}
            {appointment && <AppointmentDialog memberId={appointment} today={sp.today} onClose={() => setAppointment(null)} run={run} />}
            {measurement && <MeasurementDialog memberId={measurement} today={sp.today} onClose={() => setMeasurement(null)} run={run} />}
            {vaccination && <VaccinationDialog memberId={vaccination} today={sp.today} onClose={() => setVaccination(null)} run={run} />}

            <Confirm
                open={Boolean(removing)}
                title="Remove this appointment?"
                body={removing ? `"${removing.what}" comes off the note. Nothing else changes.` : undefined}
                confirmLabel="Remove it"
                danger
                onConfirm={async () => {
                    if (removing) await run((r) => r.removeAppointment(removing.memberId, removing.id), "Removed");
                }}
                onClose={() => setRemoving(null)}
            />

            <p className="mt-8 flex items-start gap-2 text-xs leading-5 text-caption">
                <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                    These notes carry the <strong>health</strong> sensitivity class: they never enter a child&apos;s or a guest&apos;s context pack, and the companion is told not to repeat them. Setting the query
                    string, guessing an id or calling the API directly does not widen that — the policy in <code>sql/wellness.sql</code> is what decides.
                </span>
            </p>

            {focus && (
                <button
                    type="button"
                    className="mt-4 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                    onClick={() => {
                        const next = new URLSearchParams(params);
                        next.delete("member");
                        setParams(next, { replace: true });
                    }}
                >
                    Show everyone
                </button>
            )}
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-2xs font-medium uppercase tracking-[0.06em] text-caption">{label}</dt>
            <dd className="mt-0.5 text-md leading-5">{value}</dd>
        </div>
    );
}

function Panel({ title, rows, empty, action }: { title: string; rows: Array<{ id: string; main: string; sub: string; onRemove?: () => void }>; empty: string; action?: ReactNode }) {
    return (
        <div className="rounded-lg bg-page p-3">
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{title}</h3>
                {action}
            </div>
            {rows.length === 0 ? (
                <p className="text-sm text-caption">{empty}</p>
            ) : (
                <ul className="flex flex-col gap-1.5">
                    {rows.map((row) => (
                        <li key={row.id} className="flex items-start gap-2">
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium leading-4">{row.main}</span>
                                <span className="block text-xs leading-4 text-caption">{row.sub}</span>
                            </span>
                            {row.onRemove && (
                                <IconButton label={`Remove ${row.main}`} size="sm" onClick={row.onRemove}>
                                    <Trash2 size={12} aria-hidden="true" />
                                </IconButton>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

type Run = (fn: (r: WellnessRepo) => Promise<unknown>, ok?: string) => Promise<boolean>;

function NoteDialog({ memberId, note, onClose, run }: { memberId: string; note: HealthNote | undefined; onClose: () => void; run: Run }) {
    const [allergies, setAllergies] = useState(note?.allergies ?? "");
    const [medications, setMedications] = useState(note?.medications ?? "");
    const [conditions, setConditions] = useState(note?.conditions ?? "");
    const [gp, setGp] = useState(note?.gp ?? "");
    const [dentist, setDentist] = useState(note?.dentist ?? "");
    const [nhsNumber, setNhs] = useState(note?.nhsNumber ?? "");
    const [notes, setNotes] = useState(note?.notes ?? "");
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const ok = await run((r) => r.saveHealthNote(memberId, { allergies, medications, conditions, gp, dentist, nhsNumber, notes }), "Saved");
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Dialog open onClose={onClose} title="Health note" wide>
            <form onSubmit={submit}>
                <Field label="Allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="PEANUTS — carries an adrenaline pen" hint="Write it the way a stranger would need to read it." />
                <Field label="Medicines" value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="Blue inhaler before PE" className="mt-4" />
                <Field label="Conditions" value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="Mild asthma" className="mt-4" />
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Field label="GP" value={gp} onChange={(e) => setGp(e.target.value)} placeholder="Parkway Surgery · 020 8654 0000" />
                    <Field label="Dentist" value={dentist} onChange={(e) => setDentist(e.target.value)} />
                </div>
                <Field label="NHS number" value={nhsNumber} onChange={(e) => setNhs(e.target.value)} className="mt-4" />
                <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Anything else worth remembering</span>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-md leading-6 outline-none focus:border-brand" />
                </label>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
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

function AppointmentDialog({ memberId, today, onClose, run }: { memberId: string; today: string; onClose: () => void; run: Run }) {
    const [what, setWhat] = useState("");
    const [who, setWho] = useState("");
    const [place, setPlace] = useState("");
    const [date, setDate] = useState(today);
    const [time, setTime] = useState("09:00");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!what.trim()) return;
        setBusy(true);
        const ok = await run((r) => r.addAppointment(memberId, { what: what.trim(), who: who.trim(), at: new Date(`${date}T${time}:00`).toISOString(), place: place.trim(), note: note.trim() }), "In the diary");
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Dialog open onClose={onClose} title="An appointment">
            <form onSubmit={submit}>
                <Field label="What" value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Asthma review" />
                <Field label="Who with" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Dr Whitfield" className="mt-4" />
                <Field label="Where" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Parkway Surgery" className="mt-4" />
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Date</span>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Time</span>
                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                    </label>
                </div>
                <Field label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bring the inhaler and the spacer." className="mt-4" />
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!what.trim()}>
                        Add it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function MeasurementDialog({ memberId, today, onClose, run }: { memberId: string; today: string; onClose: () => void; run: Run }) {
    const [date, setDate] = useState(today);
    const [heightCm, setHeight] = useState("");
    const [weightKg, setWeight] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const ok = await run(
            (r) => r.addMeasurement(memberId, { date, heightCm: heightCm ? Number(heightCm) : null, weightKg: weightKg ? Number(weightKg) : null, note: note.trim() }),
            "Recorded",
        );
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Dialog open onClose={onClose} title="A measurement">
            <form onSubmit={submit}>
                <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">When</span>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                </label>
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <Field label="Height (cm)" value={heightCm} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" />
                    <Field label="Weight (kg)" value={weightKg} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" />
                </div>
                <Field label="Note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-4" />
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
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

function VaccinationDialog({ memberId, today, onClose, run }: { memberId: string; today: string; onClose: () => void; run: Run }) {
    const [name, setName] = useState("");
    const [date, setDate] = useState(today);
    const [dueAgain, setDueAgain] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        const ok = await run((r) => r.addVaccination(memberId, { name: name.trim(), date, dueAgain: dueAgain || null }), "Recorded");
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Dialog open onClose={onClose} title="A vaccination">
            <form onSubmit={submit}>
                <Field label="What" value={name} onChange={(e) => setName(e.target.value)} placeholder="Flu nasal spray" />
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Given</span>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Due again</span>
                        <input type="date" value={dueAgain} onChange={(e) => setDueAgain(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                    </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!name.trim()}>
                        Record it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
