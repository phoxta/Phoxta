import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Minus, Share2, Users } from "lucide-react";
import { ROLE_LABEL, type Capability, type Member, type Role } from "@/data/core";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { defaultsFor } from "@/lib/perms";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, EmptyModule, MemberAvatar, PageTitle, Section } from "@/components/shared";
import { Button, Card, EmptyState, Tag } from "@/components/ui/primitives";
import { AuditFeed } from "../components/AuditFeed";
import { FamilyNav } from "../components/FamilyNav";
import { GrantsEditor } from "../components/GrantsEditor";
import { ProfileSuggester } from "../components/ProfileSuggester";
import { ShareDialog } from "../components/ShareDialog";
import { expired, grantDiff, shareTarget } from "../derive";
import { useFamily } from "../hooks";
import { SHARE_TYPE, type NewShare, type ObjectShare } from "../types";

/**
 * Permissions and sharing — the page that answers "who can see what".
 *
 * Three layers, in the order a parent thinks about them: what a ROLE holds by
 * default, what has been widened or narrowed for one PERSON, and the named
 * OBJECTS a guest has been granted. Under all three, the audit log.
 */

const GROUPS: Array<{ title: string; caps: Array<{ cap: Capability; label: string }> }> = [
    {
        title: "The house",
        caps: [
            { cap: "dashboard.full", label: "The family dashboard" },
            { cap: "dashboard.child", label: "The child dashboard" },
            { cap: "dashboard.guest", label: "The guest dashboard" },
            { cap: "family.manage", label: "Manage the family" },
            { cap: "family.settings", label: "Family settings" },
            { cap: "people.manage", label: "Relatives, friends, mentors" },
            { cap: "notifications.view", label: "Notifications" },
            { cap: "ai.ask", label: "Ask the companion" },
        ],
    },
    {
        title: "Execute",
        caps: [
            { cap: "tasks.manage", label: "Create and assign tasks" },
            { cap: "tasks.assigned", label: "Their own tasks" },
            { cap: "tasks.view", label: "See the task board" },
            { cap: "goals.manage", label: "Set family goals" },
            { cap: "goals.view", label: "See family goals" },
            { cap: "projects.manage", label: "Run projects" },
            { cap: "projects.view", label: "See projects" },
            { cap: "calendar.manage", label: "Add calendar events" },
            { cap: "calendar.view", label: "See the calendar" },
        ],
    },
    {
        title: "Grow",
        caps: [
            { cap: "learning.manage", label: "Plan learning" },
            { cap: "learning.assigned", label: "Their own lessons" },
            { cap: "books.manage", label: "Manage the library" },
            { cap: "books.view", label: "Read the library" },
            { cap: "bible.manage", label: "Lead Bible study" },
            { cap: "bible.assigned", label: "Their reading plan" },
            { cap: "bible.prayerwall", label: "The prayer wall" },
            { cap: "curricula.manage", label: "Build curricula" },
            { cap: "curricula.mine", label: "Their own curriculum" },
        ],
    },
    {
        title: "Live",
        caps: [
            { cap: "finance.manage", label: "The money" },
            { cap: "finance.view", label: "See budgets" },
            { cap: "travel.manage", label: "Plan trips" },
            { cap: "travel.view", label: "See trips" },
            { cap: "wardrobe.manage", label: "Everyone's wardrobe" },
            { cap: "wardrobe.mine", label: "Their own closet" },
            { cap: "wellness.manage", label: "Everyone's wellness" },
            { cap: "wellness.mine", label: "Their own habits" },
        ],
    },
    {
        title: "Create & private",
        caps: [
            { cap: "studio.full", label: "The whole studio" },
            { cap: "studio.child", label: "The child studio" },
            { cap: "studio.limited", label: "A limited studio" },
            { cap: "moodboards.manage", label: "Make moodboards" },
            { cap: "moodboards.view", label: "See moodboards" },
            { cap: "memories.manage", label: "Add memories" },
            { cap: "memories.view", label: "See memories" },
            { cap: "notes.private", label: "Private notes" },
        ],
    },
];

const ROLES: Role[] = ["parent", "child", "guest"];

