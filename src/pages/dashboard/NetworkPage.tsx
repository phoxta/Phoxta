import { useEffect, useRef, useState } from "react";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL, networkQuery, type NetworkData } from "@/lib/cache/dashboardQueries";
import {
  saveMatchProfile,
  sendMatchRequest,
  updateMatchStatus,
  type MatchProfile,
  type MatchProfileForm,
  type MatchRole,
  type Match,
} from "@/lib/db/matching";

const ROLES: { value: MatchRole; label: string }[] = [
  { value: "founder", label: "Founder" },
  { value: "cofounder", label: "Looking for a co-founder" },
  { value: "operator", label: "Operator for hire" },
  { value: "investor", label: "Investor" },
];

const EMPTY: MatchProfileForm = {
  role: "founder",
  headline: "",
  bio: "",
  skills: [],
  verticals: [],
  capital_band: "",
  location: "",
  is_open: true,
};

const toList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export default function NetworkPage() {
  const { user } = useAuth();
  // The matching reads are user-scoped; the shared networkQuery descriptor is the
  // same key + fetcher the sign-in warmer primes, so the first visit is instant.
  const netQ = user ? networkQuery(user.id) : null;
  const { data, loading, error: readError, reload } = useCachedData<NetworkData>(
    netQ ? netQ.key : "network:anon",
    netQ ? netQ.fetch : async () => ({ profile: null, people: [], matches: [] }),
    { ttl: DASHBOARD_TTL },
  );
  const people = data?.people ?? [];
  const matches = data?.matches ?? [];

  const [form, setForm] = useState<MatchProfileForm>(EMPTY);
  const [skillsText, setSkillsText] = useState("");
  const [verticalsText, setVerticalsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [requested, setRequested] = useState<Record<string, boolean>>({});

  // Seed the editable profile form from the cached match profile once. The guard
  // stops a background revalidation (or kept-alive remount) from wiping edits.
  const seededRef = useRef(false);
  useEffect(() => {
    const mine = data?.profile;
    if (!mine || seededRef.current) return;
    seededRef.current = true;
    setForm({
      role: mine.role,
      headline: mine.headline,
      bio: mine.bio,
      skills: mine.skills,
      verticals: mine.verticals,
      capital_band: mine.capital_band,
      location: mine.location,
      is_open: mine.is_open,
    });
    setSkillsText(mine.skills.join(", "));
    setVerticalsText(mine.verticals.join(", "));
  }, [data]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const payload: MatchProfileForm = { ...form, skills: toList(skillsText), verticals: toList(verticalsText) };
    const { error } = await saveMatchProfile(user.id, payload);
    setSaving(false);
    if (error) setError(error);
    else {
      setSaved(true);
      reload();
    }
  }

  async function onConnect(p: MatchProfile) {
    if (!user) return;
    const kind = p.role === "investor" ? "investor" : p.role === "operator" ? "operator" : "cofounder";
    const { error } = await sendMatchRequest(user.id, p.user_id, kind);
    if (error) setError(error);
    else {
      setRequested((r) => ({ ...r, [p.user_id]: true }));
      reload();
    }
  }

  async function respond(id: string, status: Match["status"]) {
    const { error } = await updateMatchStatus(id, status);
    if (error) setError(error);
    else reload();
  }

  const incoming = matches.filter((m) => m.target_user_id === user?.id && m.status === "pending");
  const connections = matches.filter((m) => m.status === "accepted");

  return (
    <div>
      <PageMeta title="Phoxta - Network" />
      <div className="mb-4">
        <h2 className="fw-600 mb-1">Network</h2>
        <p className="neutral-500 mb-0">Find co-founders, operators and investors — and let them find you.</p>
      </div>

      {(error || readError) && (
        <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">
          {error || readError}
        </div>
      )}

      <div className="row g-4">
        {/* Your profile */}
        <div className="col-lg-5">
          <form onSubmit={onSave} className="bg-neutral-0 rounded-4 p-4 border-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-600 mb-0">Your matching profile</h5>
              <div className="form-check form-switch m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="is-open"
                  checked={form.is_open}
                  onChange={(e) => setForm((f) => ({ ...f, is_open: e.target.checked }))}
                />
                <label className="form-check-label fz-font-sm neutral-500" htmlFor="is-open">
                  Open
                </label>
              </div>
            </div>

            {saved && <div className="alert alert-success py-2 px-3 fz-font-md">Profile saved.</div>}

            <div className="mb-3">
              <label className="form-label fz-font-md fw-500">I am a…</label>
              <select className="form-select rounded-3" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as MatchRole }))}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fz-font-md fw-500">Headline</label>
              <input className="form-control rounded-3" value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} placeholder="e.g. Operator who scales DTC brands" />
            </div>
            <div className="mb-3">
              <label className="form-label fz-font-md fw-500">About you</label>
              <textarea className="form-control rounded-3" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="row g-3">
              <div className="col-6">
                <label className="form-label fz-font-md fw-500">Location</label>
                <input className="form-control rounded-3" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="col-6">
                <label className="form-label fz-font-md fw-500">Capital band</label>
                <input className="form-control rounded-3" value={form.capital_band} onChange={(e) => setForm((f) => ({ ...f, capital_band: e.target.value }))} placeholder="e.g. $10k–50k" />
              </div>
              <div className="col-12">
                <label className="form-label fz-font-md fw-500">Skills (comma separated)</label>
                <input className="form-control rounded-3" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
              </div>
              <div className="col-12">
                <label className="form-label fz-font-md fw-500">Verticals (comma separated)</label>
                <input className="form-control rounded-3" value={verticalsText} onChange={(e) => setVerticalsText(e.target.value)} />
              </div>
            </div>
            <div className="pt-3">
              <button type="submit" className="at-btn" disabled={saving}>
                <span>
                  <span className="text-1">{saving ? "Saving…" : "Save profile"}</span>
                  <span className="text-2">{saving ? "Saving…" : "Save profile"}</span>
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* People + requests */}
        <div className="col-lg-7">
          {incoming.length > 0 && (
            <div className="mb-4">
              <h5 className="fw-600 mb-3">Requests for you</h5>
              <div className="d-flex flex-column gap-2">
                {incoming.map((m) => (
                  <div key={m.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-3">
                    <div>
                      <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize me-2">{m.kind}</span>
                      <span className="fz-font-md neutral-700">{m.message || "wants to connect with you."}</span>
                    </div>
                    <div className="d-flex gap-2 flex-shrink-0">
                      <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={() => respond(m.id, "accepted")}>
                        Accept
                      </button>
                      <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => respond(m.id, "declined")}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {connections.length > 0 && (
            <div className="mb-4">
              <h5 className="fw-600 mb-3">Your connections</h5>
              <div className="d-flex flex-wrap gap-2">
                {connections.map((m) => (
                  <span key={m.id} className="badge bg-success-subtle text-success fw-500 text-capitalize px-3 py-2">
                    {m.kind} · connected
                  </span>
                ))}
              </div>
            </div>
          )}

          <h5 className="fw-600 mb-3">Open to connect</h5>
          {loading ? (
            <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>
          ) : people.length === 0 ? (
            <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">
              No one to show yet. Save your profile to join the network.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {people.map((p) => (
                <div key={p.id} className="bg-neutral-0 rounded-4 p-4 border-100 d-flex justify-content-between gap-3">
                  <div>
                    <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize mb-2">{p.role}</span>
                    <h6 className="fw-600 mb-1">{p.headline || "Phoxta member"}</h6>
                    <p className="fz-font-md neutral-500 mb-1">{p.bio}</p>
                    <div className="fz-font-sm neutral-500">
                      {[p.location, p.verticals.join(", "), p.capital_band].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="flex-shrink-0 align-self-center">
                    <button type="button" className="at-btn" disabled={requested[p.user_id]} onClick={() => onConnect(p)}>
                      <span>
                        <span className="text-1">{requested[p.user_id] ? "Requested" : "Connect"}</span>
                        <span className="text-2">{requested[p.user_id] ? "Requested" : "Connect"}</span>
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
