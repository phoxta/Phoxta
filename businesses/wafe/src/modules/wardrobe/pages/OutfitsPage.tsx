import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Pencil, Plus, Shirt, Star, Trash2 } from "lucide-react";
import type { Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, EmptyModule, MemberAvatar, Notice, PageTitle, Section } from "@/components/shared";
import { Button, Card, EmptyState, Tag } from "@/components/ui/primitives";
import wardrobeModule from "../module";
import { useWardrobeAi } from "../ai";
import { BASE, outfitItems } from "../derive";
import { OCCASION } from "../types";
import type { NewOutfit, Outfit } from "../types";
import { OutfitDialog } from "../components/dialogs";
import { ItemStrip } from "../components/pieces";

/**
 * Outfits — the family's answer to "what do I put on", written down once.
 *
 * They are grouped by person because that is how a morning works: five closets,
 * five decisions, and the one marked "everyday" is the one the week planner
 * fills Monday to Friday with in a single tap. A child sees only their own,
 * and may build their own — choosing your clothes is a small, real freedom.
 */
export default function OutfitsPage() {
    const { state, mutate, loading, error } = useModule(wardrobeModule);
    const { me, role, can, members, today } = useSpace();
    const { toast } = useToast();
    const [params] = useSearchParams();
    const ai = useWardrobeAi(state);

    const manage = can("wardrobe.manage");
    const child = role === "child";
    const guest = role === "guest";

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Outfit | null>(null);
    const [removing, setRemoving] = useState<Outfit | null>(null);
    const [forMember, setForMember] = useState<string>(me.id);

    const wearers = useMemo(() => members.filter((m) => m.role !== "guest"), [members]);
    const groups = useMemo(() => {
        if (!state) return [];
        const people = child ? [me] : wearers;
        return people.map((m) => ({ member: m, outfits: state.outfits.filter((o) => o.memberId === m.id) })).filter((g) => g.outfits.length || !child);
    }, [state, child, me, wearers]);

    if (guest) {
        return (
            <div>
                <PageTitle title="Outfits" area="live" />
                <EmptyModule title="This one stays with the family" body="What the family wears is theirs." />
            </div>
        );
    }
    if (loading && !state) return <p className="text-md text-muted">Laying the outfits out…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const highlight = params.get("o");
    const total = state.outfits.length;

    const build = (memberId: string): void => {
        setEditing(null);
        setForMember(memberId);
        setOpen(true);
    };

    const save = async (v: NewOutfit): Promise<void> => {
        if (editing) await mutate((r) => r.updateOutfit(editing.id, v));
        else await mutate((r) => r.createOutfit(v));
        toast(editing ? "Outfit saved." : `“${v.name}” is ready to wear.`, "success");
    };

    const wearToday = async (o: Outfit): Promise<void> => {
        await mutate((r) => r.setSchedule(o.memberId, today, o.id, OCCASION[o.occasion].label));
        toast("On today's plan — it shows on the dashboard.", "success");
    };

    return (
        <div>
            <PageTitle
                title={child ? "My outfits" : "Outfits"}
                sub={child ? "Sets of clothes you can pick in one tap." : "Named sets of clothes, built from what is actually in the wardrobe."}
                area="live"
                actions={
                    <>
                        <Link to={BASE} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-md font-semibold">
                            <ArrowLeft size={16} aria-hidden="true" /> The closet
                        </Link>
                        <Button onClick={() => build(me.id)}>
                            <Plus size={16} aria-hidden="true" /> Build an outfit
                        </Button>
                    </>
                }
            />

            {!total && <EmptyState icon={<Shirt size={20} aria-hidden="true" />} title="No outfits yet" body="An outfit is a handful of garments with a name on it. Build one and the week planner, the dashboard and the companion all have something to work with." action={<Button onClick={() => build(me.id)}>Build the first one</Button>} />}

            {groups.map(({ member, outfits }) => (
                <Section
                    key={member.id}
                    title={child ? "Yours" : member.name}
                    action={
                        !child && (
                            <Button size="sm" variant="ghost" onClick={() => build(member.id)}>
                                <Plus size={14} aria-hidden="true" /> Add
                            </Button>
                        )
                    }
                >
                    {outfits.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {outfits.map((o) => (
                                <OutfitCard
                                    key={o.id}
                                    outfit={o}
                                    member={member}
                                    items={outfitItems(state, o)}
                                    highlighted={highlight === o.id}
                                    canEdit={manage || o.memberId === me.id}
                                    onEdit={() => {
                                        setEditing(o);
                                        setForMember(o.memberId);
                                        setOpen(true);
                                    }}
                                    onWearToday={() => void wearToday(o)}
                                    onRemove={() => setRemoving(o)}
                                />
                            ))}
                        </ul>
                    ) : (
                        <p className="rounded-xl bg-card px-4 py-6 text-center text-sm text-caption">Nothing built for {member.name.split(" ")[0]} yet.</p>
                    )}
                </Section>
            ))}

            <OutfitDialog
                open={open}
                onClose={() => setOpen(false)}
                outfit={editing}
                items={state.items}
                members={wearers}
                defaultMember={forMember}
                canPickMember={manage}
                onSubmit={save}
                onSuggest={ai.suggestForOccasion}
                suggesting={ai.busy}
            />

            <Confirm
                open={Boolean(removing)}
                title={`Delete “${removing?.name ?? ""}”?`}
                body="The clothes stay in the closet. Any day it was laid out for goes back to undecided."
                confirmLabel="Delete the outfit"
                danger
                onClose={() => setRemoving(null)}
                onConfirm={async () => {
                    if (!removing) return;
                    await mutate((r) => r.removeOutfit(removing.id));
                    toast("Outfit deleted.");
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

function OutfitCard({ outfit, member, items, highlighted, canEdit, onEdit, onWearToday, onRemove }: { outfit: Outfit; member: Member; items: ReturnType<typeof outfitItems>; highlighted: boolean; canEdit: boolean; onEdit: () => void; onWearToday: () => void; onRemove: () => void }) {
    return (
        <Card as="li" className={cn("flex flex-col gap-3", highlighted && "ring-2 ring-brand")}>
            <div className="flex items-start gap-3">
                <MemberAvatar member={member} size="sm" />
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold">{outfit.name}</h3>
                    <p className="text-xs text-caption">
                        {OCCASION[outfit.occasion].emoji} {OCCASION[outfit.occasion].label} · {items.length} piece{items.length === 1 ? "" : "s"}
                        {outfit.lastWorn ? ` · last worn ${shortDate(outfit.lastWorn)}` : ""}
                    </p>
                </div>
                {outfit.isUniform && (
                    <Tag tone="live" icon={<Star size={11} aria-hidden="true" />}>
                        Everyday
                    </Tag>
                )}
            </div>

            {outfit.imageUrl ? (
                <span className="block aspect-[16/9] overflow-hidden rounded-md bg-page">
                    <img src={outfit.imageUrl} alt={outfit.name} width={480} height={270} loading="lazy" className="size-full object-cover" />
                </span>
            ) : null}

            <ItemStrip items={items} max={8} size={44} />
            {outfit.notes && <p className="text-sm leading-5 text-muted">{outfit.notes}</p>}

            <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={onWearToday}>
                    <CalendarPlus size={14} aria-hidden="true" /> Wear it today
                </Button>
                {canEdit && (
                    <>
                        <Button size="sm" variant="ghost" onClick={onEdit}>
                            <Pencil size={14} aria-hidden="true" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={onRemove} aria-label={`Delete ${outfit.name}`}>
                            <Trash2 size={14} aria-hidden="true" />
                        </Button>
                    </>
                )}
            </div>
        </Card>
    );
}
