import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Plus, Sparkles, Wand2 } from "lucide-react";
import type { Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { weekStart } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { EmptyModule, MemberAvatar, Notice, PageTitle } from "@/components/shared";
import { Button, Card, EmptyState, ProgressBar } from "@/components/ui/primitives";
import wardrobeModule from "../module";
import { BASE, entryFor, outfitById, outfitItems, shiftWeek, uniformOutfit, weekDates } from "../derive";
import { OCCASION } from "../types";
import type { ScheduleEntry, WardrobeState } from "../types";
import { ScheduleDialog } from "../components/dialogs";
import { ItemStrip } from "../components/pieces";

/**
 * The week, laid out.
 *
 * This is the screen the module is worth opening for on a Sunday evening: five
 * people, seven mornings, decided once. A parent sees the household as a grid
 * and can fill a child's school week from their everyday outfit in one tap; a
 * child sees their own seven days, large, and may choose for themselves.
 *
 * Whatever is on today's cell is what the dashboard says the person is wearing
 * (AC 1) — there is no second source for it.
 */

const DAY_LABEL = (iso: string): string => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" });
const DAY_NUM = (iso: string): string => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function SchedulePage() {
    const { state, mutate, loading, error } = useModule(wardrobeModule);
    const { me, role, can, members, today } = useSpace();
    const { toast } = useToast();

    const manage = can("wardrobe.manage");
    const child = role === "child";
    const guest = role === "guest";

    const [anchor, setAnchor] = useState<string>(() => weekStart(`${today}T00:00:00`));
    const [cell, setCell] = useState<{ memberId: string; date: string } | null>(null);

    const days = useMemo(() => weekDates(anchor), [anchor]);
    const people = useMemo(() => (child ? [me] : members.filter((m) => m.role !== "guest")), [child, me, members]);

    if (guest) {
        return (
            <div>
                <PageTitle title="The week" area="live" />
                <EmptyModule title="This one stays with the family" body="What the household wears each day is private to them." />
            </div>
        );
    }
    if (loading && !state) return <p className="text-md text-muted">Reading the week…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const thisWeek = weekStart(`${today}T00:00:00`) === anchor;
    const openCell = cell ? { member: members.find((m) => m.id === cell.memberId), entry: entryFor(state, cell.memberId, cell.date) } : null;
    const cellOutfits = cell ? state.outfits.filter((o) => o.memberId === cell.memberId) : [];

    const fill = async (memberId: string): Promise<void> => {
        const uniform = uniformOutfit(state, memberId);
        if (!uniform) {
            toast("Mark one outfit as the everyday one first.", "danger");
            return;
        }
        await mutate(async (r) => {
            const made = await r.fillWeek(memberId, anchor, uniform.id, [0, 1, 2, 3, 4], OCCASION[uniform.occasion].label);
            return made;
        });
        toast("Monday to Friday laid out.", "success");
    };

    const save = async (outfitId: string, label: string): Promise<void> => {
        if (!cell) return;
        await mutate((r) => r.setSchedule(cell.memberId, cell.date, outfitId, label));
    };

    const clear = async (): Promise<void> => {
        if (!cell) return;
        await mutate((r) => r.clearSchedule(cell.memberId, cell.date));
    };

    const toggleWorn = async (entry: ScheduleEntry): Promise<void> => {
        await mutate((r) => r.markScheduleWorn(entry.id, !entry.wornAt));
    };

    return (
        <div>
            <PageTitle
                title={child ? "My week" : "The week, laid out"}
                sub={child ? "What you're wearing each day. Tap a day to change it." : "One outfit per person per day. Five minutes on a Sunday is five arguments you don't have."}
                area="live"
                actions={
                    <Link to={BASE} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-md font-semibold">
                        <ArrowLeft size={16} aria-hidden="true" /> The closet
                    </Link>
                }
            />

            <div className="mb-5 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="md" onClick={() => setAnchor(shiftWeek(anchor, -1))} aria-label="The week before">
                    <ChevronLeft size={16} aria-hidden="true" />
                </Button>
                <span className="text-md font-semibold">
                    {thisWeek ? "This week" : `Week of ${DAY_NUM(days[0])}`}
                    <span className="ml-2 font-normal text-caption">
                        {DAY_NUM(days[0])} – {DAY_NUM(days[6])}
                    </span>
                </span>
                <Button variant="outline" size="md" onClick={() => setAnchor(shiftWeek(anchor, 1))} aria-label="The week after">
                    <ChevronRight size={16} aria-hidden="true" />
                </Button>
                {!thisWeek && (
                    <Button variant="ghost" size="md" onClick={() => setAnchor(weekStart(`${today}T00:00:00`))}>
                        Back to this week
                    </Button>
                )}
            </div>

            {people.length === 0 && <EmptyState title="Nobody to lay out for" body="Add the family in Family → People first." />}

            <ul className="grid grid-cols-[minmax(0,1fr)] gap-4">
                {people.map((m) => (
                    <MemberWeek
                        key={m.id}
                        member={m}
                        state={state}
                        days={days}
                        today={today}
                        big={child}
                        canEdit={manage || m.id === me.id}
                        hasUniform={Boolean(uniformOutfit(state, m.id))}
                        onPick={(date) => setCell({ memberId: m.id, date })}
                        onFill={() => void fill(m.id)}
                        onToggleWorn={(e) => void toggleWorn(e)}
                    />
                ))}
            </ul>

            <ScheduleDialog
                open={Boolean(cell)}
                onClose={() => setCell(null)}
                member={openCell?.member}
                date={cell?.date ?? today}
                entryOutfitId={openCell?.entry?.outfitId}
                entryLabel={openCell?.entry?.eventLabel}
                outfits={cellOutfits}
                items={state.items}
                onSave={save}
                onClear={clear}
            />
        </div>
    );
}

function MemberWeek({ member, state, days, today, big, canEdit, hasUniform, onPick, onFill, onToggleWorn }: { member: Member; state: WardrobeState; days: string[]; today: string; big: boolean; canEdit: boolean; hasUniform: boolean; onPick: (date: string) => void; onFill: () => void; onToggleWorn: (e: ScheduleEntry) => void }) {
    const planned = days.filter((d) => entryFor(state, member.id, d)).length;
    return (
        <Card as="li">
            <div className="mb-3 flex flex-wrap items-center gap-3">
                <MemberAvatar member={member} size="sm" />
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold">{member.name}</h2>
                    <p className="text-xs text-caption">{planned} of 7 days decided</p>
                </div>
                <div className="w-28">
                    <ProgressBar value={(planned / 7) * 100} label={`${member.name}: days decided`} />
                </div>
                {canEdit && hasUniform && (
                    <Button size="sm" variant="outline" onClick={onFill}>
                        <Wand2 size={14} aria-hidden="true" /> Fill Mon–Fri
                    </Button>
                )}
            </div>

            <div className={cn("no-scrollbar -mx-1 overflow-x-auto px-1", big && "sm:overflow-visible")}>
                <ul className={cn("flex gap-2", big && "grid-cols-[minmax(0,1fr)] sm:grid sm:grid-cols-2 lg:grid-cols-4")}>
                    {days.map((d) => {
                        const entry = entryFor(state, member.id, d);
                        const outfit = entry ? outfitById(state, entry.outfitId) : undefined;
                        const items = outfitItems(state, outfit);
                        const isToday = d === today;
                        const past = d < today;
                        return (
                            <li key={d} className={cn("shrink-0", big ? "w-56 sm:w-auto" : "w-[132px]")}>
                                <button
                                    type="button"
                                    onClick={() => canEdit && onPick(d)}
                                    disabled={!canEdit}
                                    className={cn("flex h-full w-full flex-col items-start gap-1.5 rounded-md border p-2.5 text-left transition-colors", isToday ? "border-brand bg-brand-soft" : "border-line bg-page", canEdit && "hover:border-line-strong", past && !isToday && "opacity-70")}
                                >
                                    <span className="flex w-full items-baseline justify-between gap-1">
                                        <span className={cn("text-xs font-semibold uppercase tracking-[0.04em]", isToday ? "text-brand-ink" : "text-muted")}>{isToday ? "Today" : DAY_LABEL(d)}</span>
                                        <span className="text-2xs text-caption">{DAY_NUM(d)}</span>
                                    </span>
                                    {outfit ? (
                                        <>
                                            <span className={cn("block w-full truncate font-semibold", big ? "text-base" : "text-sm")}>{outfit.name}</span>
                                            {entry?.eventLabel && <span className="block w-full truncate text-2xs text-caption">{entry.eventLabel}</span>}
                                            <ItemStrip items={items} max={big ? 5 : 3} size={big ? 40 : 28} className="mt-0.5" />
                                        </>
                                    ) : (
                                        <span className="flex flex-1 items-center gap-1 py-3 text-xs text-caption">
                                            <Plus size={13} aria-hidden="true" /> {canEdit ? "Lay it out" : "Nothing yet"}
                                        </span>
                                    )}
                                </button>
                                {entry && (isToday || past) && canEdit && (
                                    <button type="button" onClick={() => onToggleWorn(entry)} aria-pressed={Boolean(entry.wornAt)} className={cn("mt-1.5 inline-flex h-7 w-full items-center justify-center gap-1 rounded-full border text-2xs font-semibold", entry.wornAt ? "border-mint bg-mint-soft text-mint" : "border-line-strong text-muted hover:text-ink")}>
                                        {entry.wornAt ? <Check size={12} aria-hidden="true" /> : <Sparkles size={12} aria-hidden="true" />}
                                        {entry.wornAt ? "Worn" : "Mark worn"}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </Card>
    );
}
