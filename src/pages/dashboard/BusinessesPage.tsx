import { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { organizationsQuery, invitationsQuery } from "@/lib/cache/dashboardQueries";
import { createBusiness } from "@/lib/db/organizations";
import type { Organization } from "@/lib/db/organizations";
import { acceptInvitation } from "@/lib/db/collaboration";
import { blueprintCover } from "@/lib/blueprintCover";
import { Card, Chip, Empty, InitialAvatar, PageHeader, stageTone } from "@/components/dash/Ui";

/* ── Icons (module-level, per house style) ─────────────────────────────── */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const I_PLUS = <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9.2 3.5h1.6v5.7h5.7v1.6h-5.7v5.7H9.2v-5.7H3.5V9.2h5.7z" /></svg>;
const I_STORE = <svg width="22" height="22" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5a2.6 2.6 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.6 2.6 0 0 0 5.3 0" /><path d="M5.2 12v8h13.6v-8" /><path d="M9.5 20v-5h5v5" /></svg>;
const I_ARROW = <svg width="18" height="18" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>;
const I_CONSOLE = <svg width="18" height="18" viewBox="0 0 24 24" {...ln} aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="m7.5 9.5 3 2.5-3 2.5M12.5 15h4" /></svg>;

/* Which storefront listing a business renders as: the last app_path segment is
   the blueprint slug (migration 0090 backfills it), so blueprintCover gives the
   same artwork every marketplace surface shows. Hand-created businesses have no
   app_path and fall back to the avatar tile. */
function coverFor(org: Organization): string | null {
  const appSlug = String(org.app_path ?? "").split("/").filter(Boolean).pop();
  return appSlug ? blueprintCover(appSlug) : null;
}

const CSS = `
.bzx-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); }
.bzx-tile { display: flex; flex-direction: column; }
.bzx-tile .hrx-imgcard { border-radius: 0; }
.bzx-cover { aspect-ratio: 16 / 10; }
.bzx-cover img { width: 100%; height: 100%; object-fit: cover; }
.bzx-plain {
  aspect-ratio: 16 / 10; display: flex; align-items: center; justify-content: center;
  background: var(--hrx-soft); border-bottom: 1px solid var(--hrx-border-soft); position: relative;
}
.bzx-plain .corner-r { position: absolute; top: 12px; right: 12px; display: flex; gap: 6px; }
.bzx-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; }
.bzx-foot .meta { min-width: 0; }
.bzx-foot .meta .t { font-size: 15px; font-weight: 600; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bzx-foot .meta .s { font-size: 13px; color: var(--hrx-muted); margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bzx-foot .acts { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.bzx-formgrid { display: grid; gap: 0 14px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
`;

export default function BusinessesPage() {
  const { user } = useAuth();
  // Share the "organizations" cache key with Home/Assistant/Studio + Tier-1 warming
  // (single fetch, instant first paint); invitations are their own warmed key.
  const { data: orgs = [], loading, error: loadError, reload: reloadOrgs } = useCachedData(
    organizationsQuery.key,
    organizationsQuery.fetch,
  );
  const { data: invites = [], reload: reloadInvites } = useCachedData(invitationsQuery.key, invitationsQuery.fetch);

  const [actionError, setActionError] = useState<string | null>(null);
  const error = loadError || actionError;

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState("");
  const [region, setRegion] = useState("");
  const [creating, setCreating] = useState(false);

  async function onAccept(inviteId: string) {
    const { error: accErr } = await acceptInvitation(inviteId);
    if (accErr) {
      setActionError(accErr);
      return;
    }
    reloadOrgs();
    reloadInvites();
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setCreating(true);
    setActionError(null);
    const { error } = await createBusiness(user.id, { name, vertical: vertical || null, region: region || null });
    setCreating(false);
    if (error) {
      setActionError(error);
      return;
    }
    setName("");
    setVertical("");
    setRegion("");
    setShowForm(false);
    reloadOrgs();
  }

  return (
    <div className="d-flex flex-column gap-2">
      <PageMeta title="Phoxta - Your businesses" />
      <style>{CSS}</style>

      <PageHeader
        crumb="Portal"
        title="Businesses"
        note="Everything you own and operate on Phoxta."
        actions={
          <button type="button" className={`hrx-pill${showForm ? "" : " dark"}`} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : <>{I_PLUS} New business</>}
          </button>
        }
        stat={loading ? undefined : { label: "Businesses", value: orgs.length }}
      />

      {error && (
        <div className="alert alert-warning py-2 px-3 mb-0" role="alert">
          {error}
        </div>
      )}

      {invites.length > 0 && (
        <Card title="Invitations">
          {invites.map((i) => (
            <div key={i.id} className="hrx-listrow">
              <InitialAvatar name={i.organizations?.name} />
              <div className="main">
                <p className="t">{i.organizations?.name ?? "A business"}</p>
                <p className="s">
                  You&rsquo;ve been invited as <span className="text-capitalize">{i.role}</span>.
                </p>
              </div>
              <button type="button" className="hrx-pill dark" onClick={() => onAccept(i.id)}>
                Accept
              </button>
            </div>
          ))}
        </Card>
      )}

      {showForm && (
        <Card title="New business">
          <form onSubmit={onCreate}>
            <div className="bzx-formgrid">
              <label className="hrx-field">
                <span>Business name</span>
                <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className="hrx-field">
                <span>Industry</span>
                <input className="form-control" value={vertical} onChange={(e) => setVertical(e.target.value)} />
              </label>
              <label className="hrx-field">
                <span>Region</span>
                <input className="form-control" value={region} onChange={(e) => setRegion(e.target.value)} />
              </label>
            </div>
            <button type="submit" className="hrx-pill primary" disabled={creating}>
              {creating ? "Creating…" : "Create business"}
            </button>
          </form>
        </Card>
      )}

      {loading ? (
        <Card>
          <p className="text-center mb-0" style={{ color: "var(--hrx-muted)" }}>Loading…</p>
        </Card>
      ) : orgs.length === 0 ? (
        <Empty
          icon={I_STORE}
          title="No businesses yet"
          action={
            <Link to="/dashboard/marketplace" className="hrx-pill primary">
              Browse the marketplace
            </Link>
          }
        >
          Pick one from the marketplace, or create your own to get started.
        </Empty>
      ) : (
        <div className="bzx-grid">
          {orgs.map(({ role, organization }) => {
            const cover = coverFor(organization);
            return (
              <div key={organization.id} className="hrx-card bzx-tile">
                {cover ? (
                  <Link to={`/dashboard/businesses/${organization.id}`} className="hrx-imgcard bzx-cover" aria-label={`Open ${organization.name}`}>
                    <img src={cover} alt={organization.name} width={600} height={375} loading="lazy" />
                    <span className="shade">
                      <span className="cat text-capitalize">{role}</span>
                      <span className="name">{organization.name}</span>
                    </span>
                    <span className="corner-r">
                      <Chip tone={stageTone(organization.stage)}>{organization.stage}</Chip>
                    </span>
                  </Link>
                ) : (
                  <Link to={`/dashboard/businesses/${organization.id}`} className="bzx-plain text-decoration-none" aria-label={`Open ${organization.name}`}>
                    <InitialAvatar name={organization.name} size={64} />
                    <span className="corner-r">
                      <Chip tone={stageTone(organization.stage)}>{organization.stage}</Chip>
                    </span>
                  </Link>
                )}
                <div className="bzx-foot">
                  <div className="meta">
                    <p className="t">
                      <Link to={`/dashboard/businesses/${organization.id}`} className="text-decoration-none" style={{ color: "inherit" }}>
                        {organization.name}
                      </Link>
                    </p>
                    <p className="s text-capitalize">
                      {role}
                      {organization.primary_region ? ` · ${organization.primary_region}` : ""}
                    </p>
                  </div>
                  <div className="acts">
                    <Link
                      to={`/dashboard/businesses/${organization.id}/ops`}
                      className="hrx-rbtn"
                      title="Open the operating console"
                      aria-label={`Open the ${organization.name} operating console`}
                    >
                      {I_CONSOLE}
                    </Link>
                    <Link
                      to={`/dashboard/businesses/${organization.id}`}
                      className="hrx-rbtn dark"
                      title="Business details"
                      aria-label={`${organization.name} details`}
                    >
                      {I_ARROW}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
