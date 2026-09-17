import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarPlus, MapPinned, Plus, Printer, Trash2 } from "lucide-react";
import { useAi } from "@/lib/ai";
import { isoDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, EmptyModule, Notice, PageTitle, Section } from "@/components/shared";
import { Button, Card, EmptyState, Field } from "@/components/ui/primitives";
import travelModule from "../module";
import { addDaysIso, daysOf, itemsOfDay, itineraryCost, itineraryDocument, tripDates, tripHref } from "../derive";
import type { NewItineraryItem } from "../types";
import { AiPanel, BackLink, ItineraryRow } from "../components/pieces";
import { ItineraryItemDialog } from "../components/dialogs";

/**
 * The itinerary — a day at a time.
 *
 * Three things make this screen worth opening on the day itself: every stop
 * carries a maps deep link (the CSP admits no tile server, so the device's own
 * maps app is the map), anybody on the trip can tick a thing off as it
 * happens, and the whole thing prints to a PDF you can hand to a grandparent
 * who does not want an app.
 */

/** Turn the companion's draft into proposals the parent can accept one by one. */
function parseDraft(text: string): Array<{ time: string; title: string; place: string }> {
    return text
        .split(/\r?\n/)
        .map((l) => l.replace(/^\s*[-•*\d.)\]]+\s*/, "").trim())
        .filter((l) => l.length > 3 && l.length < 160 && !/^#{1,6}\s/.test(l))
        .map((line) => {
            const m = line.match(/^(\d{1,2}[:.]\d{2})\s*[—–-]?\s*(.*)$/);
            const time = m ? m[1].replace(".", ":").padStart(5, "0") : "";
            const rest = m ? m[2] : line;
            const parts = rest.split(/\s+[—–]\s+|\s+at\s+/i);
            return { time, title: (parts[0] ?? rest).replace(/[.:]$/, "").trim(), place: (parts[1] ?? "").trim() };
        })
        .filter((x) => x.title)
        .slice(0, 12);
}

