import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Chip, Empty } from "@/components/dash/Ui";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  createFlow,
  deleteFlow,
  emptyGraph,
  flowStats,
  listFlows,
  updateFlow,
  type EngageFlow,
  type FlowKind,
  type FlowStats,
} from "@/lib/db/ops/engage";
import { templatesFor, type EngageTemplate } from "@/lib/engageTemplates";
import { NODE_META, isTrigger, validateGraph } from "@/components/engage/nodeMeta";
import { toast, toastError, confirmDanger, reportMutation } from "@/lib/ops/feedback";
import { useEngageOrg } from "./useEngageOrg";

// The shared Flows / Journeys list: a card grid of an org's automations with
// live/draft state, run counters from engage_runs, and a recipe gallery that
// creates a ready-made graph and drops you straight into the editor. FlowsPage
// and JourneysPage are thin wrappers over this with kind fixed.

const COPY: Record<FlowKind, { title: string; note: string; newLabel: string; noun: string; galleryTitle: string }> = {
  flow: {
    title: "Flows",
    note: "Chat automations that answer in seconds — with your AI agent as a node on the canvas.",
    newLabel: "New flow",
    noun: "flow",
    galleryTitle: "Start with a recipe",
  },
  journey: {
    title: "Journeys",
    note: "Lifecycle automations on events and time — reminders, review asks, win-backs.",
    newLabel: "New journey",
    noun: "journey",
    galleryTitle: "Recipes for your business",
  },
};

const CSS = `
.fbx-head { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.fbx-head h2 { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 2px; }
.fbx-head p { font-size: 13.5px; color: var(--hrx-muted); margin: 0; max-width: 60ch; }
.fbx-head .spacer { flex: 1; }
.fbx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.fbx-card { background: var(--hrx-card); border: 1px solid var(--hrx-border-soft); border-radius: 16px;
  padding: 16px; display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.fbx-card-top { display: flex; align-items: center; gap: 8px; }
.fbx-name { font-size: 15px; font-weight: 600; margin: 0; flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fbx-meta { font-size: 12.5px; color: var(--hrx-muted); line-height: 1.45; }
.fbx-runs { font-size: 12.5px; color: var(--hrx-muted); }
.fbx-runs strong { color: var(--hrx-ink); font-weight: 600; }
.fbx-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: auto; padding-top: 4px; }
.fbx-linkbtn { border: 0; background: transparent; padding: 0 2px; font-size: 13px; font-weight: 500;
  color: var(--hrx-muted); cursor: pointer; }
.fbx-linkbtn:hover { color: var(--hrx-ink); text-decoration: underline; }
.fbx-linkbtn.danger:hover { color: #dc2626; }
.fbx-tpl { background: var(--hrx-card); border: 1px solid var(--hrx-border-soft); border-radius: 16px;
  padding: 16px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.fbx-tpl h4 { font-size: 14.5px; font-weight: 600; margin: 0; }
.fbx-tpl .chain { font-size: 11.5px; font-weight: 500; color: var(--hrx-blue); }
.fbx-tpl p { font-size: 12.5px; color: var(--hrx-muted); line-height: 1.5; margin: 0; flex: 1; }
.fbx-tpl.scratch { border-style: dashed; justify-content: center; text-align: center; }
.fbx-tpl.scratch p { flex: 0; }
`;

function triggerSummary(f: EngageFlow): string {
  const t = f.graph.nodes.find((n) => isTrigger(n.type));
  if (!t) return "No trigger yet";
  const meta = NODE_META[t.type];
  const s = meta.summary(t.data);
  return s === meta.label ? meta.label : `${meta.label} — ${s}`;
}

