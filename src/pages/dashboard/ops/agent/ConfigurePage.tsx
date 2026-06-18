import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getAgentConfig, saveAgentConfig, CAPABILITY_LABELS, type AgentConfig } from "@/lib/db/ops/agent";
import { getGoogleConnection, startGoogleConnect, disconnectGoogle, listWorkspaceEmails, provisionEmails, type GoogleConnection, type WsGroup } from "@/lib/db/ops/google";
import type { OpsContext } from "@/layouts/OperatingLayout";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Industry starter presets — one click fills a sensible persona/greeting/tone.
const INDUSTRY_PRESETS: { key: string; label: string; persona: string; greeting: string; tone: string }[] = [
  { key: "services", label: "Home & personal services", persona: "A friendly front-desk receptionist for a local services business. Books appointments, answers service and pricing questions, captures leads, and flags urgent issues.", greeting: "Hi! Thanks for reaching out — would you like to book an appointment or ask about our services?", tone: "warm, efficient" },
  { key: "stays", label: "Hospitality / stays", persona: "A concierge for a hospitality business. Helps with availability, bookings, amenities and local recommendations.", greeting: "Hello! Are you looking for a stay or do you have a question about a booking?", tone: "warm, hospitable" },
  { key: "experiences", label: "Tours & experiences", persona: "An experiences host. Helps guests discover and book tours and activities, answers logistics, and suggests relevant add-ons.", greeting: "Hi there! Want help finding an experience or checking a booking?", tone: "upbeat, helpful" },
  { key: "cars", label: "Car rental / dealership", persona: "A vehicle rental and sales assistant. Helps with availability, quotes, test drives and bookings.", greeting: "Hi! Are you looking to rent or learn more about a vehicle?", tone: "professional, helpful" },
  { key: "retail", label: "Retail / e-commerce", persona: "A shopping assistant. Recommends products, answers sizing, stock and shipping questions, and helps complete orders.", greeting: "Hi! Can I help you find something or check on an order?", tone: "friendly, attentive" },
  { key: "generic", label: "General business", persona: "A warm, professional front-desk assistant that answers questions, captures leads and books follow-ups.", greeting: "Hi! Thanks for reaching out — how can I help today?", tone: "friendly" },
];
const VERTICAL_TO_PRESET: Record<string, string> = {
  services: "services", service: "services", salon: "services", cleaning: "services", appointments: "services",
  travel: "stays", stays: "stays", stay: "stays", hotel: "stays", hospitality: "stays", lodging: "stays",
  experience: "experiences", experiences: "experiences", tours: "experiences", activities: "experiences",
  car: "cars", cars: "cars", carento: "cars", dealership: "cars", rental: "cars",
  retail: "retail", ecommerce: "retail", fashion: "retail", apparel: "retail", shop: "retail",
};

const VOICES = [
  { provider: "deepgram", id: "aura-asteria-en", label: "Deepgram · Asteria (female, US)" },
  { provider: "deepgram", id: "aura-luna-en", label: "Deepgram · Luna (female, US)" },
  { provider: "deepgram", id: "aura-orion-en", label: "Deepgram · Orion (male, US)" },
  { provider: "deepgram", id: "aura-arcas-en", label: "Deepgram · Arcas (male, US)" },
  { provider: "cartesia", id: "", label: "Cartesia · custom / cloned voice (enter ID)" },
];

