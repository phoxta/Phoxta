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
import { Card, Chip } from "@/components/dash/Ui";
import type { OpsContext } from "@/layouts/OperatingLayout";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** hrx-kit dressing for the Train page — sub-forms, doc rows, day pills and
 *  the sticky save bar, all local to this page. */
const AGX_CSS = `
.agx-note{font-size:13px;color:var(--hrx-muted)}
.agx-alert{background:#fdf3d7;border:1px solid #f2dfa6;border-radius:16px;color:#a16207;padding:12px 16px;font-size:14px}
.agx-subform{background:var(--hrx-soft);border:1px solid var(--hrx-border-soft);border-radius:16px;padding:14px 16px}
.agx-subhead{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--hrx-muted);margin:0 0 10px}
.agx-linkbtn{background:none;border:0;padding:0;font-size:13px;font-weight:500;color:var(--hrx-muted);cursor:pointer;text-decoration:none}
.agx-linkbtn:hover{color:var(--hrx-ink)}
.agx-linkbtn.danger{color:#dc2626}
.agx-linkbtn.danger:hover{color:#b91c1c}
.agx-doc{background:var(--hrx-card);border:1px solid var(--hrx-border-soft);border-radius:16px;padding:14px 16px}
.agx-doc h3{font-size:15px;font-weight:600;letter-spacing:-0.02em;margin:0 0 2px}
.agx-doc-body{font-size:13px;color:var(--hrx-muted);white-space:pre-wrap;overflow-wrap:anywhere}
.agx-day{height:34px;padding:0 14px;border-radius:50px;border:1px solid var(--hrx-border-soft);background:#fff;font-size:13px;font-weight:500;color:var(--hrx-ink);cursor:pointer;transition:background-color .15s ease,color .15s ease,border-color .15s ease}
.agx-day:hover{background:#f1f2f4}
.agx-day[aria-pressed="true"]{background:var(--hrx-ink);border-color:var(--hrx-ink);color:#fff}
.agx-snippet{display:block;background:var(--hrx-soft);border:1px solid var(--hrx-border-soft);border-radius:12px;padding:10px 12px;font-size:12px;word-break:break-all;margin-bottom:10px}
.agx-savebar{position:sticky;bottom:12px;z-index:1040;background:var(--hrx-ink);color:#fff;border-radius:16px;padding:12px 18px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 18px 50px -18px rgba(0,0,0,.45);margin-top:16px}
.agx-savebar .hrx-pill:disabled{opacity:.55;cursor:default}
.agx-panel .hrx-pill:disabled,.agx-panel .hrx-seeall:disabled{opacity:.55;cursor:default}
`;

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

