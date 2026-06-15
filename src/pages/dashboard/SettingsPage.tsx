import { useEffect, useState } from "react";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import {
  getMyProfile,
  saveMyProfile,
  COMPANY_SIZES,
  PRIMARY_GOALS,
  type ProfileForm,
} from "@/lib/db/profile";

const EMPTY: ProfileForm = {
  full_name: "",
  phone: "",
  job_title: "",
  company_name: "",
  company_size: "",
  industry: "",
  country: "",
  primary_goal: "",
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    getMyProfile().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          job_title: data.job_title ?? "",
          company_name: data.company_name ?? "",
          company_size: data.company_size ?? "",
          industry: data.industry ?? "",
          country: data.country ?? "",
          primary_goal: data.primary_goal ?? "",
        });
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error } = await saveMyProfile(user.id, form);
    if (error) setError(error);
    else setSaved(true);
    setSaving(false);
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <PageMeta title="Phoxta - Settings" />
      <div className="mb-4">
        <h2 className="fw-600 mb-1">Settings</h2>
        <p className="neutral-500 mb-0">Your account and company profile.</p>
      </div>

      <div className="bg-neutral-0 rounded-4 p-4 p-md-5 border-100">
        <div className="mb-4">
          <span className="fz-font-sm neutral-500">Signed in as</span>
          <div className="fw-600">{user?.email}</div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3 fz-font-md" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className="alert alert-success py-2 px-3 fz-font-md" role="alert">
            Profile saved.
          </div>
        )}

        {loading ? (
          <div className="py-5 text-center">
            <div className="spinner-border text-dark" role="status" aria-label="Loading">
              <span className="visually-hidden">Loading…</span>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fz-font-md fw-500">Full name</label>
                <input className="form-control rounded-3" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label fz-font-md fw-500">Job title</label>
                <input className="form-control rounded-3" value={form.job_title} onChange={(e) => update("job_title", e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label fz-font-md fw-500">Phone</label>
                <input className="form-control rounded-3" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label fz-font-md fw-500">Country</label>
                <input className="form-control rounded-3" value={form.country} onChange={(e) => update("country", e.target.value)} />
              </div>

              <div className="col-12">
                <hr className="my-2 opacity-25" />
                <span className="fz-font-sm fw-600 text-uppercase neutral-500">Your company</span>
              </div>

              <div className="col-md-6">
                <label className="form-label fz-font-md fw-500">Company name</label>
                <input className="form-control rounded-3" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label fz-font-md fw-500">Industry</label>
                <input className="form-control rounded-3" value={form.industry} onChange={(e) => update("industry", e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label fz-font-md fw-500">Company size</label>
                <select className="form-select rounded-3" value={form.company_size} onChange={(e) => update("company_size", e.target.value)}>
                  <option value="">Select…</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s === "1" ? "Just me" : `${s} people`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fz-font-md fw-500">What you want most</label>
                <select className="form-select rounded-3" value={form.primary_goal} onChange={(e) => update("primary_goal", e.target.value)}>
                  <option value="">Select…</option>
                  {PRIMARY_GOALS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" className="at-btn" disabled={saving}>
                <span>
                  <span className="text-1">{saving ? "Saving…" : "Save changes"}</span>
                  <span className="text-2">{saving ? "Saving…" : "Save changes"}</span>
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
