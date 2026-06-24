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
import {
  listInvitations,
  inviteMember,
  revokeInvitation,
  type Invitation,
} from "@/lib/db/collaboration";

const INVITE_ROLES: { value: Invitation["role"]; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "viewer", label: "Viewer" },
];

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

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;
  if (!org)
    return (
      <div>
        {error && <div className="alert alert-warning py-2 px-3 fz-font-md">{error}</div>}
        <p className="neutral-500">Business not found.</p>
        <Link to="/dashboard/businesses" className="fw-600 text-decoration-none">
          ← Back to businesses
        </Link>
      </div>
    );

  return (
    <div style={{ maxWidth: 880 }}>
      <PageMeta title={`Phoxta - ${org.name}`} />
      <Link to="/dashboard/businesses" className="fz-font-md neutral-500 text-decoration-none">
        ← Businesses
      </Link>

      <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mb-4">
        <h2 className="fw-600 mb-0 me-2">{org.name}</h2>
        {org.lifecycle_stage && <span className="badge bg-neutral-900 text-white text-capitalize fw-500">{org.lifecycle_stage}</span>}
        <span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{org.stage}</span>
        {org.vertical && <span className="badge bg-neutral-100 neutral-700 fw-500">{org.vertical}</span>}
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
            <h6 className="fw-600 mb-3">Plan</h6>
            {sub ? (
              <>
                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <span className="fz-24 fw-700 text-capitalize">{sub.plan}</span>
                  <span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{sub.status.replace("_", " ")}</span>
                </div>
                <div className="fz-font-md neutral-500">
                  {formatPrice(sub.amount_cents, sub.currency)}/mo
                  {sub.current_period_end ? ` · renews ${new Date(sub.current_period_end).toLocaleDateString()}` : ""}
                </div>
                <Link to="/dashboard/billing" className="fz-font-md fw-600 text-decoration-none d-inline-block mt-3">
                  Manage billing →
                </Link>
              </>
            ) : (
              <p className="neutral-500 mb-0">No plan on file yet.</p>
            )}
          </div>
        </div>

        <div className="col-md-6">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
            <h6 className="fw-600 mb-3">Team ({members.length})</h6>
            <ul className="list-unstyled m-0 d-flex flex-column gap-2">
              {members.map((m) => (
                <li key={m.user_id} className="d-flex align-items-center justify-content-between">
                  <span className="fz-font-md neutral-700">{m.user_id === user?.id ? "You" : "Member"}</span>
                  <span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{m.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-12">
          <BusinessSiteCard
            org={org}
            canManage={canManage}
            onUpdated={(patch) => setOrgPatch((p) => ({ ...p, ...patch }))}
          />
        </div>

        <div className="col-12">
          <BusinessBrandCard org={org} canManage={canManage} />
        </div>

        <div className="col-12">
          <BusinessProfileCard org={org} canManage={canManage} />
        </div>

        {canManage && (
          <div className="col-12">
            <div className="bg-neutral-0 rounded-4 p-4 border-100">
              <h6 className="fw-600 mb-3">Invite teammates</h6>
              <form onSubmit={onInvite} className="row g-2 align-items-end">
                <div className="col-sm-6">
                  <label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Email</label>
                  <input
                    type="email"
                    className="form-control rounded-3"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@email.com"
                    required
                  />
                </div>
                <div className="col-sm-3">
                  <label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Role</label>
                  <select className="form-select rounded-3" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Invitation["role"])}>
                    {INVITE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-sm-3">
                  <button type="submit" className="btn btn-dark w-100 rounded-3" disabled={inviting}>
                    {inviting ? "Sending…" : "Send invite"}
                  </button>
                </div>
              </form>
              {inviteMsg && <div className="fz-font-md neutral-500 mt-2">{inviteMsg}</div>}

              {pendingInvites.length > 0 && (
                <div className="mt-4">
                  <div className="fz-font-sm fw-600 neutral-500 mb-2">Pending invitations</div>
                  <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                    {pendingInvites.map((i) => (
                      <li key={i.id} className="d-flex align-items-center justify-content-between gap-3">
                        <span className="fz-font-md neutral-700">
                          {i.email} <span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500 ms-1">{i.role}</span>
                        </span>
                        <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => onRevoke(i.id)}>
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="col-12">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h6 className="fw-600 mb-1">Operating console</h6>
              <p className="neutral-500 mb-0">
                Run the business day to day — CRM, commerce, invoicing, content, bookings, helpdesk, marketing and analytics.
              </p>
            </div>
            <Link to={`/dashboard/businesses/${org.id}/ops`} className="at-btn d-inline-block flex-shrink-0">
              <span>
                <span className="text-1">Open console</span>
                <span className="text-2">Open console</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
