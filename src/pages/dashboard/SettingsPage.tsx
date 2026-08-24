import { useEffect, useRef, useState } from "react";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { profileQuery } from "@/lib/cache/dashboardQueries";
import {
  saveMyProfile,
  COMPANY_SIZES,
  PRIMARY_GOALS,
  type ProfileForm,
} from "@/lib/db/profile";
import { Card, InitialAvatar, PageHeader } from "@/components/dash/Ui";

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

const CSS = `
.stx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; }
.stx-grid .hrx-field { margin-bottom: 0; }
@media (max-width: 640px) { .stx-grid { grid-template-columns: 1fr; } }
.stx-sect { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.stx-sect span {
  font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--hrx-muted); white-space: nowrap;
}
.stx-sect::after { content: ""; flex: 1 1 auto; height: 1px; background: var(--hrx-border-soft); }
.stx-who { display: flex; align-items: center; gap: 14px; min-width: 0; }
.stx-who .lbl { font-size: 13px; color: var(--hrx-muted); margin: 0 0 2px; }
.stx-who .val { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stx-pwrow { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
.stx-pwrow .hrx-field { flex: 1 1 260px; margin-bottom: 0; }
.stx-note { font-size: 14px; color: var(--hrx-muted); margin: -6px 0 14px; }
`;

export default function SettingsPage() {
  const { user, updatePassword } = useAuth();
  const { data: profile, loading, error: readError } = useCachedData(profileQuery.key, profileQuery.fetch);
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Seed the editable form from the cached profile once it arrives. The guard stops
  // a background revalidation (or kept-alive remount) from clobbering unsaved edits.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!profile || seededRef.current) return;
    seededRef.current = true;
    setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      job_title: profile.job_title ?? "",
      company_name: profile.company_name ?? "",
      company_size: profile.company_size ?? "",
      industry: profile.industry ?? "",
      country: profile.country ?? "",
      primary_goal: profile.primary_goal ?? "",
    });
  }, [profile]);

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

  // Profile completion from the fields already on this page — no extra fetching.
  const fieldValues = Object.values(form) as string[];
  const completion = Math.round(
    (fieldValues.filter((v) => v.trim() !== "").length / fieldValues.length) * 100,
  );

  return (
    <>
      <PageMeta title="Phoxta - Settings" />
      <style>{CSS}</style>

      <PageHeader
        crumb="Portal"
        title="Settings"
        note="Your account and company profile."
        stat={{ label: "Profile complete", value: `${completion}%` }}
      />

      <div className="d-grid mt-2" style={{ gap: 8, maxWidth: 860 }}>
        <Card title="Account">
          <div className="stx-who">
            <InitialAvatar name={user?.email} />
            <div style={{ minWidth: 0 }}>
              <p className="lbl">Signed in as</p>
              <div className="val">{user?.email}</div>
            </div>
          </div>
        </Card>

        <Card title="Profile">
          {(error || readError) && (
            <div className="alert alert-danger py-2 px-3" role="alert">
              {error || readError}
            </div>
          )}
          {saved && (
            <div className="alert alert-success py-2 px-3" role="alert">
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
              <div className="stx-grid">
                <label className="hrx-field">
                  <span>Full name</span>
                  <input className="form-control" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
                </label>
                <label className="hrx-field">
                  <span>Job title</span>
                  <input className="form-control" value={form.job_title} onChange={(e) => update("job_title", e.target.value)} />
                </label>
                <label className="hrx-field">
                  <span>Phone</span>
                  <input className="form-control" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </label>
                <label className="hrx-field">
                  <span>Country</span>
                  <input className="form-control" value={form.country} onChange={(e) => update("country", e.target.value)} />
                </label>

                <div className="stx-sect" role="presentation">
                  <span>Your company</span>
                </div>

                <label className="hrx-field">
                  <span>Company name</span>
                  <input className="form-control" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
                </label>
                <label className="hrx-field">
                  <span>Industry</span>
                  <input className="form-control" value={form.industry} onChange={(e) => update("industry", e.target.value)} />
                </label>
                <label className="hrx-field">
                  <span>Company size</span>
                  <select className="form-select" value={form.company_size} onChange={(e) => update("company_size", e.target.value)}>
                    <option value="">Select…</option>
                    {COMPANY_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s === "1" ? "Just me" : `${s} people`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="hrx-field">
                  <span>What you want most</span>
                  <select className="form-select" value={form.primary_goal} onChange={(e) => update("primary_goal", e.target.value)}>
                    <option value="">Select…</option>
                    {PRIMARY_GOALS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="pt-3">
                <button type="submit" className="hrx-pill primary" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          )}
        </Card>

        <Card title="Security">
          <p className="stx-note">Update the password for {user?.email}.</p>
          {pwMsg && (
            <div className={`alert ${pwMsg.ok ? "alert-success" : "alert-danger"} py-2 px-3`} role="alert">
              {pwMsg.text}
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPwSaving(true);
              setPwMsg(null);
              const { error } = await updatePassword(newPassword);
              setPwSaving(false);
              if (error) setPwMsg({ ok: false, text: error });
              else {
                setPwMsg({ ok: true, text: "Password updated." });
                setNewPassword("");
              }
            }}
          >
            <div className="stx-pwrow">
              <label className="hrx-field">
                <span>New password</span>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  placeholder="••••••••"
                  required
                />
              </label>
              <button type="submit" className="hrx-pill dark" disabled={pwSaving || newPassword.length < 8}>
                {pwSaving ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
