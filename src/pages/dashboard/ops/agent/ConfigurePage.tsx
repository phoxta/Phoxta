import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBeforeUnload, useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { getAgentConfig, saveAgentConfig, type AgentConfig } from "@/lib/db/ops/agent";
import { listKnowledge, addKnowledge, updateKnowledge, removeKnowledge } from "@/lib/db/ops/knowledge";
import { drainEmbeddings } from "@/lib/db/ops/ai";
import { listProducts } from "@/lib/db/ops/commerce";
import { listPages } from "@/lib/db/ops/cms";
import { formatPrice } from "@/lib/db/marketplace";
import { supabase } from "@/lib/supabaseClient";
import { toast, toastError, confirmDanger, reportMutation } from "@/lib/ops/feedback";
import TrainPreview from "@/pages/dashboard/ops/agent/TrainPreview";
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

// The FOUR honest capability switches — each gates real agent tools server-side.
// Saving writes ONLY these keys (silently migrating configs off the old 12-key wall).
const CAPABILITY_SWITCHES: { key: string; label: string; help: string }[] = [
  { key: "after_hours", label: "After-hours answering", help: "Outside the hours below the agent still replies: it says you're closed, captures the customer's details and offers a callback." },
  { key: "leads", label: "Lead capture & qualification", help: "Captures names and contact details into your CRM and qualifies each lead (intent, score) so you know who to call first." },
  { key: "bookings", label: "Bookings & reservations", help: "Checks real availability and books, reschedules or cancels appointments and reservations in your console." },
  { key: "tickets", label: "Support tickets", help: "Opens a support ticket for problems it can't resolve, so your team can follow up." },
];
const CAPABILITY_KEYS = CAPABILITY_SWITCHES.map((c) => c.key);

// ~30 common IANA timezones for the business-hours picker.
const TIMEZONES = [
  "UTC",
  "Africa/Accra", "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi",
  "America/Anchorage", "America/Argentina/Buenos_Aires", "America/Bogota", "America/Chicago",
  "America/Denver", "America/Los_Angeles", "America/Mexico_City", "America/New_York",
  "America/Sao_Paulo", "America/Toronto",
  "Asia/Bangkok", "Asia/Dubai", "Asia/Hong_Kong", "Asia/Karachi", "Asia/Kolkata",
  "Asia/Riyadh", "Asia/Shanghai", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Perth", "Australia/Sydney",
  "Europe/Amsterdam", "Europe/Berlin", "Europe/Dublin", "Europe/Istanbul", "Europe/London",
  "Europe/Madrid", "Europe/Paris",
  "Pacific/Auckland",
];

// Titles used by "Sync from your store" — same-titled docs are replaced on re-sync.
const SYNC_TITLES = {
  catalog: "Catalog (auto-synced)",
  pages: "Policies & pages (auto-synced)",
  faqs: "FAQs (auto-synced)",
};

const TIME_RE = /^\d{2}:\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fill sensible defaults (hours, days, timezone) so the form + dirty tracking start coherent. */
function withDefaults(c: AgentConfig): AgentConfig {
  let guess = "UTC";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONES.includes(tz)) guess = tz;
  } catch { /* keep UTC */ }
  const bh = c.business_hours ?? {};
  return {
    ...c,
    business_hours: { open: "09:00", close: "17:00", days: [1, 2, 3, 4, 5], ...bh, tz: bh.tz && TIMEZONES.includes(bh.tz) ? bh.tz : guess },
  };
}

