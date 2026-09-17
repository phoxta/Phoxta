import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, FileText, Luggage, MapPinned, Plus, Receipt, ShieldCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, DateText, EmptyModule, MemberAvatar, Money, Notice, Section } from "@/components/shared";
import { Menu } from "@/components/ui/overlay";
import { Button, Card, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import travelModule from "../module";
import {
    bookingsOf,
    checklistOf,
    checklistProgress,
    daysOf,
    expensesOf,
    fxNote,
    itemsOfDay,
    itineraryHref,
    packingHref,
    passportRisks,
    tripDates,
    tripSpend,
    tripWhen,
    travellersOf,
    HREF,
} from "../derive";
import { DOC_KIND, TRIP_KIND, TRIP_STATUS, TRIP_STATUSES, type NewBooking, type NewDoc, type NewExpense, type NewTrip, type TripStatus } from "../types";
import { AiPanel, BackLink, BookingRow, ChecklistRow, PackingSummary, ReadinessPanel, maskNumber } from "../components/pieces";
import { BookingDialog, ChecklistDialog, DocDialog, ExpenseDialog, TripDialog } from "../components/dialogs";

/**
 * One trip, from every angle a family needs it: how ready it is, who is
 * coming, the run-up, what is booked, the papers, the money and the two doors
 * out — the itinerary and the packing lists.
 *
 * What a child or a guest receives here has already been stripped by
 * `visibleTo`: no papers, no prices, no references, and only their own bag.
 * The sections below simply don't render when their data is empty, which is
 * exactly what "never reaches them" looks like on a screen.
 */
export default function TripPage() {
    const { id = "" } = useParams();
    const { state, mutate, loading, error } = useModule(travelModule);
    const { me, role, can, space, members, today } = useSpace();
    const { ask, busy: aiBusy, error: aiError, available: aiAvailable } = useAi();
    const navigate = useNavigate();

    const [editOpen, setEditOpen] = useState(false);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [docOpen, setDocOpen] = useState(false);
    const [expenseOpen, setExpenseOpen] = useState(false);
    const [checkOpen, setCheckOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [advice, setAdvice] = useState("");
    const [aiBlocked, setAiBlocked] = useState<string | null>(null);

    const manage = can("travel.manage");
    const parent = role === "parent";
    const trip = state?.trips.find((t) => t.id === id);

    const risks = useMemo(() => (state && trip ? passportRisks(state, trip, today) : []), [state, trip, today]);

    if (loading && !state) return <p className="text-md text-muted">Opening the trip…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;
    if (!trip) {
        return (
            <div>
                <BackLink to={HREF}>All trips</BackLink>
                <EmptyModule title="That trip isn't here" body="It may have been removed, or it may never have been shared with you." />
            </div>
        );
    }

    const people = travellersOf(state, trip.id);
    const days = daysOf(state, trip.id);
    const bookings = bookingsOf(state, trip.id);
    const docs = state.docs.filter((d) => d.tripId === trip.id || (d.tripId === null && people.some((p) => p.memberId === d.memberId)));
    const checklist = checklistOf(state, trip.id);
    const run = checklistProgress(state, trip, today);
    const expenses = expensesOf(state, trip.id);
    const spent = tripSpend(state, trip.id);
    const nextDay = days.find((d) => d.date >= today) ?? days[0];
    const notTravelling = members.filter((m) => !people.some((p) => p.memberId === m.id));

    const askBeforeWeGo = async (): Promise<void> => {
        setAiBlocked(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: `Remind me what we need to do before ${trip.title}. Only use what is in the run-up, the bookings and the documents; put the most urgent first and say when each is due.`,
                extraContext: `Trip: ${trip.title} to ${trip.destination}, ${tripDates(trip)} (${tripWhen(trip, today)}). Run-up: ${run.done} of ${run.total} done, ${run.overdue.length} overdue.`,
            });
            if (r.unavailable) setAiBlocked(r.unavailable);
            else setAdvice(r.text);
        } catch {
            /* useAi surfaced it */
        }
    };

    return (
        <div>
            <BackLink to={HREF}>All trips</BackLink>

            <Card className="mb-8 overflow-hidden p-0">
                <div className="relative aspect-[16/6] bg-live-soft">
                    {trip.coverUrl ? (
                        <img src={trip.coverUrl} alt="" width={1200} height={450} loading="lazy" className="absolute inset-0 size-full object-cover" />
                    ) : (
                        <span className="grid size-full place-items-center text-[44px]" aria-hidden="true">
                            {TRIP_KIND[trip.kind].emoji}
                        </span>
                    )}
                </div>
                <div className="p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <Tag tone={trip.status === "booked" ? "ok" : trip.status === "done" ? "neutral" : "brand"}>{TRIP_STATUS[trip.status].label}</Tag>
                                <Tag tone="live">{TRIP_KIND[trip.kind].label}</Tag>
                                {trip.valueId && <Tag tone="brand">{trip.valueId}</Tag>}
                            </div>
                            <h1 className="font-display text-7xl leading-9">{trip.title}</h1>
                            <p className="mt-1 text-base text-muted">
                                {trip.destination} · {tripDates(trip)} · <span className="font-semibold text-live-ink">{tripWhen(trip, today)}</span>
                            </p>
                        </div>
                        {manage && (
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <Button variant="outline" size="md" onClick={() => setEditOpen(true)}>
                                    Edit
                                </Button>
                                <Menu
                                    trigger={(p) => (
                                        <Button variant="ghost" size="md" {...p}>
                                            More
                                        </Button>
                                    )}
                                    items={[
                                        ...TRIP_STATUSES.filter((s) => s !== trip.status && s !== "done").map((s) => ({
                                            label: `Mark ${TRIP_STATUS[s].label.toLowerCase()}`,
                                            onSelect: () => void mutate((r) => r.setStatus(trip.id, s as TripStatus)),
                                        })),
                                        { label: "Home again — close it and open an album", onSelect: () => void mutate((r) => r.finishTrip(trip.id)) },
                                        { label: "Delete the trip", danger: true, onSelect: () => setConfirmDelete(true) },
                                    ]}
                                />
                            </div>
                        )}
                    </div>

                    {trip.notes && <p className="mt-4 max-w-2xl text-md leading-6 text-muted">{trip.notes}</p>}

                    <div className="mt-5 flex flex-wrap gap-2">
                        <Link to={itineraryHref(trip.id)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white">
                            <MapPinned size={15} aria-hidden="true" /> Itinerary
                        </Link>
                        <Link to={packingHref(trip.id)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-card px-4 text-sm font-semibold">
                            <Luggage size={15} aria-hidden="true" /> Packing
                        </Link>
                        {trip.albumId && (
                            <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-create-soft px-4 text-sm font-semibold text-create-ink">📸 {trip.albumTitle || "Album"}</span>
                        )}
                    </div>
                </div>
            </Card>

            {risks.length > 0 && (
                <div className="mb-8 space-y-2.5">
                    {risks.map((r) => (
                        <Notice key={r.memberId} tone={r.expiredBeforeTravel ? "danger" : "warn"}>
                            <MemberAvatar memberId={r.memberId} size="xs" showName className="mr-1 align-middle" />
                            {r.expiredBeforeTravel
                                ? `— passport expires ${shortDate(r.expiry)}, before we even fly. That has to be renewed first.`
                                : `— passport expires ${shortDate(r.expiry)}, only ${r.monthsClear} month${r.monthsClear === 1 ? "" : "s"} after we come home. ${trip.destination} wants six months clear.`}
                        </Notice>
                    ))}
                </div>
            )}

            {trip.status !== "done" && (
                <Section title="How ready we are">
                    <ReadinessPanel state={state} trip={trip} today={today} />
                </Section>
            )}

            <Section title={people.length === 1 ? "Who's going" : `Who's going · ${people.length}`}>
                <Card>
                    <ul className="divide-y divide-line">
                        {people.map((p) => {
                            const risk = risks.find((r) => r.memberId === p.memberId);
                            const who = members.find((m) => m.id === p.memberId);
                            return (
                                <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                    <MemberAvatar memberId={p.memberId} size="md" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-md font-semibold">{who?.name ?? "Someone"}</span>
                                            {p.role === "host" && <Tag tone="neutral">Hosting</Tag>}
                                            {parent && p.passportExpiry && (
                                                <span className={cn("text-xs", risk ? "font-semibold text-danger-ink" : "text-caption")}>Passport to {shortDate(p.passportExpiry)}</span>
                                            )}
                                        </div>
                                        {p.notes && <p className="mt-0.5 text-sm leading-5 text-muted">{p.notes}</p>}
                                    </div>
                                    {manage && (
                                        <button type="button" onClick={() => void mutate((r) => r.removeTraveller(p.id))} className="shrink-0 text-xs text-caption underline-offset-4 hover:text-danger-ink hover:underline">
                                            Remove
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {manage && notTravelling.length > 0 && (
                        <div className="mt-4 border-t border-line pt-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">Add someone</p>
                            <div className="flex flex-wrap gap-2">
                                {notTravelling.map((m) => (
                                    <Button key={m.id} variant="outline" size="sm" onClick={() => void mutate((r) => r.addTraveller(trip.id, m.id, m.role === "guest" ? "host" : "traveller"))}>
                                        <Plus size={13} /> {m.name.split(" ")[0]}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </Section>

            {aiAvailable && trip.status !== "done" && (
                <Section title="Ask the companion">
                    <AiPanel
                        title="Before we go"
                        hint="It reads this trip's run-up, bookings and papers — and says what it used."
                        busy={aiBusy}
                        error={aiError}
                        unavailable={aiBlocked}
                        text={advice}
                        actions={
                            <Button variant="outline" size="sm" onClick={() => void askBeforeWeGo()} loading={aiBusy}>
                                {advice ? "Ask again" : "Remind me what's left"}
                            </Button>
                        }
                    />
                </Section>
            )}

            {checklist.length > 0 && (
                <Section
                    title="The run-up"
                    action={
                        manage ? (
                            <Button variant="ghost" size="sm" onClick={() => setCheckOpen(true)}>
                                <Plus size={14} /> Add
                            </Button>
                        ) : undefined
                    }
                >
                    <Card>
                        <p className="mb-2 text-sm text-muted">
                            {run.done} of {run.total} done
                            {run.overdue.length ? <span className="text-danger-ink"> · {run.overdue.length} overdue</span> : null}
                        </p>
                        <ProgressBar value={(run.done / Math.max(1, run.total)) * 100} label="The run-up" />
                        <ul className="mt-3">
                            {checklist.map((c) => (
                                <ChecklistRow
                                    key={c.id}
                                    item={c}
                                    trip={trip}
                                    today={today}
                                    canTick={manage || c.ownerMemberId === me.id}
                                    onToggle={() => void mutate((r) => r.setChecklistDone(c.id, !c.doneAt))}
                                    actions={
                                        manage ? (
                                            <button type="button" aria-label={`Remove ${c.item}`} onClick={() => void mutate((r) => r.removeChecklistItem(c.id))} className="text-caption hover:text-danger-ink">
                                                <Trash2 size={14} />
                                            </button>
                                        ) : undefined
                                    }
                                />
                            ))}
                        </ul>
                    </Card>
                </Section>
            )}

            <Section
                title="Bookings"
                action={
                    manage ? (
                        <Button variant="ghost" size="sm" onClick={() => setBookingOpen(true)}>
                            <Plus size={14} /> Add
                        </Button>
                    ) : undefined
                }
            >
                {bookings.length ? (
                    <Card>
                        <ul>
                            {bookings.map((b) => (
                                <BookingRow
                                    key={b.id}
                                    booking={b}
                                    showMoney={parent}
                                    actions={
                                        manage ? (
                                            <Menu
                                                trigger={(p) => (
                                                    <button type="button" className="text-xs font-semibold text-caption hover:text-ink" {...p}>
                                                        ⋯
                                                    </button>
                                                )}
                                                items={[
                                                    { label: b.confirmed ? "Mark not confirmed" : "Mark confirmed", onSelect: () => void mutate((r) => r.updateBooking(b.id, { confirmed: !b.confirmed })) },
                                                    { label: "Remove", danger: true, onSelect: () => void mutate((r) => r.removeBooking(b.id)) },
                                                ]}
                                            />
                                        ) : undefined
                                    }
                                />
                            ))}
                        </ul>
                    </Card>
                ) : (
                    <EmptyState
                        icon={<CalendarDays size={20} aria-hidden="true" />}
                        title="Nothing booked yet"
                        body={manage ? "Flights, the stay, the car, the insurance — each with its reference and what it cost." : "The family hasn't added any bookings you can see."}
                        action={
                            manage ? (
                                <Button variant="outline" onClick={() => setBookingOpen(true)}>
                                    Add a booking
                                </Button>
                            ) : undefined
                        }
                    />
                )}
            </Section>

            {parent && (
                <Section
                    title="Papers"
                    action={
                        <Button variant="ghost" size="sm" onClick={() => setDocOpen(true)}>
                            <Plus size={14} /> Add
                        </Button>
                    }
                >
                    <Card>
                        <p className="mb-3 flex items-start gap-2 text-sm leading-5 text-muted">
                            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                            Parents only — these rows are filtered out of a child&apos;s or a guest&apos;s data before it leaves the server, and the numbers are never shown in full.
                        </p>
                        {docs.length ? (
                            <ul className="divide-y divide-line">
                                {docs.map((d) => {
                                    const daysLeft = d.expiresAt ? Math.round((new Date(`${d.expiresAt}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000) : null;
                                    return (
                                        <li key={d.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                                            <span className="text-xl leading-none" aria-hidden="true">
                                                {DOC_KIND[d.kind].emoji}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-md font-semibold">{d.label || DOC_KIND[d.kind].label}</span>
                                                    <MemberAvatar memberId={d.memberId} size="xs" showName />
                                                    {daysLeft !== null && daysLeft <= 90 && <Tag tone={daysLeft <= 30 ? "danger" : "warn"}>{daysLeft < 0 ? "Expired" : `${daysLeft} days left`}</Tag>}
                                                </div>
                                                <div className="mt-0.5 text-sm text-muted">
                                                    {maskNumber(d.number)}
                                                    {d.expiresAt ? ` · expires ${shortDate(d.expiresAt)}` : ""}
                                                </div>
                                                {d.notes && <p className="mt-0.5 text-sm leading-5 text-muted">{d.notes}</p>}
                                            </div>
                                            <button type="button" aria-label={`Remove ${d.label}`} onClick={() => void mutate((r) => r.removeDoc(d.id))} className="shrink-0 text-caption hover:text-danger-ink">
                                                <Trash2 size={14} />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <EmptyState icon={<FileText size={20} aria-hidden="true" />} title="No papers yet" body="Passports, visas, the insurance certificate. Add an expiry and you'll be reminded at 90 days and again at 30." />
                        )}
                    </Card>
                </Section>
            )}

            {parent && (
                <Section
                    title="What it's costing"
                    action={
                        <Button variant="ghost" size="sm" onClick={() => setExpenseOpen(true)}>
                            <Plus size={14} /> Add an expense
                        </Button>
                    }
                >
                    <Card>
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <p className="text-base font-semibold">
                                <Money cents={spent} /> spent
                                {trip.budgetCents !== null && (
                                    <span className="text-muted">
                                        {" "}
                                        of <Money cents={trip.budgetCents} />
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-caption">Posted to the ledger under {trip.financeCategoryLabel}</p>
                        </div>
                        {trip.budgetCents !== null && <ProgressBar value={(spent / Math.max(1, trip.budgetCents)) * 100} className="mt-2" label="Trip budget" />}
                        {expenses.length ? (
                            <ul className="mt-4 divide-y divide-line">
                                {expenses.map((e) => (
                                    <li key={e.id} className="flex items-start gap-3 py-3">
                                        <Receipt size={16} className="mt-0.5 shrink-0 text-caption" aria-hidden="true" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-md font-medium">{e.label}</div>
                                            <div className="text-xs text-caption">
                                                <DateText iso={e.date} /> · <MemberAvatar memberId={e.memberId} size="xs" showName className="align-middle" />
                                                {fxNote(e, space.currency) ? ` · ${fxNote(e, space.currency)}` : ""}
                                            </div>
                                            {e.note && <p className="mt-0.5 text-sm leading-5 text-muted">{e.note}</p>}
                                        </div>
                                        <span className="shrink-0 text-md font-semibold tabular-nums">
                                            <Money cents={e.homeCents} />
                                        </span>
                                        <button type="button" aria-label={`Remove ${e.label}`} onClick={() => void mutate((r) => r.removeExpense(e.id))} className="shrink-0 text-caption hover:text-danger-ink">
                                            <Trash2 size={14} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-4 text-sm text-muted">Nothing recorded yet. Every expense you add here posts straight to the family ledger under this trip&apos;s category.</p>
                        )}
                    </Card>
                </Section>
            )}

            <Section title="Packing" action={<Link to={packingHref(trip.id)} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">Open the lists</Link>}>
                <Card>
                    <PackingSummary state={state} trip={trip} />
                    {manage && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() =>
                                void mutate(async (r) => {
                                    await r.generatePacking(trip.id);
                                })
                            }
                        >
                            <Luggage size={14} /> Make the missing lists
                        </Button>
                    )}
                </Card>
            </Section>

            <Section title="The plan" action={<Link to={itineraryHref(trip.id)} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">Full itinerary</Link>}>
                {nextDay ? (
                    <Card>
                        <h3 className="font-display text-[17px]">{new Date(`${nextDay.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</h3>
                        {nextDay.title && <p className="text-sm text-muted">{nextDay.title}</p>}
                        <ul className="mt-3 space-y-2">
                            {itemsOfDay(state, nextDay.id).map((i) => (
                                <li key={i.id} className="flex gap-3 text-md">
                                    <span className="w-[52px] shrink-0 font-semibold tabular-nums text-live-ink">{i.time || "—"}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-medium">{i.title}</span>
                                        {i.place && <span className="block text-sm text-muted">{i.place}</span>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                ) : (
                    <EmptyState
                        icon={<MapPinned size={20} aria-hidden="true" />}
                        title="No itinerary yet"
                        body={manage ? "Add a day and start filling it. Every stop gets a maps link." : "The family hasn't planned the days yet."}
                        action={
                            manage ? (
                                <Link to={itineraryHref(trip.id)} className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-md font-semibold text-white">
                                    Plan the days
                                </Link>
                            ) : undefined
                        }
                    />
                )}
            </Section>

            <TripDialog open={editOpen} onClose={() => setEditOpen(false)} trip={trip} onSave={(input: NewTrip) => mutate((r) => r.updateTrip(trip.id, { ...input, endDate: input.endDate ?? null, startDate: input.startDate ?? null }))} />
            <BookingDialog open={bookingOpen} onClose={() => setBookingOpen(false)} onSave={(input: NewBooking) => mutate((r) => r.addBooking(trip.id, input))} />
            <DocDialog open={docOpen} onClose={() => setDocOpen(false)} onSave={(input: NewDoc) => mutate((r) => r.addDoc({ ...input, tripId: null }))} />
            <ExpenseDialog open={expenseOpen} onClose={() => setExpenseOpen(false)} trip={trip} onSave={(input: NewExpense) => mutate((r) => r.addExpense(trip.id, input))} />
            <ChecklistDialog open={checkOpen} onClose={() => setCheckOpen(false)} onSave={(item, offset, owner, note) => mutate((r) => r.addChecklistItem(trip.id, item, offset, owner, note))} />
            <Confirm
                open={confirmDelete}
                title="Delete this trip?"
                body="The itinerary, the bookings, the packing lists and the run-up go with it. The expenses already posted to the ledger stay there."
                confirmLabel="Delete the trip"
                danger
                onClose={() => setConfirmDelete(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removeTrip(trip.id));
                    navigate(HREF);
                }}
            />
        </div>
    );
}
