import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Cake, Check, MoreHorizontal, Shield, UserPlus } from "lucide-react";
import { AGE_BAND, ROLE_LABEL, type AgeBand, type Member, type Role } from "@/data/core";
import { cn } from "@/lib/cn";
import { ageOf, shortDate } from "@/lib/format";
import { useData } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, EmptyModule, MemberAvatar, Notice, PageTitle, Points, Section, Stat } from "@/components/shared";
import { Button, Card, EmptyState, IconButton, Tag } from "@/components/ui/primitives";
import { Menu } from "@/components/ui/overlay";
import { FamilyNav } from "../components/FamilyNav";
import { MemberDialog, type MemberInput } from "../components/MemberDialog";
import { bandChecks, daysToAnniversary, grantDiff, openTasksFor, reassignOpenTasks, removalBody, setupSteps } from "../derive";
import { useFamily } from "../hooks";
import { BAND_DEFAULTS, GUEST_TAG, type GuestTag } from "../types";

/**
 * Who is in this family.
 *
 * A card per person with everything a parent decides about them — role, band,
 * birthday, colour, points — plus the two rules that make the boundary safe:
 * the last parent cannot be demoted or removed, and moving a child between
 * bands re-applies that band's defaults while leaving every explicit
 * permission a parent has set exactly where it is.
 */

