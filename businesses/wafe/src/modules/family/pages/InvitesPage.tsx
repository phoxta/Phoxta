import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Copy, Mail, ShieldCheck, Ticket } from "lucide-react";
import { ROLE_LABEL, type AgeBand, type Invite, type Role } from "@/data/core";
import { cn } from "@/lib/cn";
import { isEmail, relative } from "@/lib/format";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, EmptyModule, MemberAvatar, PageTitle, Section } from "@/components/shared";
import { Button, Card, EmptyState, Field, Tag } from "@/components/ui/primitives";
import { FamilyNav } from "../components/FamilyNav";
import { inviteDaysLeft } from "../derive";
import { useFamily } from "../hooks";
import { BAND_DEFAULTS, INVITE_ROLES } from "../types";

/**
 * Invitations.
 *
 * An invitation is a promise a newcomer cannot rewrite: the role, the relation
 * and the name are fixed by the parent who sent it, the code is good for seven
 * days, and accepting joins on exactly those terms. Nothing about the code
 * can raise the role it carries.
 */
export default function InvitesPage() {
    const sp = useSpace();
    const { mutate } = useFamily();
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [relation, setRelation] = useState("");
    const [role, setRole] = useState<Role>("guest");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [revoking, setRevoking] = useState<Invite | null>(null);

    if (!sp.can("family.manage")) {
        return (
            <div>
                <PageTitle title="Invitations" area="family" />
                <FamilyNav />
                <EmptyModule title="Parents send the invitations" body="If someone should be here, ask a parent." action={<Link to="/family/settings" className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-md font-semibold text-white">My profile</Link>} />
            </div>
        );
    }

    const invites = sp.coreState.invites;
    const pending = invites.filter((i) => i.status === "pending");

    const send = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return setError("Who are you inviting?");
        if (!isEmail(email)) return setError("That email doesn't look right");
        setBusy(true);
        setError(null);
        try {
            let code = "";
            await sp.mutateCore(async (c) => {
                const inv = await c.invite({ name: name.trim(), email: email.trim(), role, relation: relation.trim() || ROLE_LABEL[role] });
                code = inv.code;
            });
            await mutate((r) => r.audit({ action: "invite", targetType: "invite", targetId: code, summary: `Invited ${name.trim()} as a ${ROLE_LABEL[role].toLowerCase()}`, before: null, after: role }));
            setName("");
            setEmail("");
            setRelation("");
            toast(`Invitation sent — code ${code}`, "success");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't send that");
        } finally {
            setBusy(false);
        }
    };

    const copy = async (inv: Invite) => {
        const link = `${window.location.origin}/signup?code=${encodeURIComponent(inv.code)}`;
        try {
            await navigator.clipboard.writeText(link);
            toast("Link copied", "success");
        } catch {
            toast(link);
        }
    };

    const revoke = async (inv: Invite) => {
        await sp.mutateCore((c) => c.revokeInvite(inv.id));
        await mutate((r) => r.audit({ action: "invite", targetType: "invite", targetId: inv.code, summary: `Withdrew the invitation to ${inv.name}`, before: "pending", after: "revoked" }));
        toast("Invitation withdrawn", "success");
    };

    /**
     * Demo only: walk the acceptance without an email round trip. The
     * newcomer joins with the invitation's role — never a wider one — and
     * anything already shared with the invitation follows them in.
     */
    const acceptInDemo = async (inv: Invite) => {
        setBusy(true);
        try {
            const band: AgeBand = inv.role === "child" ? "teen" : "adult";
            const created = { id: "" };
            await sp.mutateCore(async (c) => {
                const m = await c.addMember({ name: inv.name, relation: inv.relation, role: inv.role, ageBand: band, email: inv.email });
                created.id = m.id;
                if (inv.role !== "parent") for (const cap of BAND_DEFAULTS[band]) await c.setGrant(m.id, cap, true);
                await c.revokeInvite(inv.id);
            });
            await mutate(async (r) => {
                await r.retargetShares(inv.id, created.id);
                await r.audit({ action: "invite", targetType: "member", targetId: created.id, summary: `${inv.name} accepted and joined as a ${ROLE_LABEL[inv.role].toLowerCase()} — the invitation's role, and nothing wider`, before: "pending", after: inv.role });
            });
            toast(`${inv.name} joined as a ${ROLE_LABEL[inv.role].toLowerCase()}`, "success");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't accept that", "danger");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <PageTitle title="Invitations" area="family" sub="Bring someone in on terms you choose — and only those terms." />
            <FamilyNav />

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div>
                    <Section title={pending.length ? `Waiting (${pending.length})` : "Waiting"}>
                        {pending.length ? (
                            <ul className="grid gap-3">
                                {pending.map((inv) => {
                                    const left = inviteDaysLeft(inv, sp.today);
                                    const dead = left <= 0;
                                    return (
                                        <Card as="li" key={inv.id} className="flex flex-wrap items-center gap-4">
                                            <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", dead ? "bg-danger-soft text-danger-ink" : "bg-brand-soft text-brand-ink")} aria-hidden="true">
                                                <Ticket size={18} />
                                            </span>
                                            <div className="min-w-[180px] flex-1">
                                                <p className="text-base font-semibold">{inv.name}</p>
                                                <p className="mt-0.5 truncate text-sm text-muted">{inv.email}</p>
                                                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-caption">
                                                    <Tag tone={inv.role === "parent" ? "family" : inv.role === "child" ? "grow" : "live"}>{ROLE_LABEL[inv.role]}</Tag>
                                                    <span>{inv.relation}</span>
                                                    <span>· sent {relative(inv.createdAt)}</span>
                                                    <span className={cn("font-semibold", dead ? "text-danger-ink" : left <= 2 ? "text-peach" : "")}>{dead ? "· expired" : `· ${left} day${left === 1 ? "" : "s"} left`}</span>
                                                </p>
                                            </div>
                                            <code className="rounded-sm bg-page px-2.5 py-1.5 text-sm font-semibold tracking-[0.08em]">{inv.code}</code>
                                            <div className="flex flex-wrap gap-2">
                                                <Button variant="outline" size="md" onClick={() => void copy(inv)}>
                                                    <Copy size={14} aria-hidden="true" /> Copy link
                                                </Button>
                                                {sp.kind === "demo" && !dead && (
                                                    <Button variant="brand" size="md" disabled={busy} onClick={() => void acceptInDemo(inv)}>
                                                        Accept in the demo
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="md" onClick={() => setRevoking(inv)}>
                                                    Withdraw
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </ul>
                        ) : (
                            <EmptyState icon={<Mail size={20} aria-hidden="true" />} title="Nobody is waiting" body="Invite a second parent, a teenager with their own login, or a grandparent who should see the album." />
                        )}
                    </Section>

                    <Section title="How joining works">
                        <Card className="flex items-start gap-3">
                            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-grow-soft text-grow-ink" aria-hidden="true">
                                <ShieldCheck size={17} />
                            </span>
                            <div className="text-sm leading-6 text-muted">
                                <p>
                                    The code carries the role you chose. When it is redeemed the newcomer's member row is created with <strong>that</strong> role, that relation and that name — the code cannot be edited, cannot be reused to widen anything, and cannot make anyone a parent who was invited as a guest.
                                </p>
                                <p className="mt-2">A code lasts seven days. After that it stops working and you send a new one — a link left in an old email is not a way into your family.</p>
                            </div>
                        </Card>
                    </Section>
                </div>

                <aside>
                    <Card className="lg:sticky lg:top-24">
                        <h2 className="mb-3 font-display text-2xl">Invite someone</h2>
                        <form onSubmit={send} className="grid gap-3.5">
                            <Field label="Their name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Auntie Kemi" required />
                            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kemi@example.com" required />
                            <Field label="Relation" value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="Aunt, Godfather, Friend…" />
                            <div>
                                <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">They join as</span>
                                <div className="grid gap-2" role="radiogroup" aria-label="Role">
                                    {INVITE_ROLES.map((r) => (
                                        <button key={r.role} type="button" role="radio" aria-checked={role === r.role} onClick={() => setRole(r.role)} className={cn("rounded-sm border px-3 py-2.5 text-left", role === r.role ? "border-brand bg-brand-soft" : "border-line-strong hover:border-ink")}>
                                            <span className="block text-sm font-semibold">{r.label}</span>
                                            <span className="block text-2xs leading-4 text-caption">{r.note}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {error && <p className="text-sm text-danger-ink">{error}</p>}
                            <Button type="submit" variant="brand" block loading={busy}>
                                Send the invitation
                            </Button>
                            <p className="text-xs leading-5 text-caption">Sent by {sp.me.name.split(" ")[0]}. You will see it here until it is accepted or it expires.</p>
                        </form>
                    </Card>

                    <Card className="mt-4">
                        <h3 className="mb-2 text-md font-semibold">Already here</h3>
                        <ul className="flex flex-wrap gap-2">
                            {sp.members.map((m) => (
                                <li key={m.id} title={`${m.name} · ${ROLE_LABEL[m.role]}`}>
                                    <MemberAvatar member={m} size="sm" />
                                </li>
                            ))}
                        </ul>
                    </Card>
                </aside>
            </div>

            <Confirm
                open={Boolean(revoking)}
                title={revoking ? `Withdraw the invitation to ${revoking.name}?` : "Withdraw"}
                body="The code stops working immediately. You can always send another."
                confirmLabel="Withdraw it"
                danger
                onConfirm={async () => {
                    if (revoking) await revoke(revoking);
                }}
                onClose={() => setRevoking(null)}
            />
        </div>
    );
}
