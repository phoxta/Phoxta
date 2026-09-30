import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import {
  ActionButton,
  ActionForm,
  Badge,
  Field,
  Loading,
  Notice,
  PageHeading,
  useLoad,
} from "@/components/opportunities/UI";

type RecordRow = Record<string, unknown> & {
  id: string;
  title: string;
  status: string;
  created_by?: string;
  last_edited_by?: string;
};
type SourceRow = {
  title: string;
  url: string;
  publisher: string;
  published_at: string;
  retrieved_at: string;
  geography: string;
};
type Overview = {
  opportunities: RecordRow[];
  businesses: RecordRow[];
  jobs: {
    id: string;
    status: string;
    attempts: number;
    cost_usd: number;
    error?: { message?: string };
  }[];
  audit: {
    id: string;
    action: string;
    actor_user_id: string;
    created_at: string;
  }[];
  taxonomy: { kind: string; key: string; label: string; active: boolean }[];
  privacy: {
    id: string;
    user_id: string | null;
    request_type: string;
    workspace_id: string | null;
    status: string;
    created_at: string;
  }[];
};
async function adminAction(action: string, data: Record<string, unknown> = {}) {
  const result = await supabase.rpc("opportunity_admin_command", {
    p_action: action,
    p_data: data,
  });
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
const OPPORTUNITY_FIELDS = [
  "title",
  "slug",
  "thesis",
  "customer",
  "problem",
  "why_now",
  "key_uncertainty",
  "primary_industry",
  "geography",
  "model",
];
const BUSINESS_FIELDS = [
  "title",
  "slug",
  "thesis",
  "industry",
  "model",
  "complexity",
  "price_display",
  "demo_url",
];
const DISCLOSURES = [
  "included_assets",
  "dependencies",
  "ongoing_costs",
  "tested_evidence",
  "untested_assumptions",
  "licences",
  "limitations",
  "handover",
];
const emptySource = (): SourceRow => ({
  title: "",
  url: "",
  publisher: "",
  published_at: "",
  retrieved_at: "",
  geography: "",
});
function Editor({
  kind,
  row,
  saved,
}: {
  kind: "opportunity" | "business";
  row: RecordRow | null;
  saved: () => void;
}) {
  const [sources, setSources] = useState<SourceRow[]>(
    Array.isArray(row?.public_sources)
      ? (row.public_sources as SourceRow[])
      : [emptySource()],
  );
  const values = {
    ...row,
    ...((row?.disclosures as object) ?? {}),
    ...((row?.terms as object) ?? {}),
  } as Record<string, unknown>;
  const value = (key: string) => String(values[key] ?? "");
  return (
    <section className="p2-panel">
      <h2>
        {row
          ? `Edit ${row.title}`
          : kind === "business"
            ? "Prepare a Ready-to-Launch package"
            : "Create an editorial draft"}
      </h2>
      <ActionForm
        submit="Save for review"
        onSuccess={saved}
        action={async (form) => {
          if (kind === "opportunity")
            return adminAction(kind, {
              ...form,
              id: row?.id,
              skills: form.skills
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              public_sources: sources.filter((s) => s.url || s.title),
            });
          const {
            title,
            slug,
            thesis,
            industry,
            model,
            complexity,
            package_type,
            price_display,
            demo_url,
            scope,
            version,
            availability,
            ...disclosures
          } = form;
          return adminAction(kind, {
            id: row?.id,
            title,
            slug,
            thesis,
            industry,
            model,
            complexity,
            package_type,
            price_display,
            demo_url,
            availability,
            disclosures,
            terms: { scope, version },
          });
        }}
      >
        {(kind === "opportunity" ? OPPORTUNITY_FIELDS : BUSINESS_FIELDS).map(
          (name) => (
            <Field
              key={name}
              name={name}
              label={name.replaceAll("_", " ")}
              value={value(name)}
              type={
                ["thesis", "problem", "why_now", "key_uncertainty"].includes(
                  name,
                )
                  ? "textarea"
                  : name === "demo_url"
                    ? "url"
                    : "text"
              }
              required={name !== "demo_url"}
            />
          ),
        )}
        {kind === "opportunity" ? (
          <>
            <Field
              name="skills"
              label="Relevant skills (comma separated)"
              value={Array.isArray(row?.skills) ? row.skills.join(", ") : ""}
            />
            <Field
              name="evidence_strength"
              label="Evidence strength after review"
              value={value("evidence_strength") || "hypothesis"}
              options={["hypothesis", "emerging", "supported"]}
            />
            <h3>Reviewed sources</h3>
            {sources.map((source, index) => (
              <fieldset className="p2-panel" key={index}>
                <legend>Source {index + 1}</legend>
                {(
                  [
                    "title",
                    "url",
                    "publisher",
                    "published_at",
                    "retrieved_at",
                    "geography",
                  ] as const
                ).map((key) => (
                  <label className="p2-field" key={key}>
                    <span>
                      {key.replaceAll("_", " ")}
                      {key === "published_at" && " (leave blank if unknown)"}
                    </span>
                    <input
                      value={
                        key.endsWith("_at")
                          ? (source[key] ?? "").slice(0, 10)
                          : (source[key] ?? "")
                      }
                      type={
                        key === "url"
                          ? "url"
                          : key.endsWith("_at")
                            ? "date"
                            : "text"
                      }
                      required={key !== "published_at"}
                      onChange={(event) =>
                        setSources((all) =>
                          all.map((s, i) =>
                            i === index
                              ? { ...s, [key]: event.target.value }
                              : s,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="p2-button secondary"
                  onClick={() =>
                    setSources((all) => all.filter((_, i) => i !== index))
                  }
                >
                  Remove source
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              className="p2-button secondary"
              onClick={() => setSources((all) => [...all, emptySource()])}
            >
              Add source
            </button>
          </>
        ) : (
          <>
            <Field
              name="package_type"
              label="Package type"
              value={value("package_type") || "launch_kit"}
              options={[
                "launch_kit",
                "launch_system",
                "launch_handover",
                "exclusive_acquisition",
              ]}
            />
            <Field
              name="availability"
              label="Availability"
              value={value("availability") || "enquiry"}
              options={[
                "available",
                "enquiry",
                "reserved",
                "sold",
                "unavailable",
              ]}
            />
            {[...DISCLOSURES, "scope", "version"].map((name) => (
              <Field
                key={name}
                name={name}
                label={name.replaceAll("_", " ")}
                value={value(name)}
                type="textarea"
                required
              />
            ))}
            <Notice>
              A second administrator must review and publish this package.
              Saving an edit returns it to review.
            </Notice>
          </>
        )}
      </ActionForm>
    </section>
  );
}
export default function OpportunityAdminPage() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const section = pathname.split("/")[2] || "opportunities";
  const state = useLoad(
    async () => (await adminAction("overview")) as Overview,
    user?.id ?? "",
  );
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [filter, setFilter] = useState("");
  const catalogue = section === "businesses" ? "business" : "opportunity";
  const records =
    section === "businesses"
      ? state.data?.businesses
      : state.data?.opportunities;
  return (
    <>
      <PageHeading
        eyebrow="Editorial operations"
        title="Keep the quality bar visible."
      />
      <nav className="p2-tabs" aria-label="Editorial navigation">
        {[
          "opportunities",
          "research",
          "businesses",
          "taxonomy",
          "entitlements",
          "privacy",
          "audit",
        ].map((s) => (
          <NavLink
            to={`/admin/${s}`}
            key={s}
            onClick={() => {
              setEditing(null);
              setFilter("");
            }}
          >
            {s}
          </NavLink>
        ))}
      </nav>
      {state.loading && <Loading />}
      {state.error && <Notice danger>{state.error}</Notice>}
      {state.data && ["opportunities", "businesses"].includes(section) && (
        <div className="p2-stack">
          <Editor
            key={`${catalogue}:${editing?.id ?? "new"}`}
            kind={catalogue}
            row={editing}
            saved={() => {
              setEditing(null);
              state.reload();
            }}
          />
          {editing && (
            <button
              className="p2-button secondary"
              onClick={() => setEditing(null)}
            >
              Cancel editing
            </button>
          )}
          <label className="p2-field">
            <span>Filter status</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">All</option>
              {["draft", "review", "published", "retired"].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          {records
            ?.filter((row) => !filter || row.status === filter)
            .map((row) => (
              <article className="p2-panel" key={row.id}>
                <div className="p2-card-top">
                  <h2>{row.title}</h2>
                  <Badge>{row.status}</Badge>
                </div>
                <button
                  className="p2-button secondary"
                  onClick={() => {
                    setEditing(row);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Review and edit
                </button>
                {catalogue === "business" &&
                row.status !== "published" &&
                [row.created_by, row.last_edited_by].includes(user?.id) ? (
                  <p className="p2-muted">
                    Awaiting review by another administrator.
                  </p>
                ) : (
                  <ActionForm
                    submit={
                      row.status === "published"
                        ? "Unpublish"
                        : "Publish reviewed item"
                    }
                    action={(data) =>
                      adminAction(
                        `${row.status === "published" ? "unpublish" : "publish"}${catalogue === "business" ? "_business" : ""}`,
                        { id: row.id, confirmed: data.confirmed === "on" },
                      )
                    }
                    onSuccess={state.reload}
                  >
                    <label className="p2-checkbox">
                      <input type="checkbox" name="confirmed" required />I
                      reviewed the evidence, uncertainty, scope and applicable
                      terms.
                    </label>
                  </ActionForm>
                )}
              </article>
            ))}
        </div>
      )}
      {state.data && section === "research" && (
        <div className="p2-stack">
          {state.data.jobs.map((job) => (
            <article className="p2-panel" key={job.id}>
              <Badge>{job.status}</Badge>
              <p>
                {job.id} · Attempt {job.attempts} · ${job.cost_usd} reserved
              </p>
              {job.error?.message && (
                <Notice danger>{job.error.message}</Notice>
              )}
              <div className="p2-actions">
                {job.status === "failed" && (
                  <ActionButton
                    action={() => adminAction("retry", { id: job.id })}
                    onSuccess={state.reload}
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
                ].includes(job.status) && (
                  <ActionButton
                    action={() => adminAction("cancel", { id: job.id })}
                    onSuccess={state.reload}
                  >
                    Cancel
                  </ActionButton>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {state.data && section === "taxonomy" && (
        <div className="p2-stack">
          <section className="p2-panel">
            <h2>Add or update a category</h2>
            <ActionForm
              action={(data) =>
                adminAction("taxonomy", {
                  ...data,
                  active: data.active === "on",
                })
              }
              onSuccess={state.reload}
            >
              <Field
                label="Kind"
                name="kind"
                options={["industry", "geography", "model", "signal"]}
              />
              <Field label="Stable key" name="key" required />
              <Field label="Display label" name="label" required />
              <label className="p2-checkbox">
                <input type="checkbox" name="active" defaultChecked />
                Available in the catalogue
              </label>
            </ActionForm>
          </section>
          {state.data.taxonomy.map((t) => (
            <article className="p2-panel" key={`${t.kind}:${t.key}`}>
              <h3>{t.label}</h3>
              <p>
                {t.kind} / {t.key} · {t.active ? "Active" : "Hidden"}
              </p>
            </article>
          ))}
        </div>
      )}
      {state.data && section === "entitlements" && (
        <section className="p2-panel">
          <h2>Temporary plan allowances</h2>
          <ActionForm
            action={async (data) => {
              const { org_id, expires_at, reason, ...values } = data;
              const limits = Object.fromEntries(
                Object.entries(values)
                  .filter(([, value]) => value !== "")
                  .map(([key, value]) => [key, Number(value)]),
              );
              return adminAction("override", {
                org_id,
                expires_at,
                reason,
                limits,
              });
            }}
          >
            <Field name="org_id" label="Organization ID" required />
            <Field name="expires_at" label="Expires on" type="date" required />
            <Field name="reason" label="Reason for the exception" required />
            {[
              "active",
              "research",
              "refresh",
              "evidence",
              "experiments",
              "seats",
            ].map((name) => (
              <Field
                key={name}
                name={name}
                label={`${name} (blank keeps the plan allowance)`}
                type="number"
                min={0}
              />
            ))}
          </ActionForm>
        </section>
      )}
      {state.data && section === "privacy" && (
        <div className="p2-stack">
          {state.data.privacy.length === 0 && (
            <Notice>No outstanding data requests.</Notice>
          )}
          {state.data.privacy.map((request) => (
            <article className="p2-panel" key={request.id}>
              <h2>{request.request_type.replaceAll("_", " ")}</h2>
              <p>
                Account {request.user_id} · Requested{" "}
                {new Date(request.created_at).toLocaleDateString()}
              </p>
              <Badge>{request.status}</Badge>
              {request.request_type === "delete_workspace" && (
                <ActionForm
                  submit="Delete the requested workspace"
                  action={async (data) => {
                    const result = await supabase.rpc(
                      "opportunity_delete_requested_workspace",
                      {
                        p_request: request.id,
                        p_confirmed: data.confirmed === "on",
                      },
                    );
                    if (result.error) throw result.error;
                  }}
                  onSuccess={state.reload}
                >
                  <label className="p2-checkbox">
                    <input type="checkbox" name="confirmed" required />I
                    verified the owner’s request and applicable retention
                    requirements. This permanently removes the workspace and its
                    research.
                  </label>
                </ActionForm>
              )}
              {request.request_type === "delete_account" && (
                <ActionForm
                  submit="Process account deletion"
                  action={async (data) => {
                    const result = await supabase.functions.invoke(
                      "opportunity-account-deletion",
                      { body: { request_id: request.id, confirmed: data.confirmed === "on" } },
                    );
                    if (result.error || result.data?.error) {
                      const response = await (result.error as { context?: Response } | null)?.context?.json().catch(() => null);
                      throw new Error(response?.error ?? result.data?.error ?? result.error?.message ?? "Account deletion failed.");
                    }
                  }}
                  onSuccess={state.reload}
                >
                  <Notice>Active subscriptions stop processing for retention review. Private files are removed before product data and the identity record.</Notice>
                  <label className="p2-checkbox">
                    <input type="checkbox" name="confirmed" required />I verified the account owner’s request and understand that this permanently removes their private workspaces and identity.
                  </label>
                </ActionForm>
              )}
            </article>
          ))}
        </div>
      )}
      {state.data && section === "audit" && (
        <section className="p2-panel p2-detail-list">
          {state.data.audit.map((event) => (
            <div key={event.id}>
              <strong>{event.action}</strong>
              <p>
                {new Date(event.created_at).toLocaleString()} · Actor{" "}
                {event.actor_user_id || "System"}
              </p>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
