import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, Droplets, Heart, Luggage, Pencil, Shirt, ShoppingBag, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, DateText, EmptyModule, MemberAvatar, Money, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Button, Card, Tag } from "@/components/ui/primitives";
import wardrobeModule from "../module";
import { BASE, itemById, packingLinks } from "../derive";
import { CATEGORY, COLOUR, OCCASION, SEASON, STATUS } from "../types";
import type { NewItem, TravelSlice } from "../types";
import { HandDownDialog, ItemDialog, OutgrownDialog } from "../components/dialogs";
import { ColourDot, ItemPhoto, StatusTag } from "../components/pieces";

/**
 * One garment, and everything that has happened to it.
 *
 * A coat is not a row in a table: it was somebody's, it is somebody else's now,
 * it is packed for Lagos, and one day it will stop fitting and become either
 * the next child's or somebody else's altogether. That whole life is on this
 * page, and the decision that ends it is a single button (AC 4).
 */
export default function ItemPage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const { state, mutate, loading, error } = useModule(wardrobeModule);
    const { me, role, can, members, space, today } = useSpace();
    const travel = useModuleState<TravelSlice>("travel");
    const { toast } = useToast();

    const manage = can("wardrobe.manage");
    const [editOpen, setEditOpen] = useState(false);
    const [handOpen, setHandOpen] = useState(false);
    const [outgrownOpen, setOutgrownOpen] = useState(false);
    const [removing, setRemoving] = useState(false);

    const item = state ? itemById(state, id) : undefined;
    const packing = useMemo(() => packingLinks(id, travel), [id, travel]);

    if (role === "guest") {
        return (
            <div>
                <PageTitle title="Wardrobe" area="live" />
                <EmptyModule title="This one stays with the family" body="Clothes and sizes are private to the household." />
            </div>
        );
    }
    if (loading && !state) return <p className="text-md text-muted">Finding it…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    if (!item) {
        return (
            <div>
                <PageTitle title="Not in the wardrobe" sub="It may have been handed on, donated, or it was never yours to see." area="live" />
                <Link to={BASE} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-md font-semibold text-white">
                    <ArrowLeft size={16} aria-hidden="true" /> Back to the closet
                </Link>
            </div>
        );
    }

    const owner = members.find((m) => m.id === item.ownerMemberId);
    const mine = item.ownerMemberId === me.id;
    const canEdit = manage || mine;
    const inOutfits = state.outfits.filter((o) => o.itemIds.includes(item.id));
    const capsules = state.capsules.filter((c) => c.itemIds.includes(item.id));
    const history = state.handdowns.filter((h) => h.itemId === item.id);
    const wish = state.wishes.find((w) => w.itemId === item.id);
    const bag = state.donations.find((d) => d.itemIds.includes(item.id));
    const handCandidates = members.filter((m) => m.role !== "guest" && m.id !== item.ownerMemberId);

    const save = async (v: NewItem): Promise<void> => {
        await mutate((r) => r.updateItem(item.id, v));
        toast("Saved.", "success");
    };

    return (
        <div>
            <Link to={BASE} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={15} aria-hidden="true" /> The closet
            </Link>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                <div>
                    <div className="aspect-square overflow-hidden rounded-xl bg-card">
                        <ItemPhoto item={item} w={680} h={680} />
                    </div>
                    {canEdit && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                                size="md"
                                variant={item.favourite ? "tonal" : "outline"}
                                onClick={() => void mutate((r) => r.setFavourite(item.id, !item.favourite))}
                                aria-pressed={item.favourite}
                            >
                                <Heart size={15} fill={item.favourite ? "currentColor" : "none"} aria-hidden="true" /> {item.favourite ? "A favourite" : "Favourite"}
                            </Button>
                            <Button size="md" variant={item.inLaundry ? "tonal" : "outline"} onClick={() => void mutate((r) => r.setLaundry(item.id, !item.inLaundry))} aria-pressed={item.inLaundry}>
                                <Droplets size={15} aria-hidden="true" /> {item.inLaundry ? "In the wash" : "Put in the wash"}
                            </Button>
                            <Button size="md" variant="outline" onClick={() => void mutate((r) => r.markWorn(item.id, today))}>
                                <Sparkles size={15} aria-hidden="true" /> Worn today
                            </Button>
                        </div>
                    )}
                </div>

                <div className="min-w-0">
                    <PageTitle
                        title={item.name}
                        sub={`${CATEGORY[item.category].label} · ${item.brand || "no brand noted"}`}
                        area="live"
                        actions={
                            canEdit && (
                                <Button variant="outline" onClick={() => setEditOpen(true)}>
                                    <Pencil size={16} aria-hidden="true" /> Edit
                                </Button>
                            )
                        }
                    />

                    <div className="mb-5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm font-medium">
                            <ColourDot colour={item.colour} /> {COLOUR[item.colour].label}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm font-medium">
                            <MemberAvatar member={owner} size="xs" /> {owner?.name ?? "Unassigned"}
                        </span>
                        {item.size && <Tag tone="neutral">{item.size}</Tag>}
                        <Tag tone="neutral">{SEASON[item.season].label}</Tag>
                        <StatusTag status={item.status} />
                        {item.inLaundry && <Tag tone="brand">In the wash</Tag>}
                    </div>

                    <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <li>
                            <Stat label="Worn" value={item.wearCount} sub={item.lastWorn ? `Last ${shortDate(item.lastWorn)}` : "Never logged"} />
                        </li>
                        <li>
                            <Stat label="In outfits" value={inOutfits.length} sub={inOutfits.length ? "Sets it belongs to" : "Not in a set yet"} />
                        </li>
                        <li>
                            <Stat label="Packed for" value={capsules.length} sub={capsules.length ? capsules[0].tripLabel : "No trip"} tone={capsules.length ? "live" : "neutral"} />
                        </li>
                    </ul>

                    {item.occasions.length > 0 && (
                        <p className="mb-5 text-md leading-6 text-muted">
                            Worn for {item.occasions.map((o) => OCCASION[o].label.toLowerCase()).join(", ")}. {STATUS[item.status].note}
                        </p>
                    )}

                    {(item.careNotes || item.notes) && (
                        <Card className="mb-6">
                            {item.careNotes && (
                                <p className="text-md leading-6">
                                    <span className="font-semibold">Care · </span>
                                    {item.careNotes}
                                </p>
                            )}
                            {item.notes && <p className={cn("text-md leading-6 text-muted", item.careNotes && "mt-2")}>{item.notes}</p>}
                        </Card>
                    )}

                    {manage && (
                        <div className="mb-8 flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => setHandOpen(true)}>
                                <ArrowLeftRight size={16} aria-hidden="true" /> Hand it down
                            </Button>
                            <Button variant="tonal" onClick={() => setOutgrownOpen(true)}>
                                <TriangleAlert size={16} aria-hidden="true" /> It doesn&apos;t fit any more
                            </Button>
                            <Button variant="ghost" onClick={() => setRemoving(true)}>
                                Remove from the closet
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {wish && (
                <Notice tone="info" className="mt-2">
                    <span className="font-semibold">{wish.name}</span> is {wish.status === "bought" ? "bought" : wish.status === "sent" ? "ordered" : "on the shopping list"} to replace this
                    {wish.priceCents ? (
                        <>
                            {" "}
                            · <Money cents={wish.priceCents} currency={space.currency} />
                        </>
                    ) : null}
                    .
                </Notice>
            )}

            {bag && !bag.doneAt && (
                <Notice tone="warn" className="mt-3">
                    In the bag for {bag.charity}, due <DateText iso={bag.dueDate} />.
                </Notice>
            )}

            {packing.length > 0 && (
                <Section title="On a packing list" className="mt-8">
                    <ul className="grid gap-2">
                        {packing.map((p) => (
                            <Card as="li" key={p.id} className="flex items-center gap-3">
                                <Luggage size={17} className="shrink-0 text-caption" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-md font-semibold">{p.label}</span>
                                    <span className="block text-xs text-caption">{p.tripTitle}</span>
                                </span>
                                <Tag tone={p.checked ? "ok" : "neutral"}>{p.checked ? "Packed" : "Still out"}</Tag>
                            </Card>
                        ))}
                    </ul>
                </Section>
            )}

            {capsules.length > 0 && (
                <Section title="Pulled into a capsule" className="mt-8">
                    <ul className="flex flex-wrap gap-2">
                        {capsules.map((c) => (
                            <li key={c.id}>
                                <Link to={`${BASE}?view=capsules`} className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-sm font-medium hover:shadow-hover">
                                    <Luggage size={14} aria-hidden="true" /> {c.name} · {c.tripLabel}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {inOutfits.length > 0 && (
                <Section title="Part of these outfits" className="mt-8">
                    <ul className="flex flex-wrap gap-2">
                        {inOutfits.map((o) => (
                            <li key={o.id}>
                                <Link to={`${BASE}/outfits?o=${o.id}`} className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-sm font-medium hover:shadow-hover">
                                    <Shirt size={14} aria-hidden="true" /> {o.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {history.length > 0 && (
                <Section title="Whose it has been" className="mt-8">
                    <ul className="grid gap-2">
                        {history.map((h) => {
                            const from = members.find((m) => m.id === h.fromMemberId);
                            const to = members.find((m) => m.id === h.toMemberId);
                            return (
                                <Card as="li" key={h.id} className="flex flex-wrap items-center gap-3">
                                    <MemberAvatar member={from} size="xs" />
                                    <ArrowLeftRight size={14} className="text-caption" aria-hidden="true" />
                                    <MemberAvatar member={to} size="xs" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-md font-semibold">
                                            {from?.name.split(" ")[0] ?? "Someone"} → {to?.name.split(" ")[0] ?? "someone"}
                                        </span>
                                        {h.note && <span className="block text-sm leading-5 text-muted">{h.note}</span>}
                                    </span>
                                    <span className="text-xs text-caption">
                                        <DateText iso={h.at} />
                                    </span>
                                </Card>
                            );
                        })}
                    </ul>
                </Section>
            )}

            <ItemDialog open={editOpen} onClose={() => setEditOpen(false)} item={item} owners={members.filter((m) => m.role !== "guest")} defaultOwner={item.ownerMemberId} canReassign={manage} onSubmit={save} />

            <HandDownDialog
                open={handOpen}
                onClose={() => setHandOpen(false)}
                item={item}
                candidates={handCandidates}
                onSubmit={async (to, note) => {
                    await mutate((r) => r.handDown(item.id, to, note));
                    toast(`${item.name} is ${members.find((m) => m.id === to)?.name.split(" ")[0] ?? "theirs"} now.`, "success");
                }}
            />

            <OutgrownDialog
                open={outgrownOpen}
                onClose={() => setOutgrownOpen(false)}
                item={item}
                candidates={members.filter((m) => m.role === "child" && m.id !== item.ownerMemberId)}
                defaultAssignee={me.id}
                currency={space.currency}
                onSubmit={async (d) => {
                    await mutate((r) => r.markOutgrown(item.id, d));
                    toast(d.handDownToMemberId ? "Handed down." : "Decided in one go.", "success");
                }}
            />

            <Confirm
                open={removing}
                title={`Remove ${item.name}?`}
                body="It goes from the closet, from every outfit it was in and from any capsule. The hand-me-down history stays."
                confirmLabel="Remove it"
                danger
                onClose={() => setRemoving(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removeItem(item.id));
                    toast("Gone from the closet.");
                    navigate(BASE);
                }}
            />

            {!canEdit && (
                <Notice tone="info" className="mt-8">
                    This is {owner?.name.split(" ")[0] ?? "someone else"}&apos;s. You can see it, but only a parent can change it.
                </Notice>
            )}

            {wish && manage && (
                <p className="mt-8 flex items-center gap-2 text-sm text-caption">
                    <ShoppingBag size={14} aria-hidden="true" /> Replacements live in
                    <Link to={`${BASE}?view=outgrown`} className="font-semibold text-brand underline underline-offset-4">
                        Outgrown
                    </Link>
                    .
                </p>
            )}
        </div>
    );
}
