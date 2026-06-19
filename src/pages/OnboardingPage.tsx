import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { completeOnboarding, PRIMARY_GOALS } from "@/lib/db/profile";

const ROLES = [
  { value: "buyer", label: "Buy & run a business" },
  { value: "founder", label: "Start something new" },
  { value: "operator", label: "Operate for others" },
  { value: "investor", label: "Invest in businesses" },
];

export default function OnboardingPage() {
  const { user, signOut, markOnboarded } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("buyer");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const { error } = await completeOnboarding(user.id, {
      full_name: fullName,
      company_name: company,
      primary_role: role,
      primary_goal: goal,
    });
    setSaving(false);
    if (error) setError(error);
    else {
      markOnboarded(); // release the ProtectedRoute gate before navigating
      navigate(role === "buyer" || role === "founder" ? "/dashboard/marketplace" : "/dashboard", { replace: true });
    }
  }

  return (
    <div className="bg-neutral-50 d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <PageMeta title="Welcome — Phoxta" noindex />
      <div className="w-100 px-4 py-5" style={{ maxWidth: 560 }}>
        <div className="text-center mb-4">
          <img width={32} height={32} src="/assets/imgs/template/logo/favicon.svg" alt="Phoxta" loading="lazy" />
          <h3 className="fw-600 mt-3 mb-1">Welcome to Phoxta</h3>
          <p className="neutral-500 mb-0">A couple of details and you&apos;re in.</p>
        </div>

        <form onSubmit={onSubmit} className="bg-neutral-0 rounded-4 p-4 p-md-5 border-100">
          {error && <div className="alert alert-danger py-2 px-3 fz-font-md">{error}</div>}

          <div className="mb-3">
            <label className="form-label fz-font-md fw-500">Your name</label>
            <input className="form-control form-control-lg rounded-3" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="form-label fz-font-md fw-500">Company (optional)</label>
            <input className="form-control form-control-lg rounded-3" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>

          <div className="mb-3">
            <label className="form-label fz-font-md fw-500 d-block">What brings you to Phoxta?</label>
            <div className="row g-2">
              {ROLES.map((r) => (
                <div key={r.value} className="col-6">
                  <button
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`w-100 text-start rounded-3 px-3 py-3 border ${role === r.value ? "border-dark bg-neutral-100" : "border-100 bg-neutral-0"}`}
                  >
                    <span className="fz-font-md fw-600">{r.label}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fz-font-md fw-500">What do you want most?</label>
            <select className="form-select form-select-lg rounded-3" value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="">Select…</option>
              {PRIMARY_GOALS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="at-btn w-100 justify-content-center" disabled={saving}>
            <span>
              <span className="text-1">{saving ? "Setting up…" : "Enter Phoxta"}</span>
              <span className="text-2">{saving ? "Setting up…" : "Enter Phoxta"}</span>
            </span>
          </button>
        </form>

        <div className="text-center pt-3">
          <button type="button" className="btn btn-link neutral-500 text-decoration-none fz-font-md" onClick={() => signOut().then(() => navigate("/auth"))}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