export default function PermissionsPage() {
    const sp = useSpace();
    const { state, mutate } = useFamily();
    const { toast } = useToast();
    const [sharing, setSharing] = useState(false);
    const [revoking, setRevoking] = useState<ObjectShare | null>(null);
    const [busy, setBusy] = useState(false);
    const [open, setOpen] = useState<string | null>(null);

    const matrix = useMemo(() => {
        const byRole: Record<Role, Set<Capability>> = { parent: new Set(defaultsFor("parent")), child: new Set(defaultsFor("child")), guest: new Set(defaultsFor("guest")) };
        return byRole;
    }, []);

    if (!sp.can("family.manage")) {
        return (
            <div>
                <PageTitle title="Permissions & sharing" area="family" />
                <FamilyNav />
                <EmptyModule title="Only a parent sets permissions" body="What you can see was decided by a parent. Ask them if something is missing." action={<Link to="/family/settings" className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-md font-semibold text-white">My profile</Link>} />
            </div>
        );
    }
    if (!state) return null;

    const others = sp.members.filter((m) => m.role !== "parent");
    const guests = sp.members.filter((m) => m.role === "guest");
    const pendingGuests = sp.coreState.invites.filter((i) => i.status === "pending" && i.role === "guest");
    const shareTargets = [...guests, ...pendingGuests];

    const setOverride = async (member: Member, cap: Capability, value: boolean | null) => {
        setBusy(true);
        try {
            const next = { ...(state.overrides[member.id] ?? {}) };
            if (value === null) delete next[cap];
            else next[cap] = value;
            const diff = grantDiff(member, member.ageBand, next);
            await mutate((r) => r.setOverride(member.id, cap, value));
            await sp.mutateCore(async (c) => {
                for (const d of diff) await c.setGrant(member.id, d.cap, d.on);
            });
            toast(value === null ? "Back to the default" : value ? "Allowed" : "Blocked", "success");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't change that", "danger");
        } finally {
            setBusy(false);
        }
    };

    const addShare = async (input: NewShare) => {
        await mutate((r) => r.addShare(input));
        toast("Shared", "success");
    };

    return (
        <div>
            <PageTitle title="Permissions & sharing" area="family" sub="What each role holds, what you have changed by hand, and the named things your guests can reach." />
            <FamilyNav />

            <Section title="What each role holds">
                <Card className="p-0">
                    <div className="relative overflow-x-auto">
                        <table className="w-full min-w-[520px] border-collapse text-sm">
                            <caption className="sr-only">Capabilities held by each role by default</caption>
                            <thead>
                                <tr className="border-b border-line">
                                    <th scope="col" className="px-4 py-3 text-left font-semibold">
                                        Capability
                                    </th>
                                    {ROLES.map((r) => (
                                        <th key={r} scope="col" className="w-24 px-4 py-3 text-center font-semibold">
                                            {ROLE_LABEL[r]}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {GROUPS.map((g) => (
                                    <Fragment key={g.title}>
                                        <tr className="bg-page">
                                            <th scope="colgroup" colSpan={4} className="px-4 py-2 text-left text-2xs font-semibold uppercase tracking-[0.08em] text-caption">
                                                {g.title}
                                            </th>
                                        </tr>
                                        {g.caps.map((c) => (
                                            <tr key={c.cap} className="border-b border-line last:border-0">
                                                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                                                    {c.label}
                                                </th>
                                                {ROLES.map((r) => (
                                                    <td key={r} className="px-4 py-2.5 text-center">
                                                        {matrix[r].has(c.cap) ? (
                                                            <span className="inline-grid size-5 place-items-center rounded-full bg-mint-soft text-mint" title={`${ROLE_LABEL[r]}: yes`}>
                                                                <Check size={12} strokeWidth={3} aria-hidden="true" />
                                                                <span className="sr-only">Yes</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-grid size-5 place-items-center rounded-full bg-page text-caption" title={`${ROLE_LABEL[r]}: no`}>
                                                                <Minus size={12} aria-hidden="true" />
                                                                <span className="sr-only">No</span>
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="border-t border-line px-4 py-3 text-xs leading-5 text-caption">
                        Parents hold everything and cannot be narrowed. Children and guests can be widened one capability at a time below — never by handing them a module.
                    </p>
                </Card>
            </Section>

            <Section title="Set by hand">
                {others.length ? (
                    <ul className="grid gap-3">
                        {others.map((m) => {
                            const count = Object.keys(state.overrides[m.id] ?? {}).length;
                            const isOpen = open === m.id;
                            return (
                                <Card as="li" key={m.id}>
                                    <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.id)} className="flex w-full items-center gap-3 text-left">
                                        <MemberAvatar member={m} size="md" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-base font-semibold">{m.name}</span>
                                            <span className="block text-xs text-muted">
                                                {ROLE_LABEL[m.role]}
                                                {m.role === "child" ? ` · ${m.ageBand.replace("-", " ")} band` : ""} · {count ? `${count} set by hand` : "band defaults only"}
                                            </span>
                                        </span>
                                        {count > 0 && <Tag tone="brand">{count}</Tag>}
                                        <span className="text-sm font-semibold text-brand">{isOpen ? "Close" : "Open"}</span>
                                    </button>
                                    {isOpen && (
                                        <div className="mt-4">
                                            <ProfileSuggester member={m} overrides={state.overrides[m.id]} busy={busy} onSet={(cap, value) => setOverride(m, cap, value)} />
                                            <GrantsEditor member={m} overrides={state.overrides[m.id]} busy={busy} onSet={(cap, value) => setOverride(m, cap, value)} />
                                            <Link to={`/family/members/${m.id}`} className="mt-3 inline-block text-sm font-semibold text-brand underline-offset-4 hover:underline">
                                                Open {m.name.split(" ")[0]}'s card
                                            </Link>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </ul>
                ) : (
                    <EmptyState icon={<Users size={20} aria-hidden="true" />} title="Everyone here is a parent" body="Add a child or a guest and their permissions will appear here." />
                )}
            </Section>

            <Section
                title="Shared with guests"
                action={
                    shareTargets.length ? (
                        <Button size="sm" variant="outline" onClick={() => setSharing(true)}>
                            <Share2 size={13} aria-hidden="true" /> Share something
                        </Button>
                    ) : undefined
                }
            >
                {state.shares.length ? (
                    <ul className="grid gap-2">
                        {state.shares.map((s) => {
                            const target = shareTarget(s.memberId, sp.members, sp.coreState.invites);
                            const gone = expired(s, sp.today);
                            return (
                                <Card as="li" key={s.id} className={cn("flex flex-wrap items-center gap-3", gone && "opacity-60")}>
                                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-page text-xl" aria-hidden="true">
                                        {SHARE_TYPE[s.objectType].emoji}
                                    </span>
                                    <div className="min-w-[180px] flex-1">
                                        <p className="text-md font-semibold">{s.label}</p>
                                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-caption">
                                            <span>{SHARE_TYPE[s.objectType].label}</span>
                                            <span>· with {target.name}</span>
                                            {target.pending && <Tag tone="warn">Invited</Tag>}
                                            {s.expiresAt && <span className={cn(gone && "text-danger-ink")}>· {gone ? "expired" : `until ${shortDate(s.expiresAt)}`}</span>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs">
                                            <span className="sr-only">What {target.name} can do with {s.label}</span>
                                            <select
                                                value={s.level}
                                                onChange={async (e) => {
                                                    await mutate((r) => r.setShareLevel(s.id, e.target.value as ObjectShare["level"]));
                                                    toast("Updated", "success");
                                                }}
                                                className="h-9 rounded-sm border border-line-strong bg-card px-2.5 text-xs font-medium outline-none focus:border-brand"
                                            >
                                                <option value="view">View only</option>
                                                <option value="contribute">Can join in</option>
                                            </select>
                                        </label>
                                        <Button size="sm" variant="ghost" onClick={() => setRevoking(s)}>
                                            Stop sharing
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </ul>
                ) : (
                    <EmptyState
                        icon={<Share2 size={20} aria-hidden="true" />}
                        title="Nothing is shared yet"
                        body="Guests are granted named things — a trip, a board, an album, the prayer wall — never a module."
                        action={shareTargets.length ? <Button onClick={() => setSharing(true)}>Share something</Button> : <Link to="/family/invites" className="text-md font-semibold text-brand underline underline-offset-4">Invite a guest first</Link>}
                    />
                )}
            </Section>

            <Section title="What has changed">
                <AuditFeed entries={state.audit} members={sp.members} />
            </Section>

            <ShareDialog open={sharing} onClose={() => setSharing(false)} targets={shareTargets} onSave={addShare} />
            <Confirm
                open={Boolean(revoking)}
                title={revoking ? `Stop sharing “${revoking.label}”?` : "Stop sharing"}
                body="They lose it on the next request. Nothing they contributed is deleted."
                confirmLabel="Stop sharing"
                danger
                onConfirm={async () => {
                    if (!revoking) return;
                    await mutate((r) => r.revokeShare(revoking.id));
                    toast("No longer shared", "success");
                }}
                onClose={() => setRevoking(null)}
            />
        </div>
    );
}
