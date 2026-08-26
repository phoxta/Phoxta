import { useEffect, useMemo, useState } from "react";
import {
  grantAccess, listPlatformBusinesses, revokeAccess,
  type OrgRole, type PlatformBusiness, type PlatformUser,
} from "@/lib/db/platform";
import { toast, toastError } from "@/lib/ops/feedback";

/**
 * Which businesses an account can open.
 *
 * This is the whole of "give someone access". Every console in the product is
 * reached through organization_memberships — it is what listMyOrganizations
 * reads and what app_is_org_member enforces — so an account with no membership
 * has nothing to open and lands on "No business to run yet". Creating the
 * account was only ever half the job; there was no second half anywhere in the
 * product, which is the bug this fixes.
 *
 * Roles are the four the table's own CHECK constraint allows, described in
 * terms of what they let someone do rather than by name, because "staff" and
 * "admin" do not explain themselves to whoever is granting them.
 */

const ROLES: { value: OrgRole; label: string; note: string }[] = [
  { value: "owner", label: "Owner", note: "Full control, including billing and deleting the business." },
  { value: "admin", label: "Admin", note: "Everything except billing." },
  { value: "staff", label: "Staff", note: "Runs the day to day: orders, inbox, content." },
  { value: "viewer", label: "Viewer", note: "Can look, cannot change anything." },
];

export function AccessDialog({ user, onClose, onChanged }: {
  user: PlatformUser;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [all, setAll] = useState<PlatformBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<OrgRole>("staff");
  const [busy, setBusy] = useState(false);
  // The dialog keeps its own copy so a grant shows immediately, rather than
  // waiting for the roster behind it to be re-fetched and re-paged.
  const [access, setAccess] = useState(user.access ?? []);

  useEffect(() => {
    void (async () => {
      const { data, error } = await listPlatformBusinesses();
      setLoading(false);
      if (error) return toastError(error);
      setAll(data);
    })();
  }, []);

  const has = useMemo(() => new Set(access.map((a) => a.orgId)), [access]);
  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all
      .filter((b) => !has.has(b.id))
      .filter((b) => !needle || b.name.toLowerCase().includes(needle))
      .slice(0, 40);
  }, [all, has, q]);

  async function grant(b: PlatformBusiness) {
    if (busy) return;
    setBusy(true);
    const { error } = await grantAccess(user.id, b.id, role);
    setBusy(false);
    if (error) return toastError(error);
    setAccess((a) => [...a, { orgId: b.id, name: b.name, role }]);
    toast(`${user.email} can now open ${b.name}.`);
    onChanged();
  }

  async function revoke(orgId: string, name: string) {
    if (busy) return;
    setBusy(true);
    const { error } = await revokeAccess(user.id, orgId);
    setBusy(false);
    if (error) return toastError(error);
    setAccess((a) => a.filter((x) => x.orgId !== orgId));
    toast(`${user.email} can no longer open ${name}.`);
    onChanged();
  }

  return (
    <div className="opx-modal" role="dialog" aria-modal="true" aria-label={`Access for ${user.email}`}
         onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="opx-modal__box">
        <header className="d-flex align-items-start justify-content-between gap-2 mb-2">
          <div style={{ minWidth: 0 }}>
            <h3 className="opx-modal__t">Access for {user.full_name || user.email}</h3>
            <p className="opx-note mb-0">{user.email}</p>
          </div>
          <button type="button" className="opx-secret-x" aria-label="Close" onClick={onClose}>✕</button>
        </header>

        <h4 className="opx-modal__h">Can open</h4>
        {access.length === 0 ? (
          <p className="opx-note">
            Nothing yet — which is why this account sees “No business to run yet”. Give it a
            business below and the console opens on their next visit.
          </p>
        ) : (
          <ul className="opx-access">
            {access.map((a) => (
              <li key={a.orgId}>
                <span className="opx-access__n">{a.name}</span>
                <span className="opx-access__r">{a.role}</span>
                <button type="button" className="hrx-seeall opx-btn opx-danger" disabled={busy}
                        onClick={() => revoke(a.orgId, a.name)}>Remove</button>
              </li>
            ))}
          </ul>
        )}

        <h4 className="opx-modal__h">Give access to</h4>
        <div className="d-flex flex-wrap align-items-end gap-2 mb-2">
          <label className="hrx-field mb-0" style={{ minWidth: 200, flex: "1 1 auto" }}>
            <span>Find a business</span>
            <input className="form-control form-control-sm" value={q} onChange={(e) => setQ(e.target.value)}
                   placeholder="Search by name…" />
          </label>
          <label className="hrx-field mb-0" style={{ minWidth: 150 }}>
            <span>As</span>
            <select className="form-select form-select-sm" value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
        </div>
        <p className="opx-note">{ROLES.find((r) => r.value === role)?.note}</p>

        {loading ? (
          <p className="opx-note mb-0" role="status">Loading businesses…</p>
        ) : candidates.length === 0 ? (
          <p className="opx-note mb-0">
            {q ? "No business matches that." : "This account already has every business."}
          </p>
        ) : (
          <ul className="opx-access opx-access--pick">
            {candidates.map((b) => (
              <li key={b.id}>
                <span className="opx-access__n">{b.name}</span>
                <span className="opx-access__r">{b.vertical ?? "—"}</span>
                <button type="button" className="hrx-seeall opx-btn" disabled={busy}
                        onClick={() => grant(b)}>Give access</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
