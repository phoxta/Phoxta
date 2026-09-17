import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Globe } from "lucide-react";
import { civilDate, slotsByDay, viewerTz, type Mentor, type Slot } from "@startup-school/core";
import { Button, Card, EmptyState, Spinner } from "@/components/ui/primitives";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { cn } from "@/lib/cn";

/**
 * Book a 1:1 with a mentor.
 *
 * Slots are always fetched, never cached: a stale grid offers times that are
 * already taken, which is a worse failure than a slow one. The repo re-checks
 * at the moment of booking for the same reason — the notice window can close
 * while the picker is open.
 *
 * Times are shown in the VIEWER's zone with the mentor's named underneath.
 * Founders book across continents and "3pm" alone has caused more missed
 * sessions than any other single thing in scheduling software.
 */

const dayLabel = (dateISO: string, tz: string): { weekday: string; day: string } => {
    const d = new Date(`${dateISO}T12:00:00Z`);
    return {
        weekday: new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: tz }).format(d),
        day: new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", timeZone: tz }).format(d),
    };
};

const timeLabel = (iso: string, tz: string): string =>
    new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));

export function BookingPanel({ mentor }: { mentor: Mentor }) {
    const { repo, mutate } = useData();
    const { toast } = useToast();
    const tz = useMemo(viewerTz, []);

    const [slots, setSlots] = useState<Slot[] | null>(null);
    const [day, setDay] = useState<string | null>(null);
    const [picked, setPicked] = useState<Slot | null>(null);
    const [agenda, setAgenda] = useState("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setSlots(null);
        const from = new Date();
        const to = new Date(Date.now() + (mentor.horizonDays ?? 28) * 86400000);
        try {
            const s = await repo.mentorSlots(mentor.id, from.toISOString(), to.toISOString());
            setSlots(s);
        } catch {
            setSlots([]);
        }
    }, [mentor.horizonDays, mentor.id, repo]);

    useEffect(() => {
        void load();
    }, [load]);

    const days = useMemo(() => (slots ? slotsByDay(slots, tz) : []), [slots, tz]);

    // Keep the chosen day valid as the grid reloads under it.
    useEffect(() => {
        if (!days.length) return;
        if (!day || !days.some((d) => d.date === day)) setDay(days[0].date);
    }, [day, days]);

    const shown = days.find((d) => d.date === day);

    if (!mentor.bookable) return null;

    const confirm = async () => {
        if (!picked) return;
        setSaving(true);
        try {
            await mutate((r) => r.bookSlot(mentor.id, picked.startsAt, tz, agenda.trim()));
            toast(`Booked with ${mentor.name.split(" ")[0]} — ${timeLabel(picked.startsAt, tz)}`);
            setPicked(null);
            setAgenda("");
            await load();
        } catch (e) {
            // The overlap constraint speaks here, and it is worth showing plainly:
            // somebody took this slot between rendering and confirming.
            toast(e instanceof Error ? e.message : "That time is no longer available");
            await load();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="mb-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[18px] font-semibold">
                    <CalendarClock size={18} className="text-brand" /> Book a 1:1
                </h2>
                <p className="flex items-center gap-1.5 text-[12px] text-caption">
                    <Globe size={12} />
                    {mentor.sessionMin ?? 30} min · times in {tz.replace(/_/g, " ")}
                </p>
            </div>

            {slots === null ? (
                <div className="flex items-center gap-2 py-6 text-[14px] text-muted">
                    <Spinner /> Finding open times…
                </div>
            ) : !days.length ? (
                <EmptyState
                    title="No open times"
                    body={`${mentor.name.split(" ")[0]} has nothing free in the next ${mentor.horizonDays ?? 28} days. Try the group sessions, or message them.`}
                />
            ) : (
                <>
                    {/* Days */}
                    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                        {days.map((d) => {
                            const { weekday, day: dd } = dayLabel(d.date, tz);
                            const on = d.date === day;
                            return (
                                <button
                                    key={d.date}
                                    type="button"
                                    onClick={() => { setDay(d.date); setPicked(null); }}
                                    aria-pressed={on}
                                    className={cn(
                                        "shrink-0 rounded-xl border px-3.5 py-2 text-center transition-colors",
                                        on ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-card text-muted hover:border-line-strong",
                                    )}
                                >
                                    <span className="block text-[11px] font-medium uppercase tracking-wide">{weekday}</span>
                                    <span className="block text-[14px] font-semibold">{dd}</span>
                                    <span className="block text-[11px] text-caption">{d.slots.length} free</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Times */}
                    <div className="mb-4 flex flex-wrap gap-2">
                        {shown?.slots.map((s) => {
                            const on = picked?.startsAt === s.startsAt;
                            return (
                                <button
                                    key={s.startsAt}
                                    type="button"
                                    onClick={() => setPicked(on ? null : s)}
                                    aria-pressed={on}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors",
                                        on ? "border-brand bg-brand text-white" : "border-line bg-card text-ink hover:border-brand hover:text-brand-ink",
                                    )}
                                >
                                    {on && <Check size={13} strokeWidth={2.6} />}
                                    {timeLabel(s.startsAt, tz)}
                                </button>
                            );
                        })}
                    </div>

                    {picked && (
                        <div className="rounded-xl border border-line bg-page p-4">
                            <label htmlFor="agenda" className="mb-1.5 block text-[13px] font-semibold">
                                What do you want to get out of it?
                            </label>
                            <p className="mb-2 text-[12px] text-caption">
                                Optional, and the single thing that most improves a session. One sentence is enough.
                            </p>
                            <textarea
                                id="agenda"
                                value={agenda}
                                onChange={(e) => setAgenda(e.target.value)}
                                rows={3}
                                maxLength={400}
                                placeholder="The Lagos clinic group want it for four sites and I have no idea what to charge."
                                className="mb-3 w-full resize-y rounded-lg border border-line bg-card px-3 py-2 text-[14px] outline-none focus:border-brand"
                            />
                            <div className="flex flex-wrap items-center gap-3">
                                <Button onClick={() => void confirm()} disabled={saving}>
                                    {saving ? <Spinner /> : <Check size={15} strokeWidth={2.5} />}
                                    Confirm {timeLabel(picked.startsAt, tz)}
                                </Button>
                                <Button variant="ghost" onClick={() => setPicked(null)} disabled={saving}>
                                    Cancel
                                </Button>
                                {mentor.timezone && mentor.timezone !== tz && (
                                    <span className="text-[12px] text-caption">
                                        {timeLabel(picked.startsAt, mentor.timezone)} for {mentor.name.split(" ")[0]} ({mentor.timezone.replace(/_/g, " ")})
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {!picked && shown && (
                        <p className="text-[12px] text-caption">
                            {shown.slots.length} open on {dayLabel(shown.date, tz).weekday} {dayLabel(shown.date, tz).day}
                            {mentor.minNoticeMin ? ` · needs ${Math.round(mentor.minNoticeMin / 60)}h notice` : ""}
                        </p>
                    )}
                </>
            )}
        </Card>
    );
}

/** The civil date of a slot in the viewer's zone — shared with the sessions list. */
export const slotDay = (iso: string, tz: string): string => civilDate(new Date(iso), tz);