export default function ConfigurePage() {
  const { orgId, org } = useOutletContext<OpsContext>();
  const { data: loadedConfig, loading, error: loadError, setData: setCachedConfig } = useCachedData(
    `agent:config:${orgId}`,
    async () => (await getAgentConfig(orgId)).data,
    { ttl: DASHBOARD_TTL },
  );
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [baseline, setBaseline] = useState<AgentConfig | null>(null);
  const suggestedPreset = VERTICAL_TO_PRESET[(org?.vertical || "").toLowerCase().trim()] ?? "generic";
  const [presetKey, setPresetKey] = useState(suggestedPreset);
  const [saving, setSaving] = useState(false);

  // Seed the editable config once per business (re-seeds when orgId changes,
  // so one business's draft never bleeds into another's).
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (seededFor.current === orgId) return;
    setConfig(null);
    setBaseline(null);
    if (loadedConfig === undefined || loadedConfig === null) return;
    seededFor.current = orgId;
    const seeded = withDefaults(loadedConfig);
    setConfig(seeded);
    setBaseline(seeded);
  }, [orgId, loadedConfig]);

  const dirty = useMemo(
    () => !!config && !!baseline && JSON.stringify(config) !== JSON.stringify(baseline),
    [config, baseline],
  );

  // Unsaved-changes guards: tab/window close…
  useBeforeUnload(
    useCallback((e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }, [dirty]),
  );
  // …and in-app navigation (BrowserRouter has no data-router blocker, so we
  // confirm on internal link clicks at the document level, capture phase).
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("/") || href === window.location.pathname) return;
      if (!window.confirm("You have unsaved changes on Train. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  function patch(p: Partial<AgentConfig>) {
    setConfig((c) => (c ? { ...c, ...p } : c));
  }
  function capOn(key: string): boolean {
    return config?.capabilities?.[key] !== false;
  }
  function toggleCap(key: string) {
    if (!config) return;
    patch({ capabilities: { ...config.capabilities, [key]: !capOn(key) } });
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
    if (!config || saving) return;
    const bh = config.business_hours ?? {};
    if (!TIME_RE.test(bh.open ?? "") || !TIME_RE.test(bh.close ?? "")) { toastError("Set valid open and close times."); return; }
    if (bh.open === bh.close) { toastError("Open and close times can't be the same."); return; }
    if (!bh.tz || !TIMEZONES.includes(bh.tz)) { toastError("Choose your business timezone."); return; }
    const email = (config.escalation?.to_email ?? "").trim();
    if (email && !EMAIL_RE.test(email)) { toastError("The escalation address doesn't look like an email."); return; }

    // Honest capabilities: persist ONLY the four real switches (silent migration
    // away from the old 12-key list — the agent reads exactly these keys).
    const capabilities = Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, capOn(k)]));
    const next: AgentConfig = { ...config, capabilities, escalation: { ...config.escalation, to_email: email }, business_hours: bh };

    setSaving(true);
    const ok = await reportMutation(
      saveAgentConfig(config.id, {
        display_name: next.display_name,
        persona: next.persona,
        procedures: next.procedures,
        greeting: next.greeting,
        tone: next.tone,
        business_hours: next.business_hours,
        escalation: next.escalation,
        capabilities: next.capabilities,
        voice: next.voice,
      }),
      "Agent configuration saved.",
    );
    setSaving(false);
    if (ok) {
      setCachedConfig(next); // keep the cache coherent so a revisit shows the saved config
      setConfig(next);
      setBaseline(next);
    }
  }

  function discard() {
    if (baseline) setConfig(baseline);
  }

  // ---------------- Knowledge (absorbed from the old Knowledge tab) ----------------
  const { data: docs = [], loading: docsLoading, error: docsError, reload: reloadDocs } = useCachedData(
    `agent:knowledge:${orgId}`,
    async () => {
      const { data, error } = await listKnowledge(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [docForm, setDocForm] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  // The editor sits above the list, so editing an item pulls focus back up to it.
  const docTitleRef = useRef<HTMLInputElement>(null);
  const [docSaving, setDocSaving] = useState(false);
  const [docSearch, setDocSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState(false);

  // Knowledge editor state is per-business too.
  useEffect(() => {
    setDocForm({ title: "", content: "" });
    setEditingId(null);
    setDocSearch("");
    setExpanded({});
  }, [orgId]);

  const visibleDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => (d.title || "").toLowerCase().includes(q) || (d.content || "").toLowerCase().includes(q));
  }, [docs, docSearch]);

  async function submitDoc(e: React.FormEvent) {
    e.preventDefault();
    const title = docForm.title.trim();
    const content = docForm.content.trim();
    if (!content) { toastError("Write the knowledge content first."); return; }
    setDocSaving(true);
    const ok = await reportMutation(
      editingId ? updateKnowledge(editingId, title, content) : addKnowledge(orgId, title, content),
      editingId ? "Knowledge updated." : "Added to the knowledge base.",
    );
    setDocSaving(false);
    if (ok) {
      setDocForm({ title: "", content: "" });
      setEditingId(null);
      reloadDocs();
    }
  }

  async function deleteDoc(id: string, title: string) {
    if (!confirmDanger(`Delete "${title || "this doc"}"? The agent stops using it immediately.`)) return;
    const ok = await reportMutation(removeKnowledge(id), "Deleted.");
    if (ok) {
      if (editingId === id) { setEditingId(null); setDocForm({ title: "", content: "" }); }
      reloadDocs();
    }
  }

  /** Pull products + published pages + FAQs and compose them into auto-synced knowledge docs. */
  async function syncFromStore() {
    if (syncing) return;
    setSyncing(true);
    try {
      const [prodRes, pageRes, faqRes] = await Promise.all([
        listProducts(orgId),
        listPages(orgId),
        supabase.from("faqs").select("question, body, category").eq("organization_id", orgId).eq("active", true).order("sort", { ascending: true }),
      ]);
      if (prodRes.error || pageRes.error || faqRes.error) {
        toastError(prodRes.error || pageRes.error || "Could not read your store content — try again.");
        return;
      }
      const products = prodRes.data.filter((p) => p.status === "active");
      const pages = pageRes.data.filter((p) => p.status === "published");
      const faqs = (faqRes.data as { question: string; body: string; category: string }[] | null) ?? [];

      const composed: { title: string; content: string }[] = [];
      if (products.length > 0) {
        const lines = products.slice(0, 200).map((p) => {
          const desc = (p.description || "").replace(/\s+/g, " ").trim().slice(0, 200);
          const stock = p.stock > 0 ? `in stock: ${p.stock}` : "out of stock";
          return `- ${p.name} — ${formatPrice(p.price_cents, p.currency || org?.currency || "USD")} (${stock})${desc ? `: ${desc}` : ""}`;
        });
        composed.push({ title: SYNC_TITLES.catalog, content: `Our current catalog (prices and stock as of ${new Date().toLocaleDateString()}):\n${lines.join("\n")}` });
      }
      if (pages.length > 0) {
        const parts = pages.slice(0, 30).map((pg) => {
          const body = (pg.body || "").trim();
          return `## ${pg.title} (/${pg.slug})${body ? `\n${body.slice(0, 1500)}` : ""}`;
        });
        composed.push({ title: SYNC_TITLES.pages, content: `Published pages on our website — policies, terms and information:\n\n${parts.join("\n\n")}` });
      }
      if (faqs.length > 0) {
        composed.push({ title: SYNC_TITLES.faqs, content: faqs.map((f) => `Q: ${f.question}\nA: ${f.body}`).join("\n\n") });
      }
      if (composed.length === 0) {
        toastError("Nothing to sync — no active products, published pages or FAQs yet.");
        return;
      }

      // Title-keyed upsert: remove any doc with the same title, then re-add.
      const { data: existing, error: listErr } = await listKnowledge(orgId);
      if (listErr) { toastError(listErr); return; }
      for (const d of composed) {
        for (const old of existing.filter((x) => x.title === d.title)) {
          const { error } = await removeKnowledge(old.id);
          if (error) { toastError(error); return; }
        }
        const { error } = await addKnowledge(orgId, d.title, d.content);
        if (error) { toastError(error); return; }
      }
      drainEmbeddings();
      toast(`Synced ${products.length} product${products.length === 1 ? "" : "s"}, ${pages.length} page${pages.length === 1 ? "" : "s"} and ${faqs.length} FAQ${faqs.length === 1 ? "" : "s"} into ${composed.length} knowledge doc${composed.length === 1 ? "" : "s"}.`);
      reloadDocs();
    } finally {
      setSyncing(false);
    }
  }

  async function copySnippet(snippet: string) {
    try {
      await navigator.clipboard.writeText(snippet);
      toast("Embed snippet copied.");
    } catch {
      toastError("Couldn't copy — select the snippet and copy it manually.");
    }
  }

  if (loading || !config) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500" role="status">{loadError ? loadError : "Loading…"}</div>;

  const days = config.business_hours?.days ?? [1, 2, 3, 4, 5];
  const snippet = `<script src="https://www.phoxta.com/phoxta-agent.js" data-org="${config.public_key}" defer></script>`;

  return (
    <div className="row g-4">
      {(loadError || docsError) && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0" role="alert">{loadError || docsError}</div></div>}

      {/* ── Knowledge — the work you come back to, so it leads the page ── */}
      <div className="col-12 col-lg-7">
        <div className="bg-neutral-0 rounded-4 p-3 p-lg-4 border-100">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
            <h2 className="fz-font-lg fw-600 mb-0">
              Knowledge
              {docs.length > 0 && <span className="badge bg-neutral-100 neutral-700 fw-500 fz-font-sm ms-2 align-middle">{docs.length}</span>}
            </h2>
            <button type="button" className="btn btn-outline-dark btn-sm rounded-3 px-3 ops-tap" onClick={syncFromStore} disabled={syncing}>
              {syncing ? "Syncing…" : "Sync from your store"}
            </button>
          </div>
          <p className="fz-font-sm neutral-500 mb-3">Facts, policies and FAQs the agent answers from — embedded and retrieved automatically across chat, SMS, WhatsApp and voice. Sync pulls your products, published pages and FAQs into auto-updated docs.</p>

          <form onSubmit={submitDoc} className="bg-neutral-50 rounded-4 p-3 mb-3">
            <h3 className="fz-font-sm fw-600 neutral-500 text-uppercase mb-2">{editingId ? "Edit this answer" : "Add an answer"}</h3>
            <div className="row g-2">
              <div className="col-12">
                <label className="fz-font-sm fw-500 neutral-500 mb-1 d-block" htmlFor="kb-title">Title</label>
                <input id="kb-title" ref={docTitleRef} className="form-control rounded-3" placeholder="e.g. Refund policy" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} />
              </div>
              <div className="col-12">
                <label className="fz-font-sm fw-500 neutral-500 mb-1 d-block" htmlFor="kb-content">What the agent should say</label>
                <textarea id="kb-content" className="form-control rounded-3" rows={4} placeholder="Knowledge / answer…" value={docForm.content} onChange={(e) => setDocForm({ ...docForm, content: e.target.value })} required />
              </div>
              <div className="col-12 d-flex flex-wrap gap-2">
                <button type="submit" className="btn btn-dark rounded-3 px-4 ops-tap justify-content-center" disabled={docSaving}>{docSaving ? "Saving…" : editingId ? "Save changes" : "Add to knowledge base"}</button>
                {editingId && <button type="button" className="btn btn-outline-secondary rounded-3 px-3 ops-tap" onClick={() => { setEditingId(null); setDocForm({ title: "", content: "" }); }}>Cancel edit</button>}
              </div>
            </div>
          </form>

          <div className="mb-2">
            <label className="visually-hidden" htmlFor="kb-search">Search knowledge</label>
            <input id="kb-search" type="search" className="form-control rounded-3" placeholder="Search knowledge…" value={docSearch} onChange={(e) => setDocSearch(e.target.value)} />
          </div>

          {docsLoading ? (
            <div className="text-center neutral-500 py-4" role="status">Loading…</div>
          ) : visibleDocs.length === 0 ? (
            <div className="text-center neutral-500 py-4 fz-font-md">{docs.length === 0 ? "Nothing yet. Add what the agent should know — or hit Sync from your store." : "No docs match your search."}</div>
          ) : (
            <ul className="list-unstyled m-0 d-flex flex-column gap-2">
              {visibleDocs.map((d) => {
                const isLong = (d.content || "").length > 220 || (d.content.match(/\n/g)?.length ?? 0) >= 3;
                const isOpen = !!expanded[d.id];
                const label = d.title || "this answer";
                return (
                  <li key={d.id} className="bg-neutral-0 rounded-4 p-3 border-100">
                    <div className="d-flex justify-content-between gap-2">
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        {d.title && <h3 className="fz-font-md fw-600 mb-0">{d.title}</h3>}
                        <div
                          className="fz-font-sm neutral-500"
                          style={isOpen || !isLong
                            ? { whiteSpace: "pre-wrap" }
                            : { whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                        >
                          {d.content}
                        </div>
                        {isLong && (
                          <button type="button" className="btn btn-link btn-sm p-0 fz-font-sm text-decoration-none ops-tap" aria-expanded={isOpen} onClick={() => setExpanded((x) => ({ ...x, [d.id]: !isOpen }))}>
                            {isOpen ? "Show less" : "Show more"}
                          </button>
                        )}
                      </div>
                      <div className="d-flex flex-column gap-1 text-end flex-shrink-0">
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 px-2 neutral-700 text-decoration-none ops-tap"
                          aria-label={`Edit ${label}`}
                          onClick={() => { setEditingId(d.id); setDocForm({ title: d.title || "", content: d.content || "" }); docTitleRef.current?.focus(); }}
                        >
                          Edit
                        </button>
                        <button type="button" className="btn btn-link btn-sm p-0 px-2 text-danger text-decoration-none ops-tap" aria-label={`Delete ${label}`} onClick={() => deleteDoc(d.id, d.title)}>Delete</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Live preview — test what you just taught it ── */}
      <div className="col-12 col-lg-5">
        <div style={{ position: "sticky", top: 16 }}>
          <TrainPreview orgId={orgId} publicKey={config.public_key ?? null} />

          <div className="bg-neutral-0 rounded-4 p-3 p-lg-4 border-100 mt-4">
            <h2 className="fz-font-md fw-600 mb-2">Add the agent to your website</h2>
            <p className="fz-font-sm neutral-500 mb-2">Paste this once before <code>&lt;/body&gt;</code> — a chat bubble appears on every page, answered by this agent.</p>
            <code className="d-block p-2 bg-neutral-50 rounded-3 fz-font-sm mb-2" style={{ wordBreak: "break-all" }}>{snippet}</code>
            <button type="button" className="btn btn-outline-dark btn-sm rounded-3 px-3 ops-tap" onClick={() => copySnippet(snippet)}>Copy snippet</button>
          </div>
        </div>
      </div>

      {/* ── Set-up — one-time configuration, below the daily work ── */}
      <div className="col-12">
        <h2 className="fz-font-lg fw-600 mb-1">Set-up</h2>
        <p className="fz-font-sm neutral-500 mb-3">Set these once: who your agent is, what it may do, when you&rsquo;re open, and how it sounds on the phone.</p>

        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="bg-neutral-0 rounded-4 p-3 p-lg-4 border-100 h-100">
              <h3 className="fz-font-md fw-600 mb-1">Persona</h3>
              <p className="fz-font-sm neutral-500 mb-3">Who your agent is on every channel.</p>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="train-preset">Industry starter</label>
                  <div className="d-flex flex-wrap gap-2">
                    <select id="train-preset" className="form-select rounded-3" style={{ flex: "1 1 200px", minWidth: 0 }} value={presetKey} onChange={(e) => setPresetKey(e.target.value)}>
                      {INDUSTRY_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <button type="button" className="btn btn-outline-dark rounded-3 px-4 ops-tap" onClick={applyPreset}>Apply</button>
                  </div>
                  <p className="fz-font-sm neutral-500 mt-1 mb-0">Applying replaces the persona, greeting and tone below — nothing is saved until you press Save.</p>
                </div>
                <div className="col-12 col-md-8"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="agent-name">Agent name</label><input id="agent-name" className="form-control rounded-3" value={config.display_name} onChange={(e) => patch({ display_name: e.target.value })} /></div>
                <div className="col-12 col-md-4"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="agent-tone">Tone</label><input id="agent-tone" className="form-control rounded-3" value={config.tone} onChange={(e) => patch({ tone: e.target.value })} /></div>
                <div className="col-12"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="agent-persona">Persona / instructions</label><textarea id="agent-persona" className="form-control rounded-3" rows={3} value={config.persona} onChange={(e) => patch({ persona: e.target.value })} /></div>
                <div className="col-12">
                  <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="agent-procedures">Operating procedures</label>
                  <textarea
                    id="agent-procedures"
                    className="form-control rounded-3"
                    rows={4}
                    value={config.procedures ?? ""}
                    onChange={(e) => patch({ procedures: e.target.value })}
                    placeholder={"Plain-English rules the agent must always follow, e.g.:\n• If an order is unshipped, offer an exchange before a refund.\n• Never promise delivery dates — say \"usually 3–5 business days\".\n• Discounts above 10% need my approval."}
                  />
                  <p className="fz-font-sm neutral-500 mt-1 mb-0">These are hard rules — the agent follows them over its own judgment, on every channel.</p>
                </div>
                <div className="col-12"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="agent-greeting">Greeting</label><input id="agent-greeting" className="form-control rounded-3" value={config.greeting} onChange={(e) => patch({ greeting: e.target.value })} /></div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6 d-flex flex-column gap-4">
            <div className="bg-neutral-0 rounded-4 p-3 p-lg-4 border-100">
              <h3 className="fz-font-md fw-600 mb-1">What your agent can do</h3>
              <p className="fz-font-sm neutral-500 mb-3">Each switch gates real tools the agent uses on every channel. Everything else — answering from your knowledge, escalating to a human — is always on.</p>
              <div className="d-flex flex-column gap-3">
                {CAPABILITY_SWITCHES.map((c) => (
                  <div key={c.key}>
                    <div className="form-check form-switch d-flex align-items-center justify-content-between gap-3 m-0 p-0">
                      <label className="form-check-label fz-font-md fw-500 neutral-700 ops-tap" htmlFor={`cap-${c.key}`}>{c.label}</label>
                      <input className="form-check-input m-0 flex-shrink-0" type="checkbox" role="switch" id={`cap-${c.key}`} checked={capOn(c.key)} onChange={() => toggleCap(c.key)} aria-describedby={`cap-help-${c.key}`} />
                    </div>
                    <div id={`cap-help-${c.key}`} className="fz-font-sm neutral-500 mt-1">{c.help}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-neutral-0 rounded-4 p-3 p-lg-4 border-100">
              <h3 className="fz-font-md fw-600 mb-3">Business hours &amp; escalation</h3>
              <div className="row g-3">
                <div className="col-6 col-md-3"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="hours-open">Open</label><input id="hours-open" type="time" className="form-control rounded-3" value={config.business_hours?.open ?? "09:00"} onChange={(e) => patch({ business_hours: { ...config.business_hours, open: e.target.value } })} /></div>
                <div className="col-6 col-md-3"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="hours-close">Close</label><input id="hours-close" type="time" className="form-control rounded-3" value={config.business_hours?.close ?? "17:00"} onChange={(e) => patch({ business_hours: { ...config.business_hours, close: e.target.value } })} /></div>
                <div className="col-12 col-md-6">
                  <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="hours-tz">Timezone</label>
                  <select id="hours-tz" className="form-select rounded-3" value={config.business_hours?.tz ?? ""} onChange={(e) => patch({ business_hours: { ...config.business_hours, tz: e.target.value } })}>
                    {!config.business_hours?.tz && <option value="">Select timezone…</option>}
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <span className="form-label d-block fz-font-sm fw-500 neutral-500 mb-1" id="open-days-label">Open days</span>
                  <div className="d-flex flex-wrap gap-1" role="group" aria-labelledby="open-days-label">
                    {DAYS.map((d, i) => (
                      <button
                        key={d}
                        type="button"
                        className={`btn btn-sm rounded-pill px-3 ops-tap ${days.includes(i) ? "btn-dark" : "btn-outline-secondary"}`}
                        aria-pressed={days.includes(i)}
                        onClick={() => toggleDay(i)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="fz-font-sm neutral-500 mt-1">With after-hours answering on, the agent still replies outside these hours — it captures the lead and offers a callback.</div>
                </div>
                <div className="col-12"><label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="escalate-email">Escalate to (email)</label><input id="escalate-email" type="email" className="form-control rounded-3" value={config.escalation?.to_email ?? ""} onChange={(e) => patch({ escalation: { ...config.escalation, to_email: e.target.value } })} /></div>
              </div>
            </div>

            <div className="bg-neutral-0 rounded-4 p-3 p-lg-4 border-100">
              <h3 className="fz-font-md fw-600 mb-2">Voice</h3>
              <p className="fz-font-sm neutral-500 mb-2">The voice your AI uses on phone calls. Pick a preset, or choose Cartesia and paste a custom / cloned voice ID.</p>
              <label className="visually-hidden" htmlFor="agent-voice">Voice</label>
              <select
                id="agent-voice"
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
                <input aria-label="Cartesia voice ID" className="form-control rounded-3" placeholder="Cartesia voice ID (preset or cloned)" value={config.voice?.voice_id || ""} onChange={(e) => patch({ voice: { provider: "cartesia", voice_id: e.target.value } })} />
              )}
              <div className="fz-font-sm neutral-500 mt-1">To clone a voice: create it in Cartesia, then paste its voice ID here.</div>
            </div>
          </div>
        </div>
      </div>

      {dirty && (
        <div className="col-12" style={{ position: "sticky", bottom: 12, zIndex: 1040 }}>
          <div className="bg-neutral-900 text-white rounded-4 px-3 px-lg-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-2 shadow" role="status">
            <span className="fz-font-md fw-500">Unsaved changes</span>
            <div className="d-flex gap-2 ms-auto">
              <button type="button" className="btn btn-outline-light btn-sm rounded-3 px-3 ops-tap" onClick={discard} disabled={saving}>Discard</button>
              <button type="button" className="btn btn-light btn-sm rounded-3 px-4 fw-600 ops-tap" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
