import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { getBusiness, listMembers, type Organization } from "@/lib/db/organizations";
import { getSubscriptionForOrg } from "@/lib/db/billing";
import BusinessSiteCard from "@/pages/dashboard/business/BusinessSiteCard";
import BusinessBrandCard from "@/pages/dashboard/business/BusinessBrandCard";
import BusinessProfileCard from "@/pages/dashboard/business/BusinessProfileCard";
import { formatPrice } from "@/lib/db/marketplace";
import { Card, Chip, Empty, InitialAvatar, PageHeader, stageTone } from "@/components/dash/Ui";
import {
  listInvitations,
  inviteMember,
  revokeInvitation,
  type Invitation,
} from "@/lib/db/collaboration";
import { setMemberRole } from "@/lib/db/ops/policies";
import { ASSIGNABLE_ROLES, roleLabel } from "@/lib/ops/permissions";

const INVITE_ROLES: { value: Invitation["role"]; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "viewer", label: "Viewer" },
];

/* ── Icons (module-level, per house style) ─────────────────────────────── */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const I_CONSOLE = <svg width="18" height="18" viewBox="0 0 24 24" {...ln} aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="m7.5 9.5 3 2.5-3 2.5M12.5 15h4" /></svg>;
const I_GLOBE = <svg width="18" height="18" viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.7 5.6 3.7 9S14.5 18.5 12 21c-2.5-2.5-3.7-5.6-3.7-9S9.5 5.5 12 3Z" /></svg>;
const I_SEARCH = <svg width="22" height="22" viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;

const CSS = `
.bzx-detail-grid { display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 768px) { .bzx-detail-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.bzx-detail-grid > .bzx-span { grid-column: 1 / -1; }
.bzx-plan-amount { font-size: clamp(24px, 2.2vw, 32px); font-weight: 600; letter-spacing: -0.03em; line-height: 1.1; }
.bzx-invite-form { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
.bzx-invite-form .hrx-field { flex: 1 1 220px; margin-bottom: 0; }
.bzx-invite-form .hrx-field.role { flex: 0 1 160px; }
.bzx-back { font-size: 14px; color: var(--hrx-muted); text-decoration: none; }
.bzx-back:hover { color: var(--hrx-ink); }
`;