export default function ConfigurePage() {
  const { orgId, org } = useOutletContext<OpsContext>();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const suggestedPreset = VERTICAL_TO_PRESET[(org?.vertical || "").toLowerCase().trim()] ?? "generic";
  const [presetKey, setPresetKey] = useState(suggestedPreset);
  const [google, setGoogle] = useState<GoogleConnection | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleMsg, setGoogleMsg] = useState<string | null>(null);

  useEffect(() => {
    getGoogleConnection(orgId).then(({ data }) => setGoogle(data));
    const q = new URLSearchParams(window.location.search).get("google");
    if (q === "connected") setGoogleMsg("Google Workspace connected.");
    else if (q === "error") setGoogleMsg("Google connection failed — please try again.");
    if (q) window.history.replaceState({}, "", window.location.pathname);
  }, [orgId]);

  async function connectGoogle() {
    setGoogleBusy(true);
    const { error } = await startGoogleConnect(orgId);
    if (error) { setGoogleBusy(false); setGoogleMsg(error); }
  }
  async function unlinkGoogle() {
    setGoogleBusy(true);
    await disconnectGoogle(orgId);
    setGoogle(null);
    setWsGroups([]);
    setGoogleBusy(false);
    setGoogleMsg("Disconnected.");
  }

  const [wsGroups, setWsGroups] = useState<WsGroup[]>([]);
  const [provBusy, setProvBusy] = useState(false);
  const [provMsg, setProvMsg] = useState<string | null>(null);
  useEffect(() => {
    if (google) listWorkspaceEmails(orgId).then(({ data }) => setWsGroups(data));
  }, [google, orgId]);
  async function provision() {
    setProvBusy(true);
    setProvMsg(null);
    const { data, error } = await provisionEmails(orgId);
    setProvBusy(false);
    if (error) { setProvMsg(error); return; }
    const created = (data?.results ?? []).filter((r) => r.created).length;
    setProvMsg(`Done — ${created} new address(es) created, forwarding to ${data?.forwardTo}.`);
    listWorkspaceEmails(orgId).then(({ data: g }) => setWsGroups(g));
  }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAgentConfig(orgId).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      setConfig(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [orgId]);

  function patch(p: Partial<AgentConfig>) {
    setConfig((c) => (c ? { ...c, ...p } : c));
    setSaved(false);
  }
  function toggleCap(key: string) {
    if (!config) return;
    patch({ capabilities: { ...config.capabilities, [key]: config.capabilities?.[key] === false } });
  }
  function toggleDay(d: number) {
    if (!config) return;
    const days = config.business_hours?.days ?? [1, 2, 3, 4, 5];
    patch({ business_hours: { ...config.business_hours, days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort() } });
  }
  function applyPreset() {
    const p = INDUSTRY_PRESETS.find((x) => x.key === presetKey);
    if (p) patch({ persona: p.persona, greeting: p.greeting, tone: p.tone });
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setError(null);
    const { error } = await saveAgentConfig(config.id, {
      display_name: config.display_name,
      persona: config.persona,
      greeting: config.greeting,
      tone: config.tone,
      model_tier: config.model_tier,
      business_hours: config.business_hours,
      escalation: config.escalation,
      capabilities: config.capabilities,
      voice: config.voice,
    });
    setSaving(false);
    if (error) setError(error);
    else setSaved(true);
  }

  if (loading || !config) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  const days = config.business_hours?.days ?? [1, 2, 3, 4, 5];
  const widget = `<script src="https://YOUR-DOMAIN/phoxta-agent.js" data-key="${config.public_key}"></script>`;

  return (
    <div className="row g-4">
      {error && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error}</div></div>}

      <div className="col-lg-7">
        <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
          <h6 className="fw-600 mb-2">Industry starter</h6>
          <p className="fz-font-sm neutral-500 mb-2">Apply a sensible persona, greeting and tone for your industry, then fine-tune below.</p>
          <div className="d-flex gap-2">
            <select className="form-select rounded-3" value={presetKey} onChange={(e) => setPresetKey(e.target.value)}>
              {INDUSTRY_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <button type="button" className="btn btn-outline-dark rounded-3 px-4" onClick={applyPreset}>Apply</button>
          </div>
        </div>

        <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
          <h6 className="fw-600 mb-3">Persona</h6>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Agent name</label><input className="form-control rounded-3" value={config.display_name} onChange={(e) => patch({ display_name: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Tone</label><input className="form-control rounded-3" value={config.tone} onChange={(e) => patch({ tone: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Model</label>
              <select className="form-select rounded-3" value={config.model_tier} onChange={(e) => patch({ model_tier: e.target.value as AgentConfig["model_tier"] })}>
                <option value="cheap">Fast (Haiku)</option>
                <option value="balanced">Balanced (Sonnet)</option>
                <option value="complex">Smart (Opus)</option>
              </select>
            </div>
            <div className="col-12"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Persona / instructions</label><textarea className="form-control rounded-3" rows={2} value={config.persona} onChange={(e) => patch({ persona: e.target.value })} /></div>
            <div className="col-12"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Greeting</label><input className="form-control rounded-3" value={config.greeting} onChange={(e) => patch({ greeting: e.target.value })} /></div>
          </div>
        </div>

        <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
          <h6 className="fw-600 mb-3">Business hours & escalation</h6>
          <div className="row g-3">
            <div className="col-md-3"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Open</label><input className="form-control rounded-3" value={config.business_hours?.open ?? "09:00"} onChange={(e) => patch({ business_hours: { ...config.business_hours, open: e.target.value } })} /></div>
            <div className="col-md-3"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Close</label><input className="form-control rounded-3" value={config.business_hours?.close ?? "17:00"} onChange={(e) => patch({ business_hours: { ...config.business_hours, close: e.target.value } })} /></div>
            <div className="col-md-6"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Escalate to (email)</label><input className="form-control rounded-3" value={config.escalation?.to_email ?? ""} onChange={(e) => patch({ escalation: { ...config.escalation, to_email: e.target.value } })} /></div>
            <div className="col-12">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Open days</label>
              <div className="d-flex flex-wrap gap-1">
                {DAYS.map((d, i) => (
                  <button key={d} type="button" className={`btn btn-sm rounded-pill px-3 ${days.includes(i) ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => toggleDay(i)}>{d}</button>
                ))}
              </div>
              <div className="fz-font-sm neutral-500 mt-1">Outside these hours the agent still answers, captures the lead and offers a callback.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-5">
        <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
          <h6 className="fw-600 mb-3">Capabilities</h6>
          <div className="d-flex flex-column gap-2">
            {CAPABILITY_LABELS.map((c) => (
              <div key={c.key} className="form-check form-switch d-flex align-items-center justify-content-between m-0">
                <label className="form-check-label fz-font-md neutral-700" htmlFor={`cap-${c.key}`}>{c.label}</label>
                <input className="form-check-input" type="checkbox" id={`cap-${c.key}`} checked={config.capabilities?.[c.key] !== false} onChange={() => toggleCap(c.key)} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
          <h6 className="fw-600 mb-2">Voice</h6>
          <p className="fz-font-sm neutral-500 mb-2">The voice your AI uses on phone calls. Pick a preset, or choose Cartesia and paste a custom / cloned voice ID.</p>
          <select
            className="form-select rounded-3 mb-2"
            value={config.voice?.provider === "cartesia" ? "cartesia|" : `${config.voice?.provider || "deepgram"}|${config.voice?.voice_id || "aura-asteria-en"}`}
            onChange={(e) => {
              const [provider, voice_id] = e.target.value.split("|");
              patch({ voice: { provider, voice_id: provider === "cartesia" ? (config.voice?.voice_id || "") : voice_id } });
            }}
          >
            {VOICES.map((v) => <option key={v.label} value={`${v.provider}|${v.id}`}>{v.label}</option>)}
          </select>
          {config.voice?.provider === "cartesia" && (
            <input className="form-control rounded-3" placeholder="Cartesia voice ID (preset or cloned)" value={config.voice?.voice_id || ""} onChange={(e) => patch({ voice: { provider: "cartesia", voice_id: e.target.value } })} />
          )}
          <div className="fz-font-sm neutral-400 mt-1">To clone a voice: create it in Cartesia, then paste its voice ID here.</div>
        </div>

        <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
          <h6 className="fw-600 mb-2">Google Workspace</h6>
          {googleMsg && <div className="alert alert-info py-1 px-2 fz-font-sm mb-2">{googleMsg}</div>}
          {google ? (
            <>
              <p className="fz-font-sm neutral-700 mb-2">Connected as <strong>{google.email || "your Google account"}</strong> — Gmail, Drive, Docs, Sheets &amp; Calendar are available to the agent.</p>
              <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={unlinkGoogle} disabled={googleBusy}>Disconnect</button>
            </>
          ) : (
            <>
              <p className="fz-font-sm neutral-500 mb-2">Connect Google Workspace to bring Gmail, Drive, Docs, Sheets and Calendar into Phoxta.</p>
              <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={connectGoogle} disabled={googleBusy}>{googleBusy ? "…" : "Connect Google Workspace"}</button>
            </>
          )}
        </div>

        {google && (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
            <h6 className="fw-600 mb-2">Business email addresses</h6>
            <p className="fz-font-sm neutral-500 mb-2">Create the essential role addresses (hello@, info@, support@, sales@, billing@, contact@) as Google Groups that forward to you and accept customer email.</p>
            {provMsg && <div className="alert alert-info py-1 px-2 fz-font-sm mb-2">{provMsg}</div>}
            {wsGroups.length > 0 && (
              <div className="d-flex flex-wrap gap-1 mb-2">
                {wsGroups.map((g) => <span key={g.email} className="badge bg-neutral-100 neutral-700 fw-500">{g.email}</span>)}
              </div>
            )}
            <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={provision} disabled={provBusy}>{provBusy ? "Creating…" : "Create essential addresses"}</button>
          </div>
        )}

        <div className="bg-neutral-0 rounded-4 p-4 border-100">
          <h6 className="fw-600 mb-2">Web widget / instant callback</h6>
          <p className="fz-font-sm neutral-500 mb-2">Public key for the embeddable chat widget &amp; callback form (calls the <code>agent-inbound</code> endpoint).</p>
          <code className="d-block p-2 bg-neutral-50 rounded-3 fz-font-sm" style={{ wordBreak: "break-all" }}>{widget}</code>
        </div>
      </div>

      <div className="col-12 d-flex align-items-center gap-3">
        <button type="button" className="btn btn-dark rounded-3 px-4" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save configuration"}</button>
        {saved && <span className="text-success fz-font-md">Saved.</span>}
      </div>
    </div>
  );
}
