import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { profileQuery, organizationsQuery, aiUsageMonthQuery } from "@/lib/cache/dashboardQueries";
import { type UserProfile } from "@/lib/db/profile";

const PROFILE_FIELDS: (keyof UserProfile)[] = [
  "full_name",
  "job_title",
  "company_name",
  "company_size",
  "industry",
  "country",
  "primary_goal",
];

function completion(profile: UserProfile | null): number {
  if (!profile) return 0;
  const filled = PROFILE_FIELDS.filter((f) => String(profile[f] ?? "").trim() !== "").length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  // All three reads come from the shared, warmed cache — so the first paint after
  // login is instant (Tier-1 warming primed them) and revisits never re-flash.
  const { data: profile = null, loading: pLoading, error } = useCachedData(profileQuery.key, profileQuery.fetch);
  const { data: orgs = [], loading: oLoading } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);
  const { data: aiUsage = [], loading: aLoading } = useCachedData(aiUsageMonthQuery.key, aiUsageMonthQuery.fetch);
  const loading = pLoading || oLoading || aLoading;
  const aiTokens = aiUsage.reduce((sum, u) => sum + u.tokens, 0);

  const name = profile?.full_name?.trim() || user?.email?.split("@")[0] || "there";
  const pct = completion(profile);

  return (
    <div>
      <PageMeta title="Phoxta - Dashboard" />
      <div className="mb-5">
        <span className="fz-font-md neutral-500">Welcome back</span>
        <h2 className="fw-600 mb-1 text-capitalize">{name}</h2>
        <p className="neutral-500 mb-0">Here&apos;s what&apos;s happening across your businesses.</p>
      </div>

      {error && (
        <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">
          {error}
        </div>
      )}

      <div className="row g-3 mb-5">
        <div className="col-xl-3 col-md-6">
          <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
            <div className="fz-font-md neutral-500 mb-2">Your businesses</div>
            <div className="fz-60 fw-700 lh-1 mb-2">{loading ? "—" : orgs.length}</div>
            <div className="fz-font-sm neutral-500">{orgs.length === 0 ? "None yet" : "Active on Phoxta"}</div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
            <div className="fz-font-md neutral-500 mb-2">Profile complete</div>
            <div className="fz-60 fw-700 lh-1 mb-2">{loading ? "—" : `${pct}%`}</div>
            <div className="progress rounded-pill" style={{ height: 6 }}>
              <div className="progress-bar bg-dark" style={{ width: `${pct}%` }} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} role="progressbar" />
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
            <div className="fz-font-md neutral-500 mb-2">Revenue (30d)</div>
            <div className="fz-60 fw-700 lh-1 mb-2">$0</div>
            <div className="fz-font-sm neutral-500">Connect a store to track</div>
          </div>
        </div>
        <Link to="/dashboard/assistant" className="col-xl-3 col-md-6 text-decoration-none">
          <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
            <div className="fz-font-md neutral-500 mb-2">Assistant tokens (mo.)</div>
            <div className="fz-60 fw-700 lh-1 mb-2 neutral-900">
              {loading ? "—" : aiTokens >= 1000 ? `${(aiTokens / 1000).toFixed(1)}k` : aiTokens}
            </div>
            <div className="fz-font-sm neutral-500">{aiTokens === 0 ? "Ask your assistant →" : "Open the assistant →"}</div>
          </div>
        </Link>
      </div>

      {/* Real: your businesses */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="fw-600 mb-0">Your businesses</h5>
        <Link to="/dashboard/marketplace" className="fz-font-md fw-600 text-decoration-none">
          Browse the marketplace →
        </Link>
      </div>

      {loading ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>
      ) : orgs.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
          <h6 className="fw-600 mb-1">No businesses yet</h6>
          <p className="neutral-500 mb-3 mx-auto" style={{ maxWidth: 420 }}>
            Pick a validated, AI-powered business from the marketplace and make it your own.
          </p>
          <Link to="/dashboard/marketplace" className="at-btn">
            <span>
              <span className="text-1">Browse businesses</span>
              <span className="text-2">Browse businesses</span>
            </span>
          </Link>
        </div>
      ) : (
        <div className="row g-3 mb-4">
          {orgs.map(({ role, organization }) => (
            <div key={organization.id} className="col-lg-4">
              <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-600 neutral-900 mb-0">{organization.name}</h6>
                  <span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{role}</span>
                </div>
                <p className="fz-font-sm neutral-500 mb-0 text-capitalize">
                  {organization.stage}
                  {organization.primary_region ? ` · ${organization.primary_region}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile nudge */}
      {!loading && pct < 100 && (
        <div className="bg-neutral-0 rounded-4 p-4 border-100 d-flex flex-wrap align-items-center justify-content-between gap-3 mt-4">
          <div>
            <h6 className="fw-600 mb-1">Finish setting up your profile</h6>
            <p className="fz-font-md neutral-500 mb-0">A complete profile helps us tailor your dashboard.</p>
          </div>
          <Link to="/dashboard/settings" className="at-btn">
            <span>
              <span className="text-1">Complete profile</span>
              <span className="text-2">Complete profile</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
