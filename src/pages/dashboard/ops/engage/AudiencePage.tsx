import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { listContacts, type Contact } from "@/lib/db/ops/crm";
import {
  useEngageOps,
  listEngageSegments,
  createEngageSegment,
  renameEngageSegment,
  deleteEngageSegment,
  matchesFilter,
  describeFilter,
  FIELD_META,
  ENGAGE_WARMING,
  type EngageSegment,
  type SegmentCond,
  type SegmentField,
} from "@/lib/db/ops/engageAreas";
import { confirmDanger, reportMutation, toastError } from "@/lib/ops/feedback";
import { Card, Chip, Empty, InitialAvatar, StatTile } from "@/components/dash/Ui";

/**
 * Engage → Audience: the contact spine. Read-only over the CRM's contacts
 * (editing stays in CRM — every row links there) plus the engage_segments
 * saved filters that Journeys and Broadcasts will target.
 */

const ROW_CAP = 150;

const CSS = `
.adx-head { display: flex; align-items: center; justify-content: space-between; gap: 10px 12px; flex-wrap: wrap; margin-bottom: 14px; }
.adx-title { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.adx-muted { font-size: 13px; color: var(--hrx-muted); }
.adx-name { color: var(--hrx-ink); text-decoration: none; font-weight: 600; }
.adx-name:hover { text-decoration: underline; color: var(--hrx-ink); }
.adx-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.adx-cond { display: grid; grid-template-columns: 150px minmax(0, 1fr) 32px; gap: 8px; align-items: center; margin-bottom: 8px; }
.adx-x { width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--hrx-border-soft); background: var(--hrx-soft); color: var(--hrx-muted); font-size: 15px; line-height: 1; }
.adx-x:hover { color: #dc2626; border-color: #f3c1c1; }
.adx-preview { font-size: 13.5px; background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 9px 12px; }
.adx-consent { font-size: 13px; color: var(--hrx-muted); margin: 12px 0 0; }
`;

const blankCond = (): SegmentCond => ({ field: "has_tag", op: "has", value: "" });

