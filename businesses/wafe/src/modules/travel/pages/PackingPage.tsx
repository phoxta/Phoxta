import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Luggage, Plus, Sparkles } from "lucide-react";
import type { Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { pct } from "@/lib/format";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, EmptyModule, MemberAvatar, Notice, PageTitle, Section } from "@/components/shared";
import { Menu } from "@/components/ui/overlay";
import { Button, Card, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import travelModule from "../module";
import { listFor, listsOf, packedCount, packingProgress, tripDates, tripHref, travellersOf, tripNights, tripWhen } from "../derive";
import { PACKING_TEMPLATE, PACKING_TEMPLATES, PACK_CATEGORIES, PACK_CATEGORY, type PackingItem, type PackingList, type PackingTemplate, type TravelState, type Trip, type WardrobeSlice } from "../types";
import { AllPacked, BackLink, OfflineBanner, PackingRow } from "../components/pieces";
import { PackingItemDialog } from "../components/dialogs";

/**
 * The packing screen — the one page in Wàfè that is used with a suitcase open
 * on the floor and half a bar of signal.
 *
 * A parent sees every traveller's bag at once, generates the missing lists
 * from the trip's template, and pulls real garments in from the Wardrobe so a
 * packed item still points at the thing hanging in the wardrobe (AC 9). A
 * child sees exactly one list — their own, in bigger type, with a celebration
 * and points when the last thing goes in. A guest sees their own list and
 * reads it; ticking is a write, and a guest is read-only unless a parent has
 * handed them the `travel.manage` grant.
 *
 * Ticking survives being offline: the repo applies the change locally, queues
 * it, and replays the queue on reconnect. The banner at the top says how many
 * changes are still waiting rather than pretending everything is saved.
 */

/**
 * A child is congratulated — and paid — once per list, not once per re-tick.
 * The guard is per-browser on purpose: it is a celebration, not an accounting
 * record, and the points themselves live on the member row in core.
 */
const REWARD_KEY = "wafe:travel:packed-reward:v1";
const PACKING_POINTS = 20;

function rewarded(listId: string): boolean {
    try {
        return (JSON.parse(localStorage.getItem(REWARD_KEY) ?? "[]") as string[]).includes(listId);
    } catch {
        return false;
    }
}

function markRewarded(listId: string): void {
    try {
        const all = JSON.parse(localStorage.getItem(REWARD_KEY) ?? "[]") as string[];
        if (!all.includes(listId)) localStorage.setItem(REWARD_KEY, JSON.stringify([...all, listId].slice(-50)));
    } catch {
        /* private mode: the celebration simply shows again next time */
    }
}

/** One traveller's bag, grouped so it reads like a suitcase and not a spreadsheet. */
function ListCard({
    state,
    trip,
    list,
    member,
    canTick,
    manage,
    big,
    onToggle,
    onRemoveItem,
    onAdd,
    onRebuild,
    onClear,
}: {
    state: TravelState;
    trip: Trip;
    list: PackingList;
    member: Member;
    canTick: boolean;
    manage: boolean;
    big?: boolean;
    onToggle: (item: PackingItem) => void;
    onRemoveItem: (item: PackingItem) => void;
    onAdd: () => void;
    onRebuild: () => void;
    onClear: () => void;
}) {
    const counted = packedCount(state, list.id);
    const items = state.packItems.filter((p) => p.listId === list.id).sort((a, b) => a.order - b.order);
    const groups = PACK_CATEGORIES.map((c) => ({ category: c, rows: items.filter((i) => i.category === c) })).filter((g) => g.rows.length > 0);

    return (
        <Card className={cn(big && "p-5 md:p-6")}>
            <div className="flex flex-wrap items-center gap-3">
                <MemberAvatar member={member} size={big ? "lg" : "md"} />
                <div className="min-w-0 flex-1">
                    <h2 className={cn("font-display leading-tight", big ? "text-3xl" : "text-xl")}>{big ? "Your bag" : `${member.name.split(" ")[0]}'s bag`}</h2>
                    <p className="mt-0.5 text-sm text-muted">
                        {counted.done} of {counted.total} packed · {PACKING_TEMPLATE[list.template].label}
                    </p>
                </div>
                {manage && (
                    <Menu
                        trigger={(p) => (
                            <Button variant="ghost" size="sm" {...p}>
                                More
                            </Button>
                        )}
                        items={[
                            { label: "Rebuild from the template", onSelect: onRebuild },
                            { label: "Empty this list", danger: true, onSelect: onClear },
                        ]}
                    />
                )}
            </div>

            <ProgressBar value={counted.pct} className="mt-3" label={`${member.name}'s packing`} />

            {items.length === 0 ? (
                <p className="mt-4 rounded-md bg-page px-4 py-3 text-sm text-muted">Nothing on this list yet.</p>
            ) : (
                <div className="mt-4 space-y-4">
                    {groups.map((g) => (
                        <div key={g.category}>
                            <h3 className="mb-1 text-xs font-medium uppercase tracking-[0.06em] text-muted">
                                <span aria-hidden="true">{PACK_CATEGORY[g.category].emoji}</span> {PACK_CATEGORY[g.category].label}
                            </h3>
                            <ul className={cn("divide-y divide-line", big && "text-base")}>
                                {g.rows.map((row) => (
                                    <PackingRow
                                        key={row.id}
                                        item={row}
                                        canTick={canTick}
                                        onToggle={() => onToggle(row)}
                                        onRemove={canTick ? () => onRemoveItem(row) : undefined}
                                    />
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            {counted.total > 0 && counted.done === counted.total && big && <div className="mt-4"><AllPacked points={member.points} /></div>}

            {canTick && (
                <Button variant="outline" size="sm" className="mt-4" onClick={onAdd}>
                    <Plus size={14} /> Add something
                </Button>
            )}
            {!canTick && (
                <p className="mt-4 text-xs leading-5 text-caption">
                    You can read {member.id === list.memberId ? "your" : "this"} list for {trip.title} but not change it. A parent can hand you editing from Family &rarr; Permissions.
                </p>
            )}
        </Card>
    );
}

export default function PackingPage() {
    const { id = "" } = useParams();
    const { state, mutate, reload, loading, error } = useModule(travelModule);
    const { me, role, can, members, today, mutateCore } = useSpace();
    const wardrobe = useModuleState<WardrobeSlice>("wardrobe");
    const { ask, busy: aiBusy, error: aiError, available: aiAvailable } = useAi();

    const [addTo, setAddTo] = useState<{ listId: string; member: Member } | null>(null);
    const [clearing, setClearing] = useState<{ listId: string; name: string } | null>(null);
    const [template, setTemplate] = useState<PackingTemplate | "">("");
    const [suggestions, setSuggestions] = useState<Array<{ memberName: string; items: string[] }>>([]);
    const [aiBlocked, setAiBlocked] = useState<string | null>(null);
    const [celebrated, setCelebrated] = useState(false);

    const manage = can("travel.manage");
    const parent = role === "parent";
    const trip = state?.trips.find((t) => t.id === id);

    const lists = useMemo(() => (state && trip ? listsOf(state, trip.id) : []), [state, trip]);
    const myList = state && trip ? listFor(state, trip.id, me.id) : undefined;
    const myCount = state && myList ? packedCount(state, myList.id) : null;

    /**
     * The child's reward: paid once, the moment the last thing goes into the
     * bag. `mutateCore` is the only way a module touches the member row — the
     * repo stays single-table by design.
     */
    useEffect(() => {
        if (role !== "child" || !myList || !myCount) return;
        if (myCount.total === 0 || myCount.done < myCount.total) return;
        if (rewarded(myList.id)) return;
        markRewarded(myList.id);
        setCelebrated(true);
        void mutateCore((r) => r.addPoints(me.id, PACKING_POINTS, `Packed for ${trip?.title ?? "the trip"}`));
    }, [role, myList, myCount, me.id, mutateCore, trip?.title]);

    const tick = useCallback(
        (item: PackingItem, checked: boolean) => {
            void mutate((r) => r.setPackingChecked(item.id, checked));
        },
        [mutate],
    );

    if (loading && !state) return <p className="text-md text-muted">Fetching the lists…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;
    if (!trip) {
        return (
            <div>
                <BackLink to="/live/travel">All trips</BackLink>
                <EmptyModule title="That trip isn't here" body="It may have been removed, or it may never have been shared with you." />
            </div>
        );
    }

    const people = travellersOf(state, trip.id).filter((t) => t.role === "traveller");
    const progress = packingProgress(state, trip.id);
    const missing = people.filter((p) => !lists.some((l) => l.memberId === p.memberId));

    const askForSuggestions = async (): Promise<void> => {
        setAiBlocked(null);
        try {
            const r = await ask<{ lists?: Array<{ memberName?: string; items?: string[] }> }>({
                action: "packing",
                prompt: `What should each of us pack for ${trip.title}?`,
                payload: {
                    destination: trip.destination,
                    nights: tripNights(trip),
                    template: trip.template,
                    travellers: people.map((p) => {
                        const who = members.find((m) => m.id === p.memberId);
                        return { name: who?.name ?? "Someone", ageBand: who?.ageBand ?? "adult" };
                    }),
                },
                extraContext: `Trip: ${trip.title} to ${trip.destination}, ${tripDates(trip)} (${tripWhen(trip, today)}), ${tripNights(trip)} nights, ${PACKING_TEMPLATE[trip.template].label.toLowerCase()}.`,
            });
            if (r.unavailable) {
                setAiBlocked(r.unavailable);
                return;
            }
            const rows = (r.data?.lists ?? [])
                .map((l) => ({ memberName: (l.memberName ?? "").trim(), items: (l.items ?? []).map((i) => String(i).trim()).filter(Boolean).slice(0, 12) }))
                .filter((l) => l.memberName && l.items.length);
            setSuggestions(rows);
        } catch {
            /* useAi surfaced it */
        }
    };

    // ---- Child and guest: one list, theirs -----------------------------------
    if (!parent) {
        // The same rule `canTickList` enforces in the repo: a child ticks their
        // own bag; a guest reads it unless a parent granted them travel.manage.
        const canTick = Boolean(myList) && (manage || (myList!.memberId === me.id && role === "child"));
        return (
            <div>
                <BackLink to={tripHref(trip.id)}>{trip.title}</BackLink>
                <PageTitle title="My packing list" sub={`${trip.destination} · ${tripWhen(trip, today)}`} area="live" />
                <OfflineBanner onReconnected={() => void reload()} />
                {celebrated && (
                    <Notice tone="ok" className="mb-5">
                        Everything on your list is packed — {PACKING_POINTS} points added.
                    </Notice>
                )}
                {myList ? (
                    <ListCard
                        state={state}
                        trip={trip}
                        list={myList}
                        member={me}
                        canTick={canTick}
                        manage={false}
                        big
                        onToggle={(item) => tick(item, !item.checked)}
                        onRemoveItem={(item) => void mutate((r) => r.removePackingItem(item.id))}
                        onAdd={() => setAddTo({ listId: myList.id, member: me })}
                        onRebuild={() => undefined}
                        onClear={() => undefined}
                    />
                ) : (
                    <EmptyState
                        icon={<Luggage size={20} aria-hidden="true" />}
                        title="Your list isn't ready yet"
                        body="A parent makes the lists a fortnight before you go. When yours appears you can tick things off as you pack them — even with no signal."
                    />
                )}
                {addTo && (
                    <PackingItemDialog
                        open
                        onClose={() => setAddTo(null)}
                        member={addTo.member}
                        wardrobe={wardrobe}
                        onSave={(input) => mutate((r) => r.addPackingItem(addTo.listId, input))}
                    />
                )}
            </div>
        );
    }

    // ---- Parent: every bag ---------------------------------------------------
    return (
        <div>
            <BackLink to={tripHref(trip.id)}>{trip.title}</BackLink>
            <PageTitle
                title="Packing"
                sub={`${trip.destination} · ${tripDates(trip)} · a list each, generated from the trip's template and tickable offline.`}
                area="live"
                actions={
                    manage && missing.length > 0 ? (
                        <Button onClick={() => void mutate((r) => r.generatePacking(trip.id, template || undefined))}>
                            <Luggage size={16} /> Make the {missing.length} missing {missing.length === 1 ? "list" : "lists"}
                        </Button>
                    ) : undefined
                }
            />

            <OfflineBanner onReconnected={() => void reload()} />

            <Card className="mb-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-base font-semibold">
                            {progress.generated} of {progress.travellers} {progress.travellers === 1 ? "list" : "lists"} made
                        </p>
                        <p className="mt-0.5 text-sm text-muted">
                            {progress.items ? `${progress.packed} of ${progress.items} things packed · ${pct(progress.packed, progress.items)}% of the bags done` : "Nothing on the lists yet."}
                        </p>
                    </div>
                    {manage && (
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Generate from</span>
                            <select
                                value={template || trip.template}
                                onChange={(e) => setTemplate(e.target.value as PackingTemplate)}
                                className="h-11 rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                            >
                                {PACKING_TEMPLATES.map((t) => (
                                    <option key={t} value={t}>
                                        {PACKING_TEMPLATE[t].label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
                {progress.items > 0 && <ProgressBar value={pct(progress.packed, progress.items)} className="mt-3" label="Every bag" />}
                <p className="mt-3 text-xs leading-5 text-caption">{PACKING_TEMPLATE[template || trip.template].note}</p>
            </Card>

            {missing.length > 0 && (
                <Section title="No list yet">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {missing.map((p) => {
                            const who = members.find((m) => m.id === p.memberId);
                            if (!who) return null;
                            return (
                                <Card as="li" key={p.id} className="flex items-center gap-3">
                                    <MemberAvatar member={who} size="md" />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-md font-semibold">{who.name}</div>
                                        <div className="text-xs text-caption">Nothing to pack from yet</div>
                                    </div>
                                    {manage && (
                                        <Button variant="outline" size="sm" onClick={() => void mutate((r) => r.generatePackingFor(trip.id, who.id, template || undefined))}>
                                            Make it
                                        </Button>
                                    )}
                                </Card>
                            );
                        })}
                    </ul>
                </Section>
            )}

            {lists.length === 0 && missing.length === 0 ? (
                <EmptyModule title="Nobody is travelling yet" body="Add the travellers on the trip page and their lists can be generated from here." />
            ) : (
                <Section title="The bags">
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                        {lists.map((list) => {
                            const who = members.find((m) => m.id === list.memberId);
                            if (!who) return null;
                            return (
                                <ListCard
                                    key={list.id}
                                    state={state}
                                    trip={trip}
                                    list={list}
                                    member={who}
                                    canTick={manage}
                                    manage={manage}
                                    onToggle={(item) => tick(item, !item.checked)}
                                    onRemoveItem={(item) => void mutate((r) => r.removePackingItem(item.id))}
                                    onAdd={() => setAddTo({ listId: list.id, member: who })}
                                    onRebuild={() => void mutate((r) => r.generatePackingFor(trip.id, who.id, template || undefined))}
                                    onClear={() => setClearing({ listId: list.id, name: who.name })}
                                />
                            );
                        })}
                    </div>
                </Section>
            )}

            {manage && aiAvailable && (
                <Section title="Ask the companion">
                    <Card className="bg-brand-soft/60">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 text-base font-semibold">
                                <Sparkles size={15} className="text-brand" aria-hidden="true" /> Packing suggestions
                            </h3>
                            <Button variant="outline" size="sm" onClick={() => void askForSuggestions()} loading={aiBusy}>
                                {suggestions.length ? "Suggest again" : "Suggest by climate and length"}
                            </Button>
                        </div>
                        {!suggestions.length && !aiBusy && (
                            <p className="text-sm leading-5 text-muted">
                                It knows where we&apos;re going, for how long, and who is coming — nothing else. Everything it offers is a proposal until you tap Add.
                            </p>
                        )}
                        {aiBusy && <p className="text-sm text-muted">Thinking about the weather…</p>}
                        {aiBlocked && <p className="mt-2 text-sm text-muted">{aiBlocked}</p>}
                        {aiError && !aiBlocked && <p className="mt-2 text-sm text-danger-ink">{aiError}</p>}
                        {suggestions.length > 0 && (
                            <div className="mt-3 space-y-4">
                                {suggestions.map((s) => {
                                    const who = members.find((m) => m.name.toLowerCase().startsWith(s.memberName.toLowerCase().split(" ")[0] ?? ""));
                                    const list = who ? lists.find((l) => l.memberId === who.id) : undefined;
                                    return (
                                        <div key={s.memberName}>
                                            <div className="mb-1.5 flex items-center gap-2">
                                                <span className="text-sm font-semibold">{who?.name ?? s.memberName}</span>
                                                {!list && <Tag tone="warn">No list yet</Tag>}
                                            </div>
                                            <ul className="flex flex-wrap gap-2">
                                                {s.items.map((item) => (
                                                    <li key={item}>
                                                        <button
                                                            type="button"
                                                            disabled={!list}
                                                            onClick={() => list && void mutate((r) => r.addPackingItem(list.id, { item }))}
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-card px-3 text-sm font-medium hover:border-brand disabled:opacity-40"
                                                        >
                                                            <Plus size={13} aria-hidden="true" /> {item}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                                <p className="text-2xs text-caption">A suggestion, not a change. Nothing is saved until you add it.</p>
                            </div>
                        )}
                    </Card>
                </Section>
            )}

            <p className="mt-8 max-w-2xl text-xs leading-5 text-caption">
                Items pulled from the Wardrobe stay linked to the real garment, so &quot;the blue ankara&quot; on this list is the blue ankara in the wardrobe. Ticks made with no signal are kept and
                replayed the moment you&apos;re back.
            </p>

            {addTo && (
                <PackingItemDialog
                    open
                    onClose={() => setAddTo(null)}
                    member={addTo.member}
                    wardrobe={wardrobe}
                    onSave={(input) => mutate((r) => r.addPackingItem(addTo.listId, input))}
                />
            )}

            <Confirm
                open={Boolean(clearing)}
                title={clearing ? `Empty ${clearing.name.split(" ")[0]}'s list?` : "Empty the list?"}
                body="Every item goes, including anything added by hand. You can generate a fresh one from the template afterwards."
                confirmLabel="Empty the list"
                danger
                onClose={() => setClearing(null)}
                onConfirm={async () => {
                    if (clearing) await mutate((r) => r.clearPackingList(clearing.listId));
                }}
            />
        </div>
    );
}