// Owner-facing labels only — `provider` still carries the routing, so the
// supplier brand never has to appear on the top-level control.
const VOICES = [
  { provider: "deepgram", id: "aura-asteria-en", label: "Asteria — warm female (US)" },
  { provider: "deepgram", id: "aura-luna-en", label: "Luna — bright female (US)" },
  { provider: "deepgram", id: "aura-orion-en", label: "Orion — steady male (US)" },
  { provider: "deepgram", id: "aura-arcas-en", label: "Arcas — deep male (US)" },
  { provider: "cartesia", id: "", label: "Use my own recorded voice (advanced)" },
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
  const { data: loadedConfig, loading, error: loadError, setData: setCachedConfig, reload: reloadConfig } = useCachedData(
    `agent:config:${orgId}`,
    // Throw, don't swallow: getAgentConfig resolves {data: null, error} on an
    // RLS/network failure, and a silently-null "success" leaves the page
    // spinning forever with nothing to retry.
    async () => {
      const { data, error } = await getAgentConfig(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [baseline, setBaseline] = useState<AgentConfig | null>(null);
  const suggestedPreset = VERTICAL_TO_PRESET[(org?.vertical || "").toLowerCase().trim()] ?? "generic";
  const [presetKey, setPresetKey] = useState(suggestedPreset);
  const [saving, setSaving] = useState(false);
  // Section tabs (presentation only): both panels stay mounted — hidden, not
  // unmounted — so a half-typed doc or a running preview chat survives a switch.
  const [section, setSection] = useState<"knowledge" | "setup">("knowledge");

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
      // NOTE: this gate runs inside a capture-phase click handler, so the
      // confirmation must be SYNCHRONOUS — preventDefault/stopPropagation
      // cannot be deferred. confirmDanger must stay synchronous for this site.
      if (!confirmDanger("You have unsaved changes on Train. Leave without saving?")) {
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
    if (!confirmDanger(`Delete "${title || "this answer"}"? The agent stops using it immediately.`)) return;
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
          return `- ${p.name} — ${formatPrice(p.price_cents, p.currency || org?.currency || "GBP")} (${stock})${desc ? `: ${desc}` : ""}`;
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
      toast(`Pulled in ${products.length} product${products.length === 1 ? "" : "s"}, ${pages.length} page${pages.length === 1 ? "" : "s"} and ${faqs.length} FAQ${faqs.length === 1 ? "" : "s"} as ${composed.length} answer${composed.length === 1 ? "" : "s"}.`);
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

  // A failure is an alert with a way out — never a spinner that never resolves.
  if (loadError && !config) {
    return (
      <div className="hrx-card hrx-pad text-center" role="alert">
        <div className="fw-600 mb-2" style={{ color: "#dc2626" }}>Couldn&rsquo;t load your agent</div>
        <div className="mb-3" style={{ fontSize: 14, color: "var(--hrx-muted)" }}>{loadError}</div>
        <button type="button" className="hrx-pill dark ops-tap" onClick={() => reloadConfig()}>Try again</button>
      </div>
    );
  }
  if (loading || !config)
    return (
      <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }} role="status">
        Loading…
      </div>
    );

  const days = config.business_hours?.days ?? [1, 2, 3, 4, 5];
  const snippet = `<script src="https://www.phoxta.com/phoxta-agent.js" data-org="${config.public_key}" defer></script>`;

  return (
    <div>
      <style>{AGX_CSS}</style>
      {(loadError || docsError) && <div className="agx-alert mb-3" role="alert">{loadError || docsError}</div>}

      {/* ── Section tabs — both panels stay mounted below, only hidden ── */}
      <div className="hrx-tabbar mb-3" role="tablist" aria-label="Train sections">
        <button
          type="button"
          role="tab"
          id="agx-tab-knowledge"
          aria-selected={section === "knowledge"}
          aria-controls="agx-panel-knowledge"
          className={`hrx-tab${section === "knowledge" ? " active" : ""}`}
          onClick={() => setSection("knowledge")}
        >
          Knowledge &amp; preview
        </button>
        <button
          type="button"
          role="tab"
          id="agx-tab-setup"
          aria-selected={section === "setup"}
          aria-controls="agx-panel-setup"
          className={`hrx-tab${section === "setup" ? " active" : ""}`}
          onClick={() => setSection("setup")}
        >
          Set-up
        </button>
      </div>

      {/* ── Knowledge — the work you come back to, so it leads the page ── */}
      <div id="agx-panel-knowledge" role="tabpanel" aria-labelledby="agx-tab-knowledge" className="agx-panel" hidden={section !== "knowledge"}>
        <div className="row g-3">
          <div className="col-12 col-lg-7">
            <Card
              title={<>Knowledge{docs.length > 0 && <Chip tone="line">{docs.length}</Chip>}</>}
              right={
                <button type="button" className="hrx-seeall ops-tap" onClick={syncFromStore} disabled={syncing}>
                  {syncing ? "Pulling in…" : "Pull in my products & pages"}
                </button>
              }
            >
              <p className="agx-note mb-3">Facts, policies and FAQs your agent answers from — it uses these on chat, SMS, WhatsApp and phone calls automatically. Pulling in your store adds your products, published pages and FAQs, kept up to date.</p>

              <form onSubmit={submitDoc} className="agx-subform mb-3">
                <h3 className="agx-subhead">{editingId ? "Edit this answer" : "Add an answer"}</h3>
                <label className="hrx-field">
                  <span>Title</span>
                  <input ref={docTitleRef} className="form-control" placeholder="e.g. Refund policy" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} />
                </label>
                <label className="hrx-field">
                  <span>What the agent should say</span>
                  <textarea className="form-control" rows={4} placeholder="Knowledge / answer…" value={docForm.content} onChange={(e) => setDocForm({ ...docForm, content: e.target.value })} required />
                </label>
                <div className="d-flex flex-wrap gap-2">
                  <button type="submit" className="hrx-pill primary ops-tap" disabled={docSaving}>{docSaving ? "Saving…" : editingId ? "Save changes" : "Add to knowledge base"}</button>
                  {editingId && <button type="button" className="hrx-pill ops-tap" onClick={() => { setEditingId(null); setDocForm({ title: "", content: "" }); }}>Cancel edit</button>}
                </div>
              </form>

              <label className="hrx-field">
                <span className="visually-hidden">Search knowledge</span>
                <input type="search" className="form-control" placeholder="Search knowledge…" value={docSearch} onChange={(e) => setDocSearch(e.target.value)} />
              </label>

              {docsLoading ? (
                <div className="text-center py-4" style={{ color: "var(--hrx-muted)" }} role="status">Loading…</div>
              ) : visibleDocs.length === 0 ? (
                <div className="text-center py-4" style={{ fontSize: 14, color: "var(--hrx-muted)" }}>{docs.length === 0 ? "Nothing yet. Add what the agent should know — or hit Pull in my products & pages." : "No answers match your search."}</div>
              ) : (
                <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                  {visibleDocs.map((d) => {
                    const isLong = (d.content || "").length > 220 || (d.content.match(/\n/g)?.length ?? 0) >= 3;
                    const isOpen = !!expanded[d.id];
                    const label = d.title || "this answer";
                    return (
                      <li key={d.id} className="agx-doc">
                        <div className="d-flex justify-content-between gap-2">
                          <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            {d.title && <h3>{d.title}</h3>}
                            <div
                              className="agx-doc-body"
                              style={isOpen || !isLong
                                ? undefined
                                : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                            >
                              {d.content}
                            </div>
                            {isLong && (
                              <button type="button" className="agx-linkbtn ops-tap" aria-expanded={isOpen} onClick={() => setExpanded((x) => ({ ...x, [d.id]: !isOpen }))}>
                                {isOpen ? "Show less" : "Show more"}
                              </button>
                            )}
                          </div>
                          <div className="d-flex flex-column gap-1 text-end flex-shrink-0">
                            <button
                              type="button"
                              className="agx-linkbtn ops-tap"
                              aria-label={`Edit ${label}`}
                              onClick={() => { setEditingId(d.id); setDocForm({ title: d.title || "", content: d.content || "" }); docTitleRef.current?.focus(); }}
                            >
                              Edit
                            </button>
                            <button type="button" className="agx-linkbtn danger ops-tap" aria-label={`Delete ${label}`} onClick={() => deleteDoc(d.id, d.title)}>Delete</button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* ── Live preview — test what you just taught it ── */}
          <div className="col-12 col-lg-5">
            <div>
              <TrainPreview orgId={orgId} publicKey={config.public_key ?? null} />

              <Card title="Add the agent to your website" className="mt-3">
                <p className="agx-note mb-2">Paste this once before <code>&lt;/body&gt;</code> — a chat bubble appears on every page, answered by this agent.</p>
                <code className="agx-snippet">{snippet}</code>
                <button type="button" className="hrx-seeall ops-tap" onClick={() => copySnippet(snippet)}>Copy snippet</button>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ── Set-up — one-time configuration behind its own tab ── */}
      <div id="agx-panel-setup" role="tabpanel" aria-labelledby="agx-tab-setup" className="agx-panel" hidden={section !== "setup"}>
        <p className="agx-note mb-3">Set these once: who your agent is, what it may do, when you&rsquo;re open, and how it sounds on the phone.</p>

        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <Card title="Persona" className="h-100">
              <p className="agx-note mb-3">Who your agent is on every channel.</p>
              <div className="d-flex flex-wrap gap-2 align-items-end">
                <label className="hrx-field mb-0" style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <span>Industry starter</span>
                  <select className="form-select" value={presetKey} onChange={(e) => setPresetKey(e.target.value)}>
                    {INDUSTRY_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </label>
                <button type="button" className="hrx-pill ops-tap" onClick={applyPreset}>Apply</button>
              </div>
              <p className="agx-note mt-1 mb-3">Applying replaces the persona, greeting and tone below — nothing is saved until you press Save.</p>
              <div className="row g-2">
                <div className="col-12 col-md-8">
                  <label className="hrx-field mb-0">
                    <span>Agent name</span>
                    <input className="form-control" value={config.display_name} onChange={(e) => patch({ display_name: e.target.value })} />
                  </label>
                </div>
                <div className="col-12 col-md-4">
                  <label className="hrx-field mb-0">
                    <span>Tone</span>
                    <input className="form-control" value={config.tone} onChange={(e) => patch({ tone: e.target.value })} />
                  </label>
                </div>
                <div className="col-12">
                  <label className="hrx-field mb-0">
                    <span>Persona / instructions</span>
                    <textarea className="form-control" rows={3} value={config.persona} onChange={(e) => patch({ persona: e.target.value })} />
                  </label>
                </div>
                <div className="col-12">
                  <label className="hrx-field mb-0">
                    <span>Operating procedures</span>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={config.procedures ?? ""}
                      onChange={(e) => patch({ procedures: e.target.value })}
                      placeholder={"Plain-English rules the agent must always follow, e.g.:\n• If an order is unshipped, offer an exchange before a refund.\n• Never promise delivery dates — say \"usually 3–5 business days\".\n• Discounts above 10% need my approval."}
                    />
                  </label>
                  <p className="agx-note mt-1 mb-0">These are hard rules — the agent follows them over its own judgment, on every channel.</p>
                </div>
                <div className="col-12">
                  <label className="hrx-field mb-0">
                    <span>Greeting</span>
                    <input className="form-control" value={config.greeting} onChange={(e) => patch({ greeting: e.target.value })} />
                  </label>
                </div>
              </div>
            </Card>
          </div>

          <div className="col-12 col-lg-6 d-flex flex-column gap-3">
            <Card title="What your agent can do">
              <p className="agx-note mb-3">Each switch gates real tools the agent uses on every channel. Everything else — answering from your knowledge, escalating to a human — is always on.</p>
              <div className="d-flex flex-column gap-3">
                {CAPABILITY_SWITCHES.map((c) => (
                  <div key={c.key}>
                    <div className="form-check form-switch d-flex align-items-center justify-content-between gap-3 m-0 p-0">
                      <label className="form-check-label fw-500 ops-tap" style={{ fontSize: 15 }} htmlFor={`cap-${c.key}`}>{c.label}</label>
                      <input className="form-check-input m-0 flex-shrink-0" type="checkbox" role="switch" id={`cap-${c.key}`} checked={capOn(c.key)} onChange={() => toggleCap(c.key)} aria-describedby={`cap-help-${c.key}`} />
                    </div>
                    <div id={`cap-help-${c.key}`} className="agx-note mt-1">{c.help}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title={<>Business hours &amp; escalation</>}>
              <div className="row g-2">
                <div className="col-6 col-md-3">
                  <label className="hrx-field mb-0">
                    <span>Open</span>
                    <input type="time" className="form-control" value={config.business_hours?.open ?? "09:00"} onChange={(e) => patch({ business_hours: { ...config.business_hours, open: e.target.value } })} />
                  </label>
                </div>
                <div className="col-6 col-md-3">
                  <label className="hrx-field mb-0">
                    <span>Close</span>
                    <input type="time" className="form-control" value={config.business_hours?.close ?? "17:00"} onChange={(e) => patch({ business_hours: { ...config.business_hours, close: e.target.value } })} />
                  </label>
                </div>
                <div className="col-12 col-md-6">
                  <label className="hrx-field mb-0">
                    <span>Timezone</span>
                    <select className="form-select" value={config.business_hours?.tz ?? ""} onChange={(e) => patch({ business_hours: { ...config.business_hours, tz: e.target.value } })}>
                      {!config.business_hours?.tz && <option value="">Select timezone…</option>}
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                    </select>
                  </label>
                </div>
                <div className="col-12">
                  <span className="d-block" id="open-days-label" style={{ fontSize: 13, fontWeight: 500, color: "var(--hrx-muted)", marginBottom: 6 }}>Open days</span>
                  <div className="d-flex flex-wrap gap-1" role="group" aria-labelledby="open-days-label">
                    {DAYS.map((d, i) => (
                      <button
                        key={d}
                        type="button"
                        className="agx-day ops-tap"
                        aria-pressed={days.includes(i)}
                        onClick={() => toggleDay(i)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="agx-note mt-1">With after-hours answering on, the agent still replies outside these hours — it captures the lead and offers a callback.</div>
                </div>
                <div className="col-12">
                  <label className="hrx-field mb-0">
                    <span>Escalate to (email)</span>
                    <input type="email" className="form-control" value={config.escalation?.to_email ?? ""} onChange={(e) => patch({ escalation: { ...config.escalation, to_email: e.target.value } })} />
                  </label>
                </div>
              </div>
            </Card>

            <Card title="Voice">
              <p className="agx-note mb-2">The voice your AI uses on phone calls.</p>
              <label className="visually-hidden" htmlFor="agent-voice">Voice</label>
              <select
                id="agent-voice"
                className="form-select mb-2"
                value={config.voice?.provider === "cartesia" ? "cartesia|" : `${config.voice?.provider || "deepgram"}|${config.voice?.voice_id || "aura-asteria-en"}`}
                onChange={(e) => {
                  const [provider, voice_id] = e.target.value.split("|");
                  patch({ voice: { provider, voice_id: provider === "cartesia" ? (config.voice?.voice_id || "") : voice_id } });
                }}
              >
                {VOICES.map((v) => <option key={v.label} value={`${v.provider}|${v.id}`}>{v.label}</option>)}
              </select>
              {/* Cartesia is only named where it's actionable — behind the
                  "own recorded voice" option, which needs an ID from them. */}
              {config.voice?.provider === "cartesia" && (
                <>
                  <input aria-label="Cartesia voice ID" className="form-control" placeholder="Cartesia voice ID (preset or cloned)" value={config.voice?.voice_id || ""} onChange={(e) => patch({ voice: { provider: "cartesia", voice_id: e.target.value } })} />
                  <div className="agx-note mt-1">To clone a voice: create it in Cartesia, then paste its voice ID here.</div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      {dirty && (
        <div className="agx-savebar" role="status">
          <span style={{ fontSize: 15, fontWeight: 500 }}>Unsaved changes</span>
          <div className="d-flex gap-2 ms-auto">
            <button type="button" className="hrx-pill ops-tap" onClick={discard} disabled={saving}>Discard</button>
            <button type="button" className="hrx-pill primary ops-tap" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
