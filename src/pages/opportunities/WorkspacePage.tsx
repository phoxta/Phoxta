import { useEffect, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import {
  ActionButton,
  ActionForm,
  Badge,
  ButtonLink,
  Empty,
  Field,
  Loading,
  Notice,
  PageHeading,
  useLoad,
} from "@/components/opportunities/UI";
import {
  aggregate,
  command,
  privateFileUrl,
  testWorkflow,
  uploadWorkspaceFile,
  workspaces,
  type Aggregate,
  type Artifact,
} from "@/lib/opportunities/repository";
import {
  ASSUMPTION_CLASSES,
  BRIEF_SECTIONS,
  EVIDENCE_TYPES,
  EXPERIMENT_TYPES,
  LIFECYCLE_STATES,
  evidenceCounts,
  nextAction,
  safeSourceUrl,
} from "@/lib/opportunities/domain";

import {
  ResearchReview,
  DecisionSnapshot,
} from "@/components/opportunities/ResearchReview";

const TABS = [
  ["", "Overview"],
  ["brief", "Brief"],
  ["evidence", "Evidence"],
  ["assumptions", "Assumptions"],
  ["experiments", "Experiments"],
  ["market", "Market"],
  ["shape", "Shape"],
  ["build", "Build"],
  ["launch", "Launch"],
  ["decisions", "Decisions"],
] as const;
export function OpportunitiesPage() {
  const { user } = useAuth();
  const state = useLoad(workspaces, user?.id ?? "");
  const [filter, setFilter] = useState("");
  return (
    <>
      <PageHeading
        eyebrow="Your workbench"
        title="Questions worth pursuing."
        action={<ButtonLink to="/app/discover">Find an opportunity</ButtonLink>}
      >
        Follow the work from its first signal to the next informed decision.
      </PageHeading>
      <div className="p2-filter">
        <label className="p2-field">
          <span>Lifecycle stage</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All opportunities</option>
            {LIFECYCLE_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {state.loading && <Loading />}
      {state.error && <Notice danger>{state.error}</Notice>}
      <div className="p2-grid">
        {state.data
          ?.filter((w) => !filter || w.lifecycle_state === filter)
          .map((w) => (
            <article className="p2-card" key={w.id}>
              <Badge>{w.lifecycle_state}</Badge>
              <h2>{w.title}</h2>
              <p>{w.thesis || "Thesis still to be written."}</p>
              <p className="p2-muted">
                Updated {new Date(w.updated_at).toLocaleDateString()}
              </p>
              <div className="p2-actions">
                <ButtonLink to={`/app/opportunities/${w.id}`} secondary>
                  Open workspace
                </ButtonLink>
                {w.lifecycle_state !== "archived" && (
                  <ActionButton
                    action={() => command("archive", { workspace_id: w.id })}
                    onSuccess={state.reload}
                  >
                    Archive
                  </ActionButton>
                )}
              </div>
            </article>
          ))}
      </div>
      {state.data?.length === 0 && (
        <Empty
          title="No active opportunities yet."
          action={
            <ButtonLink to="/app/discover">Discover opportunities</ButtonLink>
          }
        >
          Start with an industry, a problem, your own idea, or let Phoxta
          explore for you.
        </Empty>
      )}
    </>
  );
}

export default function WorkspacePage() {
  const { id = "", tab = "" } = useParams();
  const { user } = useAuth();
  const state = useLoad(() => aggregate(id), `${id}:${user?.id}`);
  useEffect(() => {
    if (
      !state.data?.jobs.some((j) =>
        [
          "queued",
          "planning",
          "fetching",
          "extracting",
          "synthesizing",
        ].includes(j.status),
      )
    )
      return;
    const timer = setTimeout(state.reload, 12000);
    return () => clearTimeout(timer);
  }, [state.data, state.reload]);
  if (state.loading) return <Loading />;
  if (state.error)
    return (
      <Notice danger>
        {state.error}
        <div className="p2-actions">
          <button className="p2-button secondary" onClick={state.reload}>
            Try again
          </button>
          <ButtonLink to="/app/opportunities" secondary>
            All opportunities
          </ButtonLink>
        </div>
      </Notice>
    );
  const d = state.data;
  if (!d) return null;
  const base = `/app/opportunities/${id}`;
  const counts = evidenceCounts(d.evidence);
  const action = nextAction({ ...d, hasThesis: Boolean(d.workspace.thesis) });
  async function exportBrief(format: "pdf" | "docx") {
    const result = await command("export", { workspace_id: id });
    const { downloadBrief } = await import("@/lib/opportunities/export");
    await downloadBrief(result, format);
  }
  return (
    <>
      <PageHeading
        eyebrow={`Opportunity workspace · ${d.workspace.lifecycle_state}`}
        title={d.workspace.title}
        action={
          <div className="p2-actions">
            <ActionButton action={() => exportBrief("pdf")}>
              Export PDF
            </ActionButton>
            <ActionButton action={() => exportBrief("docx")}>
              Export DOCX
            </ActionButton>
          </div>
        }
      >
        {d.workspace.thesis ||
          "A hypothesis to investigate. Start by naming the customer and the problem."}
      </PageHeading>
      <nav className="p2-tabs" aria-label="Opportunity workspace">
        {TABS.map(([path, label]) => (
          <NavLink
            to={`${base}${path ? `/${path}` : ""}`}
            key={path}
            end={path === ""}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      {d.role === "viewer" && tab !== "" && (
        <Notice>This workspace is read-only for your role.</Notice>
      )}
      {tab === "" && (
        <>
          <section className="p2-continue">
            <div>
              <span className="p2-eyebrow">One useful next step</span>
              <h2>{action.title}</h2>
              <p>{action.reason}</p>
            </div>
            <ButtonLink
              to={
                action.tab === "school"
                  ? "/app/school"
                  : `${base}/${action.tab}`
              }
            >
              Continue
            </ButtonLink>
          </section>
          <div className="p2-section-title">
            <h2>What you know. What you still need to learn.</h2>
          </div>
          <div className="p2-grid">
            <article className="p2-card">
              <span className="p2-eyebrow">Observed evidence</span>
              <h2>{counts.observed} records</h2>
              <p>
                Customer observations, external sources and experiment evidence.
              </p>
              <Link to={`${base}/evidence`}>Inspect the evidence ↗</Link>
            </article>
            <article className="p2-card">
              <span className="p2-eyebrow">Inferences</span>
              <h2>{counts.inferred} hypotheses</h2>
              <p>
                AI-generated and legacy analysis, kept separate from observed
                evidence.
              </p>
              <Link to={`${base}/brief`}>Read the Brief ↗</Link>
            </article>
            <article className="p2-card">
              <span className="p2-eyebrow">Open questions</span>
              <h2>
                {
                  d.assumptions.filter((a) => !["supported"].includes(a.status))
                    .length
                }{" "}
                assumptions
              </h2>
              <p>What must be true, ordered by importance and uncertainty.</p>
              <Link to={`${base}/assumptions`}>
                Find the riskiest assumption ↗
              </Link>
            </article>
          </div>
          <div className="p2-section-title">
            <h2>Recent decisions</h2>
          </div>
          {d.decisions.length ? (
            <DecisionList data={d} />
          ) : (
            <Empty title="Let the learning lead.">
              Your decisions will appear here with the evidence available when
              you made them.
            </Empty>
          )}
        </>
      )}
      {d.role === "viewer" && tab !== "" && (
        <ReadOnlyWorkspaceTab data={d} tab={tab} />
      )}
      {d.role !== "viewer" && tab === "brief" && (
        <BriefEditor data={d} reload={state.reload} />
      )}
      {d.role !== "viewer" && tab === "evidence" && (
        <EvidencePanel data={d} reload={state.reload} />
      )}
      {d.role !== "viewer" && tab === "assumptions" && (
        <AssumptionsPanel data={d} reload={state.reload} />
      )}
      {d.role !== "viewer" && tab === "experiments" && (
        <ExperimentsPanel data={d} reload={state.reload} />
      )}
      {d.role !== "viewer" && tab === "market" && (
        <MarketPanel data={d} reload={state.reload} />
      )}
      {d.role !== "viewer" && ["shape", "build", "launch"].includes(tab) && (
        <ArtifactsPanel data={d} area={tab} reload={state.reload} />
      )}
      {d.role !== "viewer" && tab === "decisions" && (
        <DecisionsPanel data={d} reload={state.reload} />
      )}
      {!["", ...TABS.map((t) => t[0])].includes(tab) && (
        <Empty
          title="Workspace section not found."
          action={<ButtonLink to={base}>Back to overview</ButtonLink>}
        >
          Choose a section above to continue.
        </Empty>
      )}
    </>
  );
}
type PanelProps = { data: Aggregate; reload: () => void };
function ReadOnlyWorkspaceTab({
  data: d,
  tab,
}: {
  data: Aggregate;
  tab: string;
}) {
  if (tab === "brief")
    return (
      <div className="p2-stack">
        {BRIEF_SECTIONS.map(([key, label]) => {
          const section = d.brief.find((item) => item.section_key === key);
          return (
            <article className="p2-panel" key={key}>
              <div className="p2-card-top">
                <h2>{label}</h2>
                <Badge>{section?.content.kind ?? "unknown"}</Badge>
              </div>
              <p className="p2-readable">
                {section?.content.text || "Not recorded yet."}
              </p>
              <p className="p2-muted">
                {section?.content.evidence_ids?.length ?? 0} evidence references
                · Version {section?.version ?? 0}
              </p>
            </article>
          );
        })}
      </div>
    );
  if (tab === "evidence")
    return (
      <div className="p2-stack">
        {d.evidence.map((item) => (
          <article className="p2-panel" key={item.id}>
            <Badge>{item.evidence_type.replaceAll("_", " ")}</Badge>
            <p className="p2-readable">{item.claim}</p>
            <p className="p2-muted">
              {item.geography || "Geography unspecified"} ·{" "}
              {new Date(item.observed_at).toLocaleDateString()}
            </p>
          </article>
        ))}
      </div>
    );
  if (tab === "assumptions")
    return (
      <div className="p2-stack">
        {d.assumptions.map((item) => (
          <article className="p2-panel" key={item.id}>
            <div className="p2-card-top">
              <Badge>{item.status}</Badge>
              <span>
                Importance {item.importance} · Uncertainty {item.uncertainty}
              </span>
            </div>
            <p className="p2-readable">{item.statement}</p>
          </article>
        ))}
      </div>
    );
  if (tab === "experiments")
    return (
      <div className="p2-stack">
        {d.experiments.map((item) => (
          <article className="p2-panel" key={item.id}>
            <Badge>{item.status}</Badge>
            <h2>{item.hypothesis}</h2>
            <p>{item.method}</p>
            <p className="p2-muted">Success: {item.success_criteria}</p>
            {item.learning && <p>Learning: {item.learning}</p>}
          </article>
        ))}
      </div>
    );
  if (tab === "decisions") return <DecisionList data={d} />;
  const allowed: Record<string, string[]> = {
    market: ["context_map", "alternatives"],
    shape: [
      "value_proposition",
      "offer",
      "positioning",
      "business_model",
      "mvp",
    ],
    build: ["task", "brand", "website", "workflow", "crm", "analytics", "file"],
    launch: ["launch_plan", "campaign", "sales", "onboarding"],
  };
  const artifacts = d.artifacts.filter((item) =>
    (allowed[tab] ?? []).includes(item.artifact_type),
  );
  return (
    <div className="p2-stack">
      {artifacts.map((item) => (
        <article className="p2-panel" key={item.id}>
          <div className="p2-card-top">
            <h2>{item.title}</h2>
            <Badge>
              Version {item.version} · {item.status}
            </Badge>
          </div>
          <div className="p2-detail-list">
            {Object.entries(item.content)
              .filter(([key]) => key !== "path")
              .map(([key, value]) => (
                <div key={key}>
                  <h3>{key.replaceAll("_", " ")}</h3>
                  <p>{String(value)}</p>
                </div>
              ))}
          </div>
        </article>
      ))}
      {!artifacts.length && (
        <Empty title="Nothing has been added here yet.">
          An editor can create the first artifact for this section.
        </Empty>
      )}
    </div>
  );
}
function BriefEditor({ data: d, reload }: PanelProps) {
  return (
    <div className="p2-stack">
      <Notice>
        Label each section as known, inferred or unknown. Known claims require
        linked evidence from this workspace. Saving creates a version history.
      </Notice>
      {BRIEF_SECTIONS.map(([key, label]) => {
        const section = d.brief.find((s) => s.section_key === key);
        return (
          <section className="p2-panel" key={key}>
            <h2>{label}</h2>
            <ActionForm
              action={(form) =>
                command("brief", {
                  workspace_id: d.workspace.id,
                  section_key: key,
                  version: section?.version ?? 0,
                  content: {
                    text: form.text,
                    kind: form.kind,
                    evidence_ids: form.evidence_ids
                      ? form.evidence_ids.split(",")
                      : [],
                  },
                })
              }
              onSuccess={reload}
            >
              <Field
                label={label}
                name="text"
                type="textarea"
                value={section?.content.text ?? ""}
                required
              />
              <Field
                label="What do we know?"
                name="kind"
                value={section?.content.kind ?? "unknown"}
                options={["unknown", "inferred", "known"]}
              />
              <fieldset className="p2-field">
                <legend>Supporting evidence</legend>
                {d.evidence.length ? (
                  d.evidence.map((e) => (
                    <label className="p2-checkbox" key={e.id}>
                      <input
                        type="checkbox"
                        name="evidence_ids"
                        value={e.id}
                        defaultChecked={section?.content.evidence_ids?.includes(
                          e.id,
                        )}
                      />
                      {e.evidence_type.replaceAll("_", " ")}:{" "}
                      {e.claim.slice(0, 120)}
                    </label>
                  ))
                ) : (
                  <p className="p2-muted">
                    Add evidence before marking a claim as known.
                  </p>
                )}
              </fieldset>
            </ActionForm>
          </section>
        );
      })}
    </div>
  );
}
function EvidencePanel({ data: d, reload }: PanelProps) {
  const [typeFilter, setTypeFilter] = useState("");
  return (
    <div className="p2-stack">
      <section className="p2-panel">
        <h2>Add evidence</h2>
        <ActionForm
          submit="Add to evidence log"
          action={(form) =>
            command("evidence", { ...form, workspace_id: d.workspace.id })
          }
          onSuccess={reload}
        >
          <div className="p2-form-grid">
            <Field
              label="Evidence type"
              name="evidence_type"
              options={EVIDENCE_TYPES.filter(
                (t) => t !== "legacy_ai_hypothesis",
              )}
            />
            <Field
              label="Confidence"
              name="confidence_label"
              options={[
                "unknown",
                "hypothesis",
                "emerging",
                "supported",
                "contradicted",
              ]}
            />
          </div>
          <Field
            label="What was observed or claimed?"
            name="claim"
            type="textarea"
            required
          />
          <Field
            label="Your interpretation (separate from the observation)"
            name="interpretation"
            type="textarea"
          />
          <div className="p2-form-grid">
            <Field
              label="Source title or interview reference"
              name="source_title"
            />
            <Field
              label="Source URL (required for a web reference)"
              name="url"
              type="url"
            />
            <Field label="Publisher" name="publisher" />
            <Field
              label="Country or market"
              name="geography"
              value={d.workspace.geography}
            />
            <Field
              label="Publication date, if known"
              name="published_at"
              type="date"
            />
            <Field label="Observation date" name="observed_at" type="date" />
          </div>
        </ActionForm>
      </section>
      <div className="p2-section-title">
        <h2>Your evidence log</h2>
        <select
          className="p2-search"
          style={{ maxWidth: 230 }}
          aria-label="Filter evidence type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All evidence types</option>
          {EVIDENCE_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      {d.evidence
        .filter((e) => !typeFilter || e.evidence_type === typeFilter)
        .map((e) => {
          const source = d.sources.find((s) => s.id === e.source_id);
          const links = d.links.filter((l) => l.evidence_id === e.id);
          return (
            <article className="p2-panel" id={`evidence-${e.id}`} key={e.id}>
              <div className="p2-card-top">
                <Badge tone={e.confidence_label}>
                  {e.evidence_type.replaceAll("_", " ")}
                </Badge>
                <span className="p2-muted">
                  {e.geography || "Geography unspecified"} · Observed{" "}
                  {new Date(e.observed_at).toLocaleDateString()}
                </span>
              </div>
              <p className="p2-readable" style={{ marginTop: 15 }}>
                {e.claim}
              </p>
              {e.interpretation && (
                <p className="p2-muted" style={{ marginTop: 10 }}>
                  Interpretation: {e.interpretation}
                </p>
              )}
              {source && (
                <details>
                  <summary>Source and provenance</summary>
                  <p>
                    {source.canonical_url &&
                    safeSourceUrl(source.canonical_url) ? (
                      <a
                        href={safeSourceUrl(source.canonical_url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.title} ↗
                      </a>
                    ) : (
                      source.title
                    )}
                  </p>
                  <p className="p2-muted">
                    Publisher: {source.publisher || "Not recorded"} · Published:{" "}
                    {source.published_at
                      ? new Date(source.published_at).toLocaleDateString()
                      : "Unknown"}{" "}
                    · Retrieved:{" "}
                    {new Date(source.retrieved_at).toLocaleDateString()}
                  </p>
                </details>
              )}
              <details>
                <summary>Link to an assumption ({links.length})</summary>
                {links.map((l) => (
                  <p
                    className="p2-muted"
                    key={`${l.assumption_id}:${l.relation}`}
                  >
                    {l.relation}:{" "}
                    {
                      d.assumptions.find((a) => a.id === l.assumption_id)
                        ?.statement
                    }
                  </p>
                ))}
                {d.assumptions.length > 0 && (
                  <ActionForm
                    submit="Link evidence"
                    action={(form) =>
                      command("link_evidence", {
                        ...form,
                        workspace_id: d.workspace.id,
                        evidence_id: e.id,
                      })
                    }
                    onSuccess={reload}
                  >
                    <Field
                      label="Assumption"
                      name="assumption_id"
                      options={d.assumptions.map((a) => ({
                        value: a.id,
                        label: a.statement,
                      }))}
                    />
                    <Field
                      label="Relationship"
                      name="relation"
                      options={["support", "contradict", "context"]}
                    />
                  </ActionForm>
                )}
              </details>
            </article>
          );
        })}
      {!d.evidence.length && (
        <Empty title="Evidence starts with an observation.">
          Add a customer conversation, a source, an experiment result or a
          clearly labelled hypothesis.
        </Empty>
      )}
      {d.sources
        .filter(
          (source) =>
            !d.evidence.some((evidence) => evidence.source_id === source.id),
        )
        .map((source) => (
          <article className="p2-panel" key={source.id}>
            <Badge>Source to investigate</Badge>
            <h3>{source.title}</h3>
            <p className="p2-muted">
              {source.publisher} · {source.geography || "Geography unspecified"}{" "}
              · Published{" "}
              {source.published_at
                ? new Date(source.published_at).toLocaleDateString()
                : "unknown"}
            </p>
            {source.canonical_url && safeSourceUrl(source.canonical_url) && (
              <a
                href={safeSourceUrl(source.canonical_url)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read source ↗
              </a>
            )}
            <p className="p2-muted">
              A source reference alone is not evidence for a specific claim.
              Read it and record the relevant observation above.
            </p>
          </article>
        ))}
    </div>
  );
}
function AssumptionsPanel({ data: d, reload }: PanelProps) {
  return (
    <div className="p2-stack">
      <section className="p2-panel">
        <h2>What must be true?</h2>
        <ActionForm
          submit="Add assumption"
          action={(form) =>
            command("assumption", { ...form, workspace_id: d.workspace.id })
          }
          onSuccess={reload}
        >
          <Field label="Assumption" name="statement" type="textarea" required />
          <div className="p2-form-grid">
            <Field label="Class" name="class" options={ASSUMPTION_CLASSES} />
            <Field
              label="Importance (1–5)"
              name="importance"
              type="number"
              value={3}
              min={1}
              max={5}
              required
            />
            <Field
              label="Uncertainty (1–5)"
              name="uncertainty"
              type="number"
              value={5}
              min={1}
              max={5}
              required
            />
          </div>
        </ActionForm>
      </section>
      <div className="p2-grid two">
        {[...d.assumptions]
          .sort(
            (a, b) =>
              b.importance * b.uncertainty - a.importance * a.uncertainty,
          )
          .map((a) => {
            const links = d.links.filter((l) => l.assumption_id === a.id);
            const conflicting =
              links.some((l) => l.relation === "support") &&
              links.some((l) => l.relation === "contradict");
            return (
              <article className="p2-card" key={a.id}>
                <div className="p2-card-top">
                  <span className="p2-eyebrow">{a.class}</span>
                  <Badge tone={a.status}>{a.status}</Badge>
                </div>
                <h3>{a.statement}</h3>
                <p>
                  Importance {a.importance}/5 · Uncertainty {a.uncertainty}/5 ·{" "}
                  {links.length} evidence links
                </p>
                {conflicting && (
                  <Notice>
                    Evidence supports opposing interpretations. Review both
                    before deciding.
                  </Notice>
                )}
                <details>
                  <summary>Edit assumption</summary>
                  <ActionForm
                    action={(form) =>
                      command("assumption", {
                        ...form,
                        workspace_id: d.workspace.id,
                        id: a.id,
                      })
                    }
                    onSuccess={reload}
                  >
                    <Field
                      label="Statement"
                      name="statement"
                      type="textarea"
                      value={a.statement}
                      required
                    />
                    <Field
                      label="Importance"
                      name="importance"
                      type="number"
                      min={1}
                      max={5}
                      value={a.importance}
                    />
                    <Field
                      label="Uncertainty"
                      name="uncertainty"
                      type="number"
                      min={1}
                      max={5}
                      value={a.uncertainty}
                    />
                    <Field
                      label="Status"
                      name="status"
                      value={a.status}
                      options={[
                        "unknown",
                        "testing",
                        "supported",
                        "contradicted",
                        "revised",
                      ]}
                    />
                  </ActionForm>
                </details>
                <ButtonLink
                  to={`/app/opportunities/${d.workspace.id}/experiments?assumption=${a.id}`}
                  secondary
                >
                  Design a test
                </ButtonLink>
              </article>
            );
          })}
      </div>
    </div>
  );
}
function ExperimentsPanel({ data: d, reload }: PanelProps) {
  const selected =
    new URLSearchParams(window.location.search).get("assumption") ?? "";
  return (
    <div className="p2-stack">
      <section className="p2-panel">
        <h2>Design the cheapest credible test</h2>
        <ActionForm
          submit="Create experiment"
          action={(form) =>
            command("experiment", { ...form, workspace_id: d.workspace.id })
          }
          onSuccess={reload}
        >
          <div className="p2-form-grid">
            <Field label="Test type" name="type" options={EXPERIMENT_TYPES} />
            <Field
              label="Linked assumption"
              name="assumption_id"
              value={selected}
              options={[
                { value: "", label: "Choose later" },
                ...d.assumptions.map((a) => ({
                  value: a.id,
                  label: a.statement,
                })),
              ]}
            />
          </div>
          <Field
            label="Hypothesis"
            name="hypothesis"
            type="textarea"
            required
            value={
              d.assumptions.find((a) => a.id === selected)?.statement ?? ""
            }
          />
          <Field
            label="Method — who, what and how"
            name="method"
            type="textarea"
            required
          />
          <Field
            label="Success criteria — decide before seeing results"
            name="success_criteria"
            type="textarea"
            required
          />
          <Field label="Due date (optional)" name="ends_at" type="date" />
        </ActionForm>
      </section>
      {d.experiments.map((e) => {
        const transitions: Record<string, string[]> = {
          draft: ["ready", "cancelled"],
          ready: ["running", "cancelled"],
          running: ["completed", "inconclusive", "cancelled"],
        };
        return (
          <article className="p2-panel" key={e.id}>
            <div className="p2-card-top">
              <Badge>{e.status}</Badge>
              <span className="p2-muted">
                {e.type.replaceAll("_", " ")}
                {e.ends_at &&
                  ` · Due ${new Date(e.ends_at).toLocaleDateString()}`}
              </span>
            </div>
            <h2 style={{ marginTop: 16 }}>{e.hypothesis}</h2>
            <p className="p2-readable">{e.method}</p>
            <div className="p2-uncertainty" style={{ margin: "15px 0" }}>
              <strong>Success criteria</strong>
              {e.success_criteria}
            </div>
            {e.learning && (
              <p className="p2-readable">Learning: {e.learning}</p>
            )}
            {transitions[e.status] && (
              <ActionForm
                submit="Update experiment"
                action={(form) =>
                  command("experiment", {
                    ...form,
                    workspace_id: d.workspace.id,
                    id: e.id,
                  })
                }
                onSuccess={reload}
              >
                <Field
                  label="Next state"
                  name="status"
                  options={transitions[e.status]}
                />
                {e.status === "running" && (
                  <Field
                    label="What happened, what changed, and what will you do next?"
                    name="learning"
                    type="textarea"
                    required
                  />
                )}
              </ActionForm>
            )}
            {d.observations
              .filter((o) => o.experiment_id === e.id)
              .map((o) => (
                <div className="p2-uncertainty" key={o.id}>
                  <strong>
                    Observation · {new Date(o.created_at).toLocaleDateString()}
                  </strong>
                  <p className="p2-readable">{o.observation}</p>
                  {o.evidence_id && (
                    <Link
                      to={`/app/opportunities/${d.workspace.id}/evidence#evidence-${o.evidence_id}`}
                    >
                      Inspect linked evidence ↗
                    </Link>
                  )}
                </div>
              ))}
            <details>
              <summary>Add an observation</summary>
              <ActionForm
                submit="Record observation"
                action={(form) =>
                  command("observation", {
                    ...form,
                    workspace_id: d.workspace.id,
                    experiment_id: e.id,
                  })
                }
                onSuccess={reload}
              >
                <Field
                  label="Observation"
                  name="observation"
                  type="textarea"
                  required
                />
                <Field
                  label="Linked evidence (optional)"
                  name="evidence_id"
                  options={[
                    { value: "", label: "None" },
                    ...d.evidence.map((v) => ({
                      value: v.id,
                      label: v.claim.slice(0, 100),
                    })),
                  ]}
                />
              </ActionForm>
            </details>
          </article>
        );
      })}
    </div>
  );
}
function MarketPanel({ data: d, reload }: PanelProps) {
  return (
    <div className="p2-stack">
      <Notice>
        Research runs in the background. Existing notes and workspaces remain
        available if a provider is unavailable. Generated research needs source
        and hypothesis review.
      </Notice>
      <section className="p2-panel">
        <h2>Investigate a question</h2>
        <ActionForm
          submit="Queue research"
          action={(form) =>
            command("research", {
              ...form,
              workspace_id: d.workspace.id,
              idempotency_key: crypto.randomUUID(),
            })
          }
          onSuccess={reload}
        >
          <Field
            label="What do you need to learn?"
            name="question"
            type="textarea"
            required
            placeholder="Which customers experience this problem, and what do they use today?"
          />
          <Field
            label="Research focus"
            name="job_type"
            options={[
              "opportunity",
              "industry",
              "problem",
              "trend",
              "market",
              "refresh",
            ]}
          />
        </ActionForm>
      </section>
      {d.jobs.map((j) => (
        <article className="p2-card" key={j.id}>
          <div className="p2-card-top">
            <h3>{j.job_type} research</h3>
            <Badge>{j.status.replaceAll("_", " ")}</Badge>
          </div>
          <p>
            Requested {new Date(j.created_at).toLocaleString()} · Attempt{" "}
            {j.attempts} of {j.max_attempts}
          </p>
          {j.error?.message && <Notice danger>{j.error.message}</Notice>}
          <div className="p2-actions">
            {j.status === "failed" && j.attempts < j.max_attempts && (
              <ActionButton
                action={() =>
                  command("retry_research", {
                    workspace_id: d.workspace.id,
                    id: j.id,
                  })
                }
                onSuccess={reload}
              >
                Retry
              </ActionButton>
            )}
            {[
              "queued",
              "planning",
              "fetching",
              "extracting",
              "synthesizing",
            ].includes(j.status) && (
              <ActionButton
                action={() =>
                  command("cancel_research", {
                    workspace_id: d.workspace.id,
                    id: j.id,
                  })
                }
                onSuccess={reload}
              >
                Cancel
              </ActionButton>
            )}
          </div>
        </article>
      ))}
      {d.research.map((r) => (
        <article className="p2-panel" key={r.id}>
          <h2>{r.artifact_type.replaceAll("_", " ")}</h2>
          <ResearchReview
            id={r.id}
            content={r.content}
            data={d}
            reload={reload}
          />
        </article>
      ))}
      <ArtifactsPanel data={d} area="market" reload={reload} />
    </div>
  );
}
const ARTIFACTS: Record<
  string,
  { type: string; label: string; fields: string[] }[]
> = {
  market: [
    {
      type: "icp",
      label: "Ideal customer profile",
      fields: [
        "Primary segment",
        "Buyer",
        "User",
        "Jobs to be done",
        "Buying triggers",
        "Evidence and unknowns",
      ],
    },
    {
      type: "context_map",
      label: "Customer context",
      fields: [
        "When and where",
        "Frequency",
        "Consequences",
        "Current workaround",
        "Evidence",
      ],
    },
    {
      type: "alternatives",
      label: "Market and alternatives",
      fields: [
        "Direct alternatives",
        "Indirect alternatives",
        "Status quo",
        "Value chain",
        "Sources and dates",
        "Unknowns",
      ],
    },
  ],
  shape: [
    {
      type: "value_proposition",
      label: "Value proposition",
      fields: [
        "Customer",
        "Desired outcome",
        "Differentiated promise",
        "Evidence",
        "What must be tested",
      ],
    },
    {
      type: "offer",
      label: "Offer",
      fields: [
        "Core outcome",
        "Deliverables",
        "Onboarding",
        "Support",
        "Constraints",
      ],
    },
    {
      type: "positioning",
      label: "Positioning",
      fields: [
        "Category",
        "Alternatives",
        "Differentiation",
        "Reasons to believe",
      ],
    },
    {
      type: "business_model",
      label: "Business model",
      fields: [
        "Payer",
        "Pricing hypothesis",
        "Revenue frequency",
        "Cost drivers",
        "Delivery model",
        "Unit economics assumptions",
      ],
    },
    {
      type: "mvp",
      label: "MVP scope",
      fields: [
        "Value to test",
        "Must exist",
        "Can remain manual",
        "Excluded for now",
        "Success criteria",
      ],
    },
  ],
  build: [
    {
      type: "task",
      label: "MVP backlog / task",
      fields: [
        "Requirement",
        "Acceptance criteria",
        "Dependencies",
        "Owner",
        "Milestone",
      ],
    },
    {
      type: "brand",
      label: "Brand foundation",
      fields: ["Name", "Audience", "Promise", "Voice", "Visual direction"],
    },
    {
      type: "website",
      label: "Website plan",
      fields: [
        "Page structure",
        "Core copy",
        "Primary action",
        "Evidence",
        "Accessibility",
      ],
    },
    {
      type: "workflow",
      label: "Operating workflow",
      fields: [
        "Trigger",
        "Inputs",
        "Steps",
        "Owner",
        "Exceptions",
        "Human approval",
      ],
    },
    {
      type: "crm",
      label: "CRM and support",
      fields: [
        "Pipeline stages",
        "Customer fields",
        "Support workflow",
        "Consent and retention",
      ],
    },
    {
      type: "analytics",
      label: "Analytics and feedback",
      fields: [
        "Event",
        "Decision informed",
        "Collection method",
        "Owner",
        "Privacy",
      ],
    },
  ],
  launch: [
    {
      type: "launch_plan",
      label: "Launch plan",
      fields: [
        "Objective",
        "Target cohort",
        "Channel hypotheses",
        "Offer",
        "Activation checklist",
        "Acquisition metric",
        "Conversion metric",
        "Retention metric",
        "Revenue metric",
        "Learning review",
      ],
    },
    {
      type: "campaign",
      label: "Campaign plan",
      fields: [
        "Audience",
        "Channel",
        "Message",
        "Assets",
        "Budget hypothesis",
        "Measurement",
        "Approval",
      ],
    },
    {
      type: "sales",
      label: "Sales motion",
      fields: [
        "Customer",
        "Reach",
        "Conversation guide",
        "Objections",
        "Follow-up consent",
      ],
    },
    {
      type: "onboarding",
      label: "Customer onboarding",
      fields: [
        "First value",
        "Steps",
        "Activation signal",
        "Feedback",
        "Support",
      ],
    },
  ],
};
function ArtifactsPanel({
  data: d,
  area,
  reload,
}: PanelProps & { area: string }) {
  const choices = ARTIFACTS[area];
  const [type, setType] = useState(choices[0].type);
  const [edit, setEdit] = useState<Artifact | null>(null);
  const definition = choices.find((c) => c.type === type) ?? choices[0];
  useEffect(() => {
    setType(ARTIFACTS[area][0].type);
    setEdit(null);
  }, [area]);
  return (
    <div className="p2-stack">
      {area !== "market" && (
        <Notice>
          {area === "launch"
            ? "Launch actions are planning-only. Publishing, spending and contacting customers require a separate approved action."
            : "Business assumptions stay visible as you shape and build. Your plan determines which artifacts you can save."}
        </Notice>
      )}
      <section className="p2-panel">
        <h2>{edit ? "Revise an artifact" : "Create an artifact"}</h2>
        <label className="p2-field" style={{ marginBottom: 20 }}>
          <span>Artifact</span>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setEdit(null);
            }}
          >
            {choices.map((c) => (
              <option key={c.type} value={c.type}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <ActionForm
          key={`${type}:${edit?.id ?? "new"}`}
          submit={edit ? "Save a new version" : "Save artifact"}
          action={(form) => {
            const { title, status, ...content } = form;
            return command("artifact", {
              workspace_id: d.workspace.id,
              id: edit?.id,
              version: edit?.version,
              artifact_type: type,
              title,
              status,
              content,
            });
          }}
          onSuccess={() => {
            setEdit(null);
            reload();
          }}
        >
          <Field
            label="Title"
            name="title"
            value={edit?.title ?? definition.label}
            required
          />
          {definition.fields.map((field) => (
            <Field
              key={field}
              label={field}
              name={field}
              type="textarea"
              value={String(edit?.content[field] ?? "")}
              required
            />
          ))}
          <Field
            label="Status"
            name="status"
            value={edit?.status ?? "draft"}
            options={["draft", "ready", "in_progress", "completed"]}
          />
        </ActionForm>
      </section>
      {d.artifacts
        .filter((a) => choices.some((c) => c.type === a.artifact_type))
        .map((a) => (
          <article className="p2-panel" key={a.id}>
            <div className="p2-card-top">
              <h2>{a.title}</h2>
              <Badge>
                Version {a.version} · {a.status.replaceAll("_", " ")}
              </Badge>
            </div>
            <div className="p2-detail-list">
              {Object.entries(a.content).map(([key, value]) => (
                <div key={key}>
                  <h3>{key}</h3>
                  <p className="p2-readable">{String(value)}</p>
                </div>
              ))}
            </div>
            <button
              className="p2-button secondary"
              style={{ marginTop: 20 }}
              onClick={() => {
                setType(a.artifact_type);
                setEdit(a);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Revise artifact
            </button>
          </article>
        ))}
      {area === "build" && (
        <>
          <WorkspaceFiles data={d} reload={reload} />
          <section className="p2-panel">
            <h2>AI workflow designer</h2>
            <Notice>
              Design and test an approval policy before any external action.
              This version saves drafts and cannot activate production
              automations.
            </Notice>
            <ActionForm
              submit="Save workflow draft"
              action={(form) =>
                command("workflow", {
                  workspace_id: d.workspace.id,
                  name: form.name,
                  trigger: { description: form.trigger },
                  graph: [
                    {
                      inputs: form.inputs,
                      steps: form.steps,
                      human_approval: form.approval,
                      outputs: form.outputs,
                    },
                  ],
                })
              }
              onSuccess={reload}
            >
              <Field label="Workflow name" name="name" required />
              <Field label="Trigger" name="trigger" required />
              <Field
                label="Inputs and allowed data"
                name="inputs"
                type="textarea"
                required
              />
              <Field
                label="Model and tool steps"
                name="steps"
                type="textarea"
                required
              />
              <Field
                label="Human approval points"
                name="approval"
                type="textarea"
                required
              />
              <Field
                label="Expected outputs and logs"
                name="outputs"
                type="textarea"
                required
              />
            </ActionForm>
            {d.workflows.map((w) => (
              <details key={w.id}>
                <summary>
                  {w.name} · {w.status}
                </summary>
                <pre>{JSON.stringify(w.graph, null, 2)}</pre>
                <ActionForm
                  submit="Run planning-only test"
                  action={(form) =>
                    testWorkflow(w.id, { scenario: form.scenario })
                  }
                  onSuccess={reload}
                >
                  <Field
                    label="Test scenario"
                    name="scenario"
                    type="textarea"
                    required
                  />
                </ActionForm>
              </details>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
function WorkspaceFiles({ data: d, reload }: PanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const files = d.artifacts.filter(
    (artifact) => artifact.artifact_type === "file",
  );
  return (
    <section className="p2-panel">
      <h2>Private workspace files</h2>
      <p className="p2-muted">
        Files are kept in this workspace and opened with a short-lived private
        link.
      </p>
      <label className="p2-field">
        <span>Image, PDF, text, CSV or DOCX · up to 25 MB</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <div className="p2-actions">
        <button
          className="p2-button secondary"
          disabled={!file || busy}
          onClick={async () => {
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              await uploadWorkspaceFile(d.workspace, file);
              setFile(null);
              reload();
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : "Upload failed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Uploading…" : "Upload private file"}
        </button>
      </div>
      {error && <Notice danger>{error}</Notice>}
      {files.map((artifact) => (
        <article className="p2-card-top" key={artifact.id}>
          <div>
            <strong>{artifact.title}</strong>
            <p className="p2-muted">
              {String(artifact.content.content_type ?? "File")} ·{" "}
              {Math.ceil(Number(artifact.content.size ?? 0) / 1024)} KB
            </p>
          </div>
          <ActionButton
            action={async () => {
              const url = await privateFileUrl(String(artifact.content.path));
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            Open for 5 minutes
          </ActionButton>
        </article>
      ))}
    </section>
  );
}
function DecisionList({ data: d }: { data: Aggregate }) {
  return (
    <div className="p2-stack">
      {[...d.decisions]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((r) => (
          <article className="p2-panel" key={r.id}>
            <div className="p2-card-top">
              <Badge>{r.decision}</Badge>
              <span className="p2-muted">
                {new Date(r.created_at).toLocaleString()} · Finalised
              </span>
            </div>
            <p className="p2-readable" style={{ marginTop: 17 }}>
              {r.rationale}
            </p>
            <details>
              <summary>Evidence at the time of this decision</summary>
              <DecisionSnapshot snapshot={r.snapshot} />
            </details>
          </article>
        ))}
    </div>
  );
}
function DecisionsPanel({ data: d, reload }: PanelProps) {
  const unresolved = d.assumptions.filter((a) => a.status !== "supported");
  return (
    <div className="p2-stack">
      <section className="p2-panel">
        <h2>Review what you’ve learned</h2>
        <p className="p2-muted" style={{ marginBottom: 20 }}>
          {unresolved.length} assumptions remain unresolved. Finalising
          preserves the evidence, Brief and experiments as they are now.
        </p>
        {unresolved.map((a) => (
          <p key={a.id} style={{ marginBottom: 10 }}>
            <Badge tone={a.status}>{a.status}</Badge> {a.statement}
          </p>
        ))}
        <ActionForm
          submit="Finalise decision review"
          action={(form) =>
            command("decision", {
              ...form,
              confirmed: form.confirmed === "on",
              workspace_id: d.workspace.id,
            })
          }
          onSuccess={reload}
        >
          <Field
            label="Your decision"
            name="decision"
            options={["proceed", "revise", "pause", "stop"]}
          />
          <Field
            label="Next stage if proceeding"
            name="next_state"
            value="investigating"
            options={LIFECYCLE_STATES.filter(
              (s) =>
                !["discovered", "paused", "rejected", "archived"].includes(s),
            )}
          />
          <Field
            label="What changed, what remains unknown, and why this decision?"
            name="rationale"
            type="textarea"
            required
          />
          <label className="p2-checkbox">
            <input type="checkbox" name="confirmed" required />I have reviewed
            the evidence and want to preserve this decision. Later learning will
            create a new review.
          </label>
        </ActionForm>
      </section>
      <DecisionList data={d} />
    </div>
  );
}
