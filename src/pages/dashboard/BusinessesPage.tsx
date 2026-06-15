import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { listMyOrganizations, createBusiness, type Organization } from "@/lib/db/organizations";

export default function BusinessesPage() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Array<{ role: string; organization: Organization }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState("");
  const [region, setRegion] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    const { data, error } = await listMyOrganizations();
    if (error) setError(error);
    setOrgs(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setCreating(true);
    setError(null);
    const { error } = await createBusiness(user.id, { name, vertical: vertical || null, region: region || null });
    setCreating(false);
    if (error) {
      setError(error);
      return;
    }
    setName("");
    setVertical("");
    setRegion("");
    setShowForm(false);
    setLoading(true);
    load();
  }

  return (
    <div>
      <PageMeta title="Phoxta - Your businesses" />
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-600 mb-1">Your businesses</h2>
          <p className="neutral-500 mb-0">Everything you own and operate on Phoxta.</p>
        </div>
        <button type="button" className="at-btn" onClick={() => setShowForm((v) => !v)}>
          <span>
            <span className="text-1">{showForm ? "Close" : "New business"}</span>
            <span className="text-2">{showForm ? "Close" : "New business"}</span>
          </span>
        </button>
      </div>

      {error && (
        <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={onCreate} className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
          <div className="row g-3">
            <div className="col-md-5">
              <label className="form-label fz-font-md fw-500">Business name</label>
              <input className="form-control rounded-3" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="col-md-4">
              <label className="form-label fz-font-md fw-500">Industry</label>
              <input className="form-control rounded-3" value={vertical} onChange={(e) => setVertical(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label fz-font-md fw-500">Region</label>
              <input className="form-control rounded-3" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
          </div>
          <div className="pt-3">
            <button type="submit" className="at-btn" disabled={creating}>
              <span>
                <span className="text-1">{creating ? "Creating…" : "Create business"}</span>
                <span className="text-2">{creating ? "Creating…" : "Create business"}</span>
              </span>
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>
      ) : orgs.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
          <h6 className="fw-600 mb-1">No businesses yet</h6>
          <p className="neutral-500 mb-3 mx-auto" style={{ maxWidth: 420 }}>
            Pick one from the marketplace, or create your own to get started.
          </p>
          <Link to="/dashboard/marketplace" className="at-btn">
            <span>
              <span className="text-1">Browse the marketplace</span>
              <span className="text-2">Browse the marketplace</span>
            </span>
          </Link>
        </div>
      ) : (
        <div className="row g-3">
          {orgs.map(({ role, organization }) => (
            <div key={organization.id} className="col-lg-4 col-md-6">
              <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-600 neutral-900 mb-0">
                    <Link to={`/dashboard/businesses/${organization.id}`} className="neutral-900 text-decoration-none">
                      {organization.name}
                    </Link>
                  </h6>
                  <span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{role}</span>
                </div>
                <p className="fz-font-sm neutral-500 mb-3 text-capitalize">
                  {organization.stage}
                  {organization.primary_region ? ` · ${organization.primary_region}` : ""}
                </p>
                <Link to={`/dashboard/businesses/${organization.id}`} className="fz-font-md fw-600 text-decoration-none">
                  Open →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