export default function ItineraryPage() {
    const { id = "" } = useParams();
    const { state, mutate, loading, error } = useModule(travelModule);
    const { role, can, space, members, today } = useSpace();
    const { ask, busy: aiBusy, error: aiError, available: aiAvailable } = useAi();

    const [addFor, setAddFor] = useState<{ dayId: string; label: string; initial?: Partial<NewItineraryItem> } | null>(null);
    const [newDay, setNewDay] = useState("");
    const [removeDayId, setRemoveDayId] = useState<string | null>(null);
    const [interests, setInterests] = useState("");
    const [draft, setDraft] = useState("");
    const [aiBlocked, setAiBlocked] = useState<string | null>(null);
    const [printNote, setPrintNote] = useState<string | null>(null);

    const manage = can("travel.manage");
    const parent = role === "parent";
    const trip = state?.trips.find((t) => t.id === id);
    const days = useMemo(() => (state && trip ? daysOf(state, trip.id) : []), [state, trip]);
    const proposals = useMemo(() => parseDraft(draft), [draft]);

    if (loading && !state) return <p className="text-md text-muted">Opening the itinerary…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;
    if (!trip) return <EmptyModule title="That trip isn't here" body="It may have been removed, or never shared with you." />;

    /** AC 6 — the itinerary as a document, printed by the platform ("Save as PDF"). */
    const exportPdf = (): void => {
        setPrintNote(null);
        const html = itineraryDocument(state, trip, members, { currency: space.currency, showCosts: parent });
        const w = window.open("", "_blank", "noopener,width=900,height=1000");
        if (!w) {
            setPrintNote("Your browser blocked the print window. Allow pop-ups for this site and try again.");
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        window.setTimeout(() => {
            try {
                w.print();
            } catch {
                /* the window is open; the reader can print it themselves */
            }
        }, 350);
    };

    const askForDraft = async (): Promise<void> => {
        setAiBlocked(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: `Draft a day-by-day itinerary for ${trip.destination}${
                    days.length ? ` for the ${days.length} day${days.length === 1 ? "" : "s"} already on the plan` : " for this trip"
                }. Interests: ${interests || "family with children, faith, food, nature"}. Give one line per activity as "HH:MM — what — where", nothing else.`,
                extraContext: `Trip: ${trip.title}, ${trip.destination}, ${tripDates(trip)}. Travelling with children. Existing plan: ${
                    days.map((d) => `${d.date}: ${itemsOfDay(state, d.id).map((i) => i.title).join(", ") || "empty"}`).join(" | ") || "nothing yet"
                }.`,
            });
            if (r.unavailable) setAiBlocked(r.unavailable);
            else setDraft(r.text);
        } catch {
            /* useAi surfaced it */
        }
    };

    const firstDayDate = trip.startDate ?? today;
    const suggestedNext = days.length ? addDaysIso(days[days.length - 1].date, 1) : firstDayDate;

    return (
        <div>
            <BackLink to={tripHref(trip.id)}>{trip.title}</BackLink>
            <PageTitle
                title="The itinerary"
                sub={`${trip.destination} · ${tripDates(trip)}${parent && itineraryCost(state, trip) ? "" : ""}`}
                area="live"
                actions={
                    <Button variant="outline" onClick={exportPdf}>
                        <Printer size={16} /> Export to PDF
                    </Button>
                }
            />
            {printNote && <Notice tone="warn" className="mb-6">{printNote}</Notice>}

            {days.length === 0 ? (
                <EmptyState
                    icon={<MapPinned size={20} aria-hidden="true" />}
                    title="No days planned yet"
                    body={manage ? "Add the first day and start filling it in. Every stop gets a link that opens the device's own maps app." : "The family hasn't planned the days yet."}
                    action={
                        manage ? (
                            <Button onClick={() => void mutate((r) => r.addDay(trip.id, firstDayDate))}>
                                <CalendarPlus size={16} /> Add the first day
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="space-y-6">
                    {days.map((d) => {
                        const items = itemsOfDay(state, d.id);
                        const label = new Date(`${d.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
                        return (
                            <Card key={d.id}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h2 className="font-display text-2xl leading-7">{label}</h2>
                                        {d.title && <p className="text-sm text-muted">{d.title}</p>}
                                        {d.notes && <p className="mt-1 max-w-xl text-sm leading-5 text-muted">{d.notes}</p>}
                                    </div>
                                    {manage && (
                                        <div className="flex shrink-0 items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setAddFor({ dayId: d.id, label })}>
                                                <Plus size={13} /> Add
                                            </Button>
                                            <button type="button" aria-label={`Remove ${label}`} onClick={() => setRemoveDayId(d.id)} className="text-caption hover:text-danger-ink">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {items.length ? (
                                    <ul className="mt-3">
                                        {items.map((i) => (
                                            <ItineraryRow
                                                key={i.id}
                                                item={i}
                                                trip={trip}
                                                currency={space.currency}
                                                showCost={parent}
                                                onToggle={role === "guest" && !manage ? undefined : () => void mutate((r) => r.toggleItem(i.id))}
                                                actions={
                                                    manage ? (
                                                        <button type="button" aria-label={`Remove ${i.title}`} onClick={() => void mutate((r) => r.removeItem(i.id))} className="text-caption hover:text-danger-ink">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    ) : undefined
                                                }
                                            />
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-3 rounded-md bg-page px-4 py-3 text-sm text-muted">Nothing planned. A day to breathe.</p>
                                )}
                            </Card>
                        );
                    })}

                    {manage && (
                        <Card>
                            <form
                                className="flex flex-wrap items-end gap-3"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    void mutate((r) => r.addDay(trip.id, newDay || suggestedNext));
                                    setNewDay("");
                                }}
                            >
                                <Field label="Another day" type="date" value={newDay || suggestedNext} onChange={(e) => setNewDay(e.target.value)} className="min-w-[180px] flex-1" />
                                <Button type="submit" variant="outline">
                                    <CalendarPlus size={16} /> Add the day
                                </Button>
                            </form>
                        </Card>
                    )}
                </div>
            )}

            {manage && aiAvailable && (
                <Section title="Ask for a draft" className="mt-8">
                    <AiPanel
                        title="Itinerary ideas"
                        hint={`Tell the companion what this family enjoys and it will draft lines for ${trip.destination}. Nothing is added until you tap Add.`}
                        busy={aiBusy}
                        error={aiError}
                        unavailable={aiBlocked}
                        actions={
                            <Button variant="outline" size="sm" onClick={() => void askForDraft()} loading={aiBusy}>
                                {draft ? "Draft again" : "Draft some days"}
                            </Button>
                        }
                    >
                        <div className="mt-3">
                            <Field label="What we're after" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="nature, church, food markets, something for a five-year-old" />
                        </div>
                        {proposals.length > 0 && (
                            <ul className="mt-4 space-y-2">
                                {proposals.map((p, n) => (
                                    <li key={`${p.title}-${n}`} className="flex items-center gap-3 rounded-md bg-card px-3 py-2.5">
                                        <span className="w-[52px] shrink-0 text-sm font-semibold tabular-nums text-live-ink">{p.time || "—"}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-md font-medium">{p.title}</span>
                                            {p.place && <span className="block text-xs text-caption">{p.place}</span>}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!days.length}
                                            onClick={() => setAddFor({ dayId: days[0]?.id ?? "", label: "the itinerary", initial: { time: p.time, title: p.title, place: p.place } })}
                                        >
                                            Add
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </AiPanel>
                </Section>
            )}

            {addFor && (
                <ItineraryItemDialog
                    open
                    onClose={() => setAddFor(null)}
                    dayId={addFor.dayId}
                    dayLabel={addFor.label}
                    localCurrency={trip.localCurrency}
                    initial={addFor.initial}
                    onSave={(input) => mutate((r) => r.addItem(trip.id, input))}
                />
            )}

            <Confirm
                open={Boolean(removeDayId)}
                title="Remove this day?"
                body="Everything planned for it goes too."
                confirmLabel="Remove the day"
                danger
                onClose={() => setRemoveDayId(null)}
                onConfirm={async () => {
                    if (removeDayId) await mutate((r) => r.removeDay(removeDayId));
                }}
            />
            <p className="mt-8 text-xs leading-5 text-caption">
                Maps open in your device&apos;s own maps app rather than inside Wàfè: the app only talks to three outside services, and a map tile server is not one of them. Every stop links by coordinates
                where we have them, and by address where we don&apos;t — so the place is always findable. Today is {isoDate(new Date(`${today}T00:00:00`))}.
            </p>
        </div>
    );
}