export default function BusinessDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useCachedData(
    id ? `business:${id}` : "business:none",
    async () => {
      if (!id) return null;
      const [o, m, s, inv] = await Promise.all([
        getBusiness(id),
        listMembers(id),
        getSubscriptionForOrg(id),
        listInvitations(id),
      ]);
      if (o.error) throw new Error(o.error);
      return { org: o.data, members: m.data, sub: s.data, invites: inv.data };
    },
    { ttl: DASHBOARD_TTL },
  );
  const members = data?.members ?? [];
  const sub = data?.sub ?? null;
  const invites = data?.invites ?? [];

  // Local patch applied over the cached org (e.g. after the site card saves). It
  // resets naturally because this detail route remounts per business id.
  const [orgPatch, setOrgPatch] = useState<Partial<Organization>>({});
  const org = data?.org ? { ...data.org, ...orgPatch } : null;

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Invitation["role"]>("staff");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  // Team role changes go through the app_set_member_role security-definer RPC
  // (memberships have no UPDATE policy). The server re-checks the caller is an
  // owner/admin and that the owner seat is untouched — the UI gate is comfort only.
  const [roleBusy, setRoleBusy] = useState<string | null>(null);
  const [teamMsg, setTeamMsg] = useState<string | null>(null);
  async function onChangeRole(userId: string, role: "admin" | "staff" | "viewer") {
    if (!id || roleBusy) return;
    setRoleBusy(userId);
    setTeamMsg(null);
    const { error: roleErr } = await setMemberRole(id, userId, role);
    setRoleBusy(null);
    if (roleErr) setTeamMsg(roleErr);
    else {
      setTeamMsg("Role updated.");
      reload();
    }
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !user || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    const { error: invErr } = await inviteMember(id, user.id, inviteEmail, inviteRole);
    setInviting(false);
    if (invErr) {
      setInviteMsg(invErr);
    } else {
      setInviteEmail("");
      setInviteMsg("Invitation sent.");
      reload();
    }
  }

  async function onRevoke(inviteId: string) {
    if (!id) return;
    const { error: revErr } = await revokeInvitation(inviteId);
    if (revErr) setInviteMsg(revErr);
    else reload();
  }

  const pendingInvites = invites.filter((i) => i.status === "pending");

  if (loading)
    return (
      <Card>
        <p className="text-center mb-0" style={{ color: "var(--hrx-muted)" }}>Loading…</p>
      </Card>
    );
  if (!org)
    return (
      <div className="d-flex flex-column gap-2">
        {error && (
          <div className="alert alert-warning py-2 px-3 mb-0" role="alert">
            {error}
          </div>
        )}
        <Empty
          icon={I_SEARCH}
          title="Business not found"
          action={
            <Link to="/dashboard/businesses" className="hrx-pill">
              Back to businesses
            </Link>
          }
        >
          It may have been removed, or you may not have access to it.
        </Empty>
      </div>
    );

  return (
    <div className="d-flex flex-column gap-2">
      <PageMeta title={`Phoxta - ${org.name}`} />
      <style>{CSS}</style>

      <div>
        <Link to="/dashboard/businesses" className="bzx-back">
          ← Businesses
        </Link>
      </div>

      <PageHeader
        crumb="Businesses"
        title={org.name}
        note={
          <span className="d-inline-flex align-items-center flex-wrap gap-1">
            {org.lifecycle_stage && <Chip tone="solid">{org.lifecycle_stage}</Chip>}
            <Chip tone={stageTone(org.stage)}>{org.stage}</Chip>
            {org.vertical && <Chip tone="line">{org.vertical}</Chip>}
            {org.primary_region && <Chip tone="line">{org.primary_region}</Chip>}
          </span>
        }
        actions={
          <>
            {org.site_url && (
              <a href={org.site_url} target="_blank" rel="noreferrer" className="hrx-pill">
                {I_GLOBE} View live site
              </a>
            )}
            <Link to={`/dashboard/businesses/${org.id}/ops`} className="hrx-pill primary">
              {I_CONSOLE} Open console
            </Link>
          </>
        }
        stat={{ label: "Team members", value: members.length }}
      />

      <div className="bzx-detail-grid">
        <Card
          title="Plan"
          right={
            sub ? (
              <Link to="/dashboard/billing" className="hrx-seeall">
                Manage billing
              </Link>
            ) : undefined
          }
        >
          {sub ? (
            <>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="bzx-plan-amount text-capitalize">{sub.plan}</span>
                <Chip tone={stageTone(sub.status)}>{sub.status.replace("_", " ")}</Chip>
              </div>
              <p className="mb-0" style={{ color: "var(--hrx-muted)", fontSize: 14 }}>
                {formatPrice(sub.amount_cents, sub.currency)}/mo
                {sub.current_period_end ? ` · renews ${new Date(sub.current_period_end).toLocaleDateString()}` : ""}
              </p>
            </>
          ) : (
            <p className="mb-0" style={{ color: "var(--hrx-muted)", fontSize: 14 }}>No plan on file yet.</p>
          )}
        </Card>

        <Card title={`Team (${members.length})`}>
          {members.map((m) => (
            <div key={m.user_id} className="hrx-listrow">
              <InitialAvatar name={m.user_id === user?.id ? "You" : "Member"} />
              <div className="main">
                <p className="t">{m.user_id === user?.id ? "You" : "Member"}</p>
              </div>
              {/* The owner seat is immutable; only an owner/admin edits the rest. */}
              {canManage && m.role !== "owner" ? (
                <select
                  className="form-select form-select-sm w-auto"
                  aria-label="Change role"
                  value={m.role}
                  disabled={roleBusy === m.user_id}
                  onChange={(e) => onChangeRole(m.user_id, e.target.value as "admin" | "staff" | "viewer")}
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Chip tone={m.role === "owner" ? "blue" : "line"}>{roleLabel(m.role)}</Chip>
              )}
            </div>
          ))}
          {teamMsg && (
            <p className="mt-2 mb-0" style={{ color: "var(--hrx-muted)", fontSize: 14 }} role="status">
              {teamMsg}
            </p>
          )}
        </Card>

        <div className="bzx-span">
          <BusinessSiteCard
            org={org}
            canManage={canManage}
            onUpdated={(patch) => setOrgPatch((p) => ({ ...p, ...patch }))}
          />
        </div>

        <div className="bzx-span">
          <BusinessBrandCard org={org} canManage={canManage} />
        </div>

        <div className="bzx-span">
          <BusinessProfileCard org={org} canManage={canManage} />
        </div>

        {canManage && (
          <div className="bzx-span">
            <Card title="Invite teammates">
              <form onSubmit={onInvite} className="bzx-invite-form">
                <label className="hrx-field">
                  <span>Email</span>
                  <input
                    type="email"
                    className="form-control"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@email.com"
                    required
                  />
                </label>
                <label className="hrx-field role">
                  <span>Role</span>
                  <select className="form-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Invitation["role"])}>
                    {INVITE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="hrx-pill dark" disabled={inviting}>
                  {inviting ? "Sending…" : "Send invite"}
                </button>
              </form>
              {inviteMsg && (
                <p className="mt-2 mb-0" style={{ color: "var(--hrx-muted)", fontSize: 14 }} role="status">
                  {inviteMsg}
                </p>
              )}

              {pendingInvites.length > 0 && (
                <div className="mt-3">
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--hrx-muted)" }}>Pending invitations</div>
                  {pendingInvites.map((i) => (
                    <div key={i.id} className="hrx-listrow">
                      <InitialAvatar name={i.email} />
                      <div className="main">
                        <p className="t">{i.email}</p>
                        <p className="s text-capitalize">{i.role}</p>
                      </div>
                      <button type="button" className="hrx-seeall" onClick={() => onRevoke(i.id)}>
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        <div className="bzx-span">
          <Card>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div style={{ minWidth: 0 }}>
                <h2 className="hrx-card-title mb-1">Operating console</h2>
                <p className="mb-0" style={{ color: "var(--hrx-muted)", fontSize: 14 }}>
                  Run the business day to day — CRM, commerce, invoicing, content, bookings, helpdesk, marketing and analytics.
                </p>
              </div>
              <Link to={`/dashboard/businesses/${org.id}/ops`} className="hrx-pill dark flex-shrink-0">
                {I_CONSOLE} Open console
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