export default function MembersPage() {
    const sp = useSpace();
    const { state, mutate } = useFamily();
    const { slices, reload } = useData();
    const { toast } = useToast();
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<Member | null>(null);
    const [removing, setRemoving] = useState<Member | null>(null);
    const [busy, setBusy] = useState(false);

    const parents = sp.members.filter((m) => m.role === "parent");
    const kids = sp.members.filter((m) => m.role === "child");
    const guests = sp.members.filter((m) => m.role === "guest");
    const owner = parents[0];

    const goalsReady = useMemo(() => countGoalsWithMilestones(slices.goals?.state), [slices.goals?.state]);
    const steps = useMemo(() => (state ? setupSteps(state, sp.space, sp.members, goalsReady) : []), [state, sp.space, sp.members, goalsReady]);
    const bands = useMemo(() => bandChecks(sp.members, sp.today), [sp.members, sp.today]);
    // Nobody is eleven to fourteen in the Adeyemi house today, and the Teen
    // product — free-text companion, private prayers, own boards — deserves to
    // be walked rather than described. Offer the one click that reaches it.
    const teenCandidate = useMemo(() => {
        if (sp.kind !== "demo") return null;
        const kidsNow = sp.members.filter((m) => m.role === "child");
        if (kidsNow.some((k) => k.ageBand === "teen")) return null;
        return kidsNow.find((k) => k.ageBand === "junior") ?? kidsNow.find((k) => k.ageBand === "young-adult") ?? kidsNow[0] ?? null;
    }, [sp.members, sp.kind]);

    if (!sp.can("family.manage")) {
        return (
            <div>
                <PageTitle title="Our family" area="family" sub="The people, the values and the boundary." />
                <FamilyNav />
                <EmptyModule
                    title="This part belongs to the parents"
                    body="Roles, permissions and who-sees-what are a parent's to set. Your own name, picture and colour are yours."
                    action={
                        <Link to="/family/settings" className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-md font-semibold text-white hover:bg-brand-hover">
                            Go to my profile
                        </Link>
                    }
                />
            </div>
        );
    }

    if (!state) return null;

    // -----------------------------------------------------------------------
    // Writes
    // -----------------------------------------------------------------------

    const addMember = async (input: MemberInput) => {
        // A new child starts on their band's minimum grants — nothing more.
        const created = { id: "" };
        await sp.mutateCore(async (c) => {
            const m = await c.addMember({ name: input.name, relation: input.relation, role: input.role, ageBand: input.ageBand, birthday: input.birthday || undefined, email: input.email || undefined, avatarUrl: input.avatarUrl || undefined });
            created.id = m.id;
            if (input.hue) await c.updateMember(m.id, { hue: input.hue });
            if (input.role !== "parent") for (const cap of BAND_DEFAULTS[input.ageBand]) await c.setGrant(m.id, cap, true);
        });
        await mutate(async (r) => {
            if (input.role === "guest") await r.setGuestTag(created.id, input.guestTag);
            await r.audit({
                action: "member",
                targetType: "member",
                targetId: created.id,
                summary: `${input.name} joined as a ${ROLE_LABEL[input.role].toLowerCase()}${input.role === "child" ? ` on the ${AGE_BAND[input.ageBand].label} band` : ""}`,
                before: null,
                after: input.role,
            });
        });
        toast(input.role === "child" ? `${input.name.split(" ")[0]} is in the family on the ${AGE_BAND[input.ageBand].label} band — open their card for a recommended profile` : `${input.name.split(" ")[0]} is in the family`, "success");
    };

    const saveMember = async (m: Member, input: MemberInput) => {
        const roleChanged = input.role !== m.role;
        const bandChanged = input.ageBand !== m.ageBand;
        if (roleChanged && m.role === "parent" && parents.length <= 1) throw new Error("A family needs at least one parent");
        const band: AgeBand = input.role === "child" ? input.ageBand : "adult";
        const diff = input.role === "parent" ? [] : grantDiff(m, band, state.overrides[m.id]);
        await sp.mutateCore(async (c) => {
            await c.updateMember(m.id, { name: input.name, relation: input.relation, role: input.role, ageBand: band, birthday: input.birthday || undefined, email: input.email || undefined, avatarUrl: input.avatarUrl || undefined, hue: input.hue });
            for (const d of diff) await c.setGrant(m.id, d.cap, d.on);
        });
        await mutate(async (r) => {
            if (input.role === "guest") await r.setGuestTag(m.id, input.guestTag);
            if (roleChanged) await r.audit({ action: "role", targetType: "member", targetId: m.id, summary: `${input.name} is now a ${ROLE_LABEL[input.role].toLowerCase()}`, before: m.role, after: input.role });
            if (bandChanged) await r.audit({ action: "band", targetType: "member", targetId: m.id, summary: `${input.name} moved to the ${AGE_BAND[band].label} band — your own permission choices were kept`, before: m.ageBand, after: band });
            if (!roleChanged && !bandChanged) await r.audit({ action: "member", targetType: "member", targetId: m.id, summary: `Updated ${input.name}'s profile`, before: null, after: null });
        });
        toast("Saved", "success");
    };

    const changeBand = async (m: Member, band: AgeBand) => {
        if (band === m.ageBand) return;
        setBusy(true);
        try {
            const diff = grantDiff(m, band, state.overrides[m.id]);
            const kept = Object.keys(state.overrides[m.id] ?? {}).length;
            await sp.mutateCore(async (c) => {
                await c.updateMember(m.id, { ageBand: band });
                for (const d of diff) await c.setGrant(m.id, d.cap, d.on);
            });
            await mutate((r) =>
                r.audit({
                    action: "band",
                    targetType: "member",
                    targetId: m.id,
                    summary: `Moved ${m.name.split(" ")[0]} from ${AGE_BAND[m.ageBand].label} to ${AGE_BAND[band].label}${kept ? `; ${kept} explicit permission${kept === 1 ? "" : "s"} kept` : ""}`,
                    before: m.ageBand,
                    after: band,
                }),
            );
            toast(`${m.name.split(" ")[0]} is on the ${AGE_BAND[band].label} band`, "success");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't change the band", "danger");
        } finally {
            setBusy(false);
        }
    };

    const changeRole = async (m: Member, role: Role) => {
        if (role === m.role) return;
        if (m.role === "parent" && parents.length <= 1) {
            toast("A family needs at least one parent", "danger");
            return;
        }
        setBusy(true);
        try {
            const band: AgeBand = role === "child" ? (m.ageBand === "adult" ? "junior" : m.ageBand) : "adult";
            const diff = role === "parent" ? [] : grantDiff(m, band, state.overrides[m.id]);
            await sp.mutateCore(async (c) => {
                await c.updateMember(m.id, { role, ageBand: band });
                for (const d of diff) await c.setGrant(m.id, d.cap, d.on);
            });
            await mutate((r) => r.audit({ action: "role", targetType: "member", targetId: m.id, summary: `${m.name} is now a ${ROLE_LABEL[role].toLowerCase()}`, before: m.role, after: role }));
            toast(`${m.name.split(" ")[0]} is now a ${ROLE_LABEL[role].toLowerCase()}`, "success");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't change the role", "danger");
        } finally {
            setBusy(false);
        }
    };

    const doRemove = async (m: Member) => {
        // Refuse before anything is cleared: a family with no parent has nobody
        // who can manage it, and a half-applied removal is worse than none.
        if (m.role === "parent" && parents.length <= 1) throw new Error("A family needs at least one parent");
        const to = parents.find((p) => p.id !== m.id) ?? owner;
        const open = openTasksFor(slices.tasks?.state, m.id);
        // Move the work FIRST, through the tasks module's own repo, so the
        // handover record and the audit line only ever claim what happened.
        let handed = { total: 0, toOwner: 0, shared: 0 };
        if (open.length) {
            try {
                handed = await reassignOpenTasks(slices.tasks?.repo, open, m.id, to.id);
            } catch (e) {
                throw new Error(`We couldn't pass ${m.name.split(" ")[0]}'s open tasks on, so nothing was changed. ${e instanceof Error ? e.message : ""}`.trim());
            }
            await reload("tasks");
        }
        await mutate(async (r) => {
            await r.recordHandover({ memberId: m.id, memberName: m.name, toMemberId: to.id, openTasks: handed.toOwner });
            await r.clearMember(m.id);
        });
        await sp.mutateCore((c) => c.removeMember(m.id));
        toast(`${m.name.split(" ")[0]} no longer has access${handed.total ? `; ${handed.toOwner} open task${handed.toOwner === 1 ? "" : "s"} passed to ${to.name.split(" ")[0]}` : ""}`, "success");
    };

    // -----------------------------------------------------------------------

    const done = steps.filter((s) => s.done).length;

    return (
        <div>
            <PageTitle
                title="Our family"
                area="family"
                sub="Everyone in the space, what they may do, and the rules that keep it safe."
                actions={
                    <>
                        <Button variant="outline" size="md" onClick={() => setAdding(true)}>
                            <UserPlus size={15} aria-hidden="true" /> Add someone
                        </Button>
                        <Link to="/family/invites" className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
                            Invite by email
                        </Link>
                    </>
                }
            />
            <FamilyNav />

            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Parents" value={parents.length} sub={parents.map((p) => p.name.split(" ")[0]).join(" · ")} tone="family" />
                <Stat label="Children" value={kids.length} sub={kids.map((k) => `${k.name.split(" ")[0]} ${k.birthday ? ageOf(k.birthday, new Date(`${sp.today}T12:00:00`)) : ""}`).join(" · ") || "None yet"} tone="grow" />
                <Stat label="Guests" value={guests.length} sub={`${state.shares.length} named things shared`} tone="live" />
                <Stat label="Set-up" value={`${done}/${steps.length}`} sub={done === steps.length ? "Everything in place" : steps.filter((s) => !s.done)[0]?.label} tone={done === steps.length ? "ok" : "warn"} />
            </div>

            {done < steps.length && (
                <Section title="Finish setting up">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2">
                        {steps.map((s) => (
                            <li key={s.id}>
                                <Link to={s.href} className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors", s.done ? "border-line bg-card" : "border-brand/30 bg-brand-soft hover:border-brand")}>
                                    <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border", s.done ? "border-brand bg-brand text-white" : "border-line-strong text-transparent")} aria-hidden="true">
                                        <Check size={12} strokeWidth={3} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className={cn("block text-md font-semibold", s.done && "text-muted line-through")}>{s.label}</span>
                                        <span className="mt-0.5 block text-xs leading-5 text-caption">{s.note}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <Section title="Everyone">
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {sp.members.map((m) => (
                        <MemberCard
                            key={m.id}
                            member={m}
                            guestTag={state.guestTags[m.id]}
                            childMode={Boolean(state.childMode[m.id])}
                            overrides={Object.keys(state.overrides[m.id] ?? {}).length}
                            shares={state.shares.filter((s) => s.memberId === m.id).length}
                            today={sp.today}
                            lastParent={m.role === "parent" && parents.length <= 1}
                            busy={busy}
                            onEdit={() => setEditing(m)}
                            onRole={(r) => void changeRole(m, r)}
                            onBand={(b) => void changeBand(m, b)}
                            onRemove={() => setRemoving(m)}
                        />
                    ))}
                </ul>
            </Section>

            <Section title="Age bands" action={<span className="text-xs text-caption">Little 4–6 · Junior 7–10 · Teen 11–14 · Young adult 15–17</span>}>
                {kids.length ? (
                    <Card className="p-0">
                        <ul className="divide-y divide-line">
                            {bands.map((b) => (
                                <li key={b.member.id} className="flex flex-wrap items-center gap-3 p-4">
                                    <MemberAvatar member={b.member} size="md" />
                                    <div className="min-w-[160px] flex-1">
                                        <p className="text-md font-semibold">
                                            {b.member.name.split(" ")[0]}
                                            {b.age !== null && <span className="ml-2 font-normal text-muted">{b.age}</span>}
                                        </p>
                                        <p className="mt-0.5 text-xs leading-5 text-caption">
                                            {b.mismatch && b.implied ? (
                                                <span className="text-execute-ink">Their age says {AGE_BAND[b.implied].label}. Nothing changes until you say so.</span>
                                            ) : b.nextOn && b.nextBand ? (
                                                <>
                                                    Moves to {AGE_BAND[b.nextBand].label} on {shortDate(b.nextOn)}
                                                    {b.daysToNext !== null && b.daysToNext <= 30 ? " — we'll ask you first" : ""}
                                                </>
                                            ) : (
                                                AGE_BAND[b.band].note
                                            )}
                                        </p>
                                    </div>
                                    <label className="shrink-0">
                                        <span className="sr-only">{b.member.name}'s age band</span>
                                        <select
                                            value={b.band}
                                            disabled={busy}
                                            onChange={(e) => void changeBand(b.member, e.target.value as AgeBand)}
                                            className="h-10 rounded-sm border border-line-strong bg-card px-3 text-sm font-medium outline-none focus:border-brand disabled:opacity-50"
                                        >
                                            {(["little", "junior", "teen", "young-adult"] as AgeBand[]).map((x) => (
                                                <option key={x} value={x}>
                                                    {AGE_BAND[x].label} · {AGE_BAND[x].years}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    {b.mismatch && b.implied && (
                                        <Button size="md" variant="brand" disabled={busy} onClick={() => void changeBand(b.member, b.implied as AgeBand)}>
                                            Move to {AGE_BAND[b.implied].label}
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                        {teenCandidate && (
                            <div className="border-t border-line p-4">
                                <Notice tone="info">
                                    <p>
                                        Nobody is on the <strong>Teen</strong> band (11–14) today, so that version of the product is not on screen anywhere. Move {teenCandidate.name.split(" ")[0]} to Teen to walk it — free-text companion with the
                                        classifier, private prayers, their own moodboards — then move them back. Your explicit permission choices are kept both ways.
                                    </p>
                                    <Button size="sm" variant="outline" className="mt-2.5" disabled={busy} onClick={() => void changeBand(teenCandidate, "teen")}>
                                        Move {teenCandidate.name.split(" ")[0]} to Teen
                                    </Button>
                                </Notice>
                            </div>
                        )}
                        <p className="border-t border-line px-4 py-3 text-xs leading-5 text-caption">
                            A band decides the layout, the reading level, the reward mechanics and the default permissions. Changing one re-applies that band's defaults and leaves every permission you set by hand exactly where it is.
                        </p>
                    </Card>
                ) : (
                    <EmptyState icon={<Cake size={20} aria-hidden="true" />} title="No children in the space yet" body="Add a child and they will land on the band you choose, with that band's minimum permissions." action={<Button onClick={() => setAdding(true)}>Add a child</Button>} />
                )}
            </Section>

            <MemberDialog open={adding} onClose={() => setAdding(false)} scope="parent" onSave={addMember} />
            <MemberDialog
                open={Boolean(editing)}
                onClose={() => setEditing(null)}
                member={editing ?? undefined}
                guestTag={editing ? (state.guestTags[editing.id] as GuestTag | undefined) : undefined}
                scope="parent"
                lastParent={Boolean(editing && editing.role === "parent" && parents.length <= 1)}
                onSave={(input) => (editing ? saveMember(editing, input) : Promise.resolve())}
            />
            <Confirm
                open={Boolean(removing)}
                title={removing ? `Remove ${removing.name}?` : "Remove"}
                body={removing ? removalBody(removing.name, (parents.find((p) => p.id !== removing.id) ?? owner).name, openTasksFor(slices.tasks?.state, removing.id), removing.id) : undefined}
                confirmLabel="Remove from the family"
                danger
                onConfirm={async () => {
                    if (!removing) return;
                    try {
                        await doRemove(removing);
                    } catch (e) {
                        toast(e instanceof Error ? e.message : "Couldn't remove them", "danger");
                    }
                }}
                onClose={() => setRemoving(null)}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------

function MemberCard({
    member,
    guestTag,
    childMode,
    overrides,
    shares,
    today,
    lastParent,
    busy,
    onEdit,
    onRole,
    onBand,
    onRemove,
}: {
    member: Member;
    guestTag?: GuestTag;
    childMode: boolean;
    overrides: number;
    shares: number;
    today: string;
    lastParent: boolean;
    busy: boolean;
    onEdit: () => void;
    onRole: (r: Role) => void;
    onBand: (b: AgeBand) => void;
    onRemove: () => void;
}) {
    const first = member.name.split(" ")[0];
    const age = member.birthday ? ageOf(member.birthday, new Date(`${today}T12:00:00`)) : null;
    const bday = member.birthday ? daysToAnniversary(member.birthday, today) : null;

    const items: Array<{ label: string; onSelect: () => void; danger?: boolean }> = [{ label: "Edit profile", onSelect: onEdit }];
    if (member.role === "child") {
        for (const b of ["little", "junior", "teen", "young-adult"] as AgeBand[]) {
            if (b !== member.ageBand) items.push({ label: `Move to ${AGE_BAND[b].label}`, onSelect: () => onBand(b) });
        }
    }
    for (const r of ["parent", "child", "guest"] as Role[]) {
        if (r !== member.role && !lastParent) items.push({ label: `Make ${ROLE_LABEL[r].toLowerCase()}`, onSelect: () => onRole(r) });
    }
    if (!lastParent) items.push({ label: "Remove from the family", onSelect: onRemove, danger: true });

    return (
        <Card as="li" className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
                <MemberAvatar member={member} size="lg" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold">{member.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span>{member.relation || ROLE_LABEL[member.role]}</span>
                        {age !== null && <span>· {age}</span>}
                        {member.birthday && <span>· {shortDate(member.birthday)}</span>}
                    </p>
                </div>
                <Menu
                    align="end"
                    trigger={(p) => (
                        <IconButton label={`Manage ${first}`} size="md" disabled={busy} {...p}>
                            <MoreHorizontal size={16} />
                        </IconButton>
                    )}
                    items={items}
                />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
                <Tag tone={member.role === "parent" ? "family" : member.role === "child" ? "grow" : "live"}>{ROLE_LABEL[member.role]}</Tag>
                {member.role === "child" && <Tag tone="neutral">{AGE_BAND[member.ageBand].label}</Tag>}
                {member.role === "guest" && <Tag tone="neutral">{guestTag ? GUEST_TAG[guestTag].label : "Guest"}</Tag>}
                {lastParent && (
                    <Tag tone="warn" icon={<Shield size={11} aria-hidden="true" />}>
                        Last parent
                    </Tag>
                )}
                {childMode && <Tag tone="brand">Child mode</Tag>}
                {bday !== null && bday <= 14 && <Tag tone="ok">{bday === 0 ? "Birthday today" : `Birthday in ${bday}d`}</Tag>}
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-xs text-caption">
                    {member.role === "child" ? `${overrides} set by hand` : member.role === "guest" ? `${shares} thing${shares === 1 ? "" : "s"} shared` : "Everything"}
                </span>
                <div className="flex items-center gap-2">
                    {member.role === "child" && member.points > 0 && <Points n={member.points} />}
                    <Link to={`/family/members/${member.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        Open <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </Card>
    );
}

/** How many goals already have milestones — the activation step of the checklist. */
function countGoalsWithMilestones(slice: unknown): number {
    let count = 0;
    const queue: unknown[] = [slice];
    let seen = 0;
    while (queue.length && seen < 3000) {
        const node = queue.shift();
        seen += 1;
        if (Array.isArray(node)) {
            for (const x of node) if (x && typeof x === "object") queue.push(x);
            continue;
        }
        if (!node || typeof node !== "object") continue;
        const obj = node as Record<string, unknown>;
        if (Array.isArray(obj.milestones) && obj.milestones.length > 0) count += 1;
        for (const v of Object.values(obj)) if (v && typeof v === "object") queue.push(v);
    }
    return count;
}
