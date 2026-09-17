import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Gift, Luggage, Plus, Shirt, ShoppingBag, Sparkles, Trash2 } from "lucide-react";
import type { Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, DateText, EmptyModule, MemberAvatar, Money, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Button, Card, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import wardrobeModule from "../module";
import { useWardrobeAi } from "../ai";
import { BASE, capsuleRows, closetStats, filterItems, itemLine, linkableTrips, openDonations, ownersOf, undecided, wearingToday } from "../derive";
import type { CapsuleRow, ItemFilter } from "../derive";
import { CATEGORY, COLOUR, OCCASION } from "../types";
import type { Capsule, DonateJob, NewCapsule, NewItem, TravelSlice, WardrobeItem, WardrobeState, WishStatus } from "../types";
import { CapsuleDialog, CompleteDonationDialog, ItemDialog, OutgrownDialog } from "../components/dialogs";
import { ColourDot, FilterBar, ItemCard, ItemStrip } from "../components/pieces";

/**
 * The closet.
 *
 * A hundred and eighteen garments is not a list, it is a wardrobe — so the page
 * opens on the photographs and lets the filters do the talking. Three views
 * sit behind one tab strip because they are three states of the same object:
 * what we own, what is packed, and what is on its way out of the house.
 *
 * A child gets their own closet and nothing else, in warmer words and without
 * the pipeline: nobody's nine-year-old needs to see the charity bag.
 */

type View = "closet" | "capsules" | "outgrown";

const WISH_LABEL: Record<WishStatus, string> = { open: "On the list", sent: "Ordered", bought: "Bought" };

export default function ClosetPage() {
    const { state, mutate, loading, error } = useModule(wardrobeModule);
    const { me, role, can, members, space, today } = useSpace();
    const travel = useModuleState<TravelSlice>("travel");
    const { toast } = useToast();
    const [params, setParams] = useSearchParams();
    const ai = useWardrobeAi(state);

    const manage = can("wardrobe.manage");
    const child = role === "child";
    const guest = role === "guest";
    const raw = params.get("view");
    const view: View = raw === "capsules" ? "capsules" : raw === "outgrown" && manage ? "outgrown" : "closet";
    const setView = (v: View): void => setParams(v === "closet" ? {} : { view: v }, { replace: true });

    const [filter, setFilter] = useState<ItemFilter>({ status: "wearable" });
    const [addOpen, setAddOpen] = useState(false);
    const [outgrown, setOutgrown] = useState<WardrobeItem | null>(null);
    const [capsule, setCapsule] = useState<Capsule | null>(null);
    const [capsuleOpen, setCapsuleOpen] = useState(false);
    const [dropping, setDropping] = useState<DonateJob | null>(null);
    const [removingCapsule, setRemovingCapsule] = useState<Capsule | null>(null);

    const visible = useMemo(() => (state ? filterItems(state.items, child ? { ...filter, owner: me.id } : filter) : []), [state, filter, child, me.id]);
    const stats = useMemo(() => (state ? closetStats(child ? state.items.filter((i) => i.ownerMemberId === me.id) : state.items, today) : null), [state, child, me.id, today]);
    const owners = useMemo(() => (state ? ownersOf(state, members) : []), [state, members]);
    const capsules = useMemo(() => (state ? capsuleRows(state, travel) : []), [state, travel]);
    const trips = useMemo(() => linkableTrips(travel), [travel]);
    const wearers = useMemo(() => members.filter((m) => m.role !== "guest"), [members]);
    const kids = useMemo(() => members.filter((m) => m.role === "child"), [members]);

    if (guest) {
        return (
            <div>
                <PageTitle title="Wardrobe" sub="The family's closet is theirs." area="live" />
                <EmptyModule title="This one stays with the family" body="Wardrobes, sizes and hand-me-downs are private to the household. You will still see the trips and the events you have been given." />
            </div>
        );
    }
    if (loading && !state) return <p className="text-md text-muted">Opening the wardrobe…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state || !stats) return null;

    const wearing = wearingToday(state, me.id, today);
    const undecidedItems = undecided(state);
    const openJobs = openDonations(state);

    const add = async (v: NewItem): Promise<void> => {
        await mutate((r) => r.addItem(v));
        toast(`${v.name} is in the closet.`, "success");
    };
    const favourite = async (id: string, on: boolean): Promise<void> => {
        await mutate((r) => r.setFavourite(id, on));
    };
    const saveCapsule = async (v: NewCapsule): Promise<void> => {
        if (capsule) await mutate((r) => r.updateCapsule(capsule.id, { ...v, tripId: v.tripId ?? null }));
        else await mutate((r) => r.createCapsule(v));
        toast(capsule ? "Capsule saved." : "Capsule pulled together.", "success");
    };

    const tabs: Array<{ id: View; label: string; n?: number }> = [
        { id: "closet", label: child ? "My clothes" : "The closet", n: stats.wearable },
        // A child sees their own capsule too — "what I am taking to Lagos" is theirs,
        // and read-only, because CapsulesView only offers the controls to a parent.
        { id: "capsules", label: child ? "My trip bag" : "Trip capsules", n: state.capsules.length },
        ...(manage ? ([{ id: "outgrown", label: "Outgrown", n: undecidedItems.length + openJobs.length }] as Array<{ id: View; label: string; n?: number }>) : []),
    ];

    return (
        <div>
            <PageTitle
                title={child ? "My closet" : "Wardrobe & closet manager"}
                sub={child ? "Everything that's yours — and what's laid out for tomorrow." : "Everyone's clothes in one place: what fits, what is packed, and what has been grown out of."}
                area="live"
                actions={
                    <>
                        <Link to={`${BASE}/schedule`} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-md font-semibold">
                            <CalendarDays size={16} aria-hidden="true" /> The week
                        </Link>
                        <Link to={`${BASE}/outfits`} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-md font-semibold">
                            <Shirt size={16} aria-hidden="true" /> Outfits
                        </Link>
                        <Button onClick={() => setAddOpen(true)}>
                            <Plus size={16} aria-hidden="true" /> Add a garment
                        </Button>
                    </>
                }
            />

            {child && wearing?.outfit && (
                <Card className="mb-6 flex flex-wrap items-center gap-4 bg-live-soft">
                    <span className="text-[32px] leading-none" aria-hidden="true">
                        👕
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold uppercase tracking-[0.06em] text-live-ink">Today</span>
                        <span className="block font-display text-3xl leading-7">{wearing.outfit.name}</span>
                        <span className="block text-md text-muted">{wearing.entry.eventLabel || OCCASION[wearing.outfit.occasion].label}</span>
                    </span>
                    <ItemStrip items={wearing.items} max={5} size={48} />
                </Card>
            )}

            <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1" role="tablist" aria-label="Wardrobe views">
                {tabs.map((t) => (
                    <button key={t.id} type="button" role="tab" aria-selected={view === t.id} onClick={() => setView(t.id)} className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-md font-semibold", view === t.id ? "border-ink bg-ink text-white" : "border-line-strong bg-card text-muted hover:text-ink")}>
                        {t.label}
                        {typeof t.n === "number" && <span className={cn("text-xs tabular-nums", view === t.id ? "text-white/70" : "text-caption")}>{t.n}</span>}
                    </button>
                ))}
            </div>

            {view === "closet" && (
                <>
                    <ul className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <li>
                            <Stat label="In the wardrobe" value={stats.wearable} sub={`${stats.total} garments in all`} tone="live" />
                        </li>
                        <li>
                            <Stat label="Favourites" value={stats.favourites} sub="The ones actually worn" />
                        </li>
                        <li>
                            <Stat label="In the wash" value={stats.inLaundry} sub={stats.inLaundry ? "Not available tomorrow" : "Nothing waiting"} tone={stats.inLaundry ? "warn" : "neutral"} />
                        </li>
                        <li>
                            <Stat label="Outgrown" value={stats.outgrown + stats.toDonate} sub={undecidedItems.length ? `${undecidedItems.length} still undecided` : "All decided"} tone={undecidedItems.length ? "warn" : "ok"} />
                        </li>
                    </ul>

                    {!child && owners.length > 1 && (
                        <ul className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
                            <li>
                                <button type="button" aria-pressed={!filter.owner} onClick={() => setFilter({ ...filter, owner: "" })} className={cn("h-10 shrink-0 rounded-full border px-4 text-sm font-semibold", !filter.owner ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-card text-muted")}>
                                    Everyone
                                </button>
                            </li>
                            {owners.map((m) => (
                                <li key={m.id}>
                                    <button type="button" aria-pressed={filter.owner === m.id} onClick={() => setFilter({ ...filter, owner: m.id })} className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-full border pl-1.5 pr-4 text-sm font-semibold", filter.owner === m.id ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-card text-muted")}>
                                        <MemberAvatar member={m} size="xs" />
                                        {m.name.split(" ")[0]}
                                        <span className="text-xs font-normal text-caption">{state.items.filter((i) => i.ownerMemberId === m.id).length}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <FilterBar filter={filter} onChange={setFilter} owners={child ? undefined : owners.map((m) => ({ id: m.id, name: m.name }))} />

                    {stats.byColour.length > 2 && (
                        <ul className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1" aria-label="Filter by colour">
                            {stats.byColour.slice(0, 12).map((c) => (
                                <li key={c.colour}>
                                    <button type="button" aria-pressed={filter.colour === c.colour} onClick={() => setFilter({ ...filter, colour: filter.colour === c.colour ? "" : c.colour })} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium", filter.colour === c.colour ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-card text-muted hover:text-ink")}>
                                        <ColourDot colour={c.colour} />
                                        {COLOUR[c.colour].label}
                                        <span className="tabular-nums text-caption">{c.n}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {visible.length ? (
                        <>
                            <p className="mb-3 text-sm text-caption">
                                {visible.length} garment{visible.length === 1 ? "" : "s"}
                            </p>
                            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                {visible.map((i) => (
                                    <ItemCard key={i.id} item={i} onFavourite={(on) => void favourite(i.id, on)} />
                                ))}
                            </ul>
                        </>
                    ) : (
                        <EmptyState icon={<Shirt size={20} aria-hidden="true" />} title={state.items.length ? "Nothing matches those filters" : "The closet is empty"} body={state.items.length ? "Widen the search, or clear a filter or two." : "Photograph a few things and the outfits, the week and the hand-me-downs all follow from them."} action={state.items.length ? <Button variant="outline" onClick={() => setFilter({ status: "wearable" })}>Clear the filters</Button> : <Button onClick={() => setAddOpen(true)}>Add the first garment</Button>} />
                    )}

                    {!child && stats.unworn.length > 0 && (
                        <Section title="Not worn in a long time" className="mt-10">
                            <p className="mb-3 text-sm text-muted">Four months or more. Worth asking whether it still earns its hanger.</p>
                            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                {stats.unworn.slice(0, 5).map((i) => (
                                    <ItemCard key={i.id} item={i} footer={<span className="mt-1 block text-2xs text-caption">{i.lastWorn ? `Last worn ${shortDate(i.lastWorn)}` : "Never worn"}</span>} />
                                ))}
                            </ul>
                        </Section>
                    )}
                </>
            )}

            {view === "capsules" && (
                <CapsulesView
                    rows={capsules}
                    manage={manage}
                    onNew={() => {
                        setCapsule(null);
                        setCapsuleOpen(true);
                    }}
                    onEdit={(c) => {
                        setCapsule(c);
                        setCapsuleOpen(true);
                    }}
                    onRemove={setRemovingCapsule}
                    members={members}
                />
            )}

            {view === "outgrown" && manage && (
                <OutgrownView
                    state={state}
                    members={members}
                    currency={space.currency}
                    onDecide={setOutgrown}
                    onDrop={setDropping}
                    onWishStatus={async (id, status) => {
                        await mutate((r) => r.updateWish(id, { status }));
                    }}
                    onWishRemove={async (id) => {
                        await mutate((r) => r.removeWish(id));
                    }}
                />
            )}

            <ItemDialog open={addOpen} onClose={() => setAddOpen(false)} owners={child ? [me] : wearers} defaultOwner={child ? me.id : filter.owner || me.id} canReassign={manage} onSubmit={add} />

            <OutgrownDialog
                open={Boolean(outgrown)}
                onClose={() => setOutgrown(null)}
                item={outgrown}
                candidates={kids.filter((k) => k.id !== outgrown?.ownerMemberId)}
                defaultAssignee={me.id}
                currency={space.currency}
                onSubmit={async (d) => {
                    if (!outgrown) return;
                    await mutate((r) => r.markOutgrown(outgrown.id, d));
                    toast(d.handDownToMemberId ? "Handed down." : "Decided — and written everywhere it needed to be.", "success");
                }}
            />

            <CapsuleDialog
                open={capsuleOpen}
                onClose={() => setCapsuleOpen(false)}
                capsule={capsule}
                members={wearers}
                defaultMember={capsule?.memberId ?? me.id}
                items={state.items}
                trips={trips}
                onSubmit={saveCapsule}
                onSuggest={(memberId, tripLabel) => ai.suggestCapsule(memberId, tripLabel, capsule?.season ?? "summer")}
                suggesting={ai.busy}
            />

            <CompleteDonationDialog
                open={Boolean(dropping)}
                onClose={() => setDropping(null)}
                title={dropping?.title ?? ""}
                itemCount={dropping?.itemIds.length ?? 0}
                currency={space.currency}
                onSubmit={async (giving) => {
                    if (!dropping) return;
                    await mutate((r) => r.completeDonation(dropping.id, giving));
                    toast(giving ? "Dropped off, and on the giving ledger." : "Dropped off.", "success");
                }}
            />

            <Confirm
                open={Boolean(removingCapsule)}
                title="Undo this capsule?"
                body="The clothes stay in the closet — only the packing selection goes."
                confirmLabel="Remove the capsule"
                danger
                onClose={() => setRemovingCapsule(null)}
                onConfirm={async () => {
                    if (!removingCapsule) return;
                    await mutate((r) => r.removeCapsule(removingCapsule.id));
                }}
            />

            {ai.notice && (
                <Notice tone="info" className="mt-6">
                    {ai.notice}
                </Notice>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Capsules (AC 2)
// ---------------------------------------------------------------------------

function CapsulesView({ rows, manage, members, onNew, onEdit, onRemove }: { rows: CapsuleRow[]; manage: boolean; members: Member[]; onNew: () => void; onEdit: (c: Capsule) => void; onRemove: (c: Capsule) => void }) {
    if (!rows.length) {
        return <EmptyState icon={<Luggage size={20} aria-hidden="true" />} title="No capsules yet" body="A capsule is the handful of clothes one person is taking on one trip. Build it here and the packing list picks the very same garments up." action={manage ? <Button onClick={onNew}>Pull one together</Button> : undefined} />;
    }
    return (
        <>
            {manage && (
                <div className="mb-4 flex justify-end">
                    <Button variant="outline" onClick={onNew}>
                        <Plus size={16} aria-hidden="true" /> New capsule
                    </Button>
                </div>
            )}
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                {rows.map(({ capsule, items, packed, checked, tripTitle }) => {
                    const owner = members.find((m) => m.id === capsule.memberId);
                    return (
                        <Card as="li" key={capsule.id}>
                            <div className="flex items-start gap-3">
                                <MemberAvatar member={owner} size="md" />
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg font-semibold">
                                        {capsule.name} · {owner?.name.split(" ")[0] ?? "Someone"}
                                    </h3>
                                    <p className="text-sm text-muted">
                                        {tripTitle} · {items.length} pieces
                                    </p>
                                </div>
                                {capsule.tripId ? <Tag tone="live">Linked</Tag> : <Tag tone="neutral">Not linked</Tag>}
                            </div>
                            <ItemStrip items={items} max={10} size={44} className="mt-3.5" />
                            {capsule.notes && <p className="mt-3 text-sm leading-5 text-muted">{capsule.notes}</p>}
                            <div className="mt-3.5 rounded-md bg-page px-3 py-2.5">
                                <div className="flex items-center justify-between text-xs font-medium">
                                    <span className="text-muted">On the packing list</span>
                                    <span className="tabular-nums text-caption">
                                        {packed} of {items.length}
                                        {packed > 0 && ` · ${checked} packed`}
                                    </span>
                                </div>
                                <ProgressBar value={items.length ? (packed / items.length) * 100 : 0} className="mt-2" label="Garments on the packing list" />
                                {packed === 0 && <p className="mt-2 text-xs text-caption">Nothing here has reached a packing list yet. Generate one on the trip and these garments come across by name.</p>}
                            </div>
                            {manage && (
                                <div className="mt-3 flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => onEdit(capsule)}>
                                        Edit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => onRemove(capsule)}>
                                        <Trash2 size={14} aria-hidden="true" /> Remove
                                    </Button>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </ul>
        </>
    );
}

// ---------------------------------------------------------------------------
// The outgrown pipeline (AC 4, AC 7)
// ---------------------------------------------------------------------------

function OutgrownView({ state, members, currency, onDecide, onDrop, onWishStatus, onWishRemove }: { state: WardrobeState; members: Member[]; currency: string; onDecide: (i: WardrobeItem) => void; onDrop: (d: DonateJob) => void; onWishStatus: (id: string, status: WishStatus) => Promise<void>; onWishRemove: (id: string) => Promise<void> }) {
    const undecidedItems = undecided(state);
    const jobs = state.donations;
    const first = (id: string): string => members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone";
    const givingTotalCents = state.giving.reduce((n, g) => n + g.amountCents, 0);

    return (
        <>
            <Section title="Stopped fitting" action={<span className="text-xs text-caption">{undecidedItems.length ? `${undecidedItems.length} waiting on a decision` : "All decided"}</span>}>
                {undecidedItems.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {undecidedItems.map((i) => (
                            <Card as="li" key={i.id} className="flex items-center gap-3">
                                <Link to={`${BASE}/items/${i.id}`} className="size-16 shrink-0 overflow-hidden rounded-md bg-page">
                                    {i.imageUrl ? <img src={i.imageUrl} alt={i.name} width={64} height={64} loading="lazy" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-4xl">{CATEGORY[i.category].emoji}</span>}
                                </Link>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-md font-semibold">{i.name}</p>
                                    <p className="text-xs text-caption">
                                        {first(i.ownerMemberId)} · {itemLine(i)}
                                    </p>
                                </div>
                                <Button size="sm" onClick={() => onDecide(i)}>
                                    Decide
                                </Button>
                            </Card>
                        ))}
                    </ul>
                ) : (
                    <EmptyState icon={<CheckCircle2 size={20} aria-hidden="true" />} title="Nothing waiting" body="Every garment that has stopped fitting has been handed down, replaced or bagged." />
                )}
            </Section>

            <Section title="Replacements wanted" action={<span className="text-xs text-caption">Finance picks these up as purchase requests</span>}>
                {state.wishes.length ? (
                    <ul className="grid gap-2">
                        {state.wishes.map((w) => (
                            <Card as="li" key={w.id} className="flex flex-wrap items-center gap-3">
                                <ShoppingBag size={18} className="shrink-0 text-caption" aria-hidden="true" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-md font-semibold">{w.name}</p>
                                    <p className="text-xs text-caption">
                                        For {first(w.forMemberId)} · {w.size || "no size given"} · {w.priceCents ? <Money cents={w.priceCents} currency={currency} /> : "no price yet"}
                                    </p>
                                    {w.note && <p className="mt-1 text-xs leading-5 text-muted">{w.note}</p>}
                                </div>
                                <select value={w.status} onChange={(e) => void onWishStatus(w.id, e.target.value as WishStatus)} aria-label={`Status of ${w.name}`} className="h-9 rounded-full border border-line-strong bg-card px-3 text-sm">
                                    {(["open", "sent", "bought"] as WishStatus[]).map((s) => (
                                        <option key={s} value={s}>
                                            {WISH_LABEL[s]}
                                        </option>
                                    ))}
                                </select>
                                <button type="button" onClick={() => void onWishRemove(w.id)} aria-label={`Remove ${w.name}`} className="grid size-9 place-items-center rounded-full text-caption hover:text-danger-ink">
                                    <Trash2 size={15} aria-hidden="true" />
                                </button>
                            </Card>
                        ))}
                    </ul>
                ) : (
                    <EmptyState title="Nothing on the list" body="When something stops fitting you will be offered a replacement in the same breath." />
                )}
            </Section>

            <Section title="The charity bag" action={givingTotalCents ? <span className="text-xs text-caption">Given so far: <Money cents={givingTotalCents} currency={currency} /></span> : undefined}>
                {jobs.length ? (
                    <ul className="grid gap-3">
                        {jobs.map((d) => (
                            <Card as="li" key={d.id} className={cn("flex flex-wrap items-center gap-3", d.doneAt && "opacity-75")}>
                                <Gift size={18} className="shrink-0 text-caption" aria-hidden="true" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-md font-semibold">{d.title}</p>
                                    <p className="text-xs text-caption">
                                        {d.charity} · {d.itemIds.length} thing{d.itemIds.length === 1 ? "" : "s"} · {d.doneAt ? <>dropped off <DateText iso={d.doneAt} /></> : <>due <DateText iso={d.dueDate} /></>} · {first(d.assigneeMemberId)}
                                    </p>
                                    {d.note && <p className="mt-1 text-xs leading-5 text-muted">{d.note}</p>}
                                </div>
                                {d.doneAt ? (
                                    d.givingEntryId ? (
                                        <Tag tone="ok">On the giving ledger</Tag>
                                    ) : (
                                        <Tag tone="neutral">Not counted</Tag>
                                    )
                                ) : (
                                    <Button size="sm" onClick={() => onDrop(d)}>
                                        Dropped off
                                    </Button>
                                )}
                            </Card>
                        ))}
                    </ul>
                ) : (
                    <EmptyState title="No bag by the door" body="Bagging an outgrown garment opens a job here, with a date on it." />
                )}
            </Section>

            {state.giving.length > 0 && (
                <Section title="Given away">
                    <ul className="grid gap-2">
                        {state.giving.map((g) => (
                            <Card as="li" key={g.id} className="flex flex-wrap items-center gap-3">
                                <Sparkles size={16} className="shrink-0 text-live-ink" aria-hidden="true" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-md font-semibold">{g.label}</p>
                                    <p className="text-xs text-caption">
                                        {g.itemCount} things · <DateText iso={g.date} /> · {first(g.memberId)}
                                    </p>
                                </div>
                                <span className="text-base font-semibold">
                                    <Money cents={g.amountCents} currency={currency} />
                                </span>
                            </Card>
                        ))}
                    </ul>
                </Section>
            )}
        </>
    );
}