export default function AudiencePage() {
  const { orgId } = useEngageOps();

  // Same cache key + fetcher as the CRM board, so the two pages share one warm read.
  const { data: contacts = [], loading, error: loadError } = useCachedData<Contact[]>(
    `ops:crm:${orgId}`,
    async () => {
      const { data, error } = await listContacts(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );

  // Segments are fail-soft: a missing engage_segments table renders the
  // "warming up" state, never an error.
  const { data: segState, reload: reloadSegments } = useCachedData<{ rows: EngageSegment[]; missing: boolean }>(
    `ops:engage:segments:${orgId}`,
    async () => {
      const { data, missing, error } = await listEngageSegments(orgId);
      if (error) throw new Error(error);
      return { rows: data, missing };
    },
    { ttl: DASHBOARD_TTL },
  );

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.name, c.email, c.phone, c.company, ...(c.tags ?? [])].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [contacts, search]);

  const stats = useMemo(() => ({
    total: contacts.length,
    tagged: contacts.filter((c) => (c.tags ?? []).length > 0).length,
    emailable: contacts.filter((c) => c.email && !c.email_opt_out).length,
    phoneable: contacts.filter((c) => c.phone && !c.sms_opt_out).length,
  }), [contacts]);

  const crmBase = `/dashboard/businesses/${orgId}/ops/crm`;

  if (loading) return <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }} role="status">Loading…</div>;

  return (
    <div>
      <style>{CSS}</style>

      <div className="adx-head">
        <h2 className="adx-title">Audience</h2>
        <Link to={crmBase} className="hrx-seeall">Open CRM →</Link>
      </div>

      {loadError && <div className="alert alert-warning py-2 px-3 mb-3" style={{ borderRadius: 12, fontSize: 14 }} role="alert">{loadError}</div>}

      <div className="hrx-statrow mb-3">
        <StatTile label="Contacts" value={stats.total} tone="dark" />
        <StatTile label="Tagged" value={stats.tagged} />
        <StatTile label="Reachable by email" value={stats.emailable} tone="blue" />
        <StatTile label="Reachable by phone" value={stats.phoneable} />
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <Card
            title="Contacts"
            right={
              <input
                className="form-control form-control-sm"
                style={{ maxWidth: 220, borderRadius: 50 }}
                type="search"
                placeholder="Search name, email, tag…"
                aria-label="Search contacts"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            }
          >
            {contacts.length === 0 ? (
              <Empty title="No contacts yet">
                Everyone your channels touch lands in the CRM — add your first contact there and this view fills in.
              </Empty>
            ) : filtered.length === 0 ? (
              <Empty title="No contacts match">Try a shorter search — it checks names, emails, phones, companies and tags.</Empty>
            ) : (
              <>
                <div className="hrx-tablewrap">
                  <table className="hrx-table" style={{ minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th>Contact</th>
                        <th>Reach</th>
                        <th>Tags</th>
                        <th style={{ textAlign: "right" }}>Last activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, ROW_CAP).map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <InitialAvatar name={c.name} size={32} />
                              <div style={{ minWidth: 0 }}>
                                <Link to={crmBase} className="adx-name">{c.name || "Unnamed"}</Link>
                                {c.company && <div className="adx-muted">{c.company}</div>}
                              </div>
                            </div>
                          </td>
                          <td>
                            {c.email ? <div style={{ fontSize: 13.5 }}>{c.email}{c.email_opt_out ? " (opted out)" : ""}</div> : null}
                            {c.phone ? <div style={{ fontSize: 13.5 }}>{c.phone}{c.sms_opt_out ? " (opted out)" : ""}</div> : null}
                            {!c.email && !c.phone && <span className="adx-muted">No address</span>}
                          </td>
                          <td>
                            {(c.tags ?? []).length === 0 ? (
                              <span className="adx-muted">—</span>
                            ) : (
                              <div className="adx-tags">
                                {(c.tags ?? []).slice(0, 3).map((t) => <Chip key={t} tone="line">{t}</Chip>)}
                                {(c.tags ?? []).length > 3 && <Chip tone="plain">+{(c.tags ?? []).length - 3}</Chip>}
                              </div>
                            )}
                          </td>
                          <td className="text-nowrap" style={{ textAlign: "right", color: "var(--hrx-muted)", fontSize: 13.5 }}>
                            {new Date(c.updated_at || c.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length > ROW_CAP && (
                  <p className="adx-muted mt-2 mb-0">
                    Showing the first {ROW_CAP} of {filtered.length} — narrow the search, or work with the full list in <Link to={crmBase}>CRM</Link>.
                  </p>
                )}
              </>
            )}
            <p className="adx-consent">Unsubscribes and opt-outs are honored automatically at send time.</p>
          </Card>
        </div>

        <div className="col-lg-5">
          <SegmentsCard
            orgId={orgId}
            contacts={contacts}
            segments={segState?.rows ?? []}
            missing={segState?.missing ?? false}
            reload={reloadSegments}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Saved segments over engage_segments: simple AND conditions, previewed live
// against the contacts already loaded on this page.
function SegmentsCard({ orgId, contacts, segments, missing, reload }: {
  orgId: string;
  contacts: Contact[];
  segments: EngageSegment[];
  missing: boolean;
  reload: () => void;
}) {
  const [name, setName] = useState("");
  const [conds, setConds] = useState<SegmentCond[]>([blankCond()]);
  const [saving, setSaving] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const activeConds = conds.filter((c) => c.value.trim());
  const previewCount = useMemo(() => {
    const active = conds.filter((c) => c.value.trim());
    return contacts.filter((c) => matchesFilter(c, { conds: active })).length;
  }, [contacts, conds]);

  function setCond(i: number, patch: Partial<SegmentCond>) {
    setConds((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }

  function changeField(i: number, field: SegmentField) {
    setCond(i, { field, op: FIELD_META[field].op, value: "" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toastError("Give the segment a name."); return; }
    if (activeConds.length === 0) { toastError("Add at least one condition with a value."); return; }
    setSaving(true);
    const ok = await reportMutation(
      createEngageSegment(orgId, { name, filter: { conds: activeConds } }),
      `Segment "${name.trim()}" saved.`,
    );
    setSaving(false);
    if (ok) { setName(""); setConds([blankCond()]); reload(); }
  }

  async function saveRename(s: EngageSegment) {
    if (!renameValue.trim()) { toastError("The segment name can't be empty."); return; }
    const ok = await reportMutation(renameEngageSegment(s.id, renameValue), "Segment renamed.");
    if (ok) { setRenamingId(null); reload(); }
  }

  async function remove(s: EngageSegment) {
    if (!confirmDanger(`Delete the segment "${s.name}"? Journeys and broadcasts aimed at it will stop matching anyone.`)) return;
    const ok = await reportMutation(deleteEngageSegment(s.id), "Segment deleted.");
    if (ok) reload();
  }

  if (missing) {
    return (
      <Card title="Segments">
        <Empty title={ENGAGE_WARMING.title}>{ENGAGE_WARMING.body}</Empty>
      </Card>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      <Card
        title="Segments"
        right={segments.length > 0 ? <Chip tone="line">{segments.length} saved</Chip> : undefined}
      >
        {segments.length === 0 ? (
          <Empty title="No segments yet">Build one below — Journeys and Broadcasts can then target it by name.</Empty>
        ) : (
          <div>
            {segments.map((s) => {
              const count = contacts.filter((c) => matchesFilter(c, s.filter)).length;
              return (
                <div key={s.id} className="hrx-listrow">
                  <div className="main">
                    {renamingId === s.id ? (
                      <form
                        className="d-flex gap-2 align-items-center flex-wrap"
                        onSubmit={(e) => { e.preventDefault(); saveRename(s); }}
                      >
                        <input
                          className="form-control form-control-sm"
                          style={{ maxWidth: 200 }}
                          aria-label={`New name for ${s.name}`}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                        />
                        <button type="submit" className="btn btn-dark btn-sm rounded-pill px-3">Save</button>
                        <button type="button" className="btn btn-link btn-sm p-0 text-secondary text-decoration-none" onClick={() => setRenamingId(null)}>Cancel</button>
                      </form>
                    ) : (
                      <>
                        <p className="t">{s.name}</p>
                        <p className="s">≈ {count} match · {describeFilter(s.filter)}</p>
                      </>
                    )}
                  </div>
                  {renamingId !== s.id && (
                    <div className="d-flex align-items-center gap-3 flex-shrink-0">
                      <button type="button" className="btn btn-link btn-sm p-0 text-secondary text-decoration-none" onClick={() => { setRenamingId(s.id); setRenameValue(s.name); }}>Rename</button>
                      <button type="button" className="btn btn-link btn-sm p-0 text-danger text-decoration-none" onClick={() => remove(s)}>Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="New segment">
        <form onSubmit={save}>
          <label className="hrx-field" htmlFor="adx-seg-name">
            <span>Segment name</span>
            <input id="adx-seg-name" className="form-control" placeholder="e.g. Gmail VIPs" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <p className="adx-muted mb-2">Contacts must match <span className="fw-semibold">every</span> condition:</p>
          {conds.map((c, i) => (
            <div key={i} className="adx-cond">
              <label className="visually-hidden" htmlFor={`adx-cond-f-${i}`}>Condition {i + 1} field</label>
              <select
                id={`adx-cond-f-${i}`}
                className="form-select form-select-sm"
                value={c.field}
                onChange={(e) => changeField(i, e.target.value as SegmentField)}
              >
                {(Object.keys(FIELD_META) as SegmentField[]).map((f) => (
                  <option key={f} value={f}>{FIELD_META[f].label}</option>
                ))}
              </select>
              <label className="visually-hidden" htmlFor={`adx-cond-v-${i}`}>Condition {i + 1} value</label>
              <input
                id={`adx-cond-v-${i}`}
                className="form-control form-control-sm"
                type={c.field === "created_after" ? "date" : "text"}
                placeholder={FIELD_META[c.field].placeholder}
                value={c.value}
                onChange={(e) => setCond(i, { value: e.target.value })}
              />
              <button
                type="button"
                className="adx-x"
                aria-label={`Remove condition ${i + 1}`}
                onClick={() => setConds((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : [blankCond()]))}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none mb-3" onClick={() => setConds((prev) => [...prev, blankCond()])}>
            + Add condition
          </button>

          <div className="adx-preview mb-3" role="status" aria-live="polite">
            ≈ <span className="fw-semibold">{previewCount}</span> contact{previewCount === 1 ? "" : "s"} match
            <span className="adx-muted"> — previewed over the {contacts.length} contact{contacts.length === 1 ? "" : "s"} loaded here, not a server count.</span>
          </div>

          <button type="submit" className="hrx-pill primary" disabled={saving}>{saving ? "Saving…" : "Save segment"}</button>
        </form>
      </Card>
    </div>
  );
}
