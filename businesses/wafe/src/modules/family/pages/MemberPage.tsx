import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, Trash2, Unlock } from "lucide-react";
import { AGE_BAND, ROLE_LABEL, type Capability } from "@/data/core";
import { cn } from "@/lib/cn";
import { ageOf, longDate, shortDate } from "@/lib/format";
import { useData } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, DateText, EmptyModule, MemberAvatar, PageTitle, Points, Section } from "@/components/shared";
import { Button, Card, EmptyState, Tag } from "@/components/ui/primitives";
import { AuditFeed } from "../components/AuditFeed";
import { FamilyNav } from "../components/FamilyNav";
import { GrantsEditor } from "../components/GrantsEditor";
import { MemberDialog, type MemberInput } from "../components/MemberDialog";
import { ProfileSuggester } from "../components/ProfileSuggester";
import { bandChecks, grantDiff, openTasksFor, reassignOpenTasks, removalBody } from "../derive";
import { useFamily } from "../hooks";
import { GUEST_TAG, SHARE_TYPE, type GuestTag } from "../types";

/**
 * One person, and everything the family has decided about them: their card,
 * their permissions as three states, the named things they hold if they are a
 * guest, whether child mode is on, and the audit trail of every change.
 */
export default function MemberPage() {
    const { id = "" } = useParams();
    const sp = useSpace();
    const { state, mutate } = useFamily();
    const { slices, reload } = useData();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [busy, setBusy] = useState(false);

    const member = sp.members.find((m) => m.id === id);
    const parents = sp.members.filter((m) => m.role === "parent");

    if (!sp.can("family.manage")) {
        return (
            <div>
                <PageTitle title="Family" area="family" />
                <FamilyNav />
                <EmptyModule title="Only a parent can open someone's card" body="Your own is on your profile." action={<Link to="/family/settings" className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-md font-semibold text-white">My profile</Link>} />
            </div>
        );
    }
    if (!state) return null;
    if (!member) {
        return (
            <div>
                <PageTitle title="Not in this family" area="family" />
                <FamilyNav />
                <EmptyState title="We can't find that person" body="They may have been removed. Their authored history is kept under their name." action={<Link to="/family/members" className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-md font-semibold text-white">Back to the family</Link>} />
            </div>
        );
    }

    const lastParent = member.role === "parent" && parents.length <= 1;
    const shares = state.shares.filter((s) => s.memberId === member.id);
    const overrides = state.overrides[member.id];
    const check = bandChecks([member], sp.today)[0];
    const age = member.birthday ? ageOf(member.birthday, new Date(`${sp.today}T12:00:00`)) : null;

    const setOverride = async (cap: Capability, value: boolean | null) => {
        setBusy(true);
        try {
            const next = { ...(overrides ?? {}) };
            if (value === null) delete next[cap];
            else next[cap] = value;
            const diff = grantDiff(member, member.ageBand, next);
            await mutate((r) => r.setOverride(member.id, cap, value));
            await sp.mutateCore(async (c) => {
                for (const d of diff) await c.setGrant(member.id, d.cap, d.on);
            });
            toast(value === null ? "Back to the band default" : value ? "Allowed" : "Blocked", "success");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't change that", "danger");
        } finally {
            setBusy(false);
        }
    };

    const toggleChildMode = async (on: boolean) => {
        await mutate((r) => r.setChildMode(member.id, on));
        toast(on ? `Child mode on for ${member.name.split(" ")[0]}` : "Child mode off", "success");
    };

    const save = async (input: MemberInput) => {
        const band = input.role === "child" ? input.ageBand : "adult";
        const diff = input.role === "parent" ? [] : grantDiff(member, band, overrides);
        await sp.mutateCore(async (c) => {
            await c.updateMember(member.id, { name: input.name, relation: input.relation, role: input.role, ageBand: band, birthday: input.birthday || undefined, email: input.email || undefined, avatarUrl: input.avatarUrl || undefined, hue: input.hue });
            for (const d of diff) await c.setGrant(member.id, d.cap, d.on);
        });
        await mutate(async (r) => {
            if (input.role === "guest") await r.setGuestTag(member.id, input.guestTag);
            await r.audit({ action: input.role !== member.role ? "role" : input.ageBand !== member.ageBand ? "band" : "member", targetType: "member", targetId: member.id, summary: `Updated ${input.name}'s card`, before: `${member.role}/${member.ageBand}`, after: `${input.role}/${band}` });
        });
        toast("Saved", "success");
    };

    const remove = async () => {
        // Refuse before anything is cleared: the last parent stays, and a
        // half-applied removal is worse than none.
        if (lastParent) throw new Error("A family needs at least one parent");
        const to = parents.find((p) => p.id !== member.id) ?? parents[0];
        const open = openTasksFor(slices.tasks?.state, member.id);
        // Move the work FIRST, through the tasks module's own repo, so the
        // handover record and the audit line only ever claim what happened.
        let handed = { total: 0, toOwner: 0, shared: 0 };
        if (open.length) {
            try {
                handed = await reassignOpenTasks(slices.tasks?.repo, open, member.id, to.id);
            } catch (e) {
                throw new Error(`We couldn't pass ${member.name.split(" ")[0]}'s open tasks on, so nothing was changed. ${e instanceof Error ? e.message : ""}`.trim());
            }
            await reload("tasks");
        }
        await mutate(async (r) => {
            await r.recordHandover({ memberId: member.id, memberName: member.name, toMemberId: to.id, openTasks: handed.toOwner });
            await r.clearMember(member.id);
        });
        await sp.mutateCore((c) => c.removeMember(member.id));
        toast(`${member.name.split(" ")[0]} no longer has access${handed.total ? `; ${handed.toOwner} open task${handed.toOwner === 1 ? "" : "s"} passed to ${to.name.split(" ")[0]}` : ""}`, "success");
        navigate("/family/members", { replace: true });
    };

    return (
        <div>
            <Link to="/family/members" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> Everyone
            </Link>
            <PageTitle
                title={member.name}
                area="family"
                sub={`${member.relation || ROLE_LABEL[member.role]}${age !== null ? ` · ${age}` : ""}${member.role === "child" ? ` · ${AGE_BAND[member.ageBand].label} band` : ""}`}
                actions={
                    <>
                        <Button variant="outline" size="md" onClick={() => setEditing(true)}>
                            Edit card
                        </Button>
                        {!lastParent && (
                            <Button variant="danger" size="md" onClick={() => setRemoving(true)}>
                                <Trash2 size={15} aria-hidden="true" /> Remove
                            </Button>
                        )}
                    </>
                }
            />
            <FamilyNav />

            <Card className="mb-8 flex flex-wrap items-center gap-5">
                <MemberAvatar member={member} size="xl" />
                <div className="min-w-[200px] flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Tag tone={member.role === "parent" ? "family" : member.role === "child" ? "grow" : "live"}>{ROLE_LABEL[member.role]}</Tag>
                        {member.role === "child" && <Tag tone="neutral">{AGE_BAND[member.ageBand].label} · {AGE_BAND[member.ageBand].years}</Tag>}
                        {member.role === "guest" && <Tag tone="neutral">{GUEST_TAG[(state.guestTags[member.id] as GuestTag) ?? "relative"].label}</Tag>}
                        {lastParent && <Tag tone="warn">Last parent — role and removal are locked</Tag>}
                    </div>
                    <dl className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                        <Row label="Birthday" value={member.birthday ? <DateText iso={member.birthday} long /> : "Not shared"} />
                        <Row label="Email" value={member.email || "None"} />
                        <Row label="In the family since" value={shortDate(member.joinedAt)} />
                        <Row label="Signs in" value={member.userId ? "Yes, own account" : member.role === "child" ? "Parent-launched or PIN" : "Not yet"} />
                    </dl>
                </div>
                {member.role === "child" && (
                    <div className="flex flex-col items-end gap-2">
                        <Points n={member.points} />
                        <span className="text-xs text-caption">{AGE_BAND[member.ageBand].note}</span>
                    </div>
                )}
            </Card>

            {member.role === "child" && (
                <Section title="Child mode">
                    <Card className="flex flex-wrap items-center gap-4">
                        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", state.childMode[member.id] ? "bg-brand text-white" : "bg-page text-muted")} aria-hidden="true">
                            {state.childMode[member.id] ? <Lock size={18} /> : <Unlock size={18} />}
                        </span>
                        <div className="min-w-[200px] flex-1">
                            <p className="text-md font-semibold">{state.childMode[member.id] ? "On — this device stays in child mode" : "Off"}</p>
                            <p className="mt-0.5 text-sm leading-5 text-muted">
                                In child mode the app shows {member.name.split(" ")[0]}'s screens only, and leaving it needs the parent PIN. {state.pinSet ? "A PIN is set." : "Set a PIN in Settings first."}
                            </p>
                        </div>
                        <Button variant={state.childMode[member.id] ? "outline" : "brand"} size="md" onClick={() => void toggleChildMode(!state.childMode[member.id])}>
                            {state.childMode[member.id] ? "Turn off" : "Turn on"}
                        </Button>
                    </Card>
                </Section>
            )}

            {check && check.member.role === "child" && (
                <Section title="Age band">
                    <Card>
                        <p className="text-md leading-6">
                            {check.mismatch && check.implied ? (
                                <>
                                    {member.name.split(" ")[0]} is {check.age}, which the rule reads as <strong>{AGE_BAND[check.implied].label}</strong>. Nothing has changed — a band is a decision, not a birthday.
                                </>
                            ) : check.nextOn && check.nextBand ? (
                                <>
                                    On <strong>{longDate(check.nextOn)}</strong> {member.name.split(" ")[0]} reaches the {AGE_BAND[check.nextBand].label} band. We will ask you then; your explicit permissions will be kept either way.
                                </>
                            ) : (
                                AGE_BAND[member.ageBand].note
                            )}
                        </p>
                        {check.mismatch && check.implied && (
                            <Button
                                className="mt-3"
                                size="md"
                                onClick={() => {
                                    const to = check.implied;
                                    if (!to) return;
                                    void (async () => {
                                        const diff = grantDiff(member, to, overrides);
                                        await sp.mutateCore(async (c) => {
                                            await c.updateMember(member.id, { ageBand: to });
                                            for (const d of diff) await c.setGrant(member.id, d.cap, d.on);
                                        });
                                        await mutate((r) => r.audit({ action: "band", targetType: "member", targetId: member.id, summary: `Moved ${member.name.split(" ")[0]} to the ${AGE_BAND[to].label} band`, before: member.ageBand, after: to }));
                                        toast(`${member.name.split(" ")[0]} is on the ${AGE_BAND[to].label} band`, "success");
                                    })();
                                }}
                            >
                                Move to {AGE_BAND[check.implied].label}
                            </Button>
                        )}
                    </Card>
                </Section>
            )}

            <Section title="What they may do" action={<Link to="/family/permissions" className="text-sm font-semibold text-brand underline-offset-4 hover:underline">The whole matrix</Link>}>
                <ProfileSuggester member={member} overrides={overrides} onSet={setOverride} busy={busy} />
                <GrantsEditor member={member} overrides={overrides} onSet={setOverride} busy={busy} />
            </Section>

            {member.role === "guest" && (
                <Section title="Shared with them" action={<Link to="/family/permissions" className="text-sm font-semibold text-brand underline-offset-4 hover:underline">Share something</Link>}>
                    {shares.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2">
                            {shares.map((s) => (
                                <li key={s.id} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3">
                                    <span className="text-2xl" aria-hidden="true">
                                        {SHARE_TYPE[s.objectType].emoji}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-md font-semibold">{s.label}</span>
                                        <span className="block text-xs text-caption">
                                            {SHARE_TYPE[s.objectType].label} · {s.level === "contribute" ? "can join in" : "view only"}
                                            {s.expiresAt ? ` · until ${shortDate(s.expiresAt)}` : ""}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState title="Nothing is shared with them yet" body="A guest sees nothing at all until you grant one named trip, board, album, wall, event or session." />
                    )}
                </Section>
            )}

            <Section title="What has changed">
                <AuditFeed entries={state.audit} members={sp.members} filterMemberId={member.id} limit={8} />
            </Section>

            <MemberDialog open={editing} onClose={() => setEditing(false)} member={member} guestTag={state.guestTags[member.id] as GuestTag | undefined} scope="parent" lastParent={lastParent} onSave={save} />
            <Confirm
                open={removing}
                title={`Remove ${member.name}?`}
                body={removalBody(member.name, (parents.find((p) => p.id !== member.id) ?? parents[0])?.name ?? "the owner", openTasksFor(slices.tasks?.state, member.id), member.id)}
                confirmLabel="Remove from the family"
                danger
                onConfirm={async () => {
                    try {
                        await remove();
                    } catch (e) {
                        toast(e instanceof Error ? e.message : "Couldn't remove them", "danger");
                    }
                }}
                onClose={() => setRemoving(false)}
            />
        </div>
    );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-baseline gap-2">
            <dt className="w-32 shrink-0 text-xs uppercase tracking-[0.06em] text-caption">{label}</dt>
            <dd className="min-w-0 flex-1 truncate">{value}</dd>
        </div>
    );
}