export default function FlowsBoard({ kind }: { kind: FlowKind }) {
  const { orgId, org } = useEngageOrg();
  const navigate = useNavigate();
  const copy = COPY[kind];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const { data, loading, error, reload } = useCachedData<{ flows: EngageFlow[]; stats: FlowStats }>(
    `engage:${kind}s:${orgId || "none"}`,
    async () => {
      if (!orgId) return { flows: [], stats: {} };
      const [f, s] = await Promise.all([listFlows(orgId, kind), flowStats(orgId)]);
      if (f.error) throw new Error(f.error);
      return { flows: f.data, stats: s.data };
    },
    { ttl: DASHBOARD_TTL },
  );

  const flows = useMemo(() => data?.flows ?? [], [data]);
  const stats = data?.stats ?? {};
  const templates = useMemo(() => templatesFor(kind, org?.vertical), [kind, org?.vertical]);
  const showGallery = galleryOpen || (!loading && flows.length === 0);

  async function create(name: string, graph: EngageFlow["graph"], goToEditor = true) {
    if (!orgId) return;
    setBusyId("create");
    const { data: row, error: createError } = await createFlow(orgId, { name, kind, graph });
    setBusyId(null);
    if (createError || !row) {
      toastError(createError ?? `The ${copy.noun} couldn't be created — try again.`);
      return;
    }
    toast(`"${row.name}" created`);
    reload();
    if (goToEditor) navigate(row.id);
  }

  async function setLive(f: EngageFlow) {
    const errors = validateGraph(f.graph, kind);
    if (errors.length > 0) {
      toastError(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} more issue${errors.length === 2 ? "" : "s"} — open the editor)` : ""));
      return;
    }
    setBusyId(f.id);
    const ok = await reportMutation(updateFlow(f.id, { status: "live" }), `"${f.name}" is live`);
    setBusyId(null);
    if (ok) reload();
  }

  async function pause(f: EngageFlow) {
    setBusyId(f.id);
    const ok = await reportMutation(updateFlow(f.id, { status: "draft" }), `"${f.name}" paused — back to draft`);
    setBusyId(null);
    if (ok) reload();
  }

  async function duplicate(f: EngageFlow) {
    await create(`${f.name} (copy)`, f.graph, false);
  }

  async function remove(f: EngageFlow) {
    if (!confirmDanger(`Delete "${f.name}"? Any runs in progress will stop. This can't be undone.`)) return;
    setBusyId(f.id);
    const ok = await reportMutation(deleteFlow(f.id), `"${f.name}" deleted`);
    setBusyId(null);
    if (ok) reload();
  }

  if (loading && !data) {
    return (
      <Card>
        <div className="text-center py-4" style={{ color: "#6b7280" }} role="status">Loading…</div>
      </Card>
    );
  }
  if (error && !data) {
    return (
      <Card>
        <div className="text-center py-4" role="alert">
          <div className="fw-semibold mb-2" style={{ color: "#dc2626" }}>Couldn't load your {copy.noun}s</div>
          <div className="mb-3" style={{ color: "#6b7280" }}>{error}</div>
          <button type="button" className="hrx-pill dark ops-tap" onClick={() => reload()}>Retry</button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <style>{CSS}</style>
      <div className="fbx-head">
        <div style={{ minWidth: 0 }}>
          <h2>{copy.title}</h2>
          <p>{copy.note}</p>
        </div>
        <div className="spacer" />
        <button
          type="button"
          className="hrx-pill dark ops-tap"
          aria-expanded={showGallery}
          onClick={() => setGalleryOpen((v) => !v)}
        >
          {copy.newLabel}
        </button>
      </div>

      {showGallery && (
        <Card
          title={copy.galleryTitle}
          className="mb-4"
          right={flows.length > 0 ? (
            <button type="button" className="fbx-linkbtn" onClick={() => setGalleryOpen(false)}>Close</button>
          ) : undefined}
        >
          <div className="fbx-grid">
            {templates.map((t: EngageTemplate) => (
              <div key={t.id} className="fbx-tpl">
                <h4>{t.name}</h4>
                <span className="chain">{t.chain}</span>
                <p>{t.description}</p>
                <button
                  type="button"
                  className="hrx-pill dark ops-tap"
                  style={{ alignSelf: "flex-start" }}
                  disabled={busyId === "create"}
                  onClick={() => create(t.name, t.graph)}
                >
                  Use this recipe
                </button>
              </div>
            ))}
            <div className="fbx-tpl scratch">
              <h4>Start from scratch</h4>
              <p>A blank canvas — add a trigger and build your own.</p>
              <button
                type="button"
                className="hrx-pill ops-tap"
                style={{ alignSelf: "center" }}
                disabled={busyId === "create"}
                onClick={() => create(kind === "flow" ? "Untitled flow" : "Untitled journey", emptyGraph())}
              >
                Open a blank canvas
              </button>
            </div>
          </div>
        </Card>
      )}

      {flows.length === 0 ? (
        !showGallery && (
          <Card>
            <Empty title={`No ${copy.noun}s yet`}>Pick a recipe above or start from scratch — a working automation is two clicks away.</Empty>
          </Card>
        )
      ) : (
        <div className="fbx-grid">
          {flows.map((f) => {
            const s = stats[f.id];
            const live = f.status === "live";
            return (
              <div key={f.id} className="fbx-card">
                <div className="fbx-card-top">
                  <h3 className="fbx-name">{f.name}</h3>
                  <Chip tone={live ? "ok" : "warn"}>{live ? "Live" : "Draft"}</Chip>
                </div>
                <div className="fbx-meta">
                  {f.graph.nodes.length} step{f.graph.nodes.length === 1 ? "" : "s"} · {triggerSummary(f)}
                </div>
                <div className="fbx-runs">
                  {s && s.entered > 0
                    ? <><strong>{s.entered}</strong> entered · <strong>{s.completed}</strong> finished</>
                    : "No runs yet"}
                </div>
                <div className="fbx-actions">
                  <button type="button" className="hrx-pill dark ops-tap" onClick={() => navigate(f.id)}>Edit</button>
                  {live ? (
                    <button type="button" className="hrx-pill ops-tap" disabled={busyId === f.id} onClick={() => pause(f)}>Pause</button>
                  ) : (
                    <button type="button" className="hrx-pill ops-tap" disabled={busyId === f.id} onClick={() => setLive(f)}>Set live</button>
                  )}
                  <button type="button" className="fbx-linkbtn ops-tap" disabled={busyId === f.id} onClick={() => duplicate(f)}>Duplicate</button>
                  <button type="button" className="fbx-linkbtn danger ops-tap" disabled={busyId === f.id} onClick={() => remove(f)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
